import { initTRPC, TRPCError } from "@trpc/server";
import { getDb } from "./db.js";
import { auth } from "./auth.js";

/**
 * Create tRPC context from request headers
 */
export async function createTRPCContext(opts: { headers: Headers }) {
  const session = await auth.api.getSession({ headers: opts.headers });
  
  return {
    db: getDb(),
    user: session?.user ?? null,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * Initialize tRPC
 */
const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authenticated user
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const createCallerFactory = t.createCallerFactory;
