// Utilities extracted from voiceParser to keep parsing logic focused.
export function normalizeNumberString(s: string) {
  // normalize comma decimal (e.g. 12,50) to dot
  const cleaned = s.replaceAll(",", ".");
  const num = Number.parseFloat(cleaned);
  if (Number.isNaN(num)) return undefined;
  return num;
}

export function levenshtein(a: string, b: string) {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const matrix = Array.from({ length: al + 1 }, () =>
    new Array(bl + 1).fill(0),
  );
  for (let i = 0; i <= al; i++) matrix[i][0] = i;
  for (let j = 0; j <= bl; j++) matrix[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[al][bl];
}

export function normalizeForMatch(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-z0-9\s]/g, " ") // remove punctuation
    .replace(/\s+/g, " ") // collapse spaces
    .trim();
}

export function tokenizeForMatch(s: string) {
  const n = normalizeForMatch(s);
  return n ? n.split(" ").filter(Boolean) : [];
}

export function jaccardTokens(aTokens: string[], bTokens: string[]) {
  const A = new Set(aTokens);
  const B = new Set(bTokens);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = new Set([...A, ...B]).size || 1;
  return inter / union;
}

export function normalizedLevenshteinScore(a: string, b: string) {
  const dist = levenshtein(a, b);
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  const ratio = 1 - dist / max;
  return Math.max(0, Math.min(1, ratio));
}

/**
 * Soundex phonetic encoding. Maps a word to a 4-char code so that
 * homophones and STT transcription variants share same code.
 */
export function soundex(s: string): string {
  const n = normalizeForMatch(s).replace(/\s/g, "");
  if (!n) return "";
  const map: Record<string, string> = {
    b: "1",
    f: "1",
    p: "1",
    v: "1",
    c: "2",
    g: "2",
    j: "2",
    k: "2",
    q: "2",
    s: "2",
    x: "2",
    z: "2",
    d: "3",
    t: "3",
    l: "4",
    m: "5",
    n: "5",
    r: "6",
  };
  const first = n[0].toUpperCase();
  let code = first;
  let prev = map[n[0]] ?? "0";
  for (let i = 1; i < n.length && code.length < 4; i++) {
    const ch = n[i];
    const digit = map[ch] ?? "0";
    if (digit !== "0" && digit !== prev) {
      code += digit;
      prev = digit;
    } else if (digit === "0") {
      prev = "0";
    }
  }
  return code.padEnd(4, "0");
}

export function scoreCandidate(raw: string, candidate: string) {
  const rawN = normalizeForMatch(raw);
  const candN = normalizeForMatch(candidate);
  if (!candN) return { score: 0, rawMatchTokens: [] as string[] };
  if (rawN === candN) return { score: 1, rawMatchTokens: [] as string[] };
  const rawTokens = tokenizeForMatch(raw);
  const candTokens = tokenizeForMatch(candidate);
  const candCamel = normalizeForMatch(
    candidate
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2"),
  );
  const candCamelTokens = tokenizeForMatch(candCamel);
  const candPreferTokens = candCamelTokens.length
    ? candCamelTokens
    : candTokens;

  const rawNoSpace = rawN.replace(/\s+/g, "");
  const candNoSpace = candN.replace(/\s+/g, "");
  const rawNonNumTokens = rawTokens.filter((t) => !/^\d+$/.test(t));
  let f_bestWindowNoSpace = normalizedLevenshteinScore(candNoSpace, rawNoSpace);
  let bestWindowTokens: string[] = [];
  for (let wSz = 1; wSz <= rawNonNumTokens.length; wSz++) {
    for (let wi = 0; wi <= rawNonNumTokens.length - wSz; wi++) {
      const windowToks = rawNonNumTokens.slice(wi, wi + wSz);
      const ws = normalizedLevenshteinScore(candNoSpace, windowToks.join(""));
      if (ws > f_bestWindowNoSpace) {
        f_bestWindowNoSpace = ws;
        bestWindowTokens = windowToks;
      }
    }
  }

  const effectiveCandTokens =
    f_bestWindowNoSpace >= 0.85 &&
    bestWindowTokens.length > candPreferTokens.length
      ? bestWindowTokens
      : candPreferTokens;

  const effectivePhrase = effectiveCandTokens.join(" ");
  const f_substring =
    rawN.includes(candN) ||
    candN.includes(rawN) ||
    (effectiveCandTokens !== candPreferTokens && rawN.includes(effectivePhrase))
      ? 1
      : 0;

  const f_jaccard = Math.max(
    jaccardTokens(rawTokens, candTokens),
    jaccardTokens(rawTokens, candCamelTokens),
    jaccardTokens(rawTokens, effectiveCandTokens),
  );

  let tokenSim = 0;
  if (effectiveCandTokens.length && rawTokens.length) {
    let sumBest = 0;
    for (const ct of effectiveCandTokens) {
      let best = 0;
      for (const rt of rawTokens) {
        let s = normalizedLevenshteinScore(ct, rt);
        if (
          s < 0.7 &&
          ct.length > 1 &&
          rt.length > 1 &&
          soundex(ct) === soundex(rt)
        )
          s = Math.max(s, 0.7);
        if (s > best) best = s;
      }
      sumBest += best;
    }
    tokenSim = sumBest / effectiveCandTokens.length;
  }

  const prefixMatch =
    effectiveCandTokens.length > 0 &&
    rawTokens.some((t) => t.startsWith(effectiveCandTokens[0]))
      ? 1
      : 0;

  const rawNonNumForCoverage = rawNonNumTokens;
  const matchedRawCount = rawNonNumForCoverage.filter((rt) =>
    effectiveCandTokens.some((ct) => {
      if (normalizedLevenshteinScore(ct, rt) >= 0.7) return true;
      if (ct.length > 1 && rt.length > 1 && soundex(ct) === soundex(rt))
        return true;
      return false;
    }),
  ).length;
  const f_rawExplained =
    rawNonNumForCoverage.length > 0
      ? matchedRawCount / rawNonNumForCoverage.length
      : 0;

  const score =
    f_substring * 0.05 +
    f_jaccard * 0.2 +
    f_bestWindowNoSpace * 0.2 +
    tokenSim * 0.2 +
    f_rawExplained * 0.3 +
    prefixMatch * 0.05;
  const rawMatchTokens =
    f_bestWindowNoSpace >= 0.85 && bestWindowTokens.length > 0
      ? bestWindowTokens
      : [];
  return { score: Math.max(0, Math.min(1, score)), rawMatchTokens };
}

export function isContiguousSubWindow(sub: string[], sup: string[]): boolean {
  if (sub.length === 0 || sub.length >= sup.length) return false;
  for (let i = 0; i <= sup.length - sub.length; i++) {
    if (sub.every((t, j) => t === sup[i + j])) return true;
  }
  return false;
}
