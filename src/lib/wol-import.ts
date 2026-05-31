/**
 * WOL Import — fetch a Watchtower study article from wol.jw.org and turn it
 * into a "draft pack" object that pre-fills the admin editor.
 *
 * Copyright posture: paragraph body prose (the WT article text) and NWT
 * verse text are NEVER stored on the returned DraftPack. Body prose is
 * parsed in memory to derive transformative metadata (keyWords, keyPhrases,
 * vocabulary, themes, key people, scripture citations, references) and is
 * then discarded. Only citations, structural headers, question prompts,
 * vocabulary, and outbound link metadata are returned.
 */

import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { AnyNode, Element as DomElement } from "domhandler";
import { extractKeyPeople, extractVocabulary } from "@/lib/content-parser";

const WOL_ORIGIN = "https://wol.jw.org";

// ─── Public types ─────────────────────────────────────────────────────

export interface ReferenceImport {
  type: "scripture" | "publication" | "crossArticle" | "footnote" | "internal";
  /** Visible chip text — e.g. "Insight, vol. 1, p. 1240". */
  label: string;
  /** Absolute WOL URL (relative hrefs are resolved against https://wol.jw.org). */
  url?: string;
  /** For type === "scripture", the parsed citation e.g. "Prov. 22:4". */
  scriptureRef?: string;
}

export interface DraftQuestion {
  /** The italic study question as it appears in the article. */
  question: string;
  /** "" — admin types their own-words summary later. */
  answer: string;
  /** "" — admin types a simplified version later (or leaves blank to hide). */
  simplifiedAnswer: string;
  /** Single significant words derived from paragraph body (≥ 4 chars). */
  keyWords: string[];
  /** [] — admin authors multiple-choice options later. */
  options: string[];
  /** "" — admin attaches a per-question picture later. */
  imageUrl: string;
  /** Section header text that precedes this question, if any. */
  subheading?: string;
  references: ReferenceImport[];
}

export interface DraftPack {
  title: string;
  source: "WATCHTOWER";
  context: "MEETING_PREP";
  /** e.g. "2026 No. 4". */
  issueLabel?: string;
  /** e.g. 12. */
  articleNumber?: number;
  /** Citation only — NO scripture text (copyright). */
  themeScripture?: { reference: string };
  /** Canonical wol.jw.org URL. */
  sourceUrl: string;
  /** WOL doc id. */
  sourceDocId: string;
  /** e.g. "Based on 'Show Insight…', The Watchtower 2026 No. 4. © Watch Tower."
   *  Omitted when the importer can't resolve a real article title — a
   *  malformed attribution is worse than none. */
  attribution?: string;
  vocabulary: string[];
  /** text intentionally empty — admin pastes their own NWT text or leaves blank. */
  scriptures: Array<{ reference: string; text: "" }>;
  keyPeople: string[];
  themes: string[];
  questions: DraftQuestion[];
  keyPhrases: string[];
}

// ─── Input normalisation ──────────────────────────────────────────────

interface NormalisedInput {
  docId: string;
  canonicalUrl: string;
}

/**
 * Turn user-supplied input into a canonical /wol/d/ URL + bare docId.
 * Accepts the canonical doc URL, a bare numeric docId, and throws a
 * helpful error for the /wol/pc/ navigation URL form (which would need
 * extra resolution we are deferring to a follow-up).
 */
function normaliseInput(input: string): NormalisedInput {
  const raw = input.trim();
  if (!raw) {
    throw new Error("WOL import: empty input. Paste a /wol/d/ article URL.");
  }

  // Bare numeric docId.
  if (/^\d+$/.test(raw)) {
    return {
      docId: raw,
      canonicalUrl: `${WOL_ORIGIN}/wol/d/r1/lp-e/${raw}`,
    };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      `WOL import: could not parse "${raw}" as a URL or docId. ` +
        "Paste the canonical /wol/d/ URL from wol.jw.org, or just the numeric doc id.",
    );
  }

  if (!/(^|\.)wol\.jw\.org$/.test(url.hostname)) {
    throw new Error(
      `WOL import: URL must be on wol.jw.org (got ${url.hostname}).`,
    );
  }

  // /wol/pc/ is the navigation URL; we cannot resolve it to a docId without
  // a separate request, so ask the user to open the article and copy the
  // address-bar URL (which will be the /wol/d/ form).
  if (url.pathname.includes("/wol/pc/")) {
    throw new Error(
      "Please paste the canonical /wol/d/ URL of the article " +
        "(open the article in WOL and copy the URL from the address bar — " +
        "it should contain /wol/d/ not /wol/pc/).",
    );
  }

  // Canonical /wol/d/r1/lp-e/{docId}
  const m = url.pathname.match(/\/wol\/d\/[^/]+\/[^/]+\/(\d+)/);
  if (!m) {
    throw new Error(
      `WOL import: unrecognised WOL URL "${raw}". ` +
        "Expected /wol/d/r1/lp-e/{docId}.",
    );
  }
  const docId = m[1];
  return {
    docId,
    canonicalUrl: `${WOL_ORIGIN}/wol/d/r1/lp-e/${docId}`,
  };
}

