import { Router } from "express";
import { db, feedbackTable, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SubmitFeedbackBody } from "@workspace/api-zod";

const router = Router();

function formatFeedback(
  feedback: typeof feedbackTable.$inferSelect,
  userName?: string | null,
) {
  return {
    id: feedback.id,
    userId: feedback.userId,
    userName: userName ?? null,
    productId: feedback.productId,
    shopId: feedback.shopId,
    orderId: feedback.orderId,
    rating: feedback.rating,
    comment: feedback.comment,
    type: feedback.type,
    createdAt: feedback.createdAt.toISOString(),
  };
}

router.post("/feedback", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const body = SubmitFeedbackBody.parse(req.body);

    const [created] = await db
      .insert(feedbackTable)
      .values({
        userId: req.user.id,
        productId: body.productId ?? null,
        shopId: body.shopId ?? null,
        orderId: body.orderId ?? null,
        rating: body.rating,
        comment: body.comment ?? null,
        type: body.type,
      })
      .returning();

    const [profile] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.replitId, req.user.id))
      .limit(1);

    res.status(201).json(formatFeedback(created, profile?.name));
  } catch (err) {
    req.log.error({ err }, "Failed to submit feedback");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/feedback/product/:productId", async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid product ID" });

    const feedbackList = await db
      .select({ feedback: feedbackTable, userName: userProfilesTable.name })
      .from(feedbackTable)
      .leftJoin(userProfilesTable, eq(feedbackTable.userId, userProfilesTable.replitId))
      .where(eq(feedbackTable.productId, productId));

    res.json(feedbackList.map((f) => formatFeedback(f.feedback, f.userName)));
  } catch (err) {
    req.log.error({ err }, "Failed to get product feedback");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
