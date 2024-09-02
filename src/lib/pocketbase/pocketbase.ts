import PocketBase, { AsyncAuthStore } from "pocketbase";
import { getCookie, setCookie } from "../utils";

const store = new AsyncAuthStore({
  save: async (serialized) => setCookie("pb_auth", serialized, 720),
  initial:
    typeof window !== "undefined" ? getCookie("pb_auth") ?? "" : undefined,
});

export const pb = new PocketBase(
  process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "",
  store
);
