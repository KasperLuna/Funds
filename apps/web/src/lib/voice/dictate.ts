import { parseTransaction } from "@funds/core/parser";
import {
  resolvePrefill,
  type PrefillAccount,
  type PrefillCategory,
} from "./resolve";

export interface DictatePrefill {
  accountId: string | null;
  amountInput: string | null;
  categoryIds: string[];
  description: string;
}

export interface DictateResult {
  prefill: DictatePrefill;
  /**
   * True when no amount was heard. The amount hero is the only required
   * field dictation can leave empty (account always has a selection,
   * category is optional, description falls back to the raw utterance),
   * so this is the only missing state the sheet must flag.
   */
  missingAmount: boolean;
}

/**
 * cavetail: on-device dictate path for the capture sheet. iOS Safari/PWA
 * exposes no Web Speech API, so the utterance arrives via the system
 * keyboard's mic key — parsing here is fully local (same shared parser the
 * voice webhook uses server-side), no network, no permissions. Returns null
 * for blank utterances so the caller can stay in listening state.
 */
export function dictateToPrefill(
  utterance: string,
  accounts: PrefillAccount[],
  categories: PrefillCategory[],
): DictateResult | null {
  const text = utterance.trim();
  if (!text) return null;
  const parsed = parseTransaction(text, {
    accounts: accounts.map((a) => ({ id: a.id, name: a.name })),
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
  });
  const prefill = resolvePrefill(parsed, accounts, categories);
  return {
    prefill: {
      accountId: prefill.accountId,
      amountInput: prefill.amountInput,
      categoryIds: prefill.categoryIds,
      description: prefill.description,
    },
    missingAmount: prefill.amountInput == null,
  };
}
