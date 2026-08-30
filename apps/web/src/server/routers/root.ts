/**
 * Root tRPC router
 */
import { router, publicProcedure, createCallerFactory, createTRPCContext } from "../trpc.js";
import { mutationsRouter } from "./mutations.js";
import { getDb } from "../db.js";
import { assets } from "@funds/db/schema";

const assetsRouter = router({
  list: publicProcedure.query(async () => {
    const db = getDb();
    const rows = await db.select().from(assets).orderBy(assets.code);
    return rows.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      kind: a.kind,
      decimals: a.decimals,
      coingeckoId: a.coingeckoId,
    }));
  }),
});

export const appRouter = router({
  applyMutations: mutationsRouter.applyMutations,
  assets: assetsRouter,
});

export type AppRouter = typeof appRouter;

/**
 * Create tRPC caller for server-side or test usage
 */
export const createCaller = (opts: { headers: Headers }) => {
  const callerFactory = createCallerFactory(appRouter);
  return callerFactory(async () => createTRPCContext(opts));
};
