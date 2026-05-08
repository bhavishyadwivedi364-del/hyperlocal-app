import { Router } from "express";
import {
  db,
  shopsTable,
  productsTable,
  ordersTable,
  orderItemsTable,
  userProfilesTable,
  feedbackTable,
  categoriesTable,
  usersTable,
} from "@workspace/db";
import { eq, and, type SQL } from "drizzle-orm";
import { ApproveSellerBody } from "@workspace/api-zod";

const router = Router();

function requireAdmin(req: any, res: any): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

router.get("/admin/dashboard", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const [allUsers, allShops, allOrders, allFeedback, allCategories] = await Promise.all([
      db.select().from(userProfilesTable),
      db.select({ shop: shopsTable, catName: categoriesTable.name }).from(shopsTable).leftJoin(categoriesTable, eq(shopsTable.categoryId, categoriesTable.id)),
      db.select().from(ordersTable),
      db.select({ fb: feedbackTable, userName: userProfilesTable.name }).from(feedbackTable).leftJoin(userProfilesTable, eq(feedbackTable.userId, userProfilesTable.replitId)).limit(10),
      db.select().from(categoriesTable),
    ]);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const totalRevenue = allOrders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const todayOrders = allOrders.filter((o) => o.createdAt >= startOfToday);
    const todayRevenue = todayOrders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const categoryBreakdown = allCategories.map((cat) => ({
      categoryName: cat.name,
      shopCount: allShops.filter((s) => s.shop.categoryId === cat.id).length,
      orderCount: 0,
    }));

    res.json({
      totalUsers: allUsers.length,
      totalSellers: allShops.filter((s) => s.shop.status === "active").length,
      pendingSellers: allShops.filter((s) => s.shop.status === "pending").length,
      totalOrders: allOrders.length,
      totalRevenue,
      todayOrders: todayOrders.length,
      todayRevenue,
      categoryBreakdown,
      recentFeedback: allFeedback.map((f) => ({
        id: f.fb.id, userId: f.fb.userId, userName: f.userName ?? null,
        productId: f.fb.productId, shopId: f.fb.shopId, orderId: f.fb.orderId,
        rating: f.fb.rating, comment: f.fb.comment, type: f.fb.type,
        createdAt: f.fb.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get admin dashboard");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/sellers", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { status } = req.query as Record<string, string>;
    const conditions: SQL[] = [];
    if (status) conditions.push(eq(shopsTable.status, status as typeof shopsTable.$inferSelect.status));

    const shops = await db
      .select({ shop: shopsTable, catName: categoriesTable.name })
      .from(shopsTable)
      .leftJoin(categoriesTable, eq(shopsTable.categoryId, categoriesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json(
      shops.map((s) => ({
        id: s.shop.id, name: s.shop.name, description: s.shop.description,
        categoryId: s.shop.categoryId, categoryName: s.catName ?? null,
        ownerId: s.shop.ownerId, ownerName: null,
        address: s.shop.address, city: s.shop.city, phone: s.shop.phone,
        imageUrl: s.shop.imageUrl,
        rating: s.shop.rating ? Number(s.shop.rating) : null,
        reviewCount: s.shop.reviewCount, status: s.shop.status,
        isOpen: s.shop.isOpen, deliveryTime: s.shop.deliveryTime,
        minimumOrder: s.shop.minimumOrder ? Number(s.shop.minimumOrder) : null,
        createdAt: s.shop.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list admin sellers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/sellers/:shopId/approve", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const body = ApproveSellerBody.parse(req.body);

    const [updated] = await db
      .update(shopsTable)
      .set({ status: body.status, updatedAt: new Date() })
      .where(eq(shopsTable.id, shopId))
      .returning();

    if (!updated) return res.status(404).json({ error: "Shop not found" });

    res.json({
      id: updated.id, name: updated.name, description: updated.description,
      categoryId: updated.categoryId, categoryName: null,
      ownerId: updated.ownerId, ownerName: null,
      address: updated.address, city: updated.city, phone: updated.phone,
      imageUrl: updated.imageUrl,
      rating: updated.rating ? Number(updated.rating) : null,
      reviewCount: updated.reviewCount, status: updated.status,
      isOpen: updated.isOpen, deliveryTime: updated.deliveryTime,
      minimumOrder: updated.minimumOrder ? Number(updated.minimumOrder) : null,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to approve seller");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/users", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { role, limit } = req.query as Record<string, string>;
    const lim = Math.min(parseInt(limit ?? "50", 10), 200);

    const conditions: SQL[] = [];
    if (role) conditions.push(eq(userProfilesTable.role, role as typeof userProfilesTable.$inferSelect.role));

    const users = await db
      .select()
      .from(userProfilesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(lim);

    res.json(
      users.map((u) => ({
        id: u.id, replitId: u.replitId, name: u.name, email: u.email,
        phone: u.phone, address: u.address, city: u.city, role: u.role,
        profileImageUrl: u.profileImageUrl, language: u.language,
        createdAt: u.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list admin users");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/orders", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { status, limit } = req.query as Record<string, string>;
    const lim = Math.min(parseInt(limit ?? "50", 10), 200);

    const conditions: SQL[] = [];
    if (status) conditions.push(eq(ordersTable.status, status as typeof ordersTable.$inferSelect.status));

    const orders = await db
      .select({ order: ordersTable, shopName: shopsTable.name })
      .from(ordersTable)
      .leftJoin(shopsTable, eq(ordersTable.shopId, shopsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(lim)
      .orderBy(ordersTable.createdAt);

    const result = await Promise.all(
      orders.map(async (o) => {
        const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.order.id));
        return {
          id: o.order.id, userId: o.order.userId, shopId: o.order.shopId,
          shopName: o.shopName ?? null, status: o.order.status,
          items: items.map((i) => ({
            id: i.id, productId: i.productId, productName: i.productName,
            productImageUrl: i.productImageUrl, quantity: i.quantity,
            price: Number(i.price), subtotal: Number(i.price) * i.quantity,
          })),
          totalAmount: Number(o.order.totalAmount),
          paymentMethod: o.order.paymentMethod, paymentStatus: o.order.paymentStatus,
          deliveryAddress: o.order.deliveryAddress, deliveryNotes: o.order.deliveryNotes,
          estimatedDelivery: o.order.estimatedDelivery,
          createdAt: o.order.createdAt.toISOString(), updatedAt: o.order.updatedAt.toISOString(),
        };
      }),
    );

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list admin orders");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/feedback", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const feedbackList = await db
      .select({ fb: feedbackTable, userName: userProfilesTable.name })
      .from(feedbackTable)
      .leftJoin(userProfilesTable, eq(feedbackTable.userId, userProfilesTable.replitId));

    res.json(
      feedbackList.map((f) => ({
        id: f.fb.id, userId: f.fb.userId, userName: f.userName ?? null,
        productId: f.fb.productId, shopId: f.fb.shopId, orderId: f.fb.orderId,
        rating: f.fb.rating, comment: f.fb.comment, type: f.fb.type,
        createdAt: f.fb.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list admin feedback");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
