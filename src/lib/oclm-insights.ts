/**
 * OCLM AI insights — per-part, per-week summaries synthesised by Claude.
 *
 * The templated scaffolding in `oclm-scaffolding.ts` gives every meeting
 * week generic-per-kind prep prompts (Bible Reading → "read it aloud
 * twice"). Insights adds the *specific* layer: given the actual paragraph
 * prose of a workbook part, generate a Little-Ones summary, a family
 * discussion question, and 3–5 "things you'll hear" phrases tuned to
 * what the chairman/talker will actually say this week.
 *
 * Copyright posture:
 *   • Body prose flows in-memory during the call and is discarded.
 *   • Only derivative, paraphrased content is stored (the three fields).
 *   • Prose is never persisted to the database.
 *   • The call is opt-in per pack (admin clicks "Generate AI insights").
 *
 * JW-audience constraints (see feedback_no_crosses, feedback_copyright):
 *   • No cross imagery (system prompt bans it).
 *   • No doctrinal assertions — prompts frame Claude as a study helper,
 *     not an interpreter.
 *   • No fictional characters named Caleb & Sophia.
 *
 * Model: claude-haiku-4-5 — right tier for structured summarization of
 * 1–3k-token inputs at ~$0.02 per full-week import.
 */

import Anthropic from "@anthropic-ai/sdk";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { OclmPartKind, OclmSectionKind } from "./wol-import";

// ── Shared types ──────────────────────────────────────────────────────

export interface AiPartInsights {
  /** 2-sentence summary written for ages ~4–7. Concrete, no jargon. */
  kidSummary: string;
  /** One question a family could use around dinner or family worship. */
  familyDiscussionQuestion: string;
  /**
   * 3–5 phrases likely to be spoken during this part at the meeting —
   * concrete enough to seed a Little Ones "tap when you hear" card.
   */
  listeningPhrases: string[];
}

interface PartLocator {
  section: OclmSectionKind;
  number?: number;
  title: string;
  kind: OclmPartKind;
}

interface PartWithProse extends PartLocator {
  /** Plain-text body prose, in-memory only. Not persisted. */
  prose: string;
}

/**
 * Stable string identifier for a part inside a pack. Matches the shape
 * used by WorkbookPanel's localStorage keys and by the merge step below.
 */
export function insightsKeyFor(p: PartLocator): string {
  return `${p.section}:${p.number ?? ""}:${p.title}`;
}

// ── Prose extraction (mirrors the importer's section walker) ──────────

const SECTION_SELECTOR =
  "h3, div.dc-icon--gem, div.dc-icon--wheat, div.dc-icon--sheep";

/**
 * Re-parse the imported OCLM article HTML and extract each part's body
 * prose as plain text — same walking pattern as `collectOclmSections`
 * in wol-import.ts. Kept local (not exported from wol-import) because
 * the importer intentionally throws body prose away; we want it here
 * only long enough to send to Claude.
 */
function collectPartProse(
  contentHtml: string,
): PartWithProse[] {
  const $: CheerioAPI = cheerio.load(contentHtml);
  const out: PartWithProse[] = [];
  type Kind = OclmSectionKind;
  let currentSection: Kind = "OPENING";

  $(".bodyTxt")
    .find(SECTION_SELECTOR)
    .each((_, el) => {
      const $el = $(el);
      const tagName = ($el.prop("tagName") ?? "").toLowerCase();
      const classes = ($el.attr("class") ?? "").split(/\s+/);

      if (tagName === "div") {
        if (classes.includes("dc-icon--gem")) currentSection = "TREASURES";
        else if (classes.includes("dc-icon--wheat")) currentSection = "MINISTRY";
        else if (classes.includes("dc-icon--sheep")) currentSection = "LIVING";
        return;
      }

      // h3
      const isSong = classes.includes("dc-icon--music");
      if (isSong) return; // songs get no insights

      const isColored = classes.some(
        (c) =>
          c.startsWith("du-color--teal") ||
          c.startsWith("du-color--gold") ||
          c.startsWith("du-color--maroon"),
      );
      if (!isColored && currentSection === "LIVING") {
        currentSection = "CLOSING";
      }

      const headerText = $el.text().replace(/\s+/g, " ").trim();
      const strongText = $el
        .find("strong")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim();
      const rawTitle = strongText || headerText;
      const numMatch = rawTitle.match(/^\s*(\d+)\.\s*(.+)$/);
      const number = numMatch ? Number(numMatch[1]) : undefined;
      const title = numMatch
        ? numMatch[2].trim()
        : rawTitle.replace(/\s*\(\d+\s*min\.\).*$/i, "").trim();

      let $body = $el.next("div");
      if ($body.length === 0) {
        $body = $el.nextUntil(SECTION_SELECTOR);
      }

      // Drop navigation cruft (paragraph numbers, screen-reader-only text)
      // and normalise whitespace.
      const $clone = $body.clone();
      $clone
        .find("span.parNum, span.pageNum, .dc-screenReaderText")
        .remove();
      const prose = $clone.text().replace(/\s+/g, " ").trim();
      if (!prose) return;

      out.push({
        section: currentSection,
        number,
        title,
        kind: "talk" as OclmPartKind, // caller can override via locator match
        prose,
      });
    });

  return out;
}

