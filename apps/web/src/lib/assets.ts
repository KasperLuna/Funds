"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";

export type Asset = {
  id: string;
  code: string;
  name: string;
  kind: string;
  decimals: number;
};

let cached: Asset[] | null = null;
let inflight: Promise<Asset[]> | null = null;

/** Fetch supported assets once (global, not per-user). */
export function loadAssets(): Promise<Asset[]> {
  if (cached) return Promise.resolve(cached);
  const run = () => trpc.assets.list.query();
  // jsdom/node test environments lack fetch/AbortSignal; degrade to empty.
  if (typeof globalThis.fetch !== "function") return Promise.resolve([]);
  inflight ??= run().then((rows) => {
    cached = rows;
    inflight = null;
    return rows;
  });
  return inflight;
}

export function useAssets(): { assets: Asset[]; loading: boolean } {
  const [assets, setAssets] = useState<Asset[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);

  useEffect(() => {
    let cancelled = false;
    loadAssets()
      .catch(() => [])
      .then((rows) => {
        if (!cancelled) {
          setAssets(rows);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  return { assets, loading };
}