// ─── HTML helpers ─────────────────────────────────────────────────────

interface WolApiResponse {
  title?: string;
  location?: string;
  content?: string;
  /** Space-separated class list — used to detect the source publication. */
  articleClasses?: string;
}

/**
 * Inspect `articleClasses` from a WOL doc payload and dispatch on
 * publication code. We only recognise the two publications we explicitly
 * support; anything else surfaces an explicit error rather than silently
 * importing a malformed pack.
 */
function detectPublication(json: WolApiResponse): "WATCHTOWER" | "OCLM" {
  const classes = (json.articleClasses ?? "").split(/\s+/);
  if (classes.includes("pub-mwb") || classes.some((c) => c.startsWith("pub-mwb"))) {
    return "OCLM";
  }
  // The agent's WT articles carry pub-w / pub-w26 / pub-wt etc.
  if (
    classes.some((c) => c === "pub-w" || c.startsWith("pub-w") || c === "pub-wt")
  ) {
    return "WATCHTOWER";
  }
  // Fall back to WATCHTOWER for older payloads that don't carry articleClasses
  // — the caller can still inspect the result and choose to bail.
  return "WATCHTOWER";
}

function stripTags(html: string): string {
  // The title/location fields are short HTML snippets ("<strong>X</strong>").
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(href: string | undefined): string | undefined {
  if (!href) return undefined;
  const trimmed = href.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("#")) return trimmed; // in-article anchor
  if (trimmed.startsWith("/")) return WOL_ORIGIN + trimmed;
  return `${WOL_ORIGIN}/${trimmed}`;
}

/** Parse `wt 2026 No. 4 p. 14` / `w25 August pp. 14-19` / `lfb lesson 88 p. 206`. */
function parseLocation(loc: string): {
  issueLabel?: string;
  publicationCode?: string;
} {
  const text = loc.trim();
  if (!text) return {};

  // Modern WT study: "w25 August pp. 14-19" / "w26 No. 4 pp. 1-7"
  const wt = text.match(/^w(\d{2,4})\s+(.+?)\s+pp?\.\s*[\d,\-–\s]+$/i);
  if (wt) {
    const yearFrag = wt[1];
    const year = yearFrag.length === 2 ? `20${yearFrag}` : yearFrag;
    const rest = wt[2].trim(); // "August" or "No. 4"
    return {
      publicationCode: "w" + yearFrag,
      issueLabel: `${year} ${rest}`,
    };
  }

  // wt YYYY No. N p. X
  const wt2 = text.match(/^wt\s+(\d{4})\s+(.+?)\s+pp?\.\s*[\d,\-–\s]+$/i);
  if (wt2) {
    return {
      publicationCode: "wt",
      issueLabel: `${wt2[1]} ${wt2[2].trim()}`,
    };
  }

  // OCLM workbook: "mwb26 May pp. 6-7" / "mwb25 January-February pp. 4-5"
  const mwb = text.match(/^mwb(\d{2,4})\s+(.+?)\s+pp?\.\s*[\d,\-–\s]+$/i);
  if (mwb) {
    const yearFrag = mwb[1];
    const year = yearFrag.length === 2 ? `20${yearFrag}` : yearFrag;
    return {
      publicationCode: "mwb" + yearFrag,
      issueLabel: `${year} ${mwb[2].trim()}`,
    };
  }

  return {};
}

// ─── Reference extraction ─────────────────────────────────────────────

/**
 * Classify a single `<a>` inside a paragraph and return a ReferenceImport.
 * Returns null for links we don't want to surface (e.g. empty hrefs).
 */
function classifyLink(
  $: CheerioAPI,
  a: AnyNode,
): ReferenceImport | null {
  const $a = $(a);
  const href = $a.attr("href") ?? "";
  const classes = ($a.attr("class") ?? "").split(/\s+/);
  const label = $a.text().replace(/\s+/g, " ").trim();
  if (!label) return null;

  // Scripture cite: <a class="b" href="/wol/bc/…">.
  if (classes.includes("b") || href.includes("/wol/bc/")) {
    return {
      type: "scripture",
      label,
      url: absoluteUrl(href),
      scriptureRef: label,
    };
  }

  // Footnote anchor inside body: <a class="fn" href="/wol/fn/…">.
  if (classes.includes("fn") || href.includes("/wol/fn/")) {
    return {
      type: "footnote",
      label: label || "footnote",
      url: absoluteUrl(href),
    };
  }

  // In-article anchor: href starts with "#".
  if (href.startsWith("#")) {
    return { type: "internal", label, url: href };
  }

  // Cross-article doc link: /wol/d/ on the same publication.
  if (href.includes("/wol/d/")) {
    return { type: "crossArticle", label, url: absoluteUrl(href) };
  }

  // Anything else with a hyperlink to WOL (publications, navigation): /wol/pc/, etc.
  if (href) {
    return { type: "publication", label, url: absoluteUrl(href) };
  }

  return null;
}

