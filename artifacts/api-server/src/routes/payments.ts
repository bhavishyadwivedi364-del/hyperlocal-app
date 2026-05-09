import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import {
  db,
  ordersTable,
  orderItemsTable,
  cartItemsTable,
  productsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;

  // Dynamic require so it doesn't break if key not set
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Razorpay = require("razorpay");
  return new Razorpay({ key_id, key_secret });
}

const CreateOrderBody = z.object({
  amount: z.number().positive(), // in INR (not paise)
});

const VerifyPaymentBody = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  deliveryAddress: z.string().min(5),
  deliveryNotes: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
});

// POST /api/payments/razorpay/create-order
router.post("/payments/razorpay/create-order", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const razorpay = getRazorpay();
  if (!razorpay) {
    return res.status(503).json({
      error: "Payment gateway not configured. Please use Cash on Delivery.",
      code: "RAZORPAY_NOT_CONFIGURED",
    });
  }

  try {
    const { amount } = CreateOrderBody.parse(req.body);
    const order = await (razorpay.orders as any).create({
      amount: Math.round(amount * 100), // convert INR → paise
      currency: "INR",
      receipt: `nk_${Date.now()}_${req.user.id.slice(0, 8)}`,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    req.log.error({ err }, "Razorpay order creation failed");
    res.status(500).json({ error: "Failed to initiate payment" });
  }
});

// POST /api/payments/razorpay/verify — verify payment + place order
router.post("/payments/razorpay/verify", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return res.status(503).json({ error: "Payment gateway not configured." });
  }

  try {
    const body = VerifyPaymentBody.parse(req.body);

    // Verify HMAC signature
    const expectedSig = crypto
      .createHmac("sha256", keySecret)
      .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
      .digest("hex");

    if (expectedSig !== body.razorpay_signature) {
      return res.status(400).json({ error: "Payment signature verification failed" });
    }

    // Payment verified — place the order
    const cartItems = await db
      .select({ cartItem: cartItemsTable, product: productsTable })
      .from(cartItemsTable)
      .leftJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
      .where(eq(cartItemsTable.userId, req.user.id));

    if (cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const validItems = cartItems.filter((i) => i.product !== null);
    if (validItems.length === 0) {
      return res.status(400).json({ error: "No valid items in cart" });
    }

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
        paymentMethod: "online",
        paymentStatus: "paid",
        razorpayOrderId: body.razorpay_order_id,
        deliveryAddress: body.deliveryAddress,
        deliveryNotes: body.deliveryNotes,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
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

    req.log.info({ orderId: order.id, userId: req.user.id }, "Razorpay order placed");
    res.json({ success: true, orderId: order.id });
  } catch (err) {
    req.log.error({ err }, "Razorpay payment verification failed");
    res.status(500).json({ error: "Payment verification failed" });
  }
});

export default router;
