"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Bank, Category, TransactionFilters, TransactionType } from "@/lib/types";

const TRANSACTION_TYPES = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
] as const;

const ALL_BANKS = "__all__";
const ALL_TYPES = "__all__";

interface TransactionFilterProps {
  banks: Bank[];
  categories: Category[];
  onChange: (filters: TransactionFilters) => void;
}

export function TransactionFilter({ banks, categories, onChange }: TransactionFilterProps) {
  const [bank, setBank] = useState<string>(ALL_BANKS);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [type, setType] = useState<string>(ALL_TYPES);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildFilters = useCallback(
    (overrides?: { searchText?: string }): TransactionFilters => {
      const filters: TransactionFilters = {};

      if (bank !== ALL_BANKS) filters.bank = bank;
      if (selectedCategories.length > 0) filters.categories = selectedCategories;
      if (type !== ALL_TYPES) filters.type = type as TransactionType;
      if (startDate || endDate) {
        filters.dateRange = {
          start: startDate ? new Date(startDate) : new Date(0),
          end: endDate ? new Date(endDate) : new Date("9999-12-31"),
        };
      }

      const text = overrides?.searchText ?? searchText;
      if (text.trim()) filters.searchText = text.trim();

      return filters;
    },
    [bank, selectedCategories, type, startDate, endDate, searchText],
  );

  // Emit filter changes for non-search fields immediately
  useEffect(() => {
    onChange(buildFilters());
  }, [bank, selectedCategories, type, startDate, endDate, buildFilters, onChange]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(buildFilters({ searchText: value }));
    }, 300);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleCategoryToggle = (categoryId: string, checked: boolean) => {
    const updated = checked
      ? [...selectedCategories, categoryId]
      : selectedCategories.filter((id) => id !== categoryId);
    setSelectedCategories(updated);
  };

  return (
    <div className="flex flex-col gap-4" role="search" aria-label="Transaction filters">
      {/* Search */}
      <Field>
        <FieldLabel htmlFor="filter-search">Search</FieldLabel>
        <Input
          id="filter-search"
          placeholder="Search transactions…"
          value={searchText}
          onChange={handleSearchChange}
        />
      </Field>

      {/* Bank select */}
      <Field>
        <FieldLabel htmlFor="filter-bank">Bank</FieldLabel>
        <Select value={bank} onValueChange={setBank}>
          <SelectTrigger id="filter-bank" className="w-full">
            <SelectValue placeholder="All Banks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_BANKS}>All Banks</SelectItem>
            {banks.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Type select */}
      <Field>
        <FieldLabel htmlFor="filter-type">Type</FieldLabel>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger id="filter-type" className="w-full">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES}>All</SelectItem>
            {TRANSACTION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Categories multi-select */}
      <Field>
        <FieldLabel>Categories</FieldLabel>
        <fieldset className="flex flex-col gap-2" aria-label="Filter by categories">
          {categories.map((cat) => (
            <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                value={cat.id}
                checked={selectedCategories.includes(cat.id)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleCategoryToggle(cat.id, e.target.checked)
                }
                className="size-4 rounded border-input"
              />
              {cat.name}
            </label>
          ))}
        </fieldset>
      </Field>

      {/* Date range */}
      <Field>
        <FieldLabel htmlFor="filter-start-date">Start Date</FieldLabel>
        <Input
          id="filter-start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="filter-end-date">End Date</FieldLabel>
        <Input
          id="filter-end-date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </Field>
    </div>
  );
}
