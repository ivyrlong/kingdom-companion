/**
 * Daily Text — age-tiered ingestion.
 *
 * ── Copyright posture ────────────────────────────────────────────────
 *
 * Two different rules apply to the two halves of a Daily Text entry:
 *
 *   • The SCRIPTURE is Bible text. It is stored verbatim, displayed
 *     verbatim, and its citation is rendered as a pill linking to
 *     jw.org (see `lib/scripture.ts`).
 *
 *   • The COMMENT is publication prose. It is NEVER stored. It flows
 *     through `buildDailyTextPrompt` in memory, is turned into four
 *     summaries written in our own words, and is then dropped. Nothing
 *     persisted by this module reproduces it.
 *
 * That matches the posture `wol-import.ts` already takes for Watchtower
 * and workbook articles, and it's what the About page promises.
 *
 * ── How the four tiers get written ───────────────────────────────────
 *
 * Same manual handoff as `oclm-insights.ts` — no API key, no per-day
 * cost:
 *
 *   1. Admin pastes the day's comment into the form.
 *   2. `buildDailyTextPrompt()` returns a prompt to run in ChatGPT or
 *      Claude web.
 *   3. `applyPastedDailyText()` validates the JSON that comes back.
 *   4. `createOrReplaceDailyText()` persists the tiers — never the
 *      source comment.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseDailyText } from "@/lib/content-parser";
import { rejoinLineBreakHyphens } from "@/lib/text-cleanup";
import { toCitation, type ScriptureCitation } from "@/lib/scripture";

// ── Tier shapes ───────────────────────────────────────────────────────

export type DailyTier = "littleOnes" | "youth" | "adult" | "family";

export const DAILY_TIERS: DailyTier[] = [
  "littleOnes",
  "youth",
  "adult",
  "family",
];

/** Maps the AgeGroup enum onto the tier keys used in `commentByTier`. */
const TIER_BY_AGE_GROUP: Record<string, DailyTier> = {
  LITTLE_ONES: "littleOnes",
  YOUTH: "youth",
  ADULT: "adult",
  FAMILY: "family",
};

export interface TierComment {
  /** The day's thought, in our own words, pitched at this tier. */
  summary: string;
  /**
   * Open-ended question for reading the text together. Populated for
   * the `family` tier only — Family means one adult reading aloud to
   * mixed ages, so it carries adult-depth text plus a prompt to talk
   * it over.
   */
  discussionQuestion?: string;
}

export interface DailyCommentByTier {
  littleOnes: TierComment;
  youth: TierComment;
  adult: TierComment;
  family: TierComment;
}

/**
 * Per-tier fallback order. Every tier can degrade to something sensible
 * if a summary is missing, so a partially-filled row never renders
 * blank. Family falls back to adult (same depth), and Little Ones falls
 * back *up* only as a last resort.
 */
const TIER_FALLBACKS: Record<DailyTier, DailyTier[]> = {
  littleOnes: ["littleOnes", "youth", "family", "adult"],
  youth: ["youth", "family", "adult", "littleOnes"],
  adult: ["adult", "family", "youth", "littleOnes"],
  family: ["family", "adult", "youth", "littleOnes"],
};

// ── Input / output ────────────────────────────────────────────────────

export interface DailyTextInput {
  date: Date;
  scriptureRef: string;
  /** Verbatim NWT wording. Stored and displayed as-is. */
  scriptureText: string;
  /**
   * The four summaries. Preferred path.
   */
  commentByTier?: DailyCommentByTier | null;
  /**
   * Legacy two-tier fields, still accepted so the existing admin form
   * and CSV importer keep working untouched. When `commentByTier` is
   * absent these are promoted into the adult / littleOnes tiers.
   *
   * Passing publication prose here reproduces it in the database —
   * prefer `commentByTier`.
   */
  comment?: string;
  simplifiedComment?: string;
  featuredGameSlug?: string | null;
}

export interface DailyTextResult {
  date: string; // ISO
  title: string;
  instancesCreated: number;
  replaced: boolean;
  /** Tiers that ended up with real text, for admin feedback. */
  tiersWritten: DailyTier[];
}

