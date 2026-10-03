import express, { type Express } from "express";
import { resolve } from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth.ts";
import { registerStorageProxy } from "./storageProxy.ts";
import { appRouter } from "../routers.ts";
import { createContext } from "./context.ts";

export function configureApp(app: Express) {
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  if (process.env.NODE_ENV !== "development") {
    app.use(express.static(resolve(process.cwd(), "public")));
  }
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  if (process.env.NODE_ENV !== "development") {
    const clientIndex = resolve(process.cwd(), "public/index.html");
    app.get(["/", "/account", "/admin/products/add", "/admin/activity", "/404"], (_req, res) => {
      res.sendFile(clientIndex);
    });
  }
  return app;
}