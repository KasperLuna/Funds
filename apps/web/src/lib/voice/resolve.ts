import { parseAmountToMinor } from "@funds/core";
import type { ParsedResult } from "@funds/core/parser";

export interface PrefillAccount {
  id: string;
  name: string;
  decimals?: number;
}

export interface PrefillCategory {
  id: string;
  name: string;
}

export interface VoicePrefill {
  accountId: string | null;
  accountName: string | null;
  /** Signed minor units (expense convention: negative = expense). */
  amountMinor: bigint | null;
  /** Absolute keypad-style input string for the capture sheet. */
  amountInput: string | null;
  currency?: string;
  categoryIds: string[];
  description: string;
  confidence: number;
  rawText: string;
}

const DEFAULT_DECIMALS = 2;

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function resolveAccountId(
  parsed: ParsedResult,
  accounts: PrefillAccount[],
): PrefillAccount | null {
  if (!parsed.account) return null;
  const target = normalizeName(parsed.account);
  const byName = accounts.find((a) => normalizeName(a.name) === target);
  if (byName) return byName;
  // Fallback: top-scoring candidate that is an account
  const accountIds = new Set(accounts.map((a) => a.id));
  const top = parsed.candidates.find((c) => accountIds.has(c.id) && c.score >= 0.5);
  return top ? accounts.find((a) => a.id === top.id) ?? null : null;
}

function resolveCategoryIds(
  parsed: ParsedResult,
  categories: PrefillCategory[],
): string[] {
  const byName = new Map(categories.map((c) => [normalizeName(c.name), c.id]));
  const ids: string[] = [];
  for (const name of parsed.categories) {
    const id = byName.get(normalizeName(name));
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

function toAmountInput(amount: number): string {
  // Absolute value, no exponent notation, no trailing ".0"
  const abs = Math.abs(amount);
  if (Number.isInteger(abs)) return String(abs);
  return String(parseFloat(abs.toPrecision(12)));
}

export function resolvePrefill(
  parsed: ParsedResult,
  accounts: PrefillAccount[],
  categories: PrefillCategory[],
): VoicePrefill {
  const account = resolveAccountId(parsed, accounts);
  const decimals = account?.decimals ?? DEFAULT_DECIMALS;

  let amountMinor: bigint | null = null;
  let amountInput: string | null = null;
  if (parsed.amount !== undefined && !Number.isNaN(parsed.amount)) {
    amountMinor = parseAmountToMinor(String(parsed.amount), decimals);
    amountInput = toAmountInput(parsed.amount);
  }

  const description =
    parsed.description && parsed.description.length > 0
      ? parsed.description
      : parsed.rawText.trim();

  return {
    accountId: account?.id ?? null,
    accountName: account?.name ?? null,
    amountMinor,
    amountInput,
    currency: parsed.currency,
    categoryIds: resolveCategoryIds(parsed, categories),
    description,
    confidence: parsed.confidence,
    rawText: parsed.rawText,
  };
}