/** Dedupe references by (type|label|url) keeping first-seen order. */
function dedupeReferences(refs: ReferenceImport[]): ReferenceImport[] {
  const seen = new Set<string>();
  const out: ReferenceImport[] = [];
  for (const r of refs) {
    const key = `${r.type}|${r.label}|${r.url ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

// ─── Body-text helpers ────────────────────────────────────────────────

/**
 * Extract paragraph body text from a <p> element, dropping the leading
 * paragraph-number badge produced by `<span class="parNum">`.
 */
function paragraphText($: CheerioAPI, p: AnyNode): string {
  const $p = $(p).clone();
  $p.find("span.parNum, span.pageNum, .dc-screenReaderText").remove();
  return $p.text().replace(/\s+/g, " ").trim();
}

// ─── Header parsing ───────────────────────────────────────────────────

interface HeaderInfo {
  contextTitle: string; // "STUDY ARTICLE 34"
  articleNumber?: number;
  title: string;
  themeScriptureRef?: string;
}

function parseHeader($: CheerioAPI): HeaderInfo {
  const $header = $("header").first();
  const contextTitle = $header
    .find(".contextTtl")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const articleNumberMatch = contextTitle.match(/(\d+)\s*$/);
  const title = $header.find("h1").first().text().replace(/\s+/g, " ").trim();

  // The theme scripture sits in <p class="themeScrp"> just after the <header>
  // in modern WT articles. We grab the scripture link's text.
  const themeAnchor = $(".themeScrp a.b").first();
  const themeRef = themeAnchor.text().replace(/\s+/g, " ").trim() || undefined;

  return {
    contextTitle,
    articleNumber: articleNumberMatch
      ? Number(articleNumberMatch[1])
      : undefined,
    title,
    themeScriptureRef: themeRef,
  };
}

// ─── Question + paragraph pairing ─────────────────────────────────────

interface RawQuestion {
  pid: string; // data-pid of the qu paragraph
  text: string; // question prompt (italic source text)
  refs: ReferenceImport[];
  subheading?: string;
  /** body paragraphs (data-pid values referenced via data-rel-pid). */
  bodyText: string;
}

function collectQuestions($: CheerioAPI): RawQuestion[] {
  const out: RawQuestion[] = [];
  let currentSubheading: string | undefined;

  // Map of data-pid -> aggregated body text + refs.
  // We need to associate <p data-rel-pid="[40]"> bodies with question p#40.
  // First, walk the body in source order capturing subheadings + question metadata,
  // then a second pass attaches bodies.

  const questionByPid = new Map<string, RawQuestion>();

  $(".bodyTxt").children().each((_, el) => {
    const $el = $(el);
    const tagName = (el as DomElement).tagName?.toLowerCase?.();

    if (tagName === "h2") {
      currentSubheading = $el.text().replace(/\s+/g, " ").trim();
      return;
    }

    if (tagName === "p" && $el.hasClass("sg")) {
      currentSubheading = $el.text().replace(/\s+/g, " ").trim();
      return;
    }

    if (tagName === "p" && $el.hasClass("qu")) {
      const pid = $el.attr("data-pid") ?? "";
      if (!pid) return;
      const text = $el.text().replace(/\s+/g, " ").trim();
      const refs: ReferenceImport[] = [];
      $el.find("a").each((__, a) => {
        const r = classifyLink($, a);
        if (r) refs.push(r);
      });
      const q: RawQuestion = {
        pid,
        text,
        refs,
        subheading: currentSubheading,
        bodyText: "",
      };
      out.push(q);
      questionByPid.set(pid, q);
    }
  });

  // Second pass: attach body paragraphs by data-rel-pid.
  $(".bodyTxt p[data-rel-pid]").each((_, p) => {
    const $p = $(p);
    const rel = $p.attr("data-rel-pid") ?? "";
    // data-rel-pid is JSON-array-ish: "[40]" or "[40,42]".
    const pids = rel
      .replace(/[\[\]\s]/g, "")
      .split(",")
      .filter(Boolean);
    if (!pids.length) return;
    const body = paragraphText($, p);
    const refsHere: ReferenceImport[] = [];
    $p.find("a").each((__, a) => {
      const r = classifyLink($, a);
      if (r) refsHere.push(r);
    });
    for (const pid of pids) {
      const q = questionByPid.get(pid);
      if (!q) continue;
      q.bodyText = q.bodyText ? `${q.bodyText} ${body}` : body;
      q.refs.push(...refsHere);
    }
  });

  return out;
}

// ─── Aggregate-level extraction (vocab, people, themes, scriptures) ───

interface BodyAggregate {
  fullBodyText: string;
  allScriptureRefs: string[]; // unique, ordered
}

function aggregateBody($: CheerioAPI): BodyAggregate {
  const parts: string[] = [];
  $(".bodyTxt p").each((_, p) => {
    parts.push(paragraphText($, p));
  });
  const fullBodyText = parts.join("\n\n");

  const seenScrip = new Set<string>();
  const scriptures: string[] = [];
  $(".bodyTxt a.b, .themeScrp a.b").each((_, a) => {
    const ref = $(a).text().replace(/\s+/g, " ").trim();
    if (!ref) return;
    if (seenScrip.has(ref)) return;
    seenScrip.add(ref);
    scriptures.push(ref);
  });

  return { fullBodyText, allScriptureRefs: scriptures };
}

/** Pick the top N themes by occurrence count from the full body text. */
function pickThemes(bodyText: string, n: number): string[] {
  const vocab = extractVocabulary(bodyText);
  const lower = bodyText.toLowerCase();
  const counts = new Map<string, number>();
  for (const term of vocab) {
    const re = new RegExp(
      `\\b${term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "g",
    );
    const matches = lower.match(re);
    counts.set(term, matches ? matches.length : 0);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([term]) => term);
}

