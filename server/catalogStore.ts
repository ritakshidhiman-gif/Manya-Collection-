import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CatalogProduct } from "../drizzle/schema";

type StoredCatalogProduct = Omit<CatalogProduct, "createdAt" | "updatedAt"> & {
  createdAt?: string;
  updatedAt?: string;
};

const CATALOG_FILE = join(process.cwd(), ".data", "catalog-products.json");
let updateQueue = Promise.resolve();

async function readFileProducts(filePath: string): Promise<StoredCatalogProduct[]> {
  try {
    const content = await readFile(filePath, "utf8");
    const products = JSON.parse(content) as StoredCatalogProduct[];
    return Array.isArray(products) ? products : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function withDates(product: StoredCatalogProduct): CatalogProduct {
  return {
    ...product,
    createdAt: product.createdAt ? new Date(product.createdAt) : new Date(0),
    updatedAt: product.updatedAt ? new Date(product.updatedAt) : new Date(0),
  };
}

async function updateFileProducts(
  update: (products: StoredCatalogProduct[]) => StoredCatalogProduct[],
  filePath = CATALOG_FILE,
): Promise<void> {
  const operation = updateQueue.then(async () => {
    const products = update(await readFileProducts(filePath));
    await mkdir(dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.tmp`;
    await writeFile(tempPath, JSON.stringify(products), "utf8");
    await rename(tempPath, filePath);
  });
  updateQueue = operation.catch(() => undefined);
  await operation;
}

export async function listFileCatalogProducts(filePath = CATALOG_FILE): Promise<CatalogProduct[]> {
  return (await readFileProducts(filePath)).map(withDates);
}

export async function saveFileCatalogProduct(product: CatalogProduct, filePath = CATALOG_FILE): Promise<void> {
  await updateFileProducts((products) => {
    const existingIndex = products.findIndex((item) => item.id === product.id);
    const stored: StoredCatalogProduct = {
      ...product,
      createdAt: existingIndex >= 0 ? products[existingIndex]?.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (existingIndex >= 0) products[existingIndex] = stored;
    else products.unshift(stored);
    return products;
  }, filePath);
}

export async function deleteFileCatalogProduct(id: string, filePath = CATALOG_FILE): Promise<void> {
  await updateFileProducts((products) => products.filter((product) => product.id !== id), filePath);
}
