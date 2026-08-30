"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { queryKeys, useSyncMutation } from "@/lib/sync/sync-query";
import { useSync } from "@/lib/sync/sync-context";
import { useAssets, type Asset } from "@/lib/assets";
import type { Token } from "@/lib/crypto/crypto-store";

interface TokenAddSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userId: string;
  existingTokens: Token[];
}

interface TokenAddFormProps {
  onOpenChange: (isOpen: boolean) => void;
  userId: string;
  availableAssets: Asset[];
}

const TokenAddForm = (props: TokenAddFormProps) => {
  const { onOpenChange, userId, availableAssets } = props;
  const { db } = useSync();
  const [selectedId, setSelectedId] = useState<string>(
    availableAssets[0]?.id ?? "",
  );

  const addMutation = useSyncMutation<Asset>({
    keys: [queryKeys.tokens],
    mutationFn: async (asset: Asset) => {
      const now = Date.now();
      await db.table("tokens").upsert({
        id: `tok-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        user_id: userId,
        symbol: asset.code,
        name: asset.name,
        coingecko_id: asset.coingeckoId,
        decimals: asset.decimals,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
    },
  });

  const handleConfirm = () => {
    const asset = availableAssets.find((a) => a.id === selectedId);
    if (!asset) return;
    addMutation.mutate(asset, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-4 p-0">
        <div className="shrink-0 px-6 pt-6">
          <SheetTitle>Add token</SheetTitle>
          <SheetDescription>
            Pick a coin to start tracking
          </SheetDescription>
        </div>
        <div className="flex flex-col gap-4 px-6 pb-6">
          {availableAssets.length === 0 ? (
            <p className="rounded-(--radius-md) border border-(--border-strong) bg-(--surface-2) px-3 py-2 text-xs text-zinc-500">
              All cataloged crypto assets are already added.
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
              {availableAssets.map((asset) => {
                const isSelected = asset.id === selectedId;
                return (
                  <li key={asset.id}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedId(asset.id)}
                      className={
                        "flex w-full items-center justify-between rounded-(--radius-md) border px-3 py-2 text-left text-sm transition-colors " +
                        (isSelected
                          ? "border-(--accent) bg-(--surface-2) text-foreground"
                          : "border-(--border-strong) text-zinc-300 hover:bg-(--surface-2)")
                      }
                    >
                      <span className="font-medium">{asset.name}</span>
                      <span className="text-xs text-zinc-500">{asset.code}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <Button
            size="lg"
            className="w-full"
            disabled={!selectedId || addMutation.isPending}
            onClick={handleConfirm}
          >
            {addMutation.isPending ? "Adding…" : "Add token"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export const TokenAddSheet = (props: TokenAddSheetProps) => {
  const { isOpen, onOpenChange, userId, existingTokens } = props;
  const { assets } = useAssets();
  const availableAssets = useMemo(() => {
    const heldSymbols = new Set(
      existingTokens
        .filter((t) => !t.deletedAt)
        .map((t) => t.symbol.toUpperCase()),
    );
    return assets
      .filter((a) => a.kind === "crypto")
      .filter((a) => !heldSymbols.has(a.code.toUpperCase()));
  }, [assets, existingTokens]);

  if (!isOpen) return null;
  return (
    <TokenAddForm
      onOpenChange={onOpenChange}
      userId={userId}
      availableAssets={availableAssets}
    />
  );
};

export const TokenAddTrigger = (props: { onClick: () => void }) => (
  <Button size="sm" variant="outline" onClick={props.onClick}>
    <Plus className="h-4 w-4" />
    Add token
  </Button>
);