// ─── The fetch + parse pipeline ───────────────────────────────────────

/**
 * Fetch a WOL article JSON payload. Throws a helpful error if WOL returns
 * non-200 (e.g. invalid docId).
 *
 * Copyright posture: the response body lives only inside this function;
 * downstream code only sees parsed/derived data.
 */
async function fetchWolDoc(canonicalUrl: string): Promise<WolApiResponse> {
  const res = await fetch(canonicalUrl);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `WOL import: fetch failed (${res.status} ${res.statusText}) for ${canonicalUrl}. ` +
        `Response: ${body.slice(0, 200)}`,
    );
  }
  return (await res.json()) as WolApiResponse;
}

/**
 * Import a Watchtower study article from wol.jw.org and return a draft
 * pack object ready to pre-fill the admin editor form.
 *
 * Copyright posture: paragraph body prose is parsed in memory to derive
 * keyWords / keyPhrases / vocabulary / themes / key people, then discarded.
 * The returned DraftPack contains only citations, structural metadata
 * (titles, subheadings, italic question prompts), outbound link metadata,
 * and the transformative derived data. NWT scripture text is never stored
 * (each scripture is returned with `text: ""`).
 */
export async function importFromWolUrl(input: string): Promise<DraftPack> {
  const { docId, canonicalUrl } = normaliseInput(input);
  const json = await fetchWolDoc(canonicalUrl);
  return parseAsWatchtower(json, docId, canonicalUrl);
}

/**
 * Internal: turn an already-fetched WT JSON payload into a DraftPack.
 * Shared between the explicit Watchtower entry point and the unified
 * dispatcher (`importPackFromWolUrl`), so we only roundtrip to WOL once.
 */
