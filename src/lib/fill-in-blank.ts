/**
 * Fill-in-the-blank utilities shared by the Daily Text Youth panel and
 * the OCLM WorkbookPanel per-part card. Both need to:
 *
 *   1. Take a piece of text (a daily-text verse, an AI kid summary).
 *   2. Pick 3–6 meaty words to hide, preferring words that come from a
 *      "focus vocabulary" list (day's vocab / week's workbook vocab).
 *   3. Return a token stream + the answers, so the caller can render
 *      a familiar bank + slotted UI.
 *
 * The picking heuristic is intentionally simple: length ≥ 4, alphabetic,
 * not a stopword. Preference goes to vocab members so the exercise
 * reinforces the week's target words.
 */

export interface FillInBlankToken {
  /** Zero-based index into `answers`, only present on blanked tokens. */
  blank?: number;
  /** The uninterrupted word (letters + apostrophes + hyphens). */
  core?: string;
  /** Leading punctuation attached to this word ("(", quote). */
  pre?: string;
  /** Trailing punctuation attached to this word ("?", comma, quote). */
  post?: string;
  /** Full original token including punctuation — used to render non-blanks. */
  w?: string;
}

/**
 * Very small English stopword set — biased toward the vocabulary of
 * scripture, not academic prose. Extending this rarely helps; if the
 * output has too few good blanks, widen `core.length >= 4` instead.
 */
const STOPWORDS = new Set([
  "the", "and", "that", "with", "this", "from", "have", "will", "your", "you",
  "are", "was", "for", "his", "her", "him", "they", "them", "their", "what",
  "when", "which", "into", "unto", "shall", "not", "but", "all", "who", "how",
  "why", "our", "out", "one", "also", "may", "can", "has", "had", "were", "been",
  "does", "did", "then", "than", "upon", "over", "such", "more", "most", "some",
  "any", "each", "every", "there",
]);

/**
 * Tokenise `text`, pick eligible words, prefer any in `vocab`, and turn
 * ~one word in every 12 into a blank (min 3, max 6). Returns the token
 * stream (with blanks marked) and the answers in slot order.
 */
export function buildBlanks(
  text: string,
  vocab: string[],
): { tokens: FillInBlankToken[]; answers: string[] } {
  const vocabSet = new Set(vocab.map((v) => v.toLowerCase().trim()));
  const raw = text.split(/\s+/).filter(Boolean);
  const tokens: FillInBlankToken[] = [];
  const eligibleIdx: number[] = [];

  raw.forEach((word, i) => {
    const m = word.match(/^([^\w]*)([\w'’-]+)([^\w]*)$/);
    if (!m) {
      tokens.push({ w: word });
      return;
    }
    const [, pre, core, post] = m;
    tokens.push({ w: word, core, pre, post });
    const lc = core.toLowerCase();
    if (core.length >= 4 && !STOPWORDS.has(lc) && /^[A-Za-z'’-]+$/.test(core)) {
      eligibleIdx.push(i);
    }
  });

  const preferred = eligibleIdx.filter((i) =>
    vocabSet.has((tokens[i].core ?? "").toLowerCase()),
  );
  const others = eligibleIdx.filter((i) => !preferred.includes(i));
  const maxBlanks = Math.max(3, Math.min(6, Math.round(raw.length / 12)));
  const chosen = [...preferred, ...others]
    .slice(0, maxBlanks)
    .sort((a, b) => a - b);

  const answers: string[] = [];
  chosen.forEach((idx, bi) => {
    const t = tokens[idx];
    answers.push(t.core ?? "");
    tokens[idx] = { blank: bi, core: t.core, pre: t.pre, post: t.post };
  });

  return { tokens, answers };
}

/**
 * Fisher-Yates shuffle. Kept here for the callers that render a word
 * bank — do NOT use this to seed initial state during SSR (React will
 * mismatch on hydration). Start deterministic on mount, then re-shuffle
 * inside a client-only `useEffect`.
 */
export function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
