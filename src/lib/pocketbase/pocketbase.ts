import PocketBase, { AsyncAuthStore } from "pocketbase";
import { getLocalStorage, setLocalStorage } from "../utils";

const store = new AsyncAuthStore({
  save: async (serialized) => setLocalStorage("pb_auth", serialized, 720),
  initial:
    typeof window !== "undefined"
      ? getLocalStorage("pb_auth") ?? ""
      : undefined,
});

export const pb = new PocketBase(
  process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "",
  store
);
