export async function recordStoreActivity(event: Omit<InsertStoreActivity, "createdAt">): Promise<void> {
  const db = await getDb();
  if (!db && process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required to store production activity.");
  }
  if (db) {
    try {
      await db.insert(storeActivity).values(event);
      return;
    } catch (error) {
      if (process.env.NODE_ENV === "production") throw error;
      console.warn("[Activity] Database unavailable; recording event to local file.");
    }
  }
  await appendFileStoreActivity(event);
}

export async function listStoreActivity(): Promise<StoreActivity[]> {
  const db = await getDb();
  if (!db && process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required to read production activity.");
  }
  if (db) {
    try {
      return await db.select().from(storeActivity).where(ne(storeActivity.eventType, "visit")).orderBy(desc(storeActivity.createdAt)).limit(500);
    } catch (error) {
      if (process.env.NODE_ENV === "production") throw error;
      console.warn("[Activity] Database unavailable; serving local activity file.");
    }
  }
  return listFileStoreActivity();
}