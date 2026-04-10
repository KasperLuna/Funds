import PocketBase from "pocketbase";

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "http://localhost:8090";

/**
 * Singleton PocketBase client instance.
 * Uses NEXT_PUBLIC_POCKETBASE_URL env var, defaults to http://localhost:8090.
 */
const pb = new PocketBase(POCKETBASE_URL);

// Disable auto-cancellation so concurrent requests don't cancel each other
pb.autoCancellation(false);

export default pb;