// ── Tier helpers ──────────────────────────────────────────────────────

function cleanTier(raw: unknown): TierComment | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const summary =
    typeof r.summary === "string"
      ? rejoinLineBreakHyphens(r.summary).trim()
      : "";
  if (!summary) return null;
  const question =
    typeof r.discussionQuestion === "string"
      ? rejoinLineBreakHyphens(r.discussionQuestion).trim()
      : "";
  return question ? { summary, discussionQuestion: question } : { summary };
}

/**
 * Normalise whatever the caller supplied into a partial tier map.
 * Legacy `comment` / `simplifiedComment` are folded in only where the
 * tiered payload left a gap, so an explicit tier always wins.
 */
function normaliseTiers(
  input: DailyTextInput,
): Partial<Record<DailyTier, TierComment>> {
  const out: Partial<Record<DailyTier, TierComment>> = {};

  const supplied = input.commentByTier;
  if (supplied && typeof supplied === "object") {
    for (const tier of DAILY_TIERS) {
      const cleaned = cleanTier(
        (supplied as unknown as Record<string, unknown>)[tier],
      );
      if (cleaned) out[tier] = cleaned;
    }
  }

  const legacyAdult = (input.comment ?? "").trim();
  if (!out.adult && legacyAdult) {
    out.adult = { summary: rejoinLineBreakHyphens(legacyAdult) };
  }
  const legacyLittle = (input.simplifiedComment ?? "").trim();
  if (!out.littleOnes && legacyLittle) {
    out.littleOnes = { summary: rejoinLineBreakHyphens(legacyLittle) };
  }

  return out;
}

/**
 * The stored shape for a content pack's tiered comment. Mirrors
 * `ContentPack.commentByTier`, with every field optional because a row
 * may predate tiering or have been only partially filled.
 */
export type StoredCommentByTier = Partial<Record<DailyTier, TierComment>>;

/**
 * Pick the right tier for a viewer, walking the fallback chain.
 *
 * Accepts the pack fields directly so callers can pass a Prisma row
 * without reshaping it. Returns null only when there is no usable text
 * anywhere — the caller's cue to render nothing rather than an empty
 * card.
 */
export function resolveDailyComment(
  pack: {
    commentByTier?: unknown;
    comment?: string | null;
    simplifiedComment?: string | null;
  },
  ageGroup: string | null | undefined,
): TierComment | null {
  const tier = TIER_BY_AGE_GROUP[ageGroup ?? ""] ?? "youth";

  const stored: StoredCommentByTier = {};
  const raw = pack.commentByTier;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const t of DAILY_TIERS) {
      const cleaned = cleanTier((raw as Record<string, unknown>)[t]);
      if (cleaned) stored[t] = cleaned;
    }
  }

  // Pre-tiering rows: promote the legacy columns so they still render.
  if (!stored.adult && pack.comment?.trim()) {
    stored.adult = { summary: pack.comment.trim() };
  }
  if (!stored.littleOnes && pack.simplifiedComment?.trim()) {
    stored.littleOnes = { summary: pack.simplifiedComment.trim() };
  }

  for (const candidate of TIER_FALLBACKS[tier]) {
    const hit = stored[candidate];
    if (hit) {
      // A family reader keeps their discussion question even when the
      // text itself came from the adult tier.
      if (tier === "family" && candidate !== "family") {
        const q = stored.family?.discussionQuestion;
        return q ? { ...hit, discussionQuestion: q } : hit;
      }
      // Other tiers never show the family question.
      if (tier !== "family" && hit.discussionQuestion) {
        return { summary: hit.summary };
      }
      return hit;
    }
  }
  return null;
}

/**
 * The day's scripture, ready to render: verbatim text plus a citation
 * pill that links to jw.org.
 */
export function resolveDailyScripture(pack: {
  scriptures?: unknown;
}): { citation: ScriptureCitation; text: string } | null {
  const list = Array.isArray(pack.scriptures) ? pack.scriptures : [];
  const first = list[0] as { reference?: unknown; text?: unknown } | undefined;
  if (!first || typeof first.reference !== "string") return null;
  return {
    citation: toCitation(first.reference),
    text: typeof first.text === "string" ? first.text : "",
  };
}

