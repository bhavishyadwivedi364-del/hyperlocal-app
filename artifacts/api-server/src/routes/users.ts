import { Router } from "express";
import { db, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateUserProfileBody } from "@workspace/api-zod";

const router = Router();

function formatProfile(profile: typeof userProfilesTable.$inferSelect) {
  return {
    id: profile.id,
    replitId: profile.replitId,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    address: profile.address,
    city: profile.city,
    role: profile.role,
    profileImageUrl: profile.profileImageUrl,
    language: profile.language,
    createdAt: profile.createdAt.toISOString(),
  };
}

async function getOrCreateProfile(userId: string, user: Express.User) {
  const [existing] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.replitId, userId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(userProfilesTable)
    .values({
      replitId: userId,
      name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || null,
      email: user.email ?? null,
      profileImageUrl: user.profileImageUrl ?? null,
    })
    .returning();

  return created;
}

router.get("/users/profile", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const profile = await getOrCreateProfile(req.user.id, req.user);
    res.json(formatProfile(profile));
  } catch (err) {
    req.log.error({ err }, "Failed to get user profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/profile", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const body = UpdateUserProfileBody.parse(req.body);

    const profile = await getOrCreateProfile(req.user.id, req.user);

    const updates: Partial<typeof userProfilesTable.$inferSelect> = {
      updatedAt: new Date(),
    };
    if (body.name !== undefined) updates.name = body.name;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.address !== undefined) updates.address = body.address;
    if (body.city !== undefined) updates.city = body.city;
    if (body.language !== undefined) updates.language = body.language;

    const [updated] = await db
      .update(userProfilesTable)
      .set(updates)
      .where(eq(userProfilesTable.id, profile.id))
      .returning();

    res.json(formatProfile(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update user profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

export { getOrCreateProfile };
export default router;