// ── Anthropic call ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a study assistant for a Jehovah's Witness family app used to prepare for the midweek meeting (the "Christian Life and Ministry" meeting).

You will be given a single part of the meeting: its section, title, and the paragraph text as it appears in the workbook. Your job is to produce three tightly-scoped outputs to help a family prepare together.

Doctrinal posture — you MUST follow these rules:
- You are NOT interpreting Scripture. Base every output on what the paragraph text actually says, not on your own theological views.
- Do NOT introduce concepts or Bible references that are not in the paragraph text.
- Do NOT use cross imagery, cross language, or the word "cross". Jehovah's Witnesses believe Jesus died on an upright stake. If the paragraph text mentions Jesus' death, use neutral language like "Jesus' death" or "the ransom" — never "the cross".
- Do NOT use the fictional Bible-story children "Caleb" or "Sophia".
- Match the vocabulary of the JW audience: "Jehovah" (not "the Lord" or "God" alone when Jehovah is meant), "brothers and sisters", "the congregation", "the ministry", "field service", "the Kingdom".
- If the paragraph text is very short or largely a citation list, produce shorter outputs rather than filling with invented content.

You paraphrase — you do NOT quote the paragraph verbatim beyond ~5-word fragments.`;

const PART_SCHEMA = {
  type: "object",
  properties: {
    kidSummary: {
      type: "string",
      description:
        "A 2-sentence summary written for children ~4–7. Concrete, warm, no jargon. Explains what this meeting part is about — NOT a moral lesson. If the part is a talk about a Bible chapter, name the person or event a child would remember. Under 240 characters.",
    },
    familyDiscussionQuestion: {
      type: "string",
      description:
        "One question a family could discuss around dinner or family worship this week. Open-ended (not yes/no). Tied to the actual point of THIS part, not a generic Bible question. Under 200 characters.",
    },
    listeningPhrases: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 5,
      description:
        "3–5 short phrases (2–5 words each) that a child could plausibly hear said aloud during this meeting part. Concrete nouns, verbs, or Bible-character names actually present in the paragraph text — not generic vocabulary. Used to seed a listening game.",
    },
  },
  required: ["kidSummary", "familyDiscussionQuestion", "listeningPhrases"],
  additionalProperties: false,
} as const;

/**
 * Build the per-part user message. Kept short and structured so Claude
 * has the source material front and centre with no room to drift into
 * general commentary.
 */
function partPrompt(p: PartWithProse): string {
  const sectionLabel = {
    OPENING: "Opening",
    TREASURES: "Treasures From God's Word",
    MINISTRY: "Apply Yourself to the Field Ministry",
    LIVING: "Living as Christians",
    CLOSING: "Closing / Concluding Comments",
  }[p.section];

  return `Section: ${sectionLabel}
Part title: ${p.title}

Paragraph text from the workbook:
---
${p.prose.slice(0, 6000)}
---

