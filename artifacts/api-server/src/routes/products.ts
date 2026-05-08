import { Router } from "express";
import { db, productsTable, shopsTable, categoriesTable } from "@workspace/db";
import { eq, ilike, and, type SQL } from "drizzle-orm";

const router = Router();

function formatProduct(
  product: typeof productsTable.$inferSelect,
  shopName?: string | null,
) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    mrp: product.mrp ? Number(product.mrp) : null,
    imageUrl: product.imageUrl,
    shopId: product.shopId,
    shopName: shopName ?? null,
    categoryId: product.categoryId,
    unit: product.unit,
    inStock: product.inStock,
    stockQuantity: product.stockQuantity,
    rating: product.rating ? Number(product.rating) : null,
    reviewCount: product.reviewCount,
    isFeatured: product.isFeatured,
    createdAt: product.createdAt.toISOString(),
  };
}

router.get("/products", async (req, res) => {
  try {
    const { categoryId, shopId, search, limit, offset } = req.query as Record<string, string>;
    const lim = Math.min(parseInt(limit ?? "20", 10), 100);
    const off = parseInt(offset ?? "0", 10);

    const conditions: SQL[] = [eq(productsTable.inStock, true)];

    if (categoryId) conditions.push(eq(productsTable.categoryId, parseInt(categoryId, 10)));
    if (shopId) conditions.push(eq(productsTable.shopId, parseInt(shopId, 10)));
    if (search) conditions.push(ilike(productsTable.name, `%${search}%`));

    const results = await db
      .select({ product: productsTable, shopName: shopsTable.name })
      .from(productsTable)
      .leftJoin(shopsTable, eq(productsTable.shopId, shopsTable.id))
      .where(and(...conditions))
      .limit(lim)
      .offset(off);

    res.json(results.map((r) => formatProduct(r.product, r.shopName)));
  } catch (err) {
    req.log.error({ err }, "Failed to list products");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/products/featured", async (req, res) => {
  try {
    const results = await db
      .select({ product: productsTable, shopName: shopsTable.name })
      .from(productsTable)
      .leftJoin(shopsTable, eq(productsTable.shopId, shopsTable.id))
      .where(and(eq(productsTable.isFeatured, true), eq(productsTable.inStock, true)))
      .limit(12);

    res.json(results.map((r) => formatProduct(r.product, r.shopName)));
  } catch (err) {
    req.log.error({ err }, "Failed to get featured products");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/products/:productId", async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid product ID" });

    const [result] = await db
      .select({ product: productsTable, shopName: shopsTable.name })
      .from(productsTable)
      .leftJoin(shopsTable, eq(productsTable.shopId, shopsTable.id))
      .where(eq(productsTable.id, productId))
      .limit(1);

    if (!result) return res.status(404).json({ error: "Product not found" });

    res.json(formatProduct(result.product, result.shopName));
  } catch (err) {
    req.log.error({ err }, "Failed to get product");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