// ── Game generation ───────────────────────────────────────────────────

// Which evergreen game engines can be auto-generated from one day's text.
function isDailyGameCompatible(
  slug: string,
  data: {
    vocabulary: string[];
    keyPeople: string[];
    questions: string[];
    keyPhrases: string[];
  },
): boolean {
  switch (slug) {
    case "bible-word-search":
      return data.vocabulary.length >= 5;
    case "scripture-memory-match":
      return false; // only 1 scripture in a daily text
    case "theocratic-trivia":
      return data.questions.length >= 3;
    case "who-am-i":
      return data.keyPeople.length >= 1;
    case "name-that-scripture":
      return true;
    case "cryptogram":
      return data.keyPhrases.length >= 1;
    case "hangman":
      return data.vocabulary.length >= 3;
    default:
      return false;
  }
}

// ── Persist ───────────────────────────────────────────────────────────

/**
 * Create (or replace) the Daily Text pack for a day and auto-generate
 * compatible game instances.
 *
 * If a Daily Text pack already exists for that calendar day (UTC), it
 * and its game instances are deleted and recreated ("replace" policy).
 * The whole operation is one transaction so a day is never left half
 * written. Shared by the single-entry form and the CSV bulk import.
 *
 * Game content is derived from the scripture plus OUR summaries — never
 * from the source comment, which this function is never given.
 */
export async function createOrReplaceDailyText(
  input: DailyTextInput,
): Promise<DailyTextResult> {
  const { date } = input;
  const scriptureRef = rejoinLineBreakHyphens(input.scriptureRef).trim();
  const scriptureText = rejoinLineBreakHyphens(input.scriptureText).trim();
  const featuredGameSlug = input.featuredGameSlug ?? null;

  const tiers = normaliseTiers(input);
  const tiersWritten = DAILY_TIERS.filter((t) => tiers[t]);
  if (tiersWritten.length === 0) {
    throw new Error(
      "A Daily Text needs at least one tier summary. Generate the tiers " +
        "from the comment, or supply commentByTier directly.",
    );
  }

  // Derive game content from the verse plus our own summaries. The
  // family discussion question is appended so `extractQuestions` always
  // has at least one real question to find.
  const derivedProse = [
    ...tiersWritten.map((t) => tiers[t]!.summary),
    tiers.family?.discussionQuestion ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const extracted = parseDailyText(scriptureRef, scriptureText, derivedProse);

  const dateStr = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  const dayStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayEnd = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1),
  );

  return prisma.$transaction(async (tx) => {
    const existing = await tx.contentPack.findFirst({
      where: { source: "DAILY_TEXT", date: { gte: dayStart, lt: dayEnd } },
      select: { id: true },
    });

    let replaced = false;
    if (existing) {
      await tx.gameInstance.deleteMany({
        where: { contentPackId: existing.id },
      });
      await tx.contentPack.delete({ where: { id: existing.id } });
      replaced = true;
    }

    const pack = await tx.contentPack.create({
      data: {
        title: `Daily Text — ${dateStr}`,
        source: "DAILY_TEXT",
        context: "DAILY",
        date,
        // Citation + verbatim Bible text only. The source comment is
        // deliberately absent — see the copyright note at the top.
        sourceText: `${scriptureRef}\n\n${scriptureText}`,
        // Cast through unknown: our tier interfaces are structurally
        // valid JSON, but they lack the index signature Prisma's
        // InputJsonObject requires.
        commentByTier: tiers as unknown as Prisma.InputJsonValue,
        // Legacy mirrors, so readers that haven't moved to
        // commentByTier still show derivative text rather than blanks.
        comment: tiers.adult?.summary ?? tiers.family?.summary ?? null,
        simplifiedComment: tiers.littleOnes?.summary ?? null,
        featuredGameSlug,
        vocabulary: extracted.vocabulary,
        scriptures: [{ reference: scriptureRef, text: scriptureText }],
        keyPeople: extracted.keyPeople,
        themes: extracted.themes,
        questions: extracted.questions,
        keyPhrases: extracted.keyPhrases,
      },
    });

    const games = await tx.game.findMany({ where: { isActive: true } });
    const instances = games
      .filter((g) => isDailyGameCompatible(g.slug, extracted))
      .map((g) => ({
        gameId: g.id,
        contentPackId: pack.id,
        context: "DAILY" as const,
        title: `${g.title} — Daily Text ${dateStr}`,
      }));

    if (instances.length > 0) {
      await tx.gameInstance.createMany({ data: instances });
    }

    return {
      date: date.toISOString(),
      title: pack.title,
      instancesCreated: instances.length,
      replaced,
      tiersWritten,
    };
  });
}

