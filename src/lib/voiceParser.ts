import {
  normalizeNumberString,
  scoreCandidate,
  isContiguousSubWindow,
} from "./voiceParserUtils";

type ParseOptions = {
  accounts?: string[];
  categories?: string[];
  locale?: string;
};

export type ParseResult = {
  rawText: string;
  amount?: number;
  currency?: string;
  account?: string | null;
  category?: string | null;
  categories?: string[];
  description?: string;
  candidates?: { accounts?: string[]; categories?: string[] };
  confidence: number; // 0-1
};

export function parseTransaction(
  text: string,
  opts?: ParseOptions,
): ParseResult {
  const raw = (text || "").trim();
  const accounts = opts?.accounts || [];
  const categories = opts?.categories || [];

  // 1. Find amount (first numeric token with optional currency symbol)
  // regex covers $12.34, 12.34, 12,34, 12
  const amountRegex = /(?:\b(USD|EUR|GBP)\b|[$€£])?\s*(\d+(?:[.,]\d{1,2})?)/i;
  const amountMatch = amountRegex.exec(raw);
  let amount: number | undefined = undefined;
  let currency: string | undefined = undefined;
  if (amountMatch) {
    const currencyToken = amountMatch[1];
    const numToken = amountMatch[2];
    amount = normalizeNumberString(numToken);
    if (currencyToken) currency = currencyToken.toUpperCase();
    else if (raw.includes("$") || text.includes("usd")) currency = "USD";
    else if (raw.includes("€") || text.includes("eur")) currency = "EUR";
    else if (raw.includes("£") || text.includes("gbp")) currency = "GBP";
  }

  // 2. Account matching: rank candidates using tokenized Jaccard + Levenshtein
  let account: string | null = null;
  let accountMatchTokens: string[] = [];
  const accountCandidates: string[] = [];
  if (accounts.length > 0) {
    const scored = accounts
      .filter(Boolean)
      .map((acc) => {
        const r = scoreCandidate(raw, acc);
        return { name: acc, score: r.score, rawMatchTokens: r.rawMatchTokens };
      })
      .sort((a, b) => b.score - a.score);

    // Subsumption: demote any candidate whose match window is a strict
    // contiguous sub-window of another candidate's match window.
    // e.g. "Cash" window ["cash"] ⊂ "Gcash Wallet" window ["g","cash","wallet"].
    for (const s of scored) {
      if (s.rawMatchTokens.length === 0) continue;
      if (
        scored.some(
          (other) =>
            other !== s &&
            other.rawMatchTokens.length > s.rawMatchTokens.length &&
            isContiguousSubWindow(s.rawMatchTokens, other.rawMatchTokens),
        )
      ) {
        s.score = 0;
      }
    }
    scored.sort((a, b) => b.score - a.score);

    for (const s of scored) accountCandidates.push(s.name);
    const top = scored[0];
    if (top && top.score >= 0.5) {
      account = top.name;
      accountMatchTokens = top.rawMatchTokens;
    }
  }

  // 3. Category matching: rank candidates similarly, return all above threshold
  let category: string | null = null;
  const matchedCategories: string[] = [];
  const matchedScoredCats: Array<{ name: string; rawMatchTokens: string[] }> =
    [];
  const categoryCandidates: string[] = [];
  if (categories.length > 0) {
    const scored = categories
      .filter(Boolean)
      .map((c) => {
        const r = scoreCandidate(raw, c);
        return { name: c, score: r.score, rawMatchTokens: r.rawMatchTokens };
      })
      .sort((a, b) => b.score - a.score);
    for (const s of scored) categoryCandidates.push(s.name);
    for (const s of scored) {
      if (s.score >= 0.4) {
        matchedCategories.push(s.name);
        matchedScoredCats.push({
          name: s.name,
          rawMatchTokens: s.rawMatchTokens,
        });
      }
    }
    if (matchedCategories.length > 0) category = matchedCategories[0];
  }

  // 4. Description: remove amount token, account, and all matched category words
  let description = raw;
  if (amountMatch) description = description.replace(amountMatch[0], "").trim();
  if (account) {
    if (accountMatchTokens.length > 0) {
      for (const tok of accountMatchTokens) {
        description = description.replace(
          new RegExp(String.raw`\b${tok}\b`, "gi"),
          "",
        );
      }
      description = description.replace(/\s+/g, " ").trim();
    } else {
      description = description
        .replace(
          new RegExp(
            account.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`),
            "i",
          ),
          "",
        )
        .trim();
    }
  }
  for (const { name: cat, rawMatchTokens: catTokens } of matchedScoredCats) {
    if (catTokens.length > 0) {
      for (const tok of catTokens) {
        description = description.replace(
          new RegExp(String.raw`\b${tok}\b`, "gi"),
          "",
        );
      }
      description = description.replace(/\s+/g, " ").trim();
    } else {
      description = description
        .replace(
          new RegExp(cat.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), "i"),
          "",
        )
        .trim();
    }
  }

  // Confidence: require amount for high confidence
  let confidence = 0.5;
  if (amount !== undefined) confidence += 0.3;
  if (account) confidence += 0.1;
  if (category) confidence += 0.1;
  if (confidence > 1) confidence = 1;

  return {
    rawText: raw,
    amount,
    currency,
    account,
    category,
    categories: matchedCategories.length > 0 ? matchedCategories : undefined,
    description: description || undefined,
    candidates: { accounts: accountCandidates, categories: categoryCandidates },
    confidence,
  };
}
