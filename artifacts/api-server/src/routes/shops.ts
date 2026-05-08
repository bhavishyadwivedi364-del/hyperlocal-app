import { Router } from "express";
import { db, shopsTable, categoriesTable } from "@workspace/db";
import { eq, ilike, and, type SQL } from "drizzle-orm";

const router = Router();

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatShop(
  shop: typeof shopsTable.$inferSelect,
  categoryName?: string | null,
  distanceKm?: number,
) {
  return {
    id: shop.id,
    name: shop.name,
    description: shop.description,
    categoryId: shop.categoryId,
    categoryName: categoryName ?? null,
    ownerId: shop.ownerId,
    address: shop.address,
    city: shop.city,
    pincode: shop.pincode,
    phone: shop.phone,
    email: shop.email,
    imageUrl: shop.imageUrl,
    bannerUrl: shop.bannerUrl,
    gstNumber: shop.gstNumber,
    latitude: shop.latitude ? Number(shop.latitude) : null,
    longitude: shop.longitude ? Number(shop.longitude) : null,
    rating: shop.rating ? Number(shop.rating) : null,
    reviewCount: shop.reviewCount,
    status: shop.status,
    isOpen: shop.isOpen,
    deliveryTime: shop.deliveryTime,
    minimumOrder: shop.minimumOrder ? Number(shop.minimumOrder) : null,
    deliveryCharge: shop.deliveryCharge ? Number(shop.deliveryCharge) : 0,
    distanceKm: distanceKm ?? null,
    createdAt: shop.createdAt.toISOString(),
  };
}

router.get("/shops", async (req, res) => {
  try {
    const { category, search, limit, lat, lng, radius } = req.query as Record<string, string>;
    const lim = Math.min(parseInt(limit ?? "20", 10), 100);

    const conditions: SQL[] = [eq(shopsTable.status, "active")];
    if (search) conditions.push(ilike(shopsTable.name, `%${search}%`));

    const results = await db
      .select({ shop: shopsTable, categoryName: categoriesTable.name, categorySlug: categoriesTable.slug })
      .from(shopsTable)
      .leftJoin(categoriesTable, eq(shopsTable.categoryId, categoriesTable.id))
      .where(and(...conditions))
      .limit(100); // fetch more for filtering

    let filtered = results;
    if (category) filtered = results.filter((r) => r.categorySlug === category);

    // GPS filtering
    let withDistance = filtered.map((r) => {
      let distanceKm: number | undefined;
      if (lat && lng && r.shop.latitude && r.shop.longitude) {
        distanceKm = haversineKm(
          parseFloat(lat),
          parseFloat(lng),
          Number(r.shop.latitude),
          Number(r.shop.longitude),
        );
      }
      return { ...r, distanceKm };
    });

    if (lat && lng && radius) {
      const r = parseFloat(radius);
      withDistance = withDistance.filter((r_) => r_.distanceKm === undefined || r_.distanceKm <= r);
      withDistance.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    }

    res.json(withDistance.slice(0, lim).map((r) => formatShop(r.shop, r.categoryName, r.distanceKm)));
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
