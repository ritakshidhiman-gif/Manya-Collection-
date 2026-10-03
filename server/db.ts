import { desc, eq, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { CatalogProduct, InsertCatalogProduct, InsertStoreActivity, InsertUser, StoreActivity, catalogProducts, storeActivity, users } from "../drizzle/schema.ts";
import { getRoleForAccountEmail } from "../shared/admin.ts";
import { deleteFileCatalogProduct, listFileCatalogProducts, saveFileCatalogProduct } from "./catalogStore.ts";
import { appendFileStoreActivity, listFileStoreActivity } from "./activityStore.ts";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      _db = drizzle({ client: pool });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    const role = getRoleForAccountEmail(user.email);
    values.role = role;
    updateSet.role = role;
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listCatalogProducts(): Promise<CatalogProduct[]> {
  const fileProducts = await listFileCatalogProducts();
  const db = await getDb();
  if (!db && process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required for the shared production catalog.");
  }
  let databaseProducts: CatalogProduct[] = [];
  if (db) {
    try {
      databaseProducts = await db.select().from(catalogProducts).orderBy(desc(catalogProducts.createdAt));
    } catch (error) {
      if (process.env.NODE_ENV === "production") throw error;
      console.warn("[Catalog] Database unavailable; serving persisted file catalog.");
    }
  }
  const productsById = new Map(databaseProducts.map((product) => [product.id, product]));
  fileProducts.forEach((product) => productsById.set(product.id, product));
  return Array.from(productsById.values()).sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime());
}

export async function saveCatalogProduct(product: InsertCatalogProduct): Promise<void> {
  const db = await getDb();
  if (!db && process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required to publish products in production.");
  }
  const now = new Date();
  const persistentProduct = {
    ...product,
    badge: product.badge ?? null,
    createdAt: now,
    updatedAt: now,
  } as CatalogProduct;
  await saveFileCatalogProduct(persistentProduct);
  if (db) {
    try {
      const { id, ...updates } = persistentProduct;
      await db.insert(catalogProducts).values(persistentProduct).onConflictDoUpdate({
        target: catalogProducts.id,
        set: updates,
      });
    } catch (error) {
      if (process.env.NODE_ENV === "production") throw error;
      console.warn("[Catalog] Database unavailable; product saved to persistent file catalog.");
    }
  }
}

export async function deleteCatalogProduct(id: string): Promise<void> {
  const db = await getDb();
  if (!db && process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required to delete production catalog products.");
  }
  await deleteFileCatalogProduct(id);
  if (db) {
    try {
      await db.delete(catalogProducts).where(eq(catalogProducts.id, id));
    } catch (error) {
      if (process.env.NODE_ENV === "production") throw error;
      console.warn("[Catalog] Database unavailable; product deleted from persistent file catalog.");
    }
  }
}