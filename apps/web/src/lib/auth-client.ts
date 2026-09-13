import { createAuthClient } from "better-auth/react";

// cavetail: bound the session fetch — on a connected-but-no-route network it
// would otherwise hang until the OS TCP timeout, leaving login state pending
// (and the sync engine unstarted) for minutes instead of failing fast.
export const authClient = createAuthClient({
  fetchOptions: { timeout: 8_000 },
});
export const useSession = authClient.useSession;