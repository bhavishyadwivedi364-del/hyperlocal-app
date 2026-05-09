import { Router } from "express";
import { db, kycVerificationsTable, userProfilesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const SubmitKycBody = z.object({
  documentType: z.enum(["aadhaar", "pan", "shop_license"]),
  documentImageUrl: z.string().url().or(z.string().startsWith("/api/uploads/")),
  documentNumber: z.string().max(50).optional(),
});

const RejectKycBody = z.object({
  notes: z.string().min(5).max(500),
});

// ─── Seller: Get own KYC status ───────────────────────────────────────────────

router.get("/kyc", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const [kyc] = await db
      .select()
      .from(kycVerificationsTable)
      .where(eq(kycVerificationsTable.userId, req.user.id))
      .orderBy(desc(kycVerificationsTable.createdAt))
      .limit(1);

    res.json(kyc ?? null);
  } catch (err) {
    req.log.error({ err }, "Failed to get KYC status");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Seller: Submit KYC ───────────────────────────────────────────────────────

router.post("/kyc", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const body = SubmitKycBody.parse(req.body);

    // Check for existing non-rejected KYC
    const [existing] = await db
      .select()
      .from(kycVerificationsTable)
      .where(eq(kycVerificationsTable.userId, req.user.id))
      .orderBy(desc(kycVerificationsTable.createdAt))
      .limit(1);

    if (existing && existing.status === "pending") {
      return res.status(400).json({ error: "KYC already submitted and under review." });
    }
    if (existing && existing.status === "approved") {
      return res.status(400).json({ error: "KYC already verified." });
    }

    // Insert new KYC submission
    const [kyc] = await db
      .insert(kycVerificationsTable)
      .values({
        userId: req.user.id,
        documentType: body.documentType,
        documentImageUrl: body.documentImageUrl,
        documentNumber: body.documentNumber ?? null,
        status: "pending",
      })
      .returning();

    res.status(201).json(kyc);
  } catch (err) {
    req.log.error({ err }, "Failed to submit KYC");
    res.status(400).json({ error: "Failed to submit KYC" });
  }
});

// ─── Admin: List all KYC submissions ─────────────────────────────────────────

router.get("/admin/kyc", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  // Check admin role
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.replitId, req.user.id))
    .limit(1);

  if (!profile || profile.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const { status } = req.query as Record<string, string>;

    let query = db.select().from(kycVerificationsTable).$dynamic();
    if (status) {
      query = query.where(eq(kycVerificationsTable.status, status));
    }

    const submissions = await query.orderBy(desc(kycVerificationsTable.createdAt));
    res.json(submissions);
  } catch (err) {
    req.log.error({ err }, "Failed to list KYC submissions");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: Approve KYC ───────────────────────────────────────────────────────

router.post("/admin/kyc/:id/approve", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.replitId, req.user.id))
    .limit(1);

  if (!profile || profile.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const id = parseInt(req.params.id, 10);
    const [updated] = await db
      .update(kycVerificationsTable)
      .set({ status: "approved", adminNotes: null, reviewedAt: new Date() })
      .where(eq(kycVerificationsTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "KYC record not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to approve KYC");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: Reject KYC ────────────────────────────────────────────────────────

router.post("/admin/kyc/:id/reject", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.replitId, req.user.id))
    .limit(1);

  if (!profile || profile.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const id = parseInt(req.params.id, 10);
    const { notes } = RejectKycBody.parse(req.body);

    const [updated] = await db
      .update(kycVerificationsTable)
      .set({ status: "rejected", adminNotes: notes, reviewedAt: new Date() })
      .where(eq(kycVerificationsTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "KYC record not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to reject KYC");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
