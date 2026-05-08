import { Router } from "express";
import { db, cartItemsTable, productsTable, shopsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { AddToCartBody, UpdateCartItemBody } from "@workspace/api-zod";

const router = Router();

async function buildCart(userId: string) {
  const items = await db
    .select({
      cartItem: cartItemsTable,
      product: productsTable,
      shopName: shopsTable.name,
    })
    .from(cartItemsTable)
    .leftJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
    .leftJoin(shopsTable, eq(productsTable.shopId, shopsTable.id))
    .where(eq(cartItemsTable.userId, userId));

  const formatted = items
    .filter((i) => i.product !== null)
    .map((i) => {
      const price = Number(i.product!.price);
      const subtotal = price * i.cartItem.quantity;
      return {
        id: i.cartItem.id,
        productId: i.cartItem.productId,
        productName: i.product!.name,
        productImageUrl: i.product!.imageUrl,
        shopId: i.product!.shopId,
        shopName: i.shopName ?? null,
        quantity: i.cartItem.quantity,
        price,
        subtotal,
      };
    });

  const totalItems = formatted.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = formatted.reduce((sum, item) => sum + item.subtotal, 0);

  return { items: formatted, totalItems, totalAmount };
}

router.get("/cart", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    res.json(await buildCart(req.user.id));
  } catch (err) {
    req.log.error({ err }, "Failed to get cart");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cart/items", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const body = AddToCartBody.parse(req.body);

    const existing = await db
      .select()
      .from(cartItemsTable)
      .where(and(eq(cartItemsTable.userId, req.user.id), eq(cartItemsTable.productId, body.productId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(cartItemsTable)
        .set({ quantity: existing[0].quantity + body.quantity, updatedAt: new Date() })
        .where(eq(cartItemsTable.id, existing[0].id));
    } else {
      await db.insert(cartItemsTable).values({
        userId: req.user.id,
        productId: body.productId,
        quantity: body.quantity,
      });
    }

    res.json(await buildCart(req.user.id));
  } catch (err) {
    req.log.error({ err }, "Failed to add to cart");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/cart/items/:cartItemId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const cartItemId = parseInt(req.params.cartItemId, 10);
    const body = UpdateCartItemBody.parse(req.body);

    if (body.quantity === 0) {
      await db.delete(cartItemsTable).where(and(eq(cartItemsTable.id, cartItemId), eq(cartItemsTable.userId, req.user.id)));
    } else {
      await db
        .update(cartItemsTable)
        .set({ quantity: body.quantity, updatedAt: new Date() })
        .where(and(eq(cartItemsTable.id, cartItemId), eq(cartItemsTable.userId, req.user.id)));
    }

    res.json(await buildCart(req.user.id));
  } catch (err) {
    req.log.error({ err }, "Failed to update cart item");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/cart/items/:cartItemId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const cartItemId = parseInt(req.params.cartItemId, 10);
    await db.delete(cartItemsTable).where(and(eq(cartItemsTable.id, cartItemId), eq(cartItemsTable.userId, req.user.id)));
    res.json(await buildCart(req.user.id));
  } catch (err) {
    req.log.error({ err }, "Failed to remove cart item");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/cart/clear", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, req.user.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to clear cart");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
