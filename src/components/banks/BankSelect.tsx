"use client";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useBanksQuery } from "@/lib/hooks/useBanksQuery";
import { pb } from "@/lib/pocketbase/pocketbase";
import { Bank } from "@/lib/types";
import { useToast } from "@/components/ui/toast";

export const BankSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const bankData = useBanksQuery();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const banks = bankData?.banks ?? [];
  const selectedBank = banks.find((b) => b.id === value);

  const trimmed = search.trim();
  const filtered = trimmed
    ? banks.filter((b) => b.name.toLowerCase().includes(trimmed.toLowerCase()))
    : banks;
  const exactMatch = banks.some(
    (b) => b.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const showCreate = trimmed.length > 0 && !exactMatch;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleCreate = async () => {
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const record = await pb
        .collection("banks")
        .create<Bank>(
          { name: trimmed, balance: 0, user: pb.authStore.record?.id },
          { requestKey: null },
        );
      await bankData?.refetch?.();
      onChange(record.id);
      setSearch("");
      setOpen(false);
    } catch {
      addToast({
        type: "error",
        title: "Failed to create bank",
        description: "Please try again.",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full justify-between bg-transparent border-slate-700 hover:bg-slate-800 hover:text-white focus-visible:ring-offset-0 focus-visible:ring-0",
          selectedBank ? "text-white" : "text-slate-500",
        )}
      >
        <span className="truncate">{selectedBank?.name ?? "Select bank"}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border border-slate-700 bg-slate-800 shadow-lg">
          <Command shouldFilter={false} className="bg-slate-800">
            <CommandInput
              placeholder="Search or create bank"
              value={search}
              onValueChange={setSearch}
              className="text-white placeholder:text-slate-500"
              autoFocus
            />
            <CommandList className="max-h-[200px] overflow-y-auto">
              <CommandGroup>
                {filtered.map((bank) => (
                  <CommandItem
                    key={bank.id}
                    value={bank.id}
                    onSelect={() => {
                      onChange(bank.id);
                      setSearch("");
                      setOpen(false);
                    }}
                    className="cursor-pointer text-slate-100 data-[selected=true]:bg-slate-700 data-[selected=true]:text-white"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === bank.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {bank.name}
                  </CommandItem>
                ))}
                {filtered.length === 0 && !showCreate && (
                  <p className="py-4 text-center text-sm text-slate-400">
                    {trimmed
                      ? "No banks match."
                      : "No banks yet, type to create one."}
                  </p>
                )}
              </CommandGroup>
              {showCreate && (
                <CommandGroup>
                  <CommandItem
                    value={`__create__${trimmed}`}
                    onSelect={handleCreate}
                    disabled={creating}
                    className="cursor-pointer text-emerald-400 data-[selected=true]:bg-slate-700 data-[selected=true]:text-emerald-300"
                  >
                    <Plus className="mr-2 h-4 w-4 shrink-0" />
                    {creating ? "Creating" : `Create ${trimmed}`}
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
};
