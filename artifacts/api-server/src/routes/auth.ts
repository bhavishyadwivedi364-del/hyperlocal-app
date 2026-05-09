import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import { z } from "zod";
import { db, usersTable, phoneOtpsTable, userProfilesTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { otpRateLimiter } from "../middlewares/rateLimiter";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  type SessionData,
} from "../lib/auth";

// ─── Phone validation helpers ────────────────────────────────────────────────

/**
 * Normalize an Indian mobile number to +91XXXXXXXXXX.
 * Accepts: 8269352413  |  +918269352413  |  918269352413
 * Rejects: anything that doesn't resolve to a 10-digit number starting with 6-9.
 */
function normalizeIndianPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-\.\(\)]/g, "");
  if (!/^\+?\d+$/.test(cleaned)) return null;

  let digits = cleaned;
  if (digits.startsWith("+91")) digits = digits.slice(3);
  else if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);

  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return `+91${digits}`;
}


const OIDC_COOKIE_TTL = 10 * 60 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

// ─── Permanent Admin Identifiers ──────────────────────────────────────────────
const ADMIN_PHONES = new Set(["8269352413", "+918269352413", "918269352413"]);
const ADMIN_EMAILS = new Set(["bhavishyadwivedi786@gmail.com"]);

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Ensures the user_profile row for this user has the correct role.
 * Called after phone OTP verification or OIDC login.
 */
async function ensureAdminRole(userId: string, phone?: string | null, email?: string | null) {
  const normalizedPhone = phone?.replace(/[\s\-\+]/g, "");
  const isPhoneAdmin = normalizedPhone && ADMIN_PHONES.has(normalizedPhone);
  const isEmailAdmin = email && ADMIN_EMAILS.has(email.toLowerCase());

  if (!isPhoneAdmin && !isEmailAdmin) return;

  // Upsert user profile with admin role
  const [existing] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.replitId, userId))
    .limit(1);

  if (existing) {
    if (existing.role !== "admin") {
      await db
        .update(userProfilesTable)
        .set({ role: "admin", updatedAt: new Date() })
        .where(eq(userProfilesTable.replitId, userId));
    }
  } else {
    await db.insert(userProfilesTable).values({
      replitId: userId,
      phone: phone ?? null,
      email: email ?? null,
      role: "admin",
    });
  }
}

async function upsertUser(claims: Record<string, unknown>) {
  const userData = {
    id: claims.sub as string,
    email: (claims.email as string) || null,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as string | null,
  };
  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({ target: usersTable.id, set: { ...userData, updatedAt: new Date() } })
    .returning();
  return user;
}

// ─── Phone OTP Auth ───────────────────────────────────────────────────────────

router.post("/auth/phone/send-otp", otpRateLimiter, async (req: Request, res: Response) => {
  // Validate & normalize phone before anything else
  const rawPhone = req.body?.phone;
  const phone = normalizeIndianPhone(String(rawPhone ?? ""));
  if (!phone) {
    return res.status(400).json({
      error: "Invalid mobile number. Enter a 10-digit Indian number starting with 6–9 (e.g. 9876543210 or +919876543210).",
    });
  }

  try {
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Invalidate any existing OTPs for this phone
    await db
      .update(phoneOtpsTable)
      .set({ used: true })
      .where(and(eq(phoneOtpsTable.phone, phone), eq(phoneOtpsTable.used, false)));

    await db.insert(phoneOtpsTable).values({ phone, otp, expiresAt });

    // In production, send SMS via provider. For demo, return OTP in response.
    res.json({ success: true, demo_otp: otp, message: "OTP sent (demo mode)" });
  } catch (err) {
    req.log.error({ err }, "Failed to send OTP");
    res.status(500).json({ error: "Failed to send OTP. Please try again." });
  }
});

router.post("/auth/phone/verify-otp", async (req: Request, res: Response) => {
  // Validate & normalize phone
  const rawPhone = req.body?.phone;
  const phone = normalizeIndianPhone(String(rawPhone ?? ""));
  if (!phone) {
    return res.status(400).json({ error: "Invalid mobile number." });
  }

  const otp = String(req.body?.otp ?? "");
  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: "OTP must be exactly 6 digits." });
  }

  try {

    const [otpRecord] = await db
      .select()
      .from(phoneOtpsTable)
      .where(
        and(
          eq(phoneOtpsTable.phone, phone),
          eq(phoneOtpsTable.used, false),
          gt(phoneOtpsTable.expiresAt, new Date()),
        ),
      )
      .orderBy(phoneOtpsTable.createdAt)
      .limit(1);

    // (otp and phone are already validated above)

    if (!otpRecord) {
      res.status(400).json({ error: "OTP expired or not found. Please request a new OTP." });
      return;
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await db.update(phoneOtpsTable).set({ used: true }).where(eq(phoneOtpsTable.id, otpRecord.id));
      res.status(400).json({ error: "Too many attempts. Please request a new OTP." });
      return;
    }

    if (otpRecord.otp !== otp) {
      await db
        .update(phoneOtpsTable)
        .set({ attempts: otpRecord.attempts + 1 })
        .where(eq(phoneOtpsTable.id, otpRecord.id));
      res.status(400).json({ error: "Invalid OTP" });
      return;
    }

    // Mark OTP as used
    await db.update(phoneOtpsTable).set({ used: true }).where(eq(phoneOtpsTable.id, otpRecord.id));

    // Find or create user by phone
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, phone))
      .limit(1);

    let user = existingUser;
    if (!user) {
      const [created] = await db
        .insert(usersTable)
        .values({ phone, firstName: null, lastName: null, email: null })
        .returning();
      user = created;
    }

    // Auto-promote known admins by phone
    await ensureAdminRole(user.id, phone, user.email);

    const sessionData: SessionData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      },
      access_token: `phone_auth_${user.id}`,
      refresh_token: undefined,
      expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    };

    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to verify OTP");
    res.status(400).json({ error: "Verification failed" });
  }
});

// ─── Session / User ───────────────────────────────────────────────────────────

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({ user: req.isAuthenticated() ? req.user : null }),
  );
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ success: true });
});

// ─── OIDC (Replit Auth - kept for backward compatibility) ────────────────────

router.get("/login", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;
  const returnTo = getSafeReturnTo(req.query.returnTo);
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);
  res.redirect(redirectTo.href);
});

router.get("/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;
  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);
  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);
  const now = Math.floor(Date.now() / 1000);

  // Auto-promote known admins by email
  await ensureAdminRole(dbUser.id, dbUser.phone, dbUser.email);

  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

router.get("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  try {
    const config = await getOidcConfig();
    const origin = getOrigin(req);
    const endSessionUrl = oidc.buildEndSessionUrl(config, {
      client_id: process.env.REPL_ID!,
      post_logout_redirect_uri: origin,
    });
    res.redirect(endSessionUrl.href);
  } catch {
    res.redirect("/");
  }
});

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) await deleteSession(sid);
  res.json({ success: true });
});

export default router;
