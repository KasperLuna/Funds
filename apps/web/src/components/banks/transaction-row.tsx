"use client";

import { useCallback, useRef, useState } from "react";
import { Copy, Pencil, Trash2, Tag } from "lucide-react";
import type { Txn } from "@/lib/accounts/accounts-store";
import { formatMoney } from "@/lib/money";

type CategoryInfo = { id: string; name: string; color: string };

type SwipeToast = {
  message: string;
  onUndo?: () => void;
};

const SWIPE_THRESHOLD = 80;
const UNDO_WINDOW_MS = 5000;

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TransactionRow({
  txn,
  categories,
  accountName,
  assetCode,
  assetDecimals,
  onEdit,
  onDuplicate,
  onDelete,
  onUndoDelete,
}: {
  txn: Txn;
  categories: CategoryInfo[];
  accountName?: string;
  assetCode?: string;
  assetDecimals?: number;
  onEdit?: (txn: Txn) => void;
  onDuplicate?: (txn: Txn) => void;
  onDelete?: (txn: Txn) => void;
  onUndoDelete?: (txn: Txn) => void;
}) {
  const cats = txn.categoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter(Boolean) as CategoryInfo[];

  const isExpense = txn.amountMinor < 0n;
  const decimals = assetDecimals ?? 2;

  const [offsetX, setOffsetX] = useState(0);
  const [toast, setToast] = useState<SwipeToast | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);
  const isHorizontal = useRef<boolean | null>(null);

  const clearToast = useCallback(() => setToast(null), []);

  const runDuplicate = useCallback(() => {
    if (!onDuplicate) return;
    onDuplicate(txn);
    setToast({ message: "Transaction duplicated", onUndo: undefined });
    setTimeout(clearToast, UNDO_WINDOW_MS);
  }, [txn, onDuplicate, clearToast]);

  const runDelete = useCallback(() => {
    if (!onDelete) return;
    onDelete(txn);
    setToast({
      message: "Transaction deleted",
      onUndo: () => {
        if (onUndoDelete) onUndoDelete(txn);
        else onDuplicate?.(txn);
        clearToast();
      },
    });
    setTimeout(clearToast, UNDO_WINDOW_MS);
  }, [txn, onDelete, onUndoDelete, onDuplicate, clearToast]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (toast) return;
      const touch = e.touches[0];
      if (!touch) return;
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      swiping.current = true;
      isHorizontal.current = null;
    },
    [toast],
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping.current) return;
    const touch = e.touches[0];
    if (!touch) return;

    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;

    if (isHorizontal.current === null) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy);
    }

    if (!isHorizontal.current) {
      swiping.current = false;
      return;
    }

    e.preventDefault();
    setOffsetX(dx);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!swiping.current) return;
    swiping.current = false;

    if (Math.abs(offsetX) >= SWIPE_THRESHOLD) {
      if (offsetX > 0) runDuplicate();
      else runDelete();
    }
    setOffsetX(0);
  }, [offsetX, runDuplicate, runDelete]);

  const handleTouchCancel = useCallback(() => {
    swiping.current = false;
    setOffsetX(0);
  }, []);

  return (
    <div className="relative overflow-hidden">
      {offsetX > 0 && (
        <div
          className="absolute inset-y-0 left-0 flex items-center bg-(--accent)/15 px-4"
          style={{ width: Math.min(offsetX, 120) }}
        >
          <span className="text-xs font-semibold text-(--accent)">Duplicate</span>
        </div>
      )}
      {offsetX < 0 && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end bg-(--danger)/15 px-4"
          style={{ width: Math.min(Math.abs(offsetX), 120) }}
        >
          <span className="text-xs font-semibold text-(--danger)">Delete</span>
        </div>
      )}

      <div
        className="relative flex items-center justify-between bg-(--surface-1) px-4 py-3 touch-pan-y transition-colors lg:hover:bg-(--surface-3)/40"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onClick={() => onEdit?.(txn)}
        role={onEdit ? "button" : undefined}
        tabIndex={onEdit ? 0 : undefined}
        onKeyDown={(e) => {
          if (onEdit && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onEdit(txn);
          }
        }}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {txn.description || "No description"}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {accountName && (
              <span className="truncate text-[11px] text-zinc-500">{accountName}</span>
            )}
            {cats.length > 0 ? (
              cats.map((cat, i) => (
                <span
                  key={`${cat.name}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ backgroundColor: cat.color, color: "#fff" }}
                >
                  <Tag className="h-2.5 w-2.5" aria-hidden />
                  {cat.name}
                </span>
              ))
            ) : (
              <span className="inline-flex items-center text-[11px] text-zinc-600">
                Uncategorized
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(txn);
                    }}
                    className="ml-1.5 rounded-sm border border-(--border-strong) px-1.5 py-px font-medium text-(--accent) hover:bg-(--surface-3)"
                  >
                    Add category
                  </button>
                )}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden items-center gap-1 lg:flex">
            {onEdit && (
              <button
                type="button"
                aria-label="Edit transaction"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(txn);
                }}
                className="rounded-(--radius-sm) p-1.5 text-zinc-500 transition-colors hover:bg-(--surface-3) hover:text-inherit"
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </button>
            )}
            {onDuplicate && (
              <button
                type="button"
                aria-label="Duplicate transaction"
                onClick={(e) => {
                  e.stopPropagation();
                  runDuplicate();
                }}
                className="rounded-(--radius-sm) p-1.5 text-zinc-500 transition-colors hover:bg-(--surface-3) hover:text-inherit"
              >
                <Copy className="h-4 w-4" aria-hidden />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                aria-label="Delete transaction"
                onClick={(e) => {
                  e.stopPropagation();
                  runDelete();
                }}
                className="rounded-(--radius-sm) p-1.5 text-zinc-500 transition-colors hover:bg-(--surface-3) hover:text-(--danger)"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
          <div className="text-right">
            <span className="text-[11px] tabular-nums text-zinc-500">{formatTime(txn.date)}</span>
            <span
              className={`block text-sm font-semibold tabular-nums ${isExpense ? "text-(--danger)" : "text-(--accent)"}`}
            >
              {formatMoney(txn.amountMinor, decimals, assetCode)}
            </span>
          </div>
        </div>
      </div>

      {toast && (
        <div className="absolute bottom-2 left-1/2 z-50 -translate-x-1/2 rounded-md bg-(--surface-3) px-4 py-2 text-sm text-zinc-100 ring-1 ring-(--border-strong)">
          {toast.message}
          {toast.onUndo && (
            <button
              onClick={toast.onUndo}
              className="ml-2 font-semibold text-(--accent) hover:underline"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
