/**
 * Per-game anti-repeat memory, persisted in localStorage so the same
 * words don't recur across play sessions. Each word-based game stores
 * its own `used` set under a slug-scoped key.
 *
 *   const { pickFresh, markUsed } = useSessionWordHistory("hangman");
 *   const chosen = pickFresh(pool, 10);  // prefers never-used words
 *   markUsed(chosen);                    // after they've been played
 *
 * When the pool is exhausted (every word already used), `pickFresh`
 * silently resets the history and fills from the whole pool — so the
 * game never stalls for lack of fresh words.
 */

import { useCallback, useRef } from "react";

const STORAGE_PREFIX = "kc:usedWords:";

export interface SessionWordHistory {
  /**
   * Return up to `count` words from `pool`, preferring words that
   * haven't been used in previous local sessions. Shuffles within the
   * fresh pool so order isn't deterministic.
   */
  pickFresh: (pool: string[], count: number) => string[];
  /** Record `words` as used so future `pickFresh` calls avoid them. */
  markUsed: (words: string[]) => void;
  /** Clear the stored history for this game. */
  reset: () => void;
}

const canonical = (w: string): string => w.toUpperCase().trim();

function shuffleInPlace<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function useSessionWordHistory(gameSlug: string): SessionWordHistory {
  const storageKey = STORAGE_PREFIX + gameSlug;
  // Cache the Set in a ref so we don't thrash localStorage on every
  // pickFresh — reads come from memory, writes go through persist().
  const cacheRef = useRef<Set<string> | null>(null);

  const load = useCallback((): Set<string> => {
    if (cacheRef.current) return cacheRef.current;
    try {
      if (typeof window === "undefined") {
        cacheRef.current = new Set();
      } else {
        const raw = window.localStorage.getItem(storageKey);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        cacheRef.current = new Set(
          Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [],
        );
      }
    } catch {
      cacheRef.current = new Set();
    }
    return cacheRef.current;
  }, [storageKey]);

  const persist = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify([...(cacheRef.current ?? new Set())]),
      );
    } catch {
      // Private mode / quota / disabled storage — history just stays
      // in-memory, which is still better than nothing.
    }
  }, [storageKey]);

  const pickFresh = useCallback(
    (pool: string[], count: number): string[] => {
      if (pool.length === 0 || count <= 0) return [];

      const used = load();
      const fresh = pool.filter((w) => !used.has(canonical(w)));

      // Shuffle fresh words and take.
      const chosen = shuffleInPlace([...fresh]).slice(0, count);

      // Pool exhausted mid-pick: reset history and fill the remainder
      // from the whole shuffled pool, skipping anything we already took.
      if (chosen.length < count) {
        used.clear();
        const taken = new Set(chosen.map(canonical));
        const remainder = shuffleInPlace(
          pool.filter((w) => !taken.has(canonical(w))),
        ).slice(0, count - chosen.length);
        chosen.push(...remainder);
        persist();
      }

      return chosen;
    },
    [load, persist],
  );

  const markUsed = useCallback(
    (words: string[]) => {
      const used = load();
      for (const w of words) used.add(canonical(w));
      persist();
    },
    [load, persist],
  );

  const reset = useCallback(() => {
    cacheRef.current = new Set();
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  return { pickFresh, markUsed, reset };
}
