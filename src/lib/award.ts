/**
 * Client-side helper for awarding an encyclopedia entry to the current
 * user. Two paths:
 *
 *  - `rollForRandomAward(source, probability)` — random drop from the
 *    "surprise reward" pool. Callers use this on game completion and
 *    study-guide saves. Only fires (calls the endpoint) with the
 *    given probability; otherwise resolves to null without a request.
 *
 *  - `awardSpecificSlug(slug, source)` — targeted award for known-
 *    correct answers (Who Am I? correct guess, Trivia character-tied
 *    right answer). Goes through the existing collect-batch endpoint.
 *
 * Both return `AwardedEntry | null` — a non-null result is the caller's
 * cue to show a toast (via <AwardToast />).
 */

export interface AwardedEntry {
  slug: string;
  term: string;
  imageUrl: string | null;
}

const DEFAULT_PROBABILITY = 0.25;

export async function rollForRandomAward(
  source: string,
  probability = DEFAULT_PROBABILITY,
): Promise<AwardedEntry | null> {
  if (Math.random() > probability) return null;
  try {
    const res = await fetch("/api/encyclopedia/award/random", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body?.awarded || !body?.entry) return null;
    return {
      slug: body.entry.slug,
      term: body.entry.term,
      imageUrl: body.entry.imageUrl ?? null,
    };
  } catch {
    return null;
  }
}

export async function awardSpecificSlug(
  slug: string,
  source: string,
): Promise<AwardedEntry | null> {
  try {
    const res = await fetch("/api/encyclopedia/collect-batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tokens: [slug], source }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    // collect-batch returns `{ newlyCollected: number, entries: [...] }`.
    // Only surface a toast when this call actually collected something
    // new — repeat-play shouldn't spam awards.
    if (
      typeof body?.newlyCollected !== "number" ||
      body.newlyCollected === 0
    ) {
      return null;
    }
    const entry = Array.isArray(body.entries) ? body.entries[0] : null;
    if (!entry) return null;
    return {
      slug: entry.slug,
      term: entry.term,
      imageUrl: entry.imageUrl ?? null,
    };
  } catch {
    return null;
  }
}
