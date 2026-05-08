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
import { eq, and, type SQL, desc } from "drizzle-orm";
import { ApproveSellerBody } from "@workspace/api-zod";
import { z } from "zod";

const router = Router();

const UpdateUserRoleBody = z.object({ role: z.enum(["customer", "seller", "admin"]) });

function requireAdmin(req: any, res: any): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function shopToJson(s: typeof shopsTable.$inferSelect, catName?: string | null) {
  return {
    id: s.id, name: s.name, description: s.description,
    categoryId: s.categoryId, categoryName: catName ?? null,
    ownerId: s.ownerId, address: s.address, city: s.city,
    phone: s.phone, imageUrl: s.imageUrl, gstNumber: s.gstNumber,
    rating: s.rating ? Number(s.rating) : null,
    reviewCount: s.reviewCount, status: s.status,
    isOpen: s.isOpen, deliveryTime: s.deliveryTime,
    minimumOrder: s.minimumOrder ? Number(s.minimumOrder) : null,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/admin/dashboard", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const [allUsers, allShops, allOrders, allFeedback, allCategories] = await Promise.all([
      db.select().from(userProfilesTable),
      db.select({ shop: shopsTable, catName: categoriesTable.name }).from(shopsTable).leftJoin(categoriesTable, eq(shopsTable.categoryId, categoriesTable.id)),
      db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)),
      db.select({ fb: feedbackTable, userName: userProfilesTable.name }).from(feedbackTable).leftJoin(userProfilesTable, eq(feedbackTable.userId, userProfilesTable.replitId)).limit(10).orderBy(desc(feedbackTable.createdAt)),
      db.select().from(categoriesTable),
    ]);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const deliveredOrders = allOrders.filter((o) => o.status === "delivered");
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const todayOrders = allOrders.filter((o) => o.createdAt >= startOfToday);
    const todayRevenue = todayOrders.filter((o) => o.status === "delivered").reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const monthRevenue = allOrders.filter((o) => o.status === "delivered" && o.createdAt >= startOfMonth).reduce((sum, o) => sum + Number(o.totalAmount), 0);

    // Revenue by day (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    const revenueByDay = last7Days.map((day) => {
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const dayOrders = deliveredOrders.filter((o) => o.createdAt >= day && o.createdAt < nextDay);
      return {
        date: day.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        revenue: dayOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
        orders: dayOrders.length,
      };
    });

    const categoryBreakdown = allCategories.map((cat) => ({
      categoryName: cat.name,
      shopCount: allShops.filter((s) => s.shop.categoryId === cat.id).length,
      orderCount: allOrders.filter((o) => {
        const shop = allShops.find((s) => s.shop.id === o.shopId);
        return shop?.shop.categoryId === cat.id;
      }).length,
    }));

    res.json({
      totalUsers: allUsers.length,
      totalSellers: allShops.filter((s) => s.shop.status === "active").length,
      pendingSellers: allShops.filter((s) => s.shop.status === "pending").length,
      totalOrders: allOrders.length,
      totalRevenue,
      todayOrders: todayOrders.length,
      todayRevenue,
      monthRevenue,
      revenueByDay,
      categoryBreakdown,
      recentOrders: allOrders.slice(0, 5).map((o) => ({
        id: o.id, shopId: o.shopId, status: o.status,
        totalAmount: Number(o.totalAmount),
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt.toISOString(),
      })),
      recentFeedback: allFeedback.map((f) => ({
        id: f.fb.id, userId: f.fb.userId, userName: f.userName ?? null,
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
      .select({ shop: shopsTable, catName: categoriesTable.name, ownerPhone: usersTable.phone })
      .from(shopsTable)
      .leftJoin(categoriesTable, eq(shopsTable.categoryId, categoriesTable.id))
      .leftJoin(usersTable, eq(shopsTable.ownerId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(shopsTable.createdAt));

    res.json(shops.map((s) => ({ ...shopToJson(s.shop, s.catName), ownerPhone: s.ownerPhone })));
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
    res.json(shopToJson(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to approve seller");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/users", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { role, limit } = req.query as Record<string, string>;
    const lim = Math.min(parseInt(limit ?? "100", 10), 500);
    const conditions: SQL[] = [];
    if (role) conditions.push(eq(userProfilesTable.role, role as typeof userProfilesTable.$inferSelect.role));

    const users = await db
      .select({ profile: userProfilesTable, phone: usersTable.phone })
      .from(userProfilesTable)
      .leftJoin(usersTable, eq(userProfilesTable.replitId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(userProfilesTable.createdAt))
      .limit(lim);

    res.json(users.map((u) => ({
      id: u.profile.id, replitId: u.profile.replitId, name: u.profile.name,
      email: u.profile.email, phone: u.profile.phone || u.phone,
      address: u.profile.address, city: u.profile.city, role: u.profile.role,
      profileImageUrl: u.profile.profileImageUrl, language: u.profile.language,
      createdAt: u.profile.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list admin users");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/users/:replitId/role", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { replitId } = req.params;
    const body = UpdateUserRoleBody.parse(req.body);

    const [updated] = await db
      .update(userProfilesTable)
      .set({ role: body.role, updatedAt: new Date() })
      .where(eq(userProfilesTable.replitId, replitId))
      .returning();

    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, role: updated.role });
  } catch (err) {
    req.log.error({ err }, "Failed to update user role");
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
      .orderBy(desc(ordersTable.createdAt));

    const result = await Promise.all(
      orders.map(async (o) => {
        const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.order.id));
        return {
          id: o.order.id, userId: o.order.userId, shopId: o.order.shopId,
          shopName: o.shopName ?? null, status: o.order.status,
          items: items.map((i) => ({
            id: i.id, productName: i.productName, quantity: i.quantity,
            price: Number(i.price), subtotal: Number(i.price) * i.quantity,
          })),
          totalAmount: Number(o.order.totalAmount),
          paymentMethod: o.order.paymentMethod, paymentStatus: o.order.paymentStatus,
          deliveryAddress: o.order.deliveryAddress,
          customerPhone: o.order.customerPhone,
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
      .leftJoin(userProfilesTable, eq(feedbackTable.userId, userProfilesTable.replitId))
      .orderBy(desc(feedbackTable.createdAt));

    res.json(feedbackList.map((f) => ({
      id: f.fb.id, userId: f.fb.userId, userName: f.userName ?? null,
      productId: f.fb.productId, shopId: f.fb.shopId, orderId: f.fb.orderId,
      rating: f.fb.rating, comment: f.fb.comment, type: f.fb.type,
      createdAt: f.fb.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list admin feedback");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── CSV Export ───────────────────────────────────────────────────────────────

function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

router.get("/admin/export/orders", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const orders = await db
      .select({ order: ordersTable, shopName: shopsTable.name })
      .from(ordersTable)
      .leftJoin(shopsTable, eq(ordersTable.shopId, shopsTable.id))
      .orderBy(desc(ordersTable.createdAt));

    const csv = toCSV(
      ["Order ID", "Shop", "Status", "Payment", "Total (Rs)", "Customer Phone", "Address", "Date"],
      orders.map((o) => [
        o.order.id, o.shopName, o.order.status, o.order.paymentMethod,
        Number(o.order.totalAmount).toFixed(2), o.order.customerPhone,
        o.order.deliveryAddress, new Date(o.order.createdAt).toLocaleDateString("en-IN"),
      ]),
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
    res.send(csv);
  } catch (err) {
    req.log.error({ err }, "Failed to export orders CSV");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/export/users", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const users = await db
      .select({ profile: userProfilesTable, phone: usersTable.phone })
      .from(userProfilesTable)
      .leftJoin(usersTable, eq(userProfilesTable.replitId, usersTable.id))
      .orderBy(desc(userProfilesTable.createdAt));

    const csv = toCSV(
      ["ID", "Name", "Phone", "Email", "Role", "City", "Language", "Joined"],
      users.map((u) => [
        u.profile.id, u.profile.name, u.profile.phone || u.phone,
        u.profile.email, u.profile.role, u.profile.city,
        u.profile.language, new Date(u.profile.createdAt).toLocaleDateString("en-IN"),
      ]),
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=users.csv");
    res.send(csv);
  } catch (err) {
    req.log.error({ err }, "Failed to export users CSV");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/export/products", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const products = await db
      .select({ product: productsTable, shopName: shopsTable.name })
      .from(productsTable)
      .leftJoin(shopsTable, eq(productsTable.shopId, shopsTable.id));

    const csv = toCSV(
      ["ID", "Name", "Shop", "Price (Rs)", "MRP", "Unit", "In Stock", "Stock Qty", "HSN", "GST %"],
      products.map((p) => [
        p.product.id, p.product.name, p.shopName,
        Number(p.product.price).toFixed(2), p.product.mrp ? Number(p.product.mrp).toFixed(2) : "",
        p.product.unit, p.product.inStock ? "Yes" : "No",
        p.product.stockQuantity, p.product.hsn,
        p.product.gstPercent ? Number(p.product.gstPercent) : 5,
      ]),
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=products.csv");
    res.send(csv);
  } catch (err) {
    req.log.error({ err }, "Failed to export products CSV");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