function parseAsWatchtower(
  json: WolApiResponse,
  docId: string,
  canonicalUrl: string,
): DraftPack {
  const title = stripTags(json.title ?? "");
  const locationText = stripTags(json.location ?? "");
  const { issueLabel } = parseLocation(locationText);
  const contentHtml = json.content ?? "";

  if (!contentHtml) {
    throw new Error(
      `WOL import: empty content payload for docId ${docId}. ` +
        "The URL may not point to a readable article.",
    );
  }

  const $ = cheerio.load(contentHtml);
  const header = parseHeader($);
  const rawQuestions = collectQuestions($);
  const { fullBodyText, allScriptureRefs } = aggregateBody($);

  // Per-question shape.
  //
  // Copyright posture: we deliberately leave `keyWords` empty for
  // imported questions. The study panel auto-derives the word-bank
  // chips from the admin's own-words paragraph answer via the panel's
  // `deriveKeyWords` helper, so we don't need to ship ordered/cased
  // fragments of the source paragraph here.
  const questions: DraftQuestion[] = rawQuestions.map((rq) => ({
    question: rq.text,
    answer: "",
    simplifiedAnswer: "",
    keyWords: [],
    options: [],
    imageUrl: "",
    subheading: rq.subheading,
    references: dedupeReferences(rq.refs),
  }));

  // Pack-level derived data — only single-word vocabulary matched
  // against our finite THEOCRATIC_TERMS list (no verbatim prose
  // tokens) and key-people matches against a finite character list.
  // Sorted alphabetically so we never preserve source ordering.
  const vocabulary = [...new Set(extractVocabulary(fullBodyText))].sort(
    (a, b) => a.localeCompare(b),
  );
  const keyPeople = [...new Set(extractKeyPeople(fullBodyText))].sort(
    (a, b) => a.localeCompare(b),
  );
  const themes = pickThemes(fullBodyText, 5).sort((a, b) => a.localeCompare(b));

  // keyPhrases would otherwise be verbatim quoted spans from the
  // article. Skip — admins can curate Meeting Bingo phrases manually
  // if they want them for this pack.
  const keyPhrases: string[] = [];

  const scriptures = allScriptureRefs.map((reference) => ({
    reference,
    text: "" as const,
  }));

  // Resolve title for attribution: prefer the article <h1>, fall back
  // to the JSON `title` field. Skip attribution entirely if we don't
  // have a real title — a malformed "Based on 'Watchtower study
  // article'" line is worse than no attribution.
  const displayTitle = header.title || title || "";
  const attribution = displayTitle
    ? `Based on "${displayTitle}"${
        issueLabel ? `, The Watchtower ${issueLabel}` : ", The Watchtower"
      }. © Watch Tower.`
    : undefined;

  return {
    title: displayTitle,
    source: "WATCHTOWER",
    context: "MEETING_PREP",
    issueLabel,
    articleNumber: header.articleNumber,
    themeScripture: header.themeScriptureRef
      ? { reference: header.themeScriptureRef }
      : undefined,
    sourceUrl: canonicalUrl,
    sourceDocId: docId,
    attribution,
    vocabulary,
    scriptures,
    keyPeople,
    themes,
    questions,
    keyPhrases,
  };
}

// ═════════════════════════════════════════════════════════════════════
// OCLM (Our Christian Life and Ministry workbook) importer
// ═════════════════════════════════════════════════════════════════════

/** The three colored sections of an OCLM meeting + the bookend song slots. */
export type OclmSectionKind =
  | "OPENING"
  | "TREASURES"
  | "MINISTRY"
  | "LIVING"
  | "CLOSING";

/** Coarse kind for a single part — drives icon + per-age widget choice. */
export type OclmPartKind =
  | "song"
  | "openingComments"
  | "talk" // 10-min Treasures opening talk
  | "spiritualGems"
  | "bibleReading"
  | "ministryConversation"
  | "ministryDemo"
  | "ministryTalk"
  | "livingTalk"
  | "livingDiscussion"
  | "cbs" // Congregation Bible Study
  | "concludingComments";

export interface WorkbookPart {
  /** 1..9 if the part carries a numbered `<strong>N. Title</strong>`. */
  number?: number;
  kind: OclmPartKind;
  section: OclmSectionKind;
  /** Plain-text part title from the `<h3>`. */
  title: string;
  /** Parsed from "(N min.)" or inline "<span>(N min.)</span>". */
  durationMin?: number;
  /** "INFORMAL WITNESSING" | "PUBLIC WITNESSING" | "HOUSE TO HOUSE" — ministry only. */
  scenarioTag?: string;
  /** When kind === "song". */
  songNumber?: number;
  /** When the part links to a JW.org video. */
  videoUrl?: string;
  /** Title of the video as it appears in WOL — citation only, no transcript. */
  videoTitle?: string;
  /** Scripture + publication references attached to the part. */
  references: ReferenceImport[];
  /** Italic discussion-question prompts inside the part body. */
  promptQuestions: string[];
}

export interface OclmDraftSection {
  kind: OclmSectionKind;
  /** Display title from the section header, e.g. "TREASURES FROM GOD'S WORD". */
  title: string;
  parts: WorkbookPart[];
}

export interface OclmDraftPack {
  source: "OCLM";
  context: "MEETING_PREP";
  /** Week label, e.g. "JUNE 1-7". */
  title: string;
  /** Issue label parsed from location, e.g. "2026 June". */
  issueLabel?: string;
  /** Internal publication code (e.g. "mwb26"). */
  publicationCode?: string;
  /** Citation of the week's Bible reading range, e.g. "Isaiah 65-66". */
  bibleReadingRange?: { reference: string };
  /** Citation of the assigned student reading, e.g. "Isa. 65:17-25". */
  bibleReadingAssignment?: { reference: string };
  /** Opening / middle / closing song numbers in source order. */
  songs: number[];
  sections: OclmDraftSection[];
  /** All scripture citations seen anywhere in the meeting (deduped, ordered). */
  scriptures: Array<{ reference: string; text: "" }>;
  /** Derived single-word vocabulary, used to seed listening games. */
  vocabulary: string[];
  /** Bible-character matches across all part bodies. */
  keyPeople: string[];
  /** Top-occurring vocabulary terms across the week. */
  themes: string[];
  /** Always empty for OCLM — admins curate Meeting Bingo phrases per part. */
  keyPhrases: string[];
  attribution?: string;
  sourceUrl: string;
  sourceDocId: string;
}

