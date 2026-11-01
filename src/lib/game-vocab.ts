/**
 * Client-side helper for word-based games: fetch N random terms from
 * the shared VocabularyTerm catalog via /api/vocabulary/random.
 *
 * When a game is played standalone (no content pack), this replaces
 * each game's small hardcoded DEFAULT_WORDS fallback with the full
 * catalog of everything the admin has ever ingested — hundreds of
 * terms instead of ~15. See src/app/api/vocabulary/random/route.ts.
 *
 * Returns [] on failure so callers can fall back to their own defaults
 * without crashing.
 */

export interface CatalogWordsOptions {
  /** "WORD" (single word, no spaces) or "PHRASE" (multi-word). */
  type?: "WORD" | "PHRASE";
  /** How many terms to fetch. Clamped server-side to [1, 200]. */
  limit?: number;
  /** Minimum display length in characters. */
  minLen?: number;
  /** Maximum display length in characters. */
  maxLen?: number;
}

export async function fetchCatalogWords(
  options: CatalogWordsOptions = {},
): Promise<string[]> {
  const params = new URLSearchParams();
  if (options.type) params.set("type", options.type);
  if (options.limit != null) params.set("limit", String(options.limit));
  if (options.minLen != null) params.set("minLen", String(options.minLen));
  if (options.maxLen != null) params.set("maxLen", String(options.maxLen));

  try {
    const res = await fetch(`/api/vocabulary/random?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      terms?: Array<{ display: string }>;
    };
    return (body.terms ?? [])
      .map((t) => t.display)
      .filter((s) => typeof s === "string" && s.length > 0);
  } catch {
    return [];
  }
}