// ── Manual AI handoff ─────────────────────────────────────────────────

const SYSTEM_RULES = `You are a study assistant for a Jehovah's Witness family app. You are given one day's Daily Text — a Bible verse and the short comment printed with it — and you rewrite the comment's thought as four age-tiered summaries.

Doctrinal posture — you MUST follow these rules:
- You are NOT interpreting Scripture. Base every summary on what the verse and comment actually say, not on your own theological views.
- Do NOT introduce concepts or Bible references that are not in the source material.
- Do NOT use cross imagery, cross language, or the word "cross". Jehovah's Witnesses believe Jesus died on an upright stake. If Jesus' death comes up, use neutral language like "Jesus' death" or "the ransom".
- Do NOT use the fictional Bible-story children "Caleb" or "Sophia".
- Match the vocabulary of the JW audience: "Jehovah" (not "the Lord" or "God alone" when Jehovah is meant), "brothers and sisters", "the congregation", "the ministry", "field service", "the Kingdom".
- Jehovah is never depicted or described physically. Jesus may be referred to normally.

Writing posture — this is the important part:
- You are WRITING NEW TEXT, not trimming the original. Do not copy sentences or distinctive phrases from the comment. Never reuse more than about five consecutive words from it.
- Each tier is a fresh piece of writing that conveys the same practical thought at that reading level.
- You MAY quote the Bible verse itself — Bible wording is fine to reuse.
- Warm and plain. No preaching, no doctrine beyond what the source states.`;

/** Per-tier authoring brief, shared by the prompt and the docs. */
const TIER_BRIEFS: Record<DailyTier, string> = {
  littleOnes:
    'littleOnes — ages about 5-8. ONE or TWO short sentences, under 200 characters. Concrete and warm. Name a thing a child can picture. No abstract nouns like "integrity" or "sovereignty". This is read aloud to a child who may not read yet.',
  youth:
    "youth — ages about 9-17. TWO or THREE sentences, under 400 characters. Says plainly what the verse is about and one realistic way it applies to a young person's actual week — school, friends, family, the ministry. Never talks down.",
  adult:
    "adult — TWO to FOUR sentences, under 700 characters. The full thought of the day, including the reasoning behind it. Written for someone who has read the verse and wants the point developed.",
  family:
    "family — ONE adult or parent reading aloud to children of mixed ages. Use the SAME depth as the adult tier (under 700 characters), then add a separate `discussionQuestion`: one open-ended question, under 200 characters, that a family could actually talk over. Not yes/no. Tied to this specific text, not a generic Bible question.",
};

export interface DailyTextPromptInput {
  date: Date;
  scriptureRef: string;
  scriptureText: string;
  /**
   * The published comment. Used to build the prompt and then dropped —
   * this string is never returned, stored, or logged.
   */
  sourceComment: string;
}

/**
 * Compose a prompt the admin can paste into ChatGPT or Claude web.
 *
 * Mirrors `buildPromptForPack` in `oclm-insights.ts`: the whole point is
 * that no API key is needed and there is no per-day cost. The returned
 * string is the only thing that leaves this function — the source
 * comment is not echoed back to the caller.
 */
