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
import {
  extractKeyPeople,
  extractKeyPhrases,
  extractVocabulary,
} from "@/lib/content-parser";

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
  /** e.g. "Based on 'Show Insight…', The Watchtower 2026 No. 4. © Watch Tower." */
  attribution: string;
  vocabulary: string[];
  /** text intentionally empty — admin pastes their own NWT text or leaves blank. */
  scriptures: Array<{ reference: string; text: "" }>;
  keyPeople: string[];
  themes: string[];
  questions: DraftQuestion[];
  keyPhrases: string[];
}

// ─── Stopwords for keyWord derivation ─────────────────────────────────
// Inlined to keep this lib independent of the "use client" panel module.

const STOPWORDS = new Set([
  "the", "and", "that", "with", "this", "from", "have", "will", "your",
  "you", "are", "was", "for", "his", "her", "him", "they", "them", "their",
  "what", "when", "which", "into", "unto", "shall", "not", "but", "all",
  "who", "how", "why", "our", "out", "one", "also", "may", "can", "has",
  "had", "were", "been", "does", "did", "then", "than", "upon", "over",
  "such", "more", "most", "some", "any", "each", "every", "there", "would",
  "could", "should", "about", "because",
]);

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
  articleClasses?: string;
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

/**
 * Derive single significant words from a paragraph's body.
 *  - split on non-letter chars
 *  - drop stopwords + short (< 4 char) tokens
 *  - dedupe (case-insensitive, keeping first-seen casing)
 *  - cap at 12
 */
function deriveKeyWords(bodyText: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of bodyText.split(/[^A-Za-z'’-]+/)) {
    const w = raw.trim();
    if (w.length < 4) continue;
    const lc = w.toLowerCase();
    if (STOPWORDS.has(lc)) continue;
    if (seen.has(lc)) continue;
    seen.add(lc);
    out.push(w);
    if (out.length >= 12) break;
  }
  return out;
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
  const questions: DraftQuestion[] = rawQuestions.map((rq) => ({
    question: rq.text,
    answer: "",
    simplifiedAnswer: "",
    keyWords: deriveKeyWords(rq.bodyText),
    options: [],
    imageUrl: "",
    subheading: rq.subheading,
    references: dedupeReferences(rq.refs),
  }));

  // Pack-level derived data.
  const vocabFromBody = extractVocabulary(fullBodyText);
  const keyWordUnion = new Set<string>(vocabFromBody);
  for (const q of questions) for (const w of q.keyWords) keyWordUnion.add(w);
  const vocabulary = [...keyWordUnion];

  const keyPeople = extractKeyPeople(fullBodyText);
  const themes = pickThemes(fullBodyText, 5);
  const keyPhrases = extractKeyPhrases(fullBodyText);
  const scriptures = allScriptureRefs.map((reference) => ({
    reference,
    text: "" as const,
  }));

  // Resolve title for attribution: prefer the article <h1>, fall back to
  // the JSON `title` field.
  const displayTitle = header.title || title || "Watchtower study article";
  const issuePhrase = issueLabel
    ? `, The Watchtower ${issueLabel}`
    : ", The Watchtower";
  const attribution = `Based on "${displayTitle}"${issuePhrase}. © Watch Tower.`;

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
