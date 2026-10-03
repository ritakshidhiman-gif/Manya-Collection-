import { boolean, index, integer, json, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const catalogProducts = pgTable("catalog_products", {
  id: varchar("id", { length: 80 }).primaryKey(),
  name: varchar("name", { length: 240 }).notNull(),
  price: integer("price").notNull(),
  fabric: varchar("fabric", { length: 120 }).notNull(),
  color: varchar("color", { length: 120 }).notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  image: text("image").notNull(),
  sizes: json("sizes").$type<string[]>().notNull(),
  description: text("description").notNull(),
  badge: varchar("badge", { length: 120 }),
  inStock: boolean("inStock").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const storeActivity = pgTable(
  "store_activity",
  {
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
    amount: integer("amount"),
    paymentId: varchar("paymentId", { length: 128 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("store_activity_visitor_idx").on(table.visitorId),
    index("store_activity_checkout_idx").on(table.checkoutId),
    index("store_activity_created_at_idx").on(table.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type CatalogProduct = typeof catalogProducts.$inferSelect;