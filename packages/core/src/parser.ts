export interface Candidate {
  id: string;
  name: string;
}

export interface ParsedResult {
  rawText: string;
  amount?: number;
  currency?: string;
  account?: string;
  categories: string[];
  description?: string;
  candidates: { id: string; name: string; score: number }[];
  confidence: number;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₹": "INR",
  "₱": "PHP",
  "₩": "KRW",
  "₿": "BTC",
};

const CURRENCY_CODES = new Set([
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "INR",
  "PHP",
  "KRW",
  "BTC",
  "ETH",
  "USDT",
  "USDC",
]);

function normalize(text: string): string {
  let s = text.toLowerCase();
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[^-\w\s\d.,]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function extractCurrency(text: string): string | undefined {
  for (const [sym, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (text.includes(sym)) return code;
  }
  const upper = text.toUpperCase();
  for (const code of CURRENCY_CODES) {
    const re = new RegExp(`\\b${code}\\b`);
    if (re.test(upper)) return code;
  }
  return undefined;
}

function extractAmount(normalized: string): { amount: number; consumed: string } | undefined {
  const re = /-?(?:[$€£¥₹₱₩₿]?\s*\d[\d,]*\.?\d*|\d[\d,]*\.?\d*\s*(?:USD|EUR|GBP|JPY|INR|PHP|KRW|BTC|ETH|USDT|USDC)\b)/i;
  const m = normalized.match(re);
  if (!m) return undefined;
  const raw = m[0].replace(/[$€£¥₹₱₩₿]/g, "").replace(/USD|EUR|GBP|JPY|INR|PHP|KRW|BTC|ETH|USDT|USDC/gi, "").trim();
  let cleaned = raw;
  if (/^-?\d+,\d{1,2}$/.test(cleaned)) cleaned = cleaned.replace(",", ".");
  cleaned = cleaned.replace(/,/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return undefined;
  return { amount: num, consumed: m[0] };
}

function splitCamel(name: string): string[] {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/\s+/);
}

function tokenize(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const x of setA) if (setB.has(x)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i]![0] = i;
  for (let j = 0; j <= n; j++) d[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
    }
  }
  return d[m]![n]!;
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function bestWindowScore(rawTokens: string[], candidate: Candidate): { score: number; span: string[] } {
  const candTokens = tokenize(candidate.name.toLowerCase());
  const candJoined = candTokens.join("");
  let bestScore = 0;
  let bestSpan: string[] = [];

  for (let len = 1; len <= rawTokens.length; len++) {
    for (let start = 0; start <= rawTokens.length - len; start++) {
      const window = rawTokens.slice(start, start + len);
      const windowJoined = window.join("");
      const windowSim = similarity(windowJoined, candJoined);

      const candSplit = splitCamel(candidate.name);
      const jaccPlain = jaccard(window, candTokens);
      const jaccSplit = jaccard(window, candSplit);
      const jacc = Math.max(jaccPlain, jaccSplit);

      const meanSim =
        candTokens.reduce((acc, ct) => {
          const best = window.reduce(
            (mx, wt) => Math.max(mx, similarity(wt, ct)),
            0,
          );
          return acc + best;
        }, 0) / (candTokens.length || 1);

      const coverage = rawTokens.filter(
        (rt) => !rt.match(/^\d/) && candTokens.some((ct) => similarity(rt, ct) > 0.5),
      ).length / rawTokens.filter((rt) => !rt.match(/^\d/)).length || 0;

      const prefix = candTokens.length > 0 && rawTokens.includes(candTokens[0]!) ? 0.05 : 0;

      const tokenExact =
        candTokens.filter((ct) => rawTokens.includes(ct)).length /
        (candTokens.length || 1);

      const score =
        windowSim * 0.05 +
        jacc * 0.20 +
        windowSim * 0.20 +
        Math.max(meanSim, meanSim >= 0.7 ? 0.7 : 0) * 0.20 +
        coverage * 0.30 +
        prefix * 0.05 +
        tokenExact * 0.6;

      if (score > bestScore) {
        bestScore = score;
        bestSpan = window;
      }
    }
  }

  return { score: bestScore, span: bestSpan };
}

function scoreCandidates(
  rawTokens: string[],
  candidates: Candidate[],
): { id: string; name: string; score: number; span: string[] }[] {
  return candidates
    .map((c) => {
      const { score, span } = bestWindowScore(rawTokens, c);
      return { id: c.id, name: c.name, score, span };
    })
    .sort((a, b) => b.score - a.score);
}

function applySubsumption(scored: { id: string; name: string; score: number; span: string[] }[]): { id: string; name: string; score: number; span: string[] }[] {
  return scored.map((entry, i) => {
    const isSubsumed = scored.some(
      (other, j) =>
        j !== i &&
        other.span.length > entry.span.length &&
        other.span.join(" ").includes(entry.span.join(" ")),
    );
    return isSubsumed ? { ...entry, score: 0 } : entry;
  });
}

function extractDescription(
  rawText: string,
  amountConsumed: string,
  accountSpan: string[],
  categorySpans: string[][],
): string {
  let desc = rawText;
  if (amountConsumed) desc = desc.replace(amountConsumed, "");
  for (const t of accountSpan) {
    desc = desc.replace(new RegExp(`\\b${t}\\b`, "i"), "");
  }
  for (const spans of categorySpans) {
    for (const t of spans) {
      desc = desc.replace(new RegExp(`\\b${t}\\b`, "i"), "");
    }
  }
  return desc.replace(/\s+/g, " ").trim();
}

export function parseTransaction(
  rawText: string,
  opts: { accounts: Candidate[]; categories: Candidate[] },
): ParsedResult {
  const normalized = normalize(rawText);
  const rawTokens = tokenize(normalized);

  const currency = extractCurrency(rawText);
  const amountResult = extractAmount(normalized);

  const accountScored = applySubsumption(scoreCandidates(rawTokens, opts.accounts));
  const categoryScored = applySubsumption(scoreCandidates(rawTokens, opts.categories));

  const matchedAccount =
    accountScored.length > 0 && accountScored[0]!.score >= 0.5
      ? accountScored[0]
      : undefined;

  const matchedCategories = categoryScored.filter((c) => c.score >= 0.4);

  const categorySpans = matchedCategories.map((c) => c.span);

  const description = extractDescription(
    rawText,
    amountResult?.consumed ?? "",
    matchedAccount?.span ?? [],
    categorySpans,
  );

  let confidence = 0.5;
  if (amountResult) confidence += 0.3;
  if (matchedAccount) confidence += 0.1;
  if (matchedCategories.length > 0) confidence += 0.1;
  confidence = Math.min(confidence, 1.0);

  return {
    rawText,
    amount: amountResult?.amount,
    currency,
    account: matchedAccount?.name,
    categories: matchedCategories.map((c) => c.name),
    description: description || undefined,
    candidates: accountScored.concat(categoryScored).map((c) => ({
      id: c.id,
      name: c.name,
      score: c.score,
    })),
    confidence,
  };
}
