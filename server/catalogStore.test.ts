import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { deleteFileCatalogProduct, listFileCatalogProducts, saveFileCatalogProduct } from "./catalogStore";
import type { CatalogProduct } from "../drizzle/schema";

let testDirectory = "";

afterEach(async () => {
  if (testDirectory) await rm(testDirectory, { recursive: true, force: true });
  testDirectory = "";
});

describe("file-backed shared catalog", () => {
  it("keeps an uploaded image in the saved product after its source is gone", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "manya-catalog-"));
    const filePath = join(testDirectory, "catalog.json");
    const uploadedImage = "data:image/png;base64,cGhvdG8=";
    const product = {
      id: "manya-test-product",
      name: "Test suit",
      price: 2500,
      fabric: "Cotton",
      color: "Rose",
      category: "Festive",
      image: uploadedImage,
      sizes: ["S", "M"],
      description: "Test product",
      badge: "New arrival",
      inStock: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies CatalogProduct;

    await saveFileCatalogProduct(product, filePath);
    const savedFile = await readFile(filePath, "utf8");
    const [savedProduct] = await listFileCatalogProducts(filePath);

    expect(savedFile).toContain(uploadedImage);
    expect(savedProduct?.image).toBe(uploadedImage);
    expect(savedProduct?.sizes).toEqual(["S", "M"]);
  });

  it("updates and deletes saved products", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "manya-catalog-"));
    const filePath = join(testDirectory, "catalog.json");
    const product = {
      id: "manya-test-product",
      name: "Original suit",
      price: 2500,
      fabric: "Cotton",
      color: "Rose",
      category: "Festive",
      image: "/product.png",
      sizes: ["S"],
      description: "Test product",
      badge: null,
      inStock: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies CatalogProduct;

    await saveFileCatalogProduct(product, filePath);
    await saveFileCatalogProduct({ ...product, name: "Updated suit" }, filePath);
    expect((await listFileCatalogProducts(filePath))[0]?.name).toBe("Updated suit");

    await deleteFileCatalogProduct(product.id, filePath);
    expect(await listFileCatalogProducts(filePath)).toEqual([]);
  });
});