Produce the three outputs described in the system prompt, based only on the paragraph text above.`;
}

/**
 * Call Claude for a single part. Returns null on refusal / unparseable
 * output so a single failure doesn't kill the batch.
 */
async function generateOne(
  client: Anthropic,
  p: PartWithProse,
): Promise<AiPartInsights | null> {
  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      output_config: {
        format: {
          type: "json_schema",
          schema: PART_SCHEMA,
        },
      },
      messages: [{ role: "user", content: partPrompt(p) }],
    });

    // Structured-output responses put the JSON inside a text block.
    const textBlock = res.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    if (!textBlock) return null;
    const parsed = JSON.parse(textBlock.text) as AiPartInsights;

    // Belt-and-suspenders sanity check — schema-constrained decoding
    // gives us shape guarantees but not length guarantees.
    if (
      !parsed.kidSummary ||
      !parsed.familyDiscussionQuestion ||
      !Array.isArray(parsed.listeningPhrases) ||
      parsed.listeningPhrases.length < 3
    ) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.error(
      `[oclm-insights] failed for part "${p.title}":`,
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

// ── Public entry point ────────────────────────────────────────────────

export interface InsightsResult {
  /** Keyed by insightsKeyFor(part). */
  byPart: Record<string, AiPartInsights>;
  /** Parts we attempted but couldn't produce output for. */
  failures: Array<{ section: OclmSectionKind; title: string; reason: string }>;
  /** Total parts that had prose to send. */
  attempted: number;
}

/**
 * Structural pack input — accepts either the importer's OclmDraftPack
 * or the panel's WorkbookSection[]. The generator only needs the URL
 * and the sections/parts titles + kind (to skip songs).
 */
export interface InsightsInput {
  sourceUrl: string | null;
  sections: Array<{
    kind: OclmSectionKind;
    parts: Array<{ number?: number; kind: string; title: string }>;
  }>;
}

/**
 * Generate AI insights for every non-song part in `pack`, using the
 * workbook article HTML at `pack.sourceUrl`. Requires ANTHROPIC_API_KEY
 * to be set — throws with a friendly message otherwise so the admin
 * endpoint can surface it.
 *
 * Parts are processed in parallel (≤ 11 per week; Claude handles that
 * concurrency comfortably). Failures are per-part, not global.
 */
export async function generateInsightsForPack(
  pack: InsightsInput,
): Promise<InsightsResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env and restart the dev server before generating AI insights.",
    );
  }
  if (!pack.sourceUrl) {
    throw new Error(
      "This pack has no sourceUrl — it was pasted rather than imported from a WOL URL. Re-import via URL to enable AI insights.",
    );
  }

  // Re-fetch the article HTML. We deliberately use the raw JSON endpoint
  // (matches importFromWolUrl) so cheerio sees the same DOM the importer
  // walked.
  const canonical = pack.sourceUrl.replace(/\/en\/wol\//, "/wol/");
  const res = await fetch(canonical);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch article HTML from ${canonical} (${res.status}).`,
    );
  }
  const json = (await res.json()) as { content?: string };
  if (!json.content) {
    throw new Error(`Article at ${canonical} returned no content payload.`);
  }

  const proseParts = collectPartProse(json.content);

  // Match extracted prose back to the pack's authoritative parts by
  // title + section, so we can key the results the same way the panel
  // will look them up. If a title didn't survive the walker (unlikely)
  // we just skip that part.
  // Match by (section, number, lowercased title). Number matters because
  // OCLM weeks routinely have two consecutive "Starting a Conversation"
  // parts with different scenario tags — without the number they'd
  // collapse into the same lookup slot and share insights.
  const packLookup = new Map<string, PartLocator>();
  for (const s of pack.sections) {
    for (const p of s.parts) {
      if (p.kind === "song") continue;
      const key = `${s.kind}::${p.number ?? ""}::${p.title.toLowerCase()}`;
      packLookup.set(key, {
        section: s.kind,
        number: p.number,
        title: p.title,
        kind: p.kind as OclmPartKind,
      });
    }
  }

  const matched: PartWithProse[] = [];
  const failures: InsightsResult["failures"] = [];
  for (const p of proseParts) {
    const key = `${p.section}::${p.number ?? ""}::${p.title.toLowerCase()}`;
    const locator = packLookup.get(key);
    if (!locator) {
      failures.push({
        section: p.section,
        title: p.title,
        reason: "Could not match extracted prose to a pack part.",
      });
      continue;
    }
    matched.push({ ...p, ...locator });
  }

  const client = new Anthropic();
  const results = await Promise.all(
    matched.map(async (p) => ({ p, insights: await generateOne(client, p) })),
  );

  const byPart: Record<string, AiPartInsights> = {};
  for (const { p, insights } of results) {
    if (insights) {
      byPart[insightsKeyFor(p)] = insights;
    } else {
      failures.push({
        section: p.section,
        title: p.title,
        reason: "Model returned an empty or unparseable response.",
      });
    }
  }

  return {
    byPart,
    failures,
    attempted: matched.length,
  };
}

