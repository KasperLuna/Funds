/**
 * tRPC client for browser usage
 */
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/server/routers/root";

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
    }),
  ],
});
