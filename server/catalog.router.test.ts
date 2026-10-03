import { afterEach, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { createAdminSession } from "./security";
import type { TrpcContext } from "./_core/context";

const testProduct = {
  id: `manya-router-test-${Date.now()}`,
  name: "Shared catalog test suit",
  price: 2500,
  fabric: "Cotton",
  color: "Rose",
  category: "Festive",
  image: "data:image/png;base64,cGhvdG8=",
  sizes: ["S", "M"],
  description: "Temporary test item",
  badge: "New arrival",
  inStock: true,
};

function context(cookie = ""): TrpcContext {
  return {
    user: null,
    req: { protocol: "http", headers: { cookie } } as TrpcContext["req"],
    res: { cookie: () => undefined } as TrpcContext["res"],
  };
}

afterEach(async () => {
  await appRouter.createCaller(context(`manya_admin_session=${createAdminSession("ritakshidhiman@gmail.com")}`)).catalog.delete({ id: testProduct.id });
});

describe("shared catalog API", () => {
  it("allows customers to read products and only admins to save them", async () => {
    const customer = appRouter.createCaller(context());
    const admin = appRouter.createCaller(context(`manya_admin_session=${createAdminSession("ritakshidhiman@gmail.com")}`));

    await expect(customer.catalog.save(testProduct)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await admin.catalog.save(testProduct);

    const customerProducts = await customer.catalog.list();
    expect(customerProducts.find((product) => product.id === testProduct.id)).toMatchObject({
      name: testProduct.name,
      image: testProduct.image,
      sizes: testProduct.sizes,
    });
  });
});