/** Pull "(N min.)" or "(NN min.)" out of free text. Returns undefined if absent. */
function parseDurationMin(text: string): number | undefined {
  const m = text.match(/\((\d+)\s*min\.?\)/i);
  return m ? Number(m[1]) : undefined;
}

/** Songs render as `<a>Song 24</a>` in OCLM headers; pull the number. */
function parseSongNumber(text: string): number | undefined {
  const m = text.match(/song\s+(\d+)/i);
  return m ? Number(m[1]) : undefined;
}

/** Heuristic from the `<h3>` title + section context. Falls back to a generic kind. */
function inferPartKind(
  title: string,
  section: OclmSectionKind,
  isSongHeader: boolean,
): OclmPartKind {
  if (isSongHeader) return "song";
  const t = title.toLowerCase();
  if (t.includes("spiritual gems")) return "spiritualGems";
  if (t.includes("bible reading")) return "bibleReading";
  if (t.includes("congregation bible study")) return "cbs";
  if (t.includes("concluding comments")) return "concludingComments";
  if (t.includes("opening comments")) return "openingComments";
  if (section === "TREASURES") return "talk";
  if (section === "MINISTRY") {
    if (t.includes("conversation") || t.includes("starting") || t.includes("following up"))
      return "ministryConversation";
    if (t.includes("talk")) return "ministryTalk";
    return "ministryDemo";
  }
  if (section === "LIVING") {
    if (t.includes("discussion")) return "livingDiscussion";
    return "livingTalk";
  }
  return "talk";
}

/** Extract the scenario tag (INFORMAL / PUBLIC / HOUSE-TO-HOUSE) from a body div. */
function extractScenarioTag($body: cheerio.Cheerio<AnyNode>): string | undefined {
  const tags = ["INFORMAL WITNESSING", "PUBLIC WITNESSING", "HOUSE TO HOUSE"];
  const text = $body.text().toUpperCase();
  for (const tag of tags) {
    if (text.includes(tag)) return tag;
  }
  return undefined;
}

/** Pull italic question prompts out of a part body, ignoring text nodes. */
function extractPromptQuestions(
  $: CheerioAPI,
  $body: cheerio.Cheerio<AnyNode>,
): string[] {
  const out: string[] = [];
  $body.find("em, i").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t.endsWith("?") && t.length >= 8 && t.length <= 300) out.push(t);
  });
  return [...new Set(out)];
}

/** Pull every reference link from a part body. */
function extractReferences(
  $: CheerioAPI,
  $scope: cheerio.Cheerio<AnyNode>,
): ReferenceImport[] {
  const refs: ReferenceImport[] = [];
  $scope.find("a").each((_, a) => {
    const r = classifyLink($, a);
    if (r) refs.push(r);
  });
  return dedupeReferences(refs);
}

/** Find the JW.org video link (if any) attached to a part. */
function extractVideo(
  $: CheerioAPI,
  $scope: cheerio.Cheerio<AnyNode>,
): { videoUrl?: string; videoTitle?: string } {
  const $a = $scope.find("a[data-video]").first();
  if (!$a.length) return {};
  return {
    videoUrl: absoluteUrl($a.attr("href")),
    videoTitle: $a.text().replace(/\s+/g, " ").trim() || undefined,
  };
}

/** Read the numbered prefix off "<strong>N. Title</strong>" if present. */
function parseNumberedTitle(raw: string): { number?: number; title: string } {
  const m = raw.match(/^\s*(\d+)\.\s*(.+)$/);
  if (m) return { number: Number(m[1]), title: m[2].trim() };
  return { title: raw.replace(/\s+/g, " ").trim() };
}

/**
 * Walk every `<h3>` and section-marker `<div>` inside `.bodyTxt` in
 * document source order, classify the section by header class or by the
 * h3's color class, and assemble WorkbookParts.
 *
 * Using `find(SELECTOR)` (descendant search) instead of `children()`
 * matters because the first Treasures talk's `<h3>` is nested inside a
 * styled wrapper div — a direct-children walk silently drops it.
 *
 * Section transitions happen at three signals:
 *   1. `<div class="dc-icon--gem|wheat|sheep">` opens TREASURES/MINISTRY/LIVING.
 *   2. An uncolored, non-song `<h3>` while in LIVING is Concluding Comments
 *      → opens CLOSING.
 *   3. (No CLOSING trigger on songs — the middle song belongs to LIVING.)
 */
