"use client";
import React, { useState, useCallback, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCoinGeckoSearch,
  CoinGeckoSearchCoin,
} from "@/lib/hooks/useCoinGeckoSearch";
import { useTokenTransactionsQuery } from "@/lib/hooks/useTokenTransactionsQuery";
import { Token } from "@/lib/types";
import {
  addToken,
  addTokenTransaction,
  deleteTokenById,
  deleteTokenTransaction,
  recalculateTokenTotals,
} from "@/lib/pocketbase/queries";
import { useAuth } from "@/lib/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, ArrowLeft, Search, Loader2 } from "lucide-react";
import Image from "next/image";
import dayjs from "dayjs";
import { Decimal } from "decimal.js";
import { useTokensContext } from "@/lib/hooks/useTokensContext";

type DialogView = "list" | "search" | "detail" | "addTxn";

interface TokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TokenDialog({ open, onOpenChange }: TokenDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { tokenData } = useTokensContext();
  const tokens = useMemo(() => tokenData?.tokens || [], [tokenData?.tokens]);

  const [view, setView] = useState<DialogView>("list");
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [confirmDeleteToken, setConfirmDeleteToken] = useState(false);

  const txnForm = useForm<{
    type: "buy" | "sell";
    amount: string;
    price: string;
    date: string;
    note: string;
  }>({
    defaultValues: {
      type: "buy",
      amount: "",
      price: "",
      date: dayjs().format("YYYY-MM-DD"),
      note: "",
    },
  });
  const [watchedAmount, watchedPrice] = txnForm.watch(["amount", "price"]);

  const { data: searchResults, isLoading: searching } =
    useCoinGeckoSearch(searchQuery);
  const { transactions: tokenTxns, loading: txnsLoading } =
    useTokenTransactionsQuery(selectedToken?.id || null);

  const resetTxnForm = useCallback(() => {
    txnForm.reset();
  }, [txnForm]);

  const handleSelectCoinGecko = useCallback(
    async (coin: CoinGeckoSearchCoin) => {
      if (!user?.id) return;
      // Check if token already exists
      const existing = tokens.find((t) => t.coingecko_id === coin.id);
      if (existing) {
        setSelectedToken(existing);
        setView("detail");
        setSearchQuery("");
        return;
      }
      // Create new token
      setIsAddingToken(true);
      try {
        await addToken({
          name: coin.name,
          symbol: coin.symbol.toUpperCase(),
          coingecko_id: coin.id,
          total: 0,
          costAvg: 0,
        });
        await queryClient.invalidateQueries({ queryKey: ["tokens"] });
        // Wait for the token to appear in the cache
        const updatedTokens = await queryClient.fetchQuery<Token[]>({
          queryKey: ["tokens", user.id],
        });
        const newToken = updatedTokens?.find((t) => t.coingecko_id === coin.id);
        if (newToken) {
          setSelectedToken(newToken);
          setView("addTxn");
        } else {
          setView("list");
        }
        setSearchQuery("");
      } catch (e) {
        alert("Failed to add token");
      } finally {
        setIsAddingToken(false);
      }
    },
    [user, tokens, queryClient],
  );

  const handleAddTransaction = txnForm.handleSubmit(
    async ({ type, amount, price, date, note }) => {
      if (!selectedToken?.id || !user?.id) return;
      const amountNum = Number.parseFloat(amount);
      const priceNum = Number.parseFloat(price);
      if (
        Number.isNaN(amountNum) ||
        amountNum <= 0 ||
        Number.isNaN(priceNum) ||
        priceNum < 0
      )
        return;
      try {
        await addTokenTransaction({
          user: user.id,
          token: selectedToken.id,
          type,
          amount: amountNum,
          price: priceNum,
          total_cost: new Decimal(amountNum)
            .mul(new Decimal(priceNum))
            .toNumber(),
          date: new Date(date).toISOString(),
          note: note || undefined,
        });
        await recalculateTokenTotals(selectedToken.id);
        queryClient.invalidateQueries({ queryKey: ["tokens"] });
        queryClient.invalidateQueries({
          queryKey: ["tokenTransactions", selectedToken.id],
        });
        txnForm.reset();
        setView("detail");
      } catch {
        alert("Failed to add transaction");
      }
    },
  );

  const handleDeleteTokenTxn = useCallback(
    async (txnId: string) => {
      if (!selectedToken?.id) return;
      try {
        await deleteTokenTransaction(txnId);
        await recalculateTokenTotals(selectedToken.id);
        queryClient.invalidateQueries({ queryKey: ["tokens"] });
        queryClient.invalidateQueries({
          queryKey: ["tokenTransactions", selectedToken.id],
        });
      } catch {
        alert("Failed to delete transaction");
      }
    },
    [selectedToken, queryClient],
  );

  const handleDeleteToken = useCallback(async () => {
    if (!selectedToken?.id) return;
    try {
      await deleteTokenById(selectedToken.id);
      queryClient.invalidateQueries({ queryKey: ["tokens"] });
      setSelectedToken(null);
      setConfirmDeleteToken(false);
      setView("list");
    } catch {
      alert("Failed to delete token. Delete its transactions first.");
    }
  }, [selectedToken, queryClient]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setView("list");
        setSelectedToken(null);
        setSearchQuery("");
        resetTxnForm();
        setConfirmDeleteToken(false);
      }
      onOpenChange(open);
    },
    [onOpenChange, resetTxnForm],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-slate-900 text-white border-2 border-slate-800 px-4 py-4 rounded-md max-h-[90vh] overflow-y-auto max-w-lg">
        {view === "list" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-slate-100">
                Manage Tokens
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Your crypto token holdings. Add new tokens or manage existing
                ones.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="border-slate-600 hover:bg-slate-700 gap-2"
                onClick={() => setView("search")}
              >
                <Plus className="w-4 h-4" />
                Add Token
              </Button>
              {tokens.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  No tokens yet. Add one to get started.
                </p>
              )}
              {tokens.map((token) => (
                <button
                  key={token.id}
                  onClick={() => {
                    setSelectedToken(token);
                    setView("detail");
                  }}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 transition-colors text-left"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-100">
                      {token.name}
                    </span>
                    <span className="text-xs text-slate-400 uppercase">
                      {token.symbol}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-slate-200">
                      {token.total}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {view === "search" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView("list")}
                  className="p-1 hover:bg-slate-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <DialogTitle className="text-slate-100">
                  Search Token
                </DialogTitle>
              </div>
              <DialogDescription className="text-slate-400">
                Search CoinGecko for a cryptocurrency to add.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or symbol..."
                  className="bg-slate-800 border-slate-700 text-slate-100 pl-9"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
                {searching && (
                  <div className="flex items-center justify-center py-4 gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching...
                  </div>
                )}
                {!searching &&
                  searchQuery.length >= 2 &&
                  searchResults?.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No results found.
                    </p>
                  )}
                {searchResults?.map((coin) => {
                  const alreadyAdded = tokens.some(
                    (t) => t.coingecko_id === coin.id,
                  );
                  return (
                    <button
                      key={coin.id}
                      onClick={() => handleSelectCoinGecko(coin)}
                      disabled={submitting}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/60 transition-colors text-left disabled:opacity-50"
                    >
                      <Image
                        src={coin.thumb}
                        alt={coin.name}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full"
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm text-slate-100 truncate">
                          {coin.name}
                        </span>
                        <span className="text-xs text-slate-400 uppercase">
                          {coin.symbol}
                        </span>
                      </div>
                      {coin.market_cap_rank && (
                        <span className="text-xs text-slate-500">
                          #{coin.market_cap_rank}
                        </span>
                      )}
                      {alreadyAdded && (
                        <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                          Added
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {view === "detail" && selectedToken && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedToken(null);
                    setConfirmDeleteToken(false);
                    setView("list");
                  }}
                  className="p-1 hover:bg-slate-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <DialogTitle className="text-slate-100">
                  {selectedToken.name}{" "}
                  <span className="text-slate-400 text-sm uppercase">
                    {selectedToken.symbol}
                  </span>
                </DialogTitle>
              </div>
              <DialogDescription className="text-slate-400">
                Holdings: {selectedToken.total} · Avg Cost:{" "}
                {selectedToken.costAvg
                  ? `$${Number(selectedToken.costAvg).toFixed(2)}`
                  : "N/A"}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="border-slate-600 hover:bg-slate-700 gap-2"
                onClick={() => {
                  resetTxnForm();
                  setView("addTxn");
                }}
              >
                <Plus className="w-4 h-4" />
                Add Transaction
              </Button>

              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-medium text-slate-300">
                  Transaction History
                </h4>
                {txnsLoading && (
                  <div className="flex items-center justify-center py-4 gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </div>
                )}
                {!txnsLoading && tokenTxns.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-3">
                    No transactions yet.
                  </p>
                )}
                {tokenTxns.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-700/30"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                            txn.type === "buy"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {txn.type.toUpperCase()}
                        </span>
                        <span className="text-sm text-slate-200 font-mono">
                          {txn.amount} @ ${txn.price}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{dayjs(txn.date).format("MMM D, YYYY")}</span>
                        {txn.note && (
                          <span className="truncate max-w-[150px]">
                            · {txn.note}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-slate-300">
                        ${txn.total_cost.toFixed(2)}
                      </span>
                      <button
                        onClick={() => txn.id && handleDeleteTokenTxn(txn.id)}
                        className="p-1 rounded hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-700 pt-3">
                {confirmDeleteToken ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-400">
                      Delete {selectedToken.name} and all its transactions?
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteToken}
                      className="bg-red-700 hover:bg-red-600"
                    >
                      Yes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDeleteToken(false)}
                      className="border-slate-600 hover:bg-slate-700"
                    >
                      No
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDeleteToken(true)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/30 gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete token
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {view === "addTxn" && selectedToken && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView("detail")}
                  className="p-1 hover:bg-slate-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <DialogTitle className="text-slate-100">
                  Add Transaction — {selectedToken.name}
                </DialogTitle>
              </div>
              <DialogDescription className="text-slate-400">
                Record a buy or sell for this token.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label>Type</Label>
                <Controller
                  name="type"
                  control={txnForm.control}
                  render={({ field: { value, onChange } }) => (
                    <Tabs
                      value={value}
                      onValueChange={(v) => onChange(v as "buy" | "sell")}
                      className="w-full"
                    >
                      <TabsList className="bg-slate-800 w-full">
                        <TabsTrigger
                          className="w-full data-[state=active]:bg-emerald-800 data-[state=active]:text-slate-200"
                          value="buy"
                        >
                          Buy
                        </TabsTrigger>
                        <TabsTrigger
                          className="w-full data-[state=active]:bg-red-800 data-[state=active]:text-slate-200"
                          value="sell"
                        >
                          Sell
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  )}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="txn-amount">
                  Amount ({selectedToken.symbol})
                </Label>
                <Input
                  id="txn-amount"
                  type="number"
                  step="any"
                  min="0"
                  {...txnForm.register("amount")}
                  placeholder="0.00"
                  className="bg-slate-800 border-slate-700 text-slate-100"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="txn-price">Price per token (USD)</Label>
                <Input
                  id="txn-price"
                  type="number"
                  step="any"
                  min="0"
                  {...txnForm.register("price")}
                  placeholder="0.00"
                  className="bg-slate-800 border-slate-700 text-slate-100"
                />
              </div>
              {watchedAmount && watchedPrice && (
                <div className="text-sm text-slate-400">
                  Total cost:{" "}
                  <span className="text-slate-200 font-mono">
                    $
                    {new Decimal(Number.parseFloat(watchedAmount) || 0)
                      .mul(new Decimal(Number.parseFloat(watchedPrice) || 0))
                      .toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <Label htmlFor="txn-date">Date</Label>
                <Input
                  id="txn-date"
                  type="date"
                  {...txnForm.register("date")}
                  className="bg-slate-800 border-slate-700 text-slate-100"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="txn-note">Note (optional)</Label>
                <Input
                  id="txn-note"
                  {...txnForm.register("note")}
                  placeholder="e.g. DCA, dip buy..."
                  className="bg-slate-800 border-slate-700 text-slate-100"
                />
              </div>
              <Button
                variant="secondary"
                className="w-full mt-1"
                onClick={handleAddTransaction}
                disabled={
                  txnForm.formState.isSubmitting ||
                  !watchedAmount ||
                  !watchedPrice ||
                  Number.parseFloat(watchedAmount) <= 0
                }
              >
                {txnForm.formState.isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {txnForm.formState.isSubmitting
                  ? "Adding..."
                  : "Add Transaction"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