// ── Manual (copy-paste) workflow ──────────────────────────────────────

/**
 * Shared: fetch the article HTML for `pack.sourceUrl`, extract per-part
 * prose, and match each extracted part to a locator from the stored pack
 * (so callers can key insights back to the pack's parts). Used by both
 * the auto and manual workflows.
 */
async function fetchMatchedParts(
  pack: InsightsInput,
): Promise<{ matched: PartWithProse[]; failures: InsightsResult["failures"] }> {
  if (!pack.sourceUrl) {
    throw new Error(
      "This pack has no sourceUrl — it was pasted rather than imported from a WOL URL. Re-import via URL to enable AI insights.",
    );
  }
  const canonical = pack.sourceUrl.replace(/\/en\/wol\//, "/wol/");
  const res = await fetch(canonical);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch article HTML from ${canonical} (${res.status}).`,
    );
  }
  const json = (await res.json()) as { content?: string };
  if (!json.content) {
    throw new Error(`Article at ${canonical} returned no content payload.`);
  }

  const proseParts = collectPartProse(json.content);
  const packLookup = new Map<string, PartLocator>();
  for (const s of pack.sections) {
    for (const p of s.parts) {
      if (p.kind === "song") continue;
      const key = `${s.kind}::${p.number ?? ""}::${p.title.toLowerCase()}`;
      packLookup.set(key, {
        section: s.kind,
        number: p.number,
        title: p.title,
        kind: p.kind as OclmPartKind,
      });
    }
  }

  const matched: PartWithProse[] = [];
  const failures: InsightsResult["failures"] = [];
  for (const p of proseParts) {
    const key = `${p.section}::${p.number ?? ""}::${p.title.toLowerCase()}`;
    const locator = packLookup.get(key);
    if (!locator) {
      failures.push({
        section: p.section,
        title: p.title,
        reason: "Could not match extracted prose to a pack part.",
      });
      continue;
    }
    matched.push({ ...p, ...locator });
  }
  return { matched, failures };
}

/**
 * A stable, human-readable id for an AI-visible part. Uses `section:number`
 * so an AI (or the user) can look at the outbound prompt and mentally
 * match its output entries to specific meeting parts.
 */
function externalIdFor(p: PartWithProse): string {
  return p.number !== undefined
    ? `${p.section}:${p.number}`
    : `${p.section}:x`; // Concluding Comments has no number
}

/**
 * Compose a single prompt an admin can paste into ChatGPT or Claude
 * (web UI, no API key required). The prompt bundles the system rules
 * (doctrine safety, JW audience) and all N parts' paragraph text, and
 * asks the AI to return a single JSON object of the shape:
 *   { "entries": [ { "id": "TREASURES:1", "kidSummary": "...", ... }, ... ] }
 *
 * The returned `expectedIds` array documents which ids should appear
 * in the response so we can surface "missing" or "extra" entries when
 * the admin pastes it back.
 */
export async function buildPromptForPack(
  pack: InsightsInput,
): Promise<{
  prompt: string;
  expectedIds: string[];
  failures: InsightsResult["failures"];
}> {
  const { matched, failures } = await fetchMatchedParts(pack);
  const expectedIds = matched.map(externalIdFor);

  const sectionLabel = (k: OclmSectionKind): string =>
    ({
      OPENING: "Opening",
      TREASURES: "Treasures From God's Word",
      MINISTRY: "Apply Yourself to the Field Ministry",
      LIVING: "Living as Christians",
      CLOSING: "Closing / Concluding Comments",
    })[k];

  const partsBlock = matched
    .map((p, i) => {
      const trimmed = p.prose.slice(0, 4000);
      return `PART ${i + 1}
  id: ${externalIdFor(p)}
  section: ${sectionLabel(p.section)}
  title: ${p.title}
  paragraph text: ${trimmed || "(no paragraph text — write shorter outputs based on the title alone)"}`;
    })
    .join("\n\n");

  const prompt = `${SYSTEM_PROMPT}

──────────────────────────────────────────────────────────────
For EACH of the ${matched.length} meeting parts below, produce three outputs:
  1. kidSummary — 2 sentences for a 4–7 year old (≤240 chars). Concrete. Not a moral. Names a person or event a child would remember.
  2. familyDiscussionQuestion — one open-ended question a family could talk over at dinner or worship (≤200 chars). Tied to THIS part's actual point.
  3. listeningPhrases — 3–5 short phrases (2–5 words each) that a child could plausibly hear said aloud during THIS part. Use concrete nouns / names / verbs actually present in the paragraph text — not generic vocabulary.

Return ONE JSON object, no code fences, no commentary, with this exact shape:
{
  "entries": [
    { "id": "TREASURES:1", "kidSummary": "...", "familyDiscussionQuestion": "...", "listeningPhrases": ["...", "..."] },
    { "id": "TREASURES:2", "kidSummary": "...", "familyDiscussionQuestion": "...", "listeningPhrases": ["...", "..."] }
    // one entry per part, matching the ids listed below
  ]
}

Use the "id" field to match each output entry back to the correct part.

──────────────────────────────────────────────────────────────
${partsBlock}
──────────────────────────────────────────────────────────────

Return the JSON object now.`;

  return { prompt, expectedIds, failures };
}

/**
 * Parse a pasted AI response (either bare JSON or the "entries" object
 * shape) and merge each entry's insights back into the pack, keyed by
 * `id`. Returns the new `sections` array plus a stats block for the
 * admin UI. Does NOT persist — the caller writes it back to Prisma.
 */
export async function applyPastedInsights(
  pack: InsightsInput,
  rawPasted: string,
): Promise<{
  updatedSections: InsightsInput["sections"];
  matched: number;
  unmatchedIds: string[];
  missingIds: string[];
}> {
  const { matched: matchedParts } = await fetchMatchedParts(pack);
  const expected = new Map<string, PartLocator>();
  for (const p of matchedParts) expected.set(externalIdFor(p), p);

  // Accept either the whole object or just the entries array; strip
  // markdown code fences if the AI wrapped it.
  const stripped = rawPasted
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    throw new Error(
      `Response is not valid JSON: ${e instanceof Error ? e.message : String(e)}. Make sure to paste the entire JSON blob, no code fences.`,
    );
  }

  const entries = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).entries)
      ? ((parsed as { entries: unknown[] }).entries)
      : null;
  if (!entries) {
    throw new Error(
      "Response JSON must be either an array or an object like { entries: [...] }.",
    );
  }

  // Build a `byId` map of validated insights so we can merge cleanly.
  const insightsById = new Map<string, AiPartInsights>();
  const unmatchedIds: string[] = [];
  for (const raw of entries) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : null;
    const kidSummary = typeof r.kidSummary === "string" ? r.kidSummary : null;
    const familyDiscussionQuestion =
      typeof r.familyDiscussionQuestion === "string"
        ? r.familyDiscussionQuestion
        : null;
    const listeningPhrases = Array.isArray(r.listeningPhrases)
      ? r.listeningPhrases.filter((x): x is string => typeof x === "string")
      : [];
    if (!id || !kidSummary || !familyDiscussionQuestion || listeningPhrases.length < 3) {
      continue;
    }
    if (!expected.has(id)) {
      unmatchedIds.push(id);
      continue;
    }
    insightsById.set(id, { kidSummary, familyDiscussionQuestion, listeningPhrases });
  }

  // Merge into sections/parts (immutable — deep copy so caller can save).
  const updatedSections = pack.sections.map((s) => ({
    ...s,
    parts: s.parts.map((p) => {
      if (p.kind === "song") return p;
      const id =
        p.number !== undefined ? `${s.kind}:${p.number}` : `${s.kind}:x`;
      const ai = insightsById.get(id);
      if (!ai) return p;
      return { ...p, aiContent: ai };
    }),
  }));

  const missingIds = [...expected.keys()].filter((id) => !insightsById.has(id));

  return {
    updatedSections,
    matched: insightsById.size,
    unmatchedIds,
    missingIds,
  };
}