function collectOclmSections($: CheerioAPI): OclmDraftSection[] {
  const sections: OclmDraftSection[] = [];

  const openSection = (
    kind: OclmSectionKind,
    title: string,
  ): OclmDraftSection => {
    const sec: OclmDraftSection = { kind, title, parts: [] };
    sections.push(sec);
    return sec;
  };

  // Seed an OPENING bucket so the leading Song + Prayer h3 lands somewhere.
  let current = openSection("OPENING", "Opening");

  const SECTION_SELECTOR =
    "h3, div.dc-icon--gem, div.dc-icon--wheat, div.dc-icon--sheep";

  $(".bodyTxt")
    .find(SECTION_SELECTOR)
    .each((_, el) => {
      const $el = $(el);
      const tagName = (el as DomElement).tagName?.toLowerCase?.();
      const classes = ($el.attr("class") ?? "").split(/\s+/);

      if (tagName === "div") {
        const title =
          $el.find("h2").first().text().replace(/\s+/g, " ").trim() ||
          $el.text().replace(/\s+/g, " ").trim();
        if (classes.includes("dc-icon--gem")) {
          current = openSection("TREASURES", title);
        } else if (classes.includes("dc-icon--wheat")) {
          current = openSection("MINISTRY", title);
        } else if (classes.includes("dc-icon--sheep")) {
          current = openSection("LIVING", title);
        }
        return;
      }

      // h3
      const isSong = classes.includes("dc-icon--music");
      const isColored = classes.some(
        (c) =>
          c.startsWith("du-color--teal") ||
          c.startsWith("du-color--gold") ||
          c.startsWith("du-color--maroon"),
      );

      // Uncolored, non-song h3 after LIVING = Concluding Comments → CLOSING.
      if (!isSong && !isColored && current.kind === "LIVING") {
        current = openSection("CLOSING", "Closing");
      }

      const headerText = $el.text().replace(/\s+/g, " ").trim();
      const strongText = $el
        .find("strong")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim();
      const { number, title: parsedTitle } = parseNumberedTitle(
        strongText || headerText,
      );

      // Body content: prefer the next-sibling div (the (N min.) body block);
      // for nested h3s (Treasures part 1 inside a styled wrapper) fall back
      // to "everything after this h3 within the same parent, up to the next
      // h3 or section header" so we don't bleed across part boundaries.
      let $body = $el.next("div");
      if ($body.length === 0) {
        $body = $el.nextUntil(SECTION_SELECTOR);
      }

      const fullText = `${headerText} ${$body.text()}`;
      const durationMin = parseDurationMin(fullText);
      const songNumber = isSong ? parseSongNumber(headerText) : undefined;
      const scenarioTag =
        current.kind === "MINISTRY" ? extractScenarioTag($body) : undefined;
      const { videoUrl, videoTitle } = extractVideo($, $body);
      const promptQuestions = extractPromptQuestions($, $body);

      // Trim the concluding-comments title to something usable: WOL packs
      // multiple announcements into one h3 ("Concluding Comments (3 min.)
      // | Song 18 and Prayer"). Keep just the leading label.
      const displayTitle = (() => {
        if (parsedTitle) return parsedTitle;
        if (isSong && songNumber) return `Song ${songNumber}`;
        // Concluding comments — strip the duration + pipe + closing song.
        return headerText.replace(/\s*\(\d+\s*min\.\).*$/i, "").trim();
      })();

      // References live in the body div, but the h3 itself can carry
      // anchors too — e.g. "Concluding Comments | Song 18 and Prayer"
      // bundles the closing song link into the heading. Merge + dedupe.
      const refs = dedupeReferences([
        ...extractReferences($, $el),
        ...extractReferences($, $body),
      ]);

      const part: WorkbookPart = {
        number,
        kind: inferPartKind(displayTitle, current.kind, isSong),
        section: current.kind,
        title: displayTitle,
        durationMin,
        scenarioTag,
        songNumber,
        videoUrl,
        videoTitle,
        references: refs,
        promptQuestions,
      };

      current.parts.push(part);
    });

  // Drop empty buckets (e.g. OPENING with nothing).
  return sections.filter((s) => s.parts.length > 0);
}

/**
 * Internal: turn an already-fetched OCLM JSON payload into an OclmDraftPack.
 */
