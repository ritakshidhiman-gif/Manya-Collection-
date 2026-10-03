import { boolean, index, int, json, longtext, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const catalogProducts = mysqlTable("catalog_products", {
  id: varchar("id", { length: 80 }).primaryKey(),
  name: varchar("name", { length: 240 }).notNull(),
  price: int("price").notNull(),
  fabric: varchar("fabric", { length: 120 }).notNull(),
  color: varchar("color", { length: 120 }).notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  image: longtext("image").notNull(),
  sizes: json("sizes").$type<string[]>().notNull(),
  description: text("description").notNull(),
  badge: varchar("badge", { length: 120 }),
  inStock: boolean("inStock").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const storeActivity = mysqlTable("store_activity", {
  id: varchar("id", { length: 36 }).primaryKey(),
  visitorId: varchar("visitorId", { length: 64 }).notNull(),
  checkoutId: varchar("checkoutId", { length: 64 }),
  eventType: varchar("eventType", { length: 32 }).notNull(),
  path: varchar("path", { length: 255 }).notNull(),
  customerName: varchar("customerName", { length: 240 }),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerPhone: varchar("customerPhone", { length: 32 }),
  deliveryAddress: text("deliveryAddress"),
  paymentMethod: varchar("paymentMethod", { length: 16 }),
  amount: int("amount"),
  paymentId: varchar("paymentId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  visitorIdx: index("store_activity_visitor_idx").on(table.visitorId),
  checkoutIdx: index("store_activity_checkout_idx").on(table.checkoutId),
  createdAtIdx: index("store_activity_created_at_idx").on(table.createdAt),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type CatalogProduct = typeof catalogProducts.$inferSelect;
export type InsertCatalogProduct = typeof catalogProducts.$inferInsert;
export type StoreActivity = typeof storeActivity.$inferSelect;
export type InsertStoreActivity = typeof storeActivity.$inferInsert;

// TODO: Add your tables here