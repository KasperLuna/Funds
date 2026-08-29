/**
 * Pre-model resolver. The 1B-class model is reliable at emitting valid JSON
 * but unreliable at *semantic* matching — "dining" is not "Food" in its
 * head, and "payroll" is a description, not a category. Doing that match
 * deterministically here lets the model see resolved terms in its snapshot
 * (so it can still emit the right shape) and lets the executor act on them
 * even if the model emits a different shape.
 *
 * The resolver is intentionally small: a synonym table for the most common
 * food/transport/entertainment categories, a tiny description-keyword table
 * (payroll, salary, refund, transfer, etc.), and a fallback substring match
 * for everything else. It is the single source of truth for what the model
 * means when it says `category: "Food"`.
 */

export type ResolvedTerms = {
  /** Category name as it exists in the user's data. */
  category?: string;
  /** Lowercase substring to match against `txn.description`. */
  descriptionPattern?: string;
  /** How the category was resolved — for the UI badge and tests. */
  categorySource: "alias" | "exact" | "substring" | "none";
  /** How the description pattern was resolved. */
  descriptionSource: "keyword" | "extracted" | "none";
  /** The raw user phrase the resolver matched against (debug + UI). */
  matched: string[];
};

type CategoryLike = { name: string; excludeFromAnalytics?: boolean; deletedAt?: number | null };

/**
 * Hand-curated synonym table. The keys are the words a user might say; the
 * values are the category names they are likely to mean. The right side is
 * matched case-insensitively against the user's actual category names.
 */
const CATEGORY_ALIASES: Array<{ words: string[]; matches: (cat: string) => boolean }> = [
  // Food / dining
  { words: ["dining", "restaurant", "restaurants", "eatery", "food", "eating", "meals", "meal", "groceries", "grocery", "supermarket"], matches: (c) => /food|grocer|dining|restaurant|meal|eatery/i.test(c) },
  // Coffee
  { words: ["coffee", "cafe", "cafes", "starbucks"], matches: (c) => /coffee|cafe/i.test(c) },
  // Transport / fuel
  { words: ["gas", "fuel", "petrol", "uber", "grab", "taxi", "transport", "commute"], matches: (c) => /transport|fuel|gas|uber|grab|commute/i.test(c) },
  // Subscriptions / recurring
  { words: ["subscriptions", "subscription", "streaming", "recurring"], matches: (c) => /subscri|stream|recurring/i.test(c) },
  // Entertainment
  { words: ["movies", "movie", "cinema", "netflix", "shows", "entertainment"], matches: (c) => /entertain|movie|cinema|stream/i.test(c) },
  // Shopping
  { words: ["shopping", "clothes", "amazon", "lazada", "shopee"], matches: (c) => /shop|cloth|amazon|lazada|shopee/i.test(c) },
  // Bills / utilities
  { words: ["bills", "utilities", "electricity", "water", "internet", "wifi"], matches: (c) => /bill|util|electric|water|internet|wifi/i.test(c) },
  // Health
  { words: ["health", "medical", "doctor", "pharmacy", "medicine", "gym"], matches: (c) => /health|medical|pharm|gym|fitness/i.test(c) },
  // Work / income
  { words: ["work", "salary", "income", "job"], matches: (c) => /work|salary|income/i.test(c) },
  // Travel
  { words: ["travel", "flight", "hotel", "vacation", "trip"], matches: (c) => /travel|flight|hotel|trip|vacation/i.test(c) },
];

/**
 * Description keyword stems. Matched as a prefix against the user's tokens
 * (no right word boundary) so "refunds" still matches "refund", "salaries"
 * matches "salary", etc. The value is the substring to search for in the
 * transaction description.
 */
const DESCRIPTION_KEYWORDS: Record<string, string> = {
  payro: "payroll",
  salar: "salary",
  paych: "paycheck",
  refun: "refund",
  reimb: "reimburse",
  transf: "transfer",
  cashb: "cashback",
  inte: "interest",
  divid: "dividend",
  freel: "freelance",
  bonu: "bonus",
  ren: "rent",
  mortg: "mortgage",
  tuiti: "tuition",
  insu: "insurance",
  loa: "loan",
  credi: "credit",
  ta: "tax",
};