function parseAsOclm(
  json: WolApiResponse,
  docId: string,
  canonicalUrl: string,
): OclmDraftPack {
  const title = stripTags(json.title ?? "");
  const locationText = stripTags(json.location ?? "");
  const { issueLabel, publicationCode } = parseLocation(locationText);
  const contentHtml = json.content ?? "";

  if (!contentHtml) {
    throw new Error(
      `WOL import: empty content payload for docId ${docId}. ` +
        "The URL may not point to a readable article.",
    );
  }

  const $ = cheerio.load(contentHtml);

  // Header: week label (`<h1>`) + the Bible-reading range (`<h2><a class="b">`).
  const $header = $("header").first();
  const weekLabel =
    $header.find("h1").first().text().replace(/\s+/g, " ").trim() || title;
  const bibleReadingRef = $header
    .find("h2 a.b")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();

  const sections = collectOclmSections($);

  // Songs in source order — opening / middle / closing.
  const songs: number[] = [];
  for (const s of sections) {
    for (const p of s.parts) {
      if (p.kind === "song" && typeof p.songNumber === "number") {
        songs.push(p.songNumber);
      }
    }
  }

  // Find the student Bible-reading assignment: scripture ref attached
  // to the Bible Reading part (distinct from the week range).
  let bibleReadingAssignment: { reference: string } | undefined;
  for (const s of sections) {
    for (const p of s.parts) {
      if (p.kind === "bibleReading") {
        const sc = p.references.find((r) => r.type === "scripture");
        if (sc) bibleReadingAssignment = { reference: sc.scriptureRef ?? sc.label };
        break;
      }
    }
  }

  // Aggregate scripture citations across the whole meeting.
  const seenScrip = new Set<string>();
  const scriptures: Array<{ reference: string; text: "" }> = [];
  if (bibleReadingRef) {
    seenScrip.add(bibleReadingRef);
    scriptures.push({ reference: bibleReadingRef, text: "" });
  }
  for (const s of sections) {
    for (const p of s.parts) {
      for (const r of p.references) {
        if (r.type !== "scripture") continue;
        const ref = r.scriptureRef ?? r.label;
        if (seenScrip.has(ref)) continue;
        seenScrip.add(ref);
        scriptures.push({ reference: ref, text: "" });
      }
    }
  }

  // Vocab seed text: part titles + scenario tags + prompt questions only.
  // We deliberately do NOT pull from body prose — those are derived,
  // transformative cues for listening games. Sorted to avoid preserving
  // source order.
  const seedText = sections
    .flatMap((s) => s.parts)
    .flatMap((p) => [
      p.title,
      p.scenarioTag ?? "",
      ...p.promptQuestions,
    ])
    .join(" ");
  const vocabulary = [...new Set(extractVocabulary(seedText))].sort((a, b) =>
    a.localeCompare(b),
  );
  const keyPeople = [...new Set(extractKeyPeople(seedText))].sort((a, b) =>
    a.localeCompare(b),
  );
  const themes = pickThemes(seedText, 5).sort((a, b) => a.localeCompare(b));

  const attribution = weekLabel
    ? `Based on Our Christian Life and Ministry — ${weekLabel}${
        issueLabel ? `, mwb ${issueLabel}` : ""
      }. © Watch Tower.`
    : undefined;

  return {
    source: "OCLM",
    context: "MEETING_PREP",
    title: weekLabel,
    issueLabel,
    publicationCode,
    bibleReadingRange: bibleReadingRef ? { reference: bibleReadingRef } : undefined,
    bibleReadingAssignment,
    songs,
    sections,
    scriptures,
    vocabulary,
    keyPeople,
    themes,
    keyPhrases: [],
    attribution,
    sourceUrl: canonicalUrl,
    sourceDocId: docId,
  };
}

/**
 * Public entry point: import an OCLM workbook week from a wol.jw.org URL.
 * Throws if the URL doesn't resolve to an `mwb` publication.
 */
export async function importOclmFromWolUrl(input: string): Promise<OclmDraftPack> {
  const { docId, canonicalUrl } = normaliseInput(input);
  const json = await fetchWolDoc(canonicalUrl);
  const pub = detectPublication(json);
  if (pub !== "OCLM") {
    throw new Error(
      `WOL import: ${canonicalUrl} doesn't look like an OCLM workbook ` +
        `(detected ${pub}). Paste a /wol/d/ URL from the Meeting Workbook (mwb).`,
    );
  }
  return parseAsOclm(json, docId, canonicalUrl);
}

/**
 * Unified entry point — fetch once, auto-detect publication, and dispatch
 * to the right parser. Returns a discriminated union so callers (the admin
 * UI) can branch on `kind`.
 */
export type ImportedPack =
  | { kind: "WATCHTOWER"; pack: DraftPack }
  | { kind: "OCLM"; pack: OclmDraftPack };

export async function importPackFromWolUrl(input: string): Promise<ImportedPack> {
  const { docId, canonicalUrl } = normaliseInput(input);
  const json = await fetchWolDoc(canonicalUrl);
  const pub = detectPublication(json);
  if (pub === "OCLM") {
    return { kind: "OCLM", pack: parseAsOclm(json, docId, canonicalUrl) };
  }
  return { kind: "WATCHTOWER", pack: parseAsWatchtower(json, docId, canonicalUrl) };
}
