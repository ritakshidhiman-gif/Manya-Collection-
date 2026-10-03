import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { appendFileStoreActivity, listFileStoreActivity } from "./activityStore";

let testDirectory = "";

afterEach(async () => {
  if (testDirectory) await rm(testDirectory, { recursive: true, force: true });
  testDirectory = "";
});

describe("file-backed store activity", () => {
  it("persists customer activity and excludes anonymous visits", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "manya-activity-"));
    const filePath = join(testDirectory, "activity.json");
    const shared = {
      visitorId: "5a3d7d85-a8b2-4ae7-88bb-6d5327a577e9",
      checkoutId: null,
      path: "/",
      customerName: null,
      customerEmail: null,
      customerPhone: null,
      amount: null,
      paymentId: null,
    };

    await appendFileStoreActivity({ ...shared, id: "5a3d7d85-a8b2-4ae7-88bb-6d5327a577e1", eventType: "visit" }, filePath);
    await appendFileStoreActivity({ ...shared, id: "5a3d7d85-a8b2-4ae7-88bb-6d5327a577e4", eventType: "customer_login", customerEmail: "customer@example.com" }, filePath);
    await appendFileStoreActivity({ ...shared, id: "5a3d7d85-a8b2-4ae7-88bb-6d5327a577e2", eventType: "checkout_started", checkoutId: "5a3d7d85-a8b2-4ae7-88bb-6d5327a577e3", amount: 4200 }, filePath);

    const events = await listFileStoreActivity(filePath);
    expect(events).toHaveLength(2);
    expect(events.find((event) => event.eventType === "checkout_started")).toMatchObject({ amount: 4200 });
    expect(events.find((event) => event.eventType === "customer_login")?.createdAt).toBeInstanceOf(Date);
    expect(events.some((event) => event.eventType === "visit")).toBe(false);
  });
});