export function buildDailyTextPrompt(input: DailyTextPromptInput): string {
  const dateStr = input.date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const citation = toCitation(input.scriptureRef);

  const briefs = DAILY_TIERS.map(
    (tier, i) => `  ${i + 1}. ${TIER_BRIEFS[tier]}`,
  ).join("\n");

  return `${SYSTEM_RULES}

──────────────────────────────────────────────────────────────
DAILY TEXT — ${dateStr}

Scripture (${citation.label}):
"${input.scriptureText.trim()}"

The published comment (REWRITE this thought — do not copy its wording):
---
${input.sourceComment.trim().slice(0, 6000)}
---

──────────────────────────────────────────────────────────────
Write FOUR summaries of the comment's thought:

${briefs}

Return ONE JSON object, no code fences, no commentary, with exactly this shape:
{
  "littleOnes": { "summary": "..." },
  "youth":      { "summary": "..." },
  "adult":      { "summary": "..." },
  "family":     { "summary": "...", "discussionQuestion": "..." }
}

Return the JSON object now.`;
}

export interface AppliedDailyText {
  commentByTier: DailyCommentByTier;
  /** Tiers the AI returned usable text for. */
  tiersWritten: DailyTier[];
  /** Tiers that came back empty or malformed. */
  missingTiers: DailyTier[];
  /** Tiers whose text exceeded its brief and was kept anyway. */
  overLengthTiers: DailyTier[];
}

/** Soft length ceilings, matching the briefs above. */
const TIER_LIMITS: Record<DailyTier, number> = {
  littleOnes: 200,
  youth: 400,
  adult: 700,
  family: 700,
};

/**
 * Parse and validate a pasted AI response into the tiered shape.
 *
 * Tolerant in the same ways `applyPastedInsights` is — strips markdown
 * fences, accepts the object either bare or wrapped in `{ tiers: ... }`
 * — because the admin is pasting out of a chat window.
 *
 * Throws on unusable input so the caller can show the reason. Missing
 * individual tiers are reported rather than thrown, so a nearly-good
 * response is still savable.
 */
export function applyPastedDailyText(rawPasted: string): AppliedDailyText {
  const stripped = rawPasted
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  if (!stripped) {
    throw new Error("Nothing pasted — copy the AI's full JSON reply.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    throw new Error(
      `Response is not valid JSON: ${
        e instanceof Error ? e.message : String(e)
      }. Paste the entire JSON object, with no code fences.`,
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      'Response must be a JSON object like { "littleOnes": { "summary": "..." }, ... }.',
    );
  }

  const root = parsed as Record<string, unknown>;
  // Accept a { tiers: {...} } wrapper as well as the bare object.
  const body =
    root.tiers && typeof root.tiers === "object" && !Array.isArray(root.tiers)
      ? (root.tiers as Record<string, unknown>)
      : root;

  const tiers: Partial<Record<DailyTier, TierComment>> = {};
  const missingTiers: DailyTier[] = [];
  const overLengthTiers: DailyTier[] = [];

  for (const tier of DAILY_TIERS) {
    // Accept a bare string as well as { summary } — chat models
    // sometimes flatten the single-key object.
    const rawTier = body[tier];
    const cleaned =
      typeof rawTier === "string"
        ? cleanTier({ summary: rawTier })
        : cleanTier(rawTier);

    if (!cleaned) {
      missingTiers.push(tier);
      continue;
    }
    if (cleaned.summary.length > TIER_LIMITS[tier]) {
      overLengthTiers.push(tier);
    }
    // Only the family tier carries a discussion question.
    tiers[tier] =
      tier === "family"
        ? cleaned
        : { summary: cleaned.summary };
  }

  if (missingTiers.length === DAILY_TIERS.length) {
    throw new Error(
      "No usable tiers found. Expected keys: " +
        DAILY_TIERS.join(", ") +
        " — each an object with a `summary` string.",
    );
  }

  // Fill any gap from the fallback chain so the saved row is complete.
  const complete = {} as DailyCommentByTier;
  for (const tier of DAILY_TIERS) {
    const direct = tiers[tier];
    if (direct) {
      complete[tier] = direct;
      continue;
    }
    const donor = TIER_FALLBACKS[tier].find((t) => tiers[t]);
    complete[tier] = { summary: tiers[donor!]!.summary };
  }

  return {
    commentByTier: complete,
    tiersWritten: DAILY_TIERS.filter((t) => tiers[t]),
    missingTiers,
    overLengthTiers,
  };
}
