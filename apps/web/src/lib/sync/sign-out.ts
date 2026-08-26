import { authClient } from "@/lib/auth-client";
import { wipeLocalStore } from "./store.js";

/**
 * cavetail: the wipe must not depend on the reactive 401 path — an OFFLINE
 * sign-out produces no 401, so the click handler destroys the local store
 * explicitly. Unsynchronized outbox work is intentionally lost: nothing
 * account-attached may survive logout on a shared device.
 */
export async function signOutAndWipe(): Promise<void> {
  await authClient.signOut().catch(() => {});
  await wipeLocalStore();
}
