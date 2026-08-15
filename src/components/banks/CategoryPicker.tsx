"use client";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCategoriesQuery } from "@/lib/hooks/useCategoriesQuery";
import { pb } from "@/lib/pocketbase/pocketbase";
import { Category } from "@/lib/types";
import { useToast } from "@/components/ui/toast";

export const CategoryPicker = ({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) => {
  const categoryData = useCategoriesQuery();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const categories = categoryData?.categories ?? [];
  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  const trimmed = search.trim();
  const filtered = trimmed
    ? sorted.filter((c) => c.name.toLowerCase().includes(trimmed.toLowerCase()))
    : sorted;
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

  // Keep dropdown above mobile keyboard: scroll into view on open and on keyboard-triggered viewport resize
  useEffect(() => {
    if (!open) return;
    const keepInView = () => {
      dropdownRef.current?.scrollIntoView({ block: "nearest" });
    };
    const raf = requestAnimationFrame(keepInView);
    window.visualViewport?.addEventListener("resize", keepInView);
    return () => {
      cancelAnimationFrame(raf);
      window.visualViewport?.removeEventListener("resize", keepInView);
    };
  }, [open]);

  const toggle = (name: string) => {
    if (value.includes(name)) {
      onChange(value.filter((v) => v !== name));
    } else {
      onChange([...value, name]);
    }
  };

  const handleCreate = async () => {
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const record = await pb
        .collection("categories")
        .create<Category>(
          { name: trimmed, user: pb.authStore.record?.id },
          { requestKey: null },
        );
      await categoryData?.refetch?.();
      onChange([...value, record.name]);
      setSearch("");
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
    <div className="flex flex-col gap-1.5 w-full">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((cat) => (
            <Badge
              key={cat}
              variant="secondary"
              className="bg-slate-700 text-slate-200 px-2 py-0.5 flex items-center gap-1"
            >
              {cat}
              <button
                type="button"
                aria-label={`Remove ${cat}`}
                onClick={() => toggle(cat)}
                className="ml-0.5 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div ref={containerRef} className="relative w-full">
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "w-full justify-between bg-transparent border-slate-700 hover:bg-slate-800 hover:text-white focus-visible:ring-offset-0 focus-visible:ring-0",
            value.length > 0 ? "text-slate-300" : "text-slate-500",
          )}
        >
          <span className="truncate">
            {value.length === 0
              ? "Select categories"
              : `${value.length} selected`}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>

        {open && (
          <div
            ref={dropdownRef}
            className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border border-slate-700 bg-slate-800 shadow-lg"
          >
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
                  {filtered.map((cat) => {
                    const selected = value.includes(cat.name);
                    return (
                      <CommandItem
                        key={cat.id}
                        value={cat.id}
                        onSelect={() => toggle(cat.name)}
                        className="cursor-pointer text-slate-100 data-[selected=true]:bg-slate-700 data-[selected=true]:text-white"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            selected ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {cat.name}
                      </CommandItem>
                    );
                  })}
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
                      {creating ? "Creating" : `Create ${trimmed}`}
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </div>
        )}
      </div>
    </div>
  );
};
