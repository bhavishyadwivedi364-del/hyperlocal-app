import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const shopStatusEnum = pgEnum("shop_status", [
  "pending",
  "active",
  "suspended",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "placed",
  "confirmed",
  "preparing",
  "dispatched",
  "delivered",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", ["cod", "online"]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

export const userRoleEnum = pgEnum("user_role", [
  "customer",
  "seller",
  "admin",
]);

export const feedbackTypeEnum = pgEnum("feedback_type", [
  "product_review",
  "shop_review",
  "general",
  "complaint",
]);

// ─── User Profiles ────────────────────────────────────────────────────────────

export const userProfilesTable = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  replitId: text("replit_id").notNull().unique().references(() => usersTable.id),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  role: userRoleEnum("role").notNull().default("customer"),
  profileImageUrl: text("profile_image_url"),
  language: text("language").default("en"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfilesTable.$inferSelect;

// ─── Categories ────────────────────────────────────────────────────────────────

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true, createdAt: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;

// ─── Shops ────────────────────────────────────────────────────────────────────

export const shopsTable = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
  ownerId: text("owner_id").notNull().references(() => usersTable.id),
  address: text("address"),
  city: text("city"),
  phone: text("phone"),
  imageUrl: text("image_url"),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  reviewCount: integer("review_count").default(0),
  status: shopStatusEnum("status").notNull().default("pending"),
  isOpen: boolean("is_open").default(true),
  deliveryTime: text("delivery_time"),
  minimumOrder: numeric("minimum_order", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertShopSchema = createInsertSchema(shopsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertShop = z.infer<typeof insertShopSchema>;
export type Shop = typeof shopsTable.$inferSelect;

// ─── Products ─────────────────────────────────────────────────────────────────

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  mrp: numeric("mrp", { precision: 10, scale: 2 }),
  imageUrl: text("image_url"),
  shopId: integer("shop_id").notNull().references(() => shopsTable.id),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
  unit: text("unit"),
  inStock: boolean("in_stock").notNull().default(true),
  stockQuantity: integer("stock_quantity"),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  reviewCount: integer("review_count").default(0),
  isFeatured: boolean("is_featured").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;

// ─── Cart Items ───────────────────────────────────────────────────────────────

export const cartItemsTable = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCartItemSchema = createInsertSchema(cartItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItemsTable.$inferSelect;

// ─── Orders ───────────────────────────────────────────────────────────────────

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  shopId: integer("shop_id").notNull().references(() => shopsTable.id),
  status: orderStatusEnum("status").notNull().default("placed"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default("pending"),
  deliveryAddress: text("delivery_address"),
  deliveryNotes: text("delivery_notes"),
  estimatedDelivery: text("estimated_delivery"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;

// ─── Order Items ──────────────────────────────────────────────────────────────

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  productName: text("product_name").notNull(),
  productImageUrl: text("product_image_url"),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ id: true, createdAt: true });
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItemsTable.$inferSelect;

// ─── Feedback ─────────────────────────────────────────────────────────────────

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  productId: integer("product_id").references(() => productsTable.id),
  shopId: integer("shop_id").references(() => shopsTable.id),
  orderId: integer("order_id").references(() => ordersTable.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  type: feedbackTypeEnum("type").notNull().default("general"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFeedbackSchema = createInsertSchema(feedbackTable).omit({ id: true, createdAt: true });
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedbackTable.$inferSelect;
