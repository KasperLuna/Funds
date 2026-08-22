/**
 * Root tRPC router
 */
import { router, createCallerFactory, createTRPCContext } from "../trpc.js";
import { mutationsRouter } from "./mutations.js";

export const appRouter = router({
  applyMutations: mutationsRouter.applyMutations,
});

export type AppRouter = typeof appRouter;

/**
 * Create tRPC caller for server-side or test usage
 */
export const createCaller = (opts: { headers: Headers }) => {
  const callerFactory = createCallerFactory(appRouter);
  return callerFactory(async () => createTRPCContext(opts));
};