/** Drop tiny words that aren't useful for matching. */
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "i", "you", "we", "they",
  "me", "my", "your", "our", "this", "that", "these", "those",
  "how", "much", "many", "what", "where", "when", "why", "who",
  "on", "in", "at", "to", "for", "of", "with", "by", "from",
  "do", "does", "did", "can", "could", "should", "would",
  "am", "is", "are", "be", "been", "being",
  "spend", "spent", "spending", "pay", "paid", "paying", "cost", "costs",
  "budget", "track", "show", "tell", "find", "get", "give", "list",
  "last", "this", "next", "first", "second",
  "month", "week", "year", "day", "today", "yesterday", "tomorrow",
  "over", "under", "above", "below", "near",
  "any", "all", "some", "every",
]);

/** Tokenize, drop stopwords and tiny tokens. */
function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function findDescriptionKeyword(words: string[]): { value: string; token: string } | null {
  for (const w of words) {
    for (const [stem, value] of Object.entries(DESCRIPTION_KEYWORDS)) {
      if (w.startsWith(stem)) return { value, token: w };
    }
  }
  return null;
}

/**
 * Resolve a user utterance to (category, descriptionPattern). Runs once per
 * request, before the model is called. The result is fed into the snapshot
 * and used to back-fill the query if the model omits `category` or fails to
 * pick the right one.
 */
export function resolveTerms(args: {
  userText: string;
  categories: CategoryLike[];
}): ResolvedTerms {
  const words = tokens(args.userText);
  const matched: string[] = [];

  // 1. Description keyword first — "payroll" is a description, not a
  // category, and the user's primary intent is "find this in descriptions".
  let descriptionPattern: string | undefined;
  let descriptionSource: ResolvedTerms["descriptionSource"] = "none";
  const kw = findDescriptionKeyword(words);
  if (kw) {
    descriptionPattern = kw.value;
    descriptionSource = "keyword";
    matched.push(`description≈"${kw.value}"`);
  } else if (words.length > 0) {
    // 2. Fallback: any token that is not an exact category name and not a
    // stopword is a candidate description pattern. We only do this when
    // the model has not already picked a category — if the user said
    // "Food spending", "Food" is the category and the rest is filler.
    for (const w of words) {
      if (Object.keys(DESCRIPTION_KEYWORDS).some((stem) => w.startsWith(stem))) continue;
      if (args.categories.some((c) => c.name.toLowerCase() === w)) continue;
      if (w.length < 3) continue;
      descriptionPattern = descriptionPattern ?? w;
    }
    if (descriptionPattern) {
      descriptionSource = "extracted";
      matched.push(`description~="${descriptionPattern}"`);
    }
  }

  // 3. Category: prefer an alias match over an exact-name match, since the
  // user's words are more often synonyms than literal category names.
  let category: string | undefined;
  let categorySource: ResolvedTerms["categorySource"] = "none";

  for (const alias of CATEGORY_ALIASES) {
    if (alias.words.some((w) => words.includes(w))) {
      const found = args.categories.find((c) => !c.deletedAt && alias.matches(c.name));
      if (found) {
        category = found.name;
        categorySource = "alias";
        matched.push(`category≈"${found.name}"`);
        break;
      }
    }
  }

  if (!category) {
    // 4. Exact match.
    for (const c of args.categories) {
      if (c.deletedAt) continue;
      if (words.includes(c.name.toLowerCase())) {
        category = c.name;
        categorySource = "exact";
        matched.push(`category="${c.name}"`);
        break;
      }
    }
  }

  if (!category) {
    // 5. Substring: the user's word appears inside one of the category names.
    for (const w of words) {
      const found = args.categories.find(
        (c) => !c.deletedAt && c.name.toLowerCase().includes(w),
      );
      if (found) {
        category = found.name;
        categorySource = "substring";
        matched.push(`category~="${found.name}"`);
        break;
      }
    }
  }

  return {
    ...(category ? { category } : {}),
    ...(descriptionPattern ? { descriptionPattern } : {}),
    categorySource,
    descriptionSource,
    matched,
  };
}
