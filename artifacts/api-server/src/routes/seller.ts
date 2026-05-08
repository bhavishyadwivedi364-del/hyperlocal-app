import { Router } from "express";
import {
  db,
  shopsTable,
  productsTable,
  ordersTable,
  orderItemsTable,
} from "@workspace/db";
import { eq, and, sum, count, type SQL } from "drizzle-orm";
import {
  CreateSellerShopBody,
  UpdateSellerShopBody,
  CreateSellerProductBody,
  UpdateSellerProductBody,
  UpdateSellerOrderStatusBody,
} from "@workspace/api-zod";

const router = Router();

function isAuthenticated(req: Express.Request, res: any) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

async function getSellerShop(ownerId: string) {
  const [shop] = await db
    .select()
    .from(shopsTable)
    .where(eq(shopsTable.ownerId, ownerId))
    .limit(1);
  return shop ?? null;
}

function formatShop(shop: typeof shopsTable.$inferSelect) {
  return {
    id: shop.id,
    name: shop.name,
    description: shop.description,
    categoryId: shop.categoryId,
    categoryName: null,
    ownerId: shop.ownerId,
    ownerName: null,
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

function formatProduct(product: typeof productsTable.$inferSelect) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    mrp: product.mrp ? Number(product.mrp) : null,
    imageUrl: product.imageUrl,
    shopId: product.shopId,
    shopName: null,
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

router.get("/seller/shop", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const shop = await getSellerShop(req.user.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    res.json(formatShop(shop));
  } catch (err) {
    req.log.error({ err }, "Failed to get seller shop");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/seller/shop", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const body = CreateSellerShopBody.parse(req.body);

    const [shop] = await db
      .insert(shopsTable)
      .values({
        name: body.name,
        description: body.description ?? null,
        categoryId: body.categoryId,
        ownerId: req.user.id,
        address: body.address ?? null,
        city: body.city ?? null,
        phone: body.phone ?? null,
        imageUrl: body.imageUrl ?? null,
        deliveryTime: body.deliveryTime ?? null,
        minimumOrder: body.minimumOrder?.toString() ?? null,
        status: "pending",
      })
      .returning();

    res.status(201).json(formatShop(shop));
  } catch (err) {
    req.log.error({ err }, "Failed to create seller shop");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/seller/shop", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const body = UpdateSellerShopBody.parse(req.body);
    const existing = await getSellerShop(req.user.id);
    if (!existing) return res.status(404).json({ error: "Shop not found" });

    const updates: Partial<typeof shopsTable.$inferInsert> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name ?? undefined;
    if (body.description !== undefined) updates.description = body.description;
    if (body.address !== undefined) updates.address = body.address;
    if (body.city !== undefined) updates.city = body.city;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl;
    if (body.isOpen !== undefined) updates.isOpen = body.isOpen;
    if (body.deliveryTime !== undefined) updates.deliveryTime = body.deliveryTime;
    if (body.minimumOrder !== undefined) updates.minimumOrder = body.minimumOrder?.toString() ?? null;

    const [updated] = await db
      .update(shopsTable)
      .set(updates)
      .where(eq(shopsTable.id, existing.id))
      .returning();

    res.json(formatShop(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update seller shop");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/seller/products", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const shop = await getSellerShop(req.user.id);
    if (!shop) return res.json([]);

    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.shopId, shop.id));

    res.json(products.map(formatProduct));
  } catch (err) {
    req.log.error({ err }, "Failed to list seller products");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/seller/products", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const body = CreateSellerProductBody.parse(req.body);
    const shop = await getSellerShop(req.user.id);
    if (!shop) return res.status(400).json({ error: "No shop found. Create a shop first." });

    const [product] = await db
      .insert(productsTable)
      .values({
        name: body.name,
        description: body.description ?? null,
        price: body.price.toString(),
        mrp: body.mrp?.toString() ?? null,
        imageUrl: body.imageUrl ?? null,
        shopId: shop.id,
        categoryId: body.categoryId,
        unit: body.unit ?? null,
        stockQuantity: body.stockQuantity ?? null,
        isFeatured: body.isFeatured ?? false,
      })
      .returning();

    res.status(201).json(formatProduct(product));
  } catch (err) {
    req.log.error({ err }, "Failed to create product");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/seller/products/:productId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const productId = parseInt(req.params.productId, 10);
    const body = UpdateSellerProductBody.parse(req.body);
    const shop = await getSellerShop(req.user.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });

    const updates: Partial<typeof productsTable.$inferInsert> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name ?? undefined;
    if (body.description !== undefined) updates.description = body.description;
    if (body.price !== undefined) updates.price = body.price?.toString();
    if (body.mrp !== undefined) updates.mrp = body.mrp?.toString() ?? null;
    if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl;
    if (body.unit !== undefined) updates.unit = body.unit;
    if (body.stockQuantity !== undefined) updates.stockQuantity = body.stockQuantity;
    if (body.inStock !== undefined) updates.inStock = body.inStock ?? undefined;
    if (body.isFeatured !== undefined) updates.isFeatured = body.isFeatured;

    const [updated] = await db
      .update(productsTable)
      .set(updates)
      .where(and(eq(productsTable.id, productId), eq(productsTable.shopId, shop.id)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Product not found" });
    res.json(formatProduct(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update product");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/seller/products/:productId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const productId = parseInt(req.params.productId, 10);
    const shop = await getSellerShop(req.user.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });

    await db
      .delete(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.shopId, shop.id)));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete product");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/seller/orders", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const shop = await getSellerShop(req.user.id);
    if (!shop) return res.json([]);

    const { status } = req.query as Record<string, string>;
    const conditions: SQL[] = [eq(ordersTable.shopId, shop.id)];
    if (status) conditions.push(eq(ordersTable.status, status as typeof ordersTable.$inferSelect.status));

    const orders = await db
      .select()
      .from(ordersTable)
      .where(and(...conditions))
      .orderBy(ordersTable.createdAt);

    const result = await Promise.all(
      orders.map(async (order) => {
        const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
        return {
          id: order.id,
          userId: order.userId,
          shopId: order.shopId,
          shopName: shop.name,
          status: order.status,
          items: items.map((i) => ({
            id: i.id,
            productId: i.productId,
            productName: i.productName,
            productImageUrl: i.productImageUrl,
            quantity: i.quantity,
            price: Number(i.price),
            subtotal: Number(i.price) * i.quantity,
          })),
          totalAmount: Number(order.totalAmount),
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          deliveryAddress: order.deliveryAddress,
          deliveryNotes: order.deliveryNotes,
          estimatedDelivery: order.estimatedDelivery,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
        };
      }),
    );

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list seller orders");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/seller/orders/:orderId/status", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const body = UpdateSellerOrderStatusBody.parse(req.body);
    const shop = await getSellerShop(req.user.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });

    const [updated] = await db
      .update(ordersTable)
      .set({ status: body.status, updatedAt: new Date() })
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.shopId, shop.id)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Order not found" });

    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
    res.json({
      id: updated.id,
      userId: updated.userId,
      shopId: updated.shopId,
      shopName: shop.name,
      status: updated.status,
      items: items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.productName,
        productImageUrl: i.productImageUrl,
        quantity: i.quantity,
        price: Number(i.price),
        subtotal: Number(i.price) * i.quantity,
      })),
      totalAmount: Number(updated.totalAmount),
      paymentMethod: updated.paymentMethod,
      paymentStatus: updated.paymentStatus,
      deliveryAddress: updated.deliveryAddress,
      deliveryNotes: updated.deliveryNotes,
      estimatedDelivery: updated.estimatedDelivery,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update order status");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/seller/dashboard", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const shop = await getSellerShop(req.user.id);
    if (!shop) {
      return res.json({
        totalOrders: 0, pendingOrders: 0, confirmedOrders: 0,
        dispatchedOrders: 0, deliveredOrders: 0, totalRevenue: 0,
        monthlyRevenue: 0, totalProducts: 0, outOfStockProducts: 0,
        recentOrders: [], topProducts: [],
      });
    }

    const allOrders = await db.select().from(ordersTable).where(eq(ordersTable.shopId, shop.id));
    const allProducts = await db.select().from(productsTable).where(eq(productsTable.shopId, shop.id));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalRevenue = allOrders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const monthlyRevenue = allOrders
      .filter((o) => o.status === "delivered" && o.createdAt >= startOfMonth)
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const recentOrders = allOrders
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((o) => ({
        id: o.id, userId: o.userId, shopId: o.shopId, shopName: shop.name,
        status: o.status, items: [], totalAmount: Number(o.totalAmount),
        paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus,
        deliveryAddress: o.deliveryAddress, deliveryNotes: o.deliveryNotes,
        estimatedDelivery: o.estimatedDelivery,
        createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString(),
      }));

    res.json({
      totalOrders: allOrders.length,
      pendingOrders: allOrders.filter((o) => o.status === "placed").length,
      confirmedOrders: allOrders.filter((o) => o.status === "confirmed").length,
      dispatchedOrders: allOrders.filter((o) => o.status === "dispatched").length,
      deliveredOrders: allOrders.filter((o) => o.status === "delivered").length,
      totalRevenue,
      monthlyRevenue,
      totalProducts: allProducts.length,
      outOfStockProducts: allProducts.filter((p) => !p.inStock).length,
      recentOrders,
      topProducts: allProducts.slice(0, 5).map(formatProduct),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get seller dashboard");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
