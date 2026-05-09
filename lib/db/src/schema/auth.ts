import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const sessionsTable = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const usersTable = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  phone: varchar("phone").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type UpsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;

export const phoneOtpsTable = pgTable("phone_otps", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 15 }).notNull(),
  otp: varchar("otp", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PhoneOtp = typeof phoneOtpsTable.$inferSelect;

// KYC Verification — required for sellers before they can go live
export const kycVerificationsTable = pgTable("kyc_verifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  documentType: varchar("document_type", { length: 20 }).notNull(), // "aadhaar" | "pan" | "shop_license"
  documentImageUrl: varchar("document_image_url", { length: 500 }).notNull(),
  documentNumber: varchar("document_number", { length: 50 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending" | "approved" | "rejected"
  adminNotes: varchar("admin_notes", { length: 500 }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type KycVerification = typeof kycVerificationsTable.$inferSelect;
