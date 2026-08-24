"use client";

import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc/client";
import { queryKeys } from "@/lib/sync/sync-query";

export type Asset = {
  id: string;
  code: string;
  name: string;
  kind: string;
  decimals: number;
};

export function useAssets(): { assets: Asset[]; loading: boolean } {
  const { data, isPending } = useQuery({
    queryKey: queryKeys.assets,
    queryFn: () => trpc.assets.list.query(),
    staleTime: Infinity,
    // cavetail: jsdom/node test environments lack fetch/AbortSignal; skip and
    // let consumers fall back to the empty list.
    enabled: typeof globalThis.fetch === "function",
  });
  return { assets: data ?? [], loading: isPending };
}
