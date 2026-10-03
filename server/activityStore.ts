import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { InsertStoreActivity, StoreActivity } from "../drizzle/schema";

type NewStoreActivity = Omit<InsertStoreActivity, "createdAt">;
type StoredStoreActivity = Omit<StoreActivity, "createdAt"> & { createdAt?: string | Date };

const ACTIVITY_FILE = join(process.cwd(), ".data", "store-activity.json");
let updateQueue = Promise.resolve();

async function readFileActivity(filePath: string): Promise<StoredStoreActivity[]> {
  try {
    const content = await readFile(filePath, "utf8");
    const events = JSON.parse(content) as StoredStoreActivity[];
    return Array.isArray(events) ? events : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function withDate(event: StoredStoreActivity): StoreActivity {
  return { ...event, createdAt: event.createdAt ? new Date(event.createdAt) : new Date(0) };
}

export async function appendFileStoreActivity(event: NewStoreActivity, filePath = ACTIVITY_FILE): Promise<void> {
  const operation = updateQueue.then(async () => {
    const events = await readFileActivity(filePath);
    events.push({
      id: event.id,
      visitorId: event.visitorId,
      checkoutId: event.checkoutId ?? null,
      eventType: event.eventType,
      path: event.path,
      customerName: event.customerName ?? null,
      customerEmail: event.customerEmail ?? null,
      customerPhone: event.customerPhone ?? null,
      deliveryAddress: event.deliveryAddress ?? null,
      paymentMethod: event.paymentMethod ?? null,
      amount: event.amount ?? null,
      paymentId: event.paymentId ?? null,
      createdAt: new Date().toISOString(),
    });
    if (events.length > 5000) events.splice(0, events.length - 5000);
    await mkdir(dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.tmp`;
    await writeFile(tempPath, JSON.stringify(events), "utf8");
    await rename(tempPath, filePath);
  });
  updateQueue = operation.catch(() => undefined);
  await operation;
}

export async function listFileStoreActivity(filePath = ACTIVITY_FILE): Promise<StoreActivity[]> {
  return (await readFileActivity(filePath))
    .filter((event) => event.eventType !== "visit")
    .map(withDate)
    .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
    .slice(0, 500);
}