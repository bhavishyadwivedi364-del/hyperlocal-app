import { Router } from "express";
import { db, shopsTable, categoriesTable, usersTable } from "@workspace/db";
import { eq, ilike, and, type SQL } from "drizzle-orm";

const router = Router();

function formatShop(shop: typeof shopsTable.$inferSelect, categoryName?: string | null, ownerName?: string | null) {
  return {
    id: shop.id,
    name: shop.name,
    description: shop.description,
    categoryId: shop.categoryId,
    categoryName: categoryName ?? null,
    ownerId: shop.ownerId,
    ownerName: ownerName ?? null,
    address: shop.address,
    city: shop.city,
    phone: shop.phone,
    imageUrl: shop.imageUrl,
    rating: shop.rating ? Number(shop.rating) : null,
    reviewCount: shop.reviewCount,
    status: shop.status,
    isOpen: shop.isOpen,
    deliveryTime: shop.deliveryTime,
    minimumOrder: shop.minimumOrder ? Number(shop.minimumOrder) : null,
    createdAt: shop.createdAt.toISOString(),
  };
}

router.get("/shops", async (req, res) => {
  try {
    const { category, search, limit } = req.query as Record<string, string>;
    const lim = Math.min(parseInt(limit ?? "20", 10), 100);

    const conditions: SQL[] = [eq(shopsTable.status, "active")];

    if (search) {
      conditions.push(ilike(shopsTable.name, `%${search}%`));
    }

    const results = await db
      .select({
        shop: shopsTable,
        categoryName: categoriesTable.name,
        categorySlug: categoriesTable.slug,
      })
      .from(shopsTable)
      .leftJoin(categoriesTable, eq(shopsTable.categoryId, categoriesTable.id))
      .where(and(...conditions))
      .limit(lim);

    let filtered = results;
    if (category) {
      filtered = results.filter((r) => r.categorySlug === category);
    }

    res.json(filtered.map((r) => formatShop(r.shop, r.categoryName)));
  } catch (err) {
    req.log.error({ err }, "Failed to list shops");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/shops/:shopId", async (req, res) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    if (isNaN(shopId)) return res.status(400).json({ error: "Invalid shop ID" });

    const [result] = await db
      .select({ shop: shopsTable, categoryName: categoriesTable.name })
      .from(shopsTable)
      .leftJoin(categoriesTable, eq(shopsTable.categoryId, categoriesTable.id))
      .where(eq(shopsTable.id, shopId))
      .limit(1);

    if (!result) return res.status(404).json({ error: "Shop not found" });

    res.json(formatShop(result.shop, result.categoryName));
  } catch (err) {
    req.log.error({ err }, "Failed to get shop");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
