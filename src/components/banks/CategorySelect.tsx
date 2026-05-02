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
import { useCategoriesQuery } from "@/lib/hooks/useCategoriesQuery";
import { pb } from "@/lib/pocketbase/pocketbase";
import { useToast } from "@/components/ui/toast";

export const CategorySelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const categoryData = useCategoriesQuery();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const categories = categoryData?.categories ?? [];
  const selectedCategory = categories.find((c) => c.id === value);

  const trimmed = search.trim();
  const filtered = trimmed
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(trimmed.toLowerCase()),
      )
    : categories;
  const exactMatch = categories.some(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
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
        .collection("categories")
        .create({ name: trimmed, user: pb.authStore.record?.id });
      await categoryData?.refetch?.();
      onChange(record.id);
      setSearch("");
      setOpen(false);
    } catch {
      addToast({
        type: "error",
        title: "Failed to create category",
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
          selectedCategory ? "text-white" : "text-slate-500",
        )}
      >
        <span className="truncate">
          {selectedCategory?.name ?? "Select category"}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border border-slate-700 bg-slate-800 shadow-lg">
          <Command shouldFilter={false} className="bg-slate-800">
            <CommandInput
              placeholder="Search or create category"
              value={search}
              onValueChange={setSearch}
              className="text-white placeholder:text-slate-500"
              autoFocus
            />
            <CommandList className="max-h-[200px] overflow-y-auto">
              <CommandGroup>
                {filtered.map((cat) => (
                  <CommandItem
                    key={cat.id}
                    value={cat.id}
                    onSelect={() => {
                      onChange(cat.id);
                      setSearch("");
                      setOpen(false);
                    }}
                    className="cursor-pointer text-slate-100 data-[selected=true]:bg-slate-700 data-[selected=true]:text-white"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === cat.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {cat.name}
                  </CommandItem>
                ))}
                {filtered.length === 0 && !showCreate && (
                  <p className="py-4 text-center text-sm text-slate-400">
                    {trimmed
                      ? "No categories match."
                      : "No categories yet, type to create one."}
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
                    {creating ? "Creating…" : `Create "${trimmed}"`}
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
