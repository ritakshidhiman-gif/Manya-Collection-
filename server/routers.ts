import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { deleteCatalogProduct, listCatalogProducts, listStoreActivity, recordStoreActivity, saveCatalogProduct } from "./db";
import { ADMIN_COOKIE_NAME, ADMIN_SESSION_MAX_AGE_MS, createAdminSession, readAdminSession, verifyAdminCredentials } from "./security";
import { isAllowedAdminEmail } from "../shared/admin";

const catalogProductInput = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(240),
  price: z.number().int().positive().max(2_000_000_000),
  fabric: z.string().max(120),
  color: z.string().max(120),
  category: z.string().max(120),
  image: z.string().min(1).max(35_000_000),
  sizes: z.array(z.string().min(1).max(12)).min(1).max(12),
  description: z.string().max(6000),
  badge: z.string().max(120).nullable().optional(),
  inStock: z.boolean(),
});

const storeActivityInput = z.object({
  id: z.string().uuid(),
  visitorId: z.string().uuid(),
  checkoutId: z.string().uuid().nullable().optional(),
  eventType: z.enum(["customer_login", "checkout_started", "checkout_details_entered", "cod_order_requested", "payment_succeeded", "payment_failed", "payment_cancelled"]),
  path: z.string().max(255),
  customerName: z.string().max(240).nullable().optional(),
  customerEmail: z.string().email().max(320).nullable().optional(),
  customerPhone: z.string().max(32).nullable().optional(),
  deliveryAddress: z.string().max(1500).nullable().optional(),
  paymentMethod: z.enum(["online", "cod"]).nullable().optional(),
  amount: z.number().int().nonnegative().nullable().optional(),
  paymentId: z.string().max(128).nullable().optional(),
});

function requireAdmin(ctx: any) {
  const cookies = parseCookieHeader(ctx.req.headers.cookie ?? "");
  const email = readAdminSession(cookies[ADMIN_COOKIE_NAME]);
  if (!email || !isAllowedAdminEmail(email)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin access required." });
  }
  return email;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }: { ctx: any }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }: { ctx: any }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  admin: router({
    login: publicProcedure.input(z.object({
      email: z.string().max(320),
      phone: z.string().min(8).max(32),
      passphrase: z.string().max(1024),
      pin: z.string().max(64),
    })).mutation(({ ctx, input }: { ctx: any; input: { email: string; phone: string; passphrase: string; pin: string } }) => {
      const email = input.email.trim().toLowerCase();
      if (!verifyAdminCredentials(input)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Credentials not accepted." });
      }

      const token = createAdminSession(email);
      ctx.res.cookie(ADMIN_COOKIE_NAME, token, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: ADMIN_SESSION_MAX_AGE_MS,
      });
      return { success: true } as const;
    }),
    me: publicProcedure.query(({ ctx }: { ctx: any }) => {
      const cookies = parseCookieHeader(ctx.req.headers.cookie ?? "");
      const email = readAdminSession(cookies[ADMIN_COOKIE_NAME]);
      return { isAdmin: Boolean(email), email };
    }),
    logout: publicProcedure.mutation(({ ctx }: { ctx: any }) => {
      ctx.res.clearCookie(ADMIN_COOKIE_NAME, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: 0,
      });
      return { success: true } as const;
    }),
  }),
  catalog: router({
    list: publicProcedure.query(async () => {
      const products = await listCatalogProducts();
      return products.map(({ createdAt, updatedAt, ...product }) => product);
    }),
    save: publicProcedure.input(catalogProductInput).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      await saveCatalogProduct(input);
      return { success: true } as const;
    }),
    delete: publicProcedure.input(z.object({ id: z.string().min(1).max(80) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      await deleteCatalogProduct(input.id);
      return { success: true } as const;
    }),
  }),
  activity: router({
    track: publicProcedure.input(storeActivityInput).mutation(async ({ input }) => {
      const { id, ...event } = input;
      await recordStoreActivity({
        id,
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
      });
      return { success: true } as const;
    }),
    recent: publicProcedure.query(({ ctx }) => {
      requireAdmin(ctx);
      return listStoreActivity();
    }),
  }),
});

export type AppRouter = typeof appRouter;