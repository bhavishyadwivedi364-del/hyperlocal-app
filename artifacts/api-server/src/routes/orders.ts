import { Router } from "express";
import {
  db,
  ordersTable,
  orderItemsTable,
  cartItemsTable,
  productsTable,
  shopsTable,
} from "@workspace/db";
import { eq, and, type SQL } from "drizzle-orm";
import { PlaceOrderBody } from "@workspace/api-zod";

const router = Router();

async function getOrderWithItems(orderId: number, userId?: string) {
  const conditions: SQL[] = [eq(ordersTable.id, orderId)];
  if (userId) conditions.push(eq(ordersTable.userId, userId));

  const [order] = await db
    .select({ order: ordersTable, shopName: shopsTable.name })
    .from(ordersTable)
    .leftJoin(shopsTable, eq(ordersTable.shopId, shopsTable.id))
    .where(and(...conditions))
    .limit(1);

  if (!order) return null;

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, orderId));

  return {
    id: order.order.id,
    userId: order.order.userId,
    shopId: order.order.shopId,
    shopName: order.shopName ?? null,
    status: order.order.status,
    items: items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      productImageUrl: i.productImageUrl,
      quantity: i.quantity,
      price: Number(i.price),
      subtotal: Number(i.price) * i.quantity,
    })),
    totalAmount: Number(order.order.totalAmount),
    paymentMethod: order.order.paymentMethod,
    paymentStatus: order.order.paymentStatus,
    deliveryAddress: order.order.deliveryAddress,
    deliveryNotes: order.order.deliveryNotes,
    estimatedDelivery: order.order.estimatedDelivery,
    createdAt: order.order.createdAt.toISOString(),
    updatedAt: order.order.updatedAt.toISOString(),
  };
}

router.get("/orders", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const { status } = req.query as Record<string, string>;
    const conditions: SQL[] = [eq(ordersTable.userId, req.user.id)];
    if (status) conditions.push(eq(ordersTable.status, status as typeof ordersTable.$inferSelect.status));

    const orders = await db
      .select({ order: ordersTable, shopName: shopsTable.name })
      .from(ordersTable)
      .leftJoin(shopsTable, eq(ordersTable.shopId, shopsTable.id))
      .where(and(...conditions))
      .orderBy(ordersTable.createdAt);

    const result = await Promise.all(
      orders.map(async (o) => {
        const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.order.id));
        return {
          id: o.order.id,
          userId: o.order.userId,
          shopId: o.order.shopId,
          shopName: o.shopName ?? null,
          status: o.order.status,
          items: items.map((i) => ({
            id: i.id,
            productId: i.productId,
            productName: i.productName,
            productImageUrl: i.productImageUrl,
            quantity: i.quantity,
            price: Number(i.price),
            subtotal: Number(i.price) * i.quantity,
          })),
          totalAmount: Number(o.order.totalAmount),
          paymentMethod: o.order.paymentMethod,
          paymentStatus: o.order.paymentStatus,
          deliveryAddress: o.order.deliveryAddress,
          deliveryNotes: o.order.deliveryNotes,
          estimatedDelivery: o.order.estimatedDelivery,
          createdAt: o.order.createdAt.toISOString(),
          updatedAt: o.order.updatedAt.toISOString(),
        };
      }),
    );

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list orders");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/orders", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const body = PlaceOrderBody.parse(req.body);

    const cartItems = await db
      .select({ cartItem: cartItemsTable, product: productsTable })
      .from(cartItemsTable)
      .leftJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
      .where(eq(cartItemsTable.userId, req.user.id));

    if (cartItems.length === 0) return res.status(400).json({ error: "Cart is empty" });

    const validItems = cartItems.filter((i) => i.product !== null);
    const shopId = validItems[0].product!.shopId;
    const totalAmount = validItems.reduce(
      (sum, i) => sum + Number(i.product!.price) * i.cartItem.quantity,
      0,
    );

    const [order] = await db
      .insert(ordersTable)
      .values({
        userId: req.user.id,
        shopId,
        totalAmount: totalAmount.toFixed(2),
        paymentMethod: body.paymentMethod,
        deliveryAddress: body.deliveryAddress,
        deliveryNotes: body.deliveryNotes,
        estimatedDelivery: "30-45 minutes",
      })
      .returning();

    await db.insert(orderItemsTable).values(
      validItems.map((i) => ({
        orderId: order.id,
        productId: i.cartItem.productId,
        productName: i.product!.name,
        productImageUrl: i.product!.imageUrl,
        quantity: i.cartItem.quantity,
        price: i.product!.price,
      })),
    );

    await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, req.user.id));

    const result = await getOrderWithItems(order.id);
    res.status(201).json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to place order");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders/:orderId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const order = await getOrderWithItems(orderId, req.user.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    req.log.error({ err }, "Failed to get order");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
