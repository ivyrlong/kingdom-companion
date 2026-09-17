"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Confetti from "@/components/Confetti";

/* ── Types ─────────────────────────────────────────────────────────── */

export interface StudyReference {
  type: "scripture" | "publication" | "crossArticle" | "footnote" | "internal";
  /** What to print on the chip (e.g. "Insight, vol. 1, p. 1240"). */
  label: string;
  /** WOL link — chips always open this in a new tab. */
  url?: string;
  /** When type === "scripture", the parsed citation like "2 Kings 5:13, 14". */
  scriptureRef?: string;
}

export interface StudyQuestion {
  question: string;
  /** Paragraph answer. Blank = a personal/discussion question. */
  answer: string;
  /** Kid-level answer. Blank = the question is hidden from Little Ones. */
  simplifiedAnswer?: string;
  /** Comment-building word bank for Youth (auto-derived if empty). */
  keyWords?: string[];
  /** Multiple-choice options for Youth (auto-derived if empty). */
  options?: string[];
  /** Per-question picture for the Little Ones reveal (falls back to pack). */
  imageUrl?: string;
  /** Section subheading that precedes this question (from WOL import). */
  subheading?: string;
  /** Outgoing reference links found in the paragraph (from WOL import). */
  references?: StudyReference[];
}

export interface SavedStudyResponse {
  response: string;
  data?: { mode?: "build" | "mc"; builtAnswer?: string } | null;
}

export interface WatchtowerStudyPanelProps {
  ageGroup: string;
  packId: string;
  title: string;
  /** One linked picture, revealed (grayscale → colour) for Little Ones. */
  imageUrl: string | null;
  questions: StudyQuestion[];
  /** Pack's authored scripture references (with optional text). When the
   *  text is non-empty and the reference appears in a question, the
   *  question header offers a "Reveal scripture" toggle. */
  scriptures?: Array<{ reference: string; text: string }>;
  /** Prep answers keyed by question index, so Meeting Live resumes them. */
  savedResponses: Record<number, SavedStudyResponse>;
  /** Pre-formatted attribution line for the pack, e.g.
   *  "Based on 'Show Insight…', The Watchtower 2026 No. 4. © Watch Tower." */
  attribution?: string | null;
  /** Canonical wol.jw.org URL for the source article. */
  sourceUrl?: string | null;
}

/* ── Helpers ───────────────────────────────────────────────────────── */

const STOPWORDS = new Set([
  "the", "and", "that", "with", "this", "from", "have", "will", "your",
  "you", "are", "was", "for", "his", "her", "him", "they", "them", "their",
  "what", "when", "which", "into", "unto", "shall", "not", "but", "all",
  "who", "how", "why", "our", "out", "one", "also", "may", "can", "has",
  "had", "were", "been", "does", "did", "then", "than", "upon", "over",
  "such", "more", "most", "some", "any", "each", "every", "there", "would",
  "could", "should", "about", "because",
]);

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/**
 * Match scripture references that appear inside a question's text against
 * the pack's authored scriptures, returning only the ones whose text has
 * been filled in by the admin. Used to surface "Reveal scripture" toggles
 * on the question header.
 *
 * Matching is whitespace-insensitive (so "2 Kings 5:13, 14" matches the
 * pack ref "2 Kings 5:13, 14" regardless of stray spacing) but otherwise
 * exact — admins should keep references consistent.
 */
function matchPackScriptures(
  questionText: string,
  pack: Array<{ reference: string; text: string }>,
): Array<{ reference: string; text: string }> {
  if (!pack.length) return [];
  const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  const matched: Array<{ reference: string; text: string }> = [];
  for (const s of pack) {
    if (!s.text?.trim()) continue;
    if (norm(questionText).includes(norm(s.reference))) matched.push(s);
  }
  return matched;
}

/**
 * Splits a leading Watchtower paragraph marker — "1.", "1, 2.", "1-2.",
 * "1–2." — off the question text. We render the marker separately as a
 * "¶1–2" badge so the list index ("1.") doesn't collide with it and
 * produce "1. 1-2. …" double numbering.
 */
const LEADING_PARAGRAPH = /^\s*(\d+(?:\s*[,\-–—]\s*\d+)*)\.\s*/;
function splitParagraph(q: string): { paragraph: string | null; text: string } {
  const m = q.match(LEADING_PARAGRAPH);
  if (!m) return { paragraph: null, text: q };
  // Normalise "1, 2" / "1 - 2" → "1, 2" / "1–2" with a real en-dash.
  const para = m[1].replace(/\s*[\-–—]\s*/, "–").replace(/\s*,\s*/, ", ");
  return { paragraph: para, text: q.slice(m[0].length).trim() };
}

/** Per-question picture, falling back to the pack's shared picture. */
function imgSrc(
  raw: string | null | undefined,
  fallback: string | null,
): string | null {
  const v = (raw ?? "").trim();
  if (!v) return fallback;
  if (v.startsWith("/") || v.startsWith("http")) return v;
  return `/${v}`;
}

/** Significant words from the answer, used when no key words were authored. */
function deriveKeyWords(answer: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of answer.split(/[^A-Za-z'’-]+/)) {
    const w = raw.trim();
    const lc = w.toLowerCase();
    if (w.length >= 4 && !STOPWORDS.has(lc) && !seen.has(lc)) {
      seen.add(lc);
      out.push(w);
    }
    if (out.length >= 12) break;
  }
  return out;
}

/** Build multiple-choice options when none were authored. */
function deriveOptions(answer: string, allAnswers: string[]): string[] {
  const correct = answer.trim();
  const distractors: string[] = [];
  for (const a of allAnswers) {
    const t = a.trim();
    if (t && t !== correct && !distractors.includes(t)) distractors.push(t);
    if (distractors.length >= 3) break;
  }
  const generic = [
    "The Bible does not say",
    "Only on special occasions",
    "It is not important",
  ];
  while (distractors.length < 3) {
    const g = generic.shift();
    if (!g) break;
    if (g !== correct) distractors.push(g);
  }
  return shuffle([correct, ...distractors]);
}

async function postResponse(
  packId: string,
  index: number,
  question: string,
  response: string,
  data?: { mode?: "build" | "mc"; builtAnswer?: string },
): Promise<boolean> {
  try {
    const res = await fetch("/api/daily/response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentPackId: packId,
        questionIndex: index,
        question: question.slice(0, 500),
        response,
        ...(data ? { data } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function useCelebrate(): [boolean, () => void] {
  const [on, setOn] = useState(false);
  const fire = useCallback(() => {
    setOn(true);
    window.setTimeout(() => setOn(false), 1600);
  }, []);
  return [on, fire];
}

/** What to print on each pagination pill — the paragraph number from
 *  the question's leading marker (e.g. "1-2", "6(a)"), falling back to
 *  the list index if there's no marker so the pill is never empty. */
function paragraphLabel(question: string, index: number): string {
  const { paragraph } = splitParagraph(question);
  if (paragraph) return paragraph;
  // Capture "6(a)", "7(b)" style sub-markers that don't end in a period.
  const sub = question.match(/^\s*(\d+\([a-h]\))/i);
  if (sub) return sub[1];
  return String(index + 1);
}

/** Quick-jump pill list at the top of every Watchtower view. Renders one
 *  button per question — clicking either scrolls to the question (Adult /
 *  Youth) or advances the LittlesStudy carousel to that question. */
function ParagraphNav({
  questions,
  activeIndex,
  onSelect,
}: {
  questions: StudyQuestion[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  if (questions.length < 2) return null;
  return (
    <nav
      aria-label="Jump to paragraph"
      className="sticky top-0 z-10 -mx-1 mb-4 bg-white/95 dark:bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-zinc-950/70 px-1 py-2 border-b border-zinc-100 dark:border-zinc-800"
    >
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <span className="shrink-0 text-xs font-medium text-zinc-400 mr-1">
          Jump to:
        </span>
        {questions.map((q, i) => {
          const active = i === activeIndex;
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide transition border ${
                active
                  ? "bg-violet-600 dark:bg-violet-500 text-white border-violet-600 dark:border-violet-500"
                  : "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-transparent hover:bg-violet-200 dark:hover:bg-violet-900/50"
              }`}
              title={`Paragraph ${paragraphLabel(q.question, i)}`}
            >
              ¶{paragraphLabel(q.question, i)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ── Reference chips: per-question WOL outgoing links ──────────────── */

/** Tailwind classes for each reference type — colour-coded so a reader
 *  can tell at a glance whether a chip points to scripture, a publication,
 *  another article in the same magazine, a footnote, or an in-page anchor. */
const REFERENCE_CHIP_STYLES: Record<StudyReference["type"], string> = {
  scripture:
    "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 hover:bg-sky-200 dark:hover:bg-sky-900/50",
  publication:
    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900/50",
  crossArticle:
    "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 hover:bg-violet-200 dark:hover:bg-violet-900/50",
  footnote:
    "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700",
  internal:
    "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700",
};

/** Row of small tappable chips for the question's WOL-imported references.
 *  Each chip opens its WOL URL in a new tab — we never inline the resolved
 *  content (copyright). `internal` chips intentionally skip the external-
 *  link icon because they're anchors within the same article. */
function ReferenceChips({ references }: { references?: StudyReference[] }) {
  if (!references || references.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-medium text-zinc-400 mr-0.5">
        See also:
      </span>
      {references.map((ref, i) => {
        const styles = REFERENCE_CHIP_STYLES[ref.type];
        const showExternalIcon =
          ref.type !== "internal" && !!ref.url;
        const inner = (
          <>
            {ref.label}
            {showExternalIcon && (
              <span aria-hidden="true" className="ml-1 opacity-70">
                ↗
              </span>
            )}
          </>
        );
        const className = `inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border transition ${styles}`;
        if (ref.url) {
          return (
            <a
              key={`${ref.type}-${ref.label}-${i}`}
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
              title={ref.label}
            >
              {inner}
            </a>
          );
        }
        return (
          <span
            key={`${ref.type}-${ref.label}-${i}`}
            className={`${className} cursor-default`}
            title={ref.label}
          >
            {ref.label}
          </span>
        );
      })}
    </div>
  );
}

/* ── Attribution footer: pack-level source line ────────────────────── */

/** Small muted footer below the study showing the source citation and a
 *  link to the canonical WOL article. Renders nothing if both fields are
 *  empty so packs without imported metadata don't get a stray line. */
function AttributionFooter({
  attribution,
  sourceUrl,
}: {
  attribution?: string | null;
  sourceUrl?: string | null;
}) {
  const hasAttribution = !!attribution?.trim();
  const hasSourceUrl = !!sourceUrl?.trim();
  if (!hasAttribution && !hasSourceUrl) return null;
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs italic text-zinc-400">
      {hasAttribution && <span>{attribution}</span>}
      {hasSourceUrl && (
        <a
          href={sourceUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className="not-italic font-medium text-sky-500 dark:text-sky-400 hover:underline"
        >
          Read full article on WOL →
        </a>
      )}
    </div>
  );
}

/* ── Container ─────────────────────────────────────────────────────── */

export default function WatchtowerStudyPanel(
  props: WatchtowerStudyPanelProps,
) {
  const baseQuestions = props.questions.filter((q) => q.question.trim());
  const [celebrating, fire] = useCelebrate();

  const isLittle = props.ageGroup === "LITTLE_ONES";
  const isYouth =
    props.ageGroup === "YOUTH" || props.ageGroup === "FAMILY";

  // Self-managed study ↔ live mode (same pattern as WorkbookPanel).
  // Default: if any prep answers already exist for this pack, land in
  // live mode so the family opens straight to their finished study.
  // Explicit Save / Edit choices win and persist per-pack.
  const modeKey = `wt-mode:${props.packId}`;
  const [mode, setMode] = useState<"study" | "live">("study");
  const [modeLoaded, setModeLoaded] = useState(false);
  useEffect(() => {
    try {
      const explicit = window.localStorage.getItem(modeKey);
      if (explicit === "live" || explicit === "study") {
        setMode(explicit);
      } else if (Object.keys(props.savedResponses).length > 0) {
        setMode("live");
      }
    } catch {
      // localStorage unavailable — stay on default "study".
    }
    setModeLoaded(true);
  }, [modeKey, props.savedResponses]);
  const switchMode = (m: "study" | "live") => {
    setMode(m);
    try {
      window.localStorage.setItem(modeKey, m);
    } catch {
      // ignore
    }
  };
  const live = mode === "live";

  // Little Ones only ever see questions an admin wrote a Simplified answer
  // for — everything else is automatically hidden (no adult-answer fallback).
  const questions = isLittle
    ? baseQuestions.filter((q) => (q.simplifiedAnswer ?? "").trim())
    : baseQuestions;

  // Carousel index for Youth + Adult: one question shown at a time, with
  // Back/Next buttons + jump-to nav. Little Ones manages its own idx.
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    // Re-bound idx if the question list ever shrinks under us.
    if (idx >= questions.length) setIdx(0);
  }, [questions.length, idx]);

  // After the first render, scroll the active question into view when the
  // user advances. We render every question (all stay mounted so unsaved
  // typing isn't lost on nav), but hide all but the active one — so
  // scroll position doesn't auto-shift; we nudge it here for clarity.
  const firstIdxRender = useRef(true);
  useEffect(() => {
    if (firstIdxRender.current) {
      firstIdxRender.current = false;
      return;
    }
    document
      .getElementById(`wt-q-${idx}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [idx]);

  if (questions.length === 0) return null;

  return (
    <section className="mb-8">
      <Confetti active={celebrating} duration={1500} count={60} />
      <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          {isLittle
            ? "Watchtower Story Time"
            : live
              ? "Your Watchtower comments"
              : "Watchtower Study"}
        </h2>
        <div className="flex items-center gap-2">
          {live && (
            <span className="text-xs font-medium text-violet-600 dark:text-violet-300">
              Your prepared answers are loaded
            </span>
          )}
          {modeLoaded && live && (
            <button
              onClick={() => switchMode("study")}
              className="text-xs font-medium px-3 py-1 rounded-full bg-white dark:bg-zinc-800 text-coral-700 dark:text-coral-300 border border-coral-300 dark:border-coral-800 hover:bg-coral-50 dark:hover:bg-coral-950/40 transition"
            >
              ✏️ Edit my study guide
            </button>
          )}
        </div>
      </div>

      {isLittle ? (
        <>
          <LittlesStudy
            questions={questions}
            imageUrl={props.imageUrl}
            fire={fire}
          />
          <AttributionFooter
            attribution={props.attribution}
            sourceUrl={props.sourceUrl}
          />
        </>
      ) : (
        <>
          <ParagraphNav
            questions={questions}
            activeIndex={idx}
            onSelect={setIdx}
          />
          {/* Every question stays mounted so a user typing on Q3 then
              jumping to Q5 and back doesn't lose their answer — only
              the active card is visible. */}
          <div>
            {questions.map((q, i) => (
              <div
                key={i}
                id={`wt-q-${i}`}
                className={`scroll-mt-16 ${i === idx ? "" : "hidden"}`}
              >
                {isYouth ? (
                  <YouthQuestion
                    index={i}
                    packId={props.packId}
                    q={q}
                    allAnswers={questions.map((x) => x.answer)}
                    packScriptures={props.scriptures ?? []}
                    saved={props.savedResponses[i]}
                    live={live}
                  />
                ) : (
                  <AdultQuestion
                    index={i}
                    packId={props.packId}
                    q={q}
                    packScriptures={props.scriptures ?? []}
                    saved={props.savedResponses[i]}
                    live={live}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Back / Next pager */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ← Back
            </button>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Question {idx + 1} of {questions.length}
            </span>
            <button
              type="button"
              onClick={() =>
                setIdx((i) => Math.min(questions.length - 1, i + 1))
              }
              disabled={idx >= questions.length - 1}
              className="px-4 py-2 rounded-lg bg-coral-600 hover:bg-coral-700 text-white text-sm font-medium disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          </div>

          {/* Save = mode toggle. Every input already persists per keystroke;
              hitting Save just switches the panel to the read-only Meeting
              Live view. Study mode only. */}
          {modeLoaded && !live && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => switchMode("live")}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition"
              >
                💾 Save study guide
              </button>
            </div>
          )}

          <AttributionFooter
            attribution={props.attribution}
            sourceUrl={props.sourceUrl}
          />
        </>
      )}
    </section>
  );
}

/* ── Little Ones: per-question tap-to-reveal ───────────────────────── */

function LittlesStudy({
  questions,
  imageUrl,
  fire,
}: {
  questions: StudyQuestion[];
  imageUrl: string | null;
  fire: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [imgOpen, setImgOpen] = useState(false);
  const [ansOpen, setAnsOpen] = useState(false);
  const done = idx >= questions.length;

  const q = questions[Math.min(idx, questions.length - 1)];
  // Every question here is guaranteed to have a simplified answer (the
  // container filters the rest out), so there is no adult-answer fallback.
  const answer = q?.simplifiedAnswer?.trim() ?? "";
  // This paragraph's own picture, or the pack's shared one.
  const pic = imgSrc(q?.imageUrl, imageUrl);

  // Warm the browser cache for the next question's image so that when the
  // user clicks "Next" and we remount the <img> (see key={pic} below) it
  // can paint instantly in grayscale instead of briefly flashing blank.
  useEffect(() => {
    const upcoming = questions[idx + 1];
    if (!upcoming) return;
    const url = imgSrc(upcoming.imageUrl, imageUrl);
    if (!url) return;
    const preload = new Image();
    preload.src = url;
  }, [idx, questions, imageUrl]);

  const next = () => {
    setImgOpen(false);
    setAnsOpen(false);
    setIdx((i) => i + 1);
    if (idx + 1 >= questions.length) fire();
  };

  /** Jump straight to a given question — used by the paragraph nav so
   *  little ones don't have to tap "next" through every card. */
  const jumpTo = (i: number) => {
    setImgOpen(false);
    setAnsOpen(false);
    setIdx(i);
  };

  const back = () => {
    setImgOpen(false);
    setAnsOpen(false);
    setIdx((i) => Math.max(0, i - 1));
  };

  const cardBase =
    "rounded-3xl border-2 p-5 flex flex-col items-center justify-center text-center min-h-[200px] select-none transition-transform active:scale-95 shadow-md w-full";

  if (done) {
    return (
      <div className="rounded-3xl border-2 border-golden-300 dark:border-golden-700 bg-gradient-to-br from-golden-100 to-coral-100 dark:from-golden-900/30 dark:to-coral-900/20 p-10 text-center">
        <p className="text-5xl mb-3">🎉</p>
        <p className="text-2xl font-extrabold text-coral-600 dark:text-coral-300">
          Great job!
        </p>
        <p className="mt-2 text-zinc-600 dark:text-zinc-300">
          You learned all about the Watchtower today.
        </p>
        <button
          onClick={() => setIdx(0)}
          className="mt-5 px-5 py-2 rounded-xl bg-coral-600 hover:bg-coral-700 text-white text-sm font-bold transition"
        >
          Do it again
        </button>
      </div>
    );
  }

  return (
    <div>
      <ParagraphNav
        questions={questions}
        activeIndex={idx}
        onSelect={jumpTo}
      />
      <p className="text-sm font-medium text-zinc-400 mb-2">
        Question {idx + 1} of {questions.length}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1 — the question */}
        <div
          className={`${cardBase} bg-gradient-to-br from-sky-100 to-violet-100 border-sky-300 dark:from-sky-900/30 dark:to-violet-900/20 dark:border-sky-700`}
        >
          <span className="text-xs font-semibold text-sky-600 dark:text-sky-300 mb-2">
            Let&apos;s find out
          </span>
          {(() => {
            const { paragraph, text } = splitParagraph(q.question);
            return (
              <>
                {paragraph && (
                  <span className="mb-2 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-violet-200 dark:bg-violet-900/40 text-violet-700 dark:text-violet-200">
                    Paragraph {paragraph}
                  </span>
                )}
                <span className="text-lg font-extrabold leading-tight text-zinc-800 dark:text-zinc-100">
                  {text}
                </span>
              </>
            );
          })()}
        </div>

        {/* 2 — picture: B&W → colour */}
        <button
          onClick={() => {
            if (!imgOpen) {
              setImgOpen(true);
              fire();
            }
          }}
          className={`${cardBase} relative overflow-hidden p-0 ${
            imgOpen
              ? "border-sky-300 dark:border-sky-700"
              : "border-zinc-200 dark:border-zinc-800"
          }`}
        >
          {pic ? (
            <>
              {/* key={pic} forces the <img> to remount when the question
                  changes, so the colour→grayscale transition can't run on
                  the previous picture (which is what produced the flash
                  the user noticed). The new element starts straight in
                  the grayscale state with no "from" frame to animate. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={pic}
                src={pic}
                alt=""
                className={`w-full h-full object-cover transition-[filter] duration-700 ${
                  imgOpen ? "grayscale-0" : "grayscale"
                }`}
              />
              <span className="absolute bottom-2 text-sm text-white drop-shadow font-medium">
                {imgOpen ? "✨ Beautiful! ✨" : "Tap to colour me!"}
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400">
              <span className="text-5xl mb-2">📖</span>
              <span className="text-sm">Picture coming soon</span>
            </div>
          )}
        </button>

        {/* 3 — answer behind a ? */}
        <button
          onClick={() => {
            if (!ansOpen) {
              setAnsOpen(true);
              fire();
            }
          }}
          className={`${cardBase} ${
            ansOpen
              ? "bg-gradient-to-br from-violet-100 to-sky-100 border-violet-300 dark:from-violet-900/30 dark:to-sky-900/20 dark:border-violet-700"
              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
          }`}
        >
          {ansOpen ? (
            <>
              <span className="text-xs font-semibold text-violet-600 dark:text-violet-300 mb-2">
                The answer is
              </span>
              <span className="text-base text-zinc-800 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap">
                {answer || "Ask a grown-up to help with this one!"}
              </span>
            </>
          ) : (
            <>
              <span className="text-6xl font-black text-violet-400">?</span>
              <span className="mt-3 text-sm text-zinc-400">
                Tap to find out!
              </span>
            </>
          )}
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          onClick={back}
          disabled={idx === 0}
          className="px-6 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          ← Back
        </button>
        <button
          onClick={next}
          disabled={!ansOpen}
          className="px-6 py-2.5 rounded-xl bg-coral-600 hover:bg-coral-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white text-sm font-bold transition"
        >
          {idx + 1 >= questions.length ? "Finish 🎉" : "Next →"}
        </button>
      </div>
    </div>
  );
}

/* ── Youth: build / multiple-choice / reveal / note ────────────────── */

function YouthQuestion({
  index,
  packId,
  q,
  allAnswers,
  packScriptures,
  saved,
  live,
}: {
  index: number;
  packId: string;
  q: StudyQuestion;
  allAnswers: string[];
  packScriptures: Array<{ reference: string; text: string }>;
  saved: SavedStudyResponse | undefined;
  live?: boolean;
}) {
  // A blank paragraph answer marks a personal/discussion question: there is
  // nothing to reveal or build, so the player shows only a text box.
  const isReflection = !q.answer.trim();

  const keyWords = useMemo(
    () =>
      shuffle(
        q.keyWords && q.keyWords.length > 0
          ? q.keyWords
          : deriveKeyWords(q.answer),
      ),
    [q.keyWords, q.answer],
  );
  const options = useMemo(
    () =>
      q.options && q.options.length >= 2
        ? q.options
        : deriveOptions(q.answer, allAnswers),
    [q.options, q.answer, allAnswers],
  );

  const [mode, setMode] = useState<"build" | "mc">(
    saved?.data?.mode ?? "build",
  );
  // The user's answer lives in a single field. For back-compat with rows
  // saved under the old chip-builder UI, fall back to `data.builtAnswer`
  // when `response` is empty so existing prepared answers don't vanish.
  const [note, setNote] = useState(
    saved?.response || saved?.data?.builtAnswer || "",
  );
  const [revealed, setRevealed] = useState(false);
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");

  // Refs so the debounced + beacon saves always read the latest values.
  const noteRef = useRef(note);
  noteRef.current = note;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Textarea ref so chip taps can insert at the cursor instead of just
  // appending. Without this, tapping a chip after positioning your cursor
  // would still add the word to the end — which feels broken.
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const flush = useCallback(async () => {
    setStatus("saving");
    const ok = await postResponse(
      packId,
      index,
      q.question,
      noteRef.current,
      // Discussion questions don't have a mode toggle.
      isReflection ? undefined : { mode: modeRef.current },
    );
    setStatus(ok ? "saved" : "error");
  }, [packId, index, q.question, isReflection]);

  // Auto-save after a short pause. Watches `note` so MC selections and
  // chip taps (which mutate note directly, not via the textarea's blur)
  // still persist. Watches `mode` so the picked tab is sticky.
  const initial = useRef(true);
  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    const t = setTimeout(() => {
      void flush();
    }, 700);
    return () => clearTimeout(t);
  }, [note, mode, flush]);

  // Backstop for the autosave debounce: when the tab goes hidden or the
  // component unmounts (e.g. the user types in the textarea then clicks
  // a nav link without blurring), fire a sendBeacon so the request leaves
  // the browser even though the page is going away.
  const beaconFlush = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
    const latest = noteRef.current;
    if (!latest.trim()) return;
    const payload = {
      contentPackId: packId,
      questionIndex: index,
      question: q.question.slice(0, 500),
      response: latest,
      ...(isReflection ? {} : { data: { mode: modeRef.current } }),
    };
    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    navigator.sendBeacon("/api/daily/response", blob);
  }, [packId, index, q.question, isReflection]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") beaconFlush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", beaconFlush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", beaconFlush);
      // Client-side route change unmounts this component — final flush.
      beaconFlush();
    };
  }, [beaconFlush]);

  /** Whole-word, case-insensitive match: chip lights up when its word
   *  appears in the user's answer, whether they typed it or tapped it. */
  const usedKeyWord = useCallback(
    (word: string) => {
      const w = word.trim();
      if (!w) return false;
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^A-Za-z'’-])${escaped}([^A-Za-z'’-]|$)`, "i").test(
        note,
      );
    },
    [note],
  );

  /** Insert a key word at the cursor — or at the end if the textarea
   *  isn't focused — with smart spacing so we don't get "wordword". */
  const insertWord = (word: string) => {
    const ta = textareaRef.current;
    setNote((prev) => {
      const start = ta?.selectionStart ?? prev.length;
      const end = ta?.selectionEnd ?? prev.length;
      const before = prev.slice(0, start);
      const after = prev.slice(end);
      const needsLead = before.length > 0 && !/\s$/.test(before);
      const needsTrail = after.length > 0 && !/^\s/.test(after);
      const piece = `${needsLead ? " " : ""}${word}${needsTrail ? " " : ""}`;
      const next = before + piece + after;
      // Restore focus + cursor just after the inserted word.
      requestAnimationFrame(() => {
        if (!ta) return;
        const cursor =
          before.length + piece.length - (needsTrail ? 1 : 0);
        ta.focus();
        ta.setSelectionRange(cursor, cursor);
      });
      return next;
    });
    setStatus("");
  };

  const { paragraph, text } = splitParagraph(q.question);
  const hasParagraphAnswer = !!q.answer.trim();
  const scriptureMatches = useMemo(
    () => matchPackScriptures(q.question, packScriptures),
    [q.question, packScriptures],
  );
  const [openScriptures, setOpenScriptures] = useState<Set<string>>(
    () => new Set(),
  );
  const toggleScripture = (ref: string) =>
    setOpenScriptures((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });

  // In Meeting Live, fall back to the paragraph answer when nothing was
  // prepared — so the user still has something to read aloud.
  const liveAnswer = note.trim() || q.answer.trim();

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="font-semibold text-zinc-900 dark:text-zinc-50 flex-1">
          <span className="text-zinc-400 mr-1">{index + 1}.</span>
          {paragraph && (
            <span className="inline-block mr-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 align-middle">
              ¶{paragraph}
            </span>
          )}
          {text}
        </p>
        {/* Reveal links live next to the question in prep mode so they
            don't visually count as a 4th MC option below. */}
        {!live && (hasParagraphAnswer || scriptureMatches.length > 0) && (
          <div className="flex flex-col items-end gap-1 shrink-0 text-xs">
            {hasParagraphAnswer && (
              <button
                onClick={() => setRevealed((r) => !r)}
                className="font-medium text-sky-600 dark:text-sky-400 hover:underline"
              >
                {revealed ? "Hide paragraph answer" : "Reveal paragraph answer"}
              </button>
            )}
            {scriptureMatches.map((s) => {
              const open = openScriptures.has(s.reference);
              return (
                <button
                  key={s.reference}
                  onClick={() => toggleScripture(s.reference)}
                  className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  {open ? `Hide ${s.reference}` : `Reveal ${s.reference}`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Revealed panels (prep only) — placed right after the header so
          they read like an inline reference, not a separate section. */}
      {!live && revealed && hasParagraphAnswer && (
        <div className="mb-3 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 p-3">
          <p className="text-xs font-semibold text-sky-700 dark:text-sky-300 mb-1">
            What the paragraph says
          </p>
          <p className="text-sm text-zinc-800 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap">
            {q.answer}
          </p>
        </div>
      )}
      {!live &&
        scriptureMatches
          .filter((s) => openScriptures.has(s.reference))
          .map((s) => (
            <div
              key={s.reference}
              className="mb-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3"
            >
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                {s.reference}
              </p>
              <p className="text-sm text-zinc-800 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap">
                {s.text}
              </p>
            </div>
          ))}

      {/* Meeting Live: read-only recap of whatever was prepared. */}
      {live ? (
        <>
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
              {note.trim()
                ? "Your prepared answer"
                : hasParagraphAnswer
                  ? "Paragraph answer"
                  : "Your prepared answer"}
            </p>
            {liveAnswer ? (
              <p className="text-sm text-zinc-800 dark:text-zinc-100 whitespace-pre-wrap">
                {liveAnswer}
              </p>
            ) : (
              <p className="text-sm italic text-zinc-400">
                No answer prepared this week.
              </p>
            )}
          </div>
          <ReferenceChips references={q.references} />
        </>
      ) : (
        <>
          {/* Mode toggle (non-reflection only) */}
          {!isReflection && (
            <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 w-fit mb-3">
              {(["build", "mc"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    mode === m
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700"
                  }`}
                >
                  {m === "build" ? "Write my own" : "Multiple choice"}
                </button>
              ))}
            </div>
          )}

          {/* Multiple-choice options write straight into the answer
              field below — so the user can edit the option afterwards
              if they want. */}
          {!isReflection && mode === "mc" && (
            <div className="mb-3 space-y-2">
              {options.map((opt, i) => {
                const selected = note.trim() === opt.trim();
                const isCorrect =
                  revealed && opt.trim() === q.answer.trim();
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setNote(opt);
                      setStatus("");
                    }}
                    className={`block w-full text-left px-3 py-2 rounded-lg border text-sm transition ${
                      isCorrect
                        ? "border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                        : selected
                          ? "border-coral-400 bg-coral-50 dark:bg-coral-900/20 text-coral-700 dark:text-coral-300"
                          : "border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-coral-300"
                    }`}
                  >
                    {opt}
                    {isCorrect && " ✓"}
                  </button>
                );
              })}
            </div>
          )}

          {/* Textarea + chips show in Build mode and on reflection
              questions. In MC mode the selected option IS the answer,
              so the textarea would just clutter the screen. */}
          {(isReflection || mode === "build") && (
            <>
              {isReflection ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                  This is a personal question — share your own thoughts.
                </p>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                  Write your comment. Tap a key word to add it; words you
                  use get checked off automatically.
                </p>
              )}
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                My answer
              </label>
              <textarea
                ref={textareaRef}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setStatus("");
                }}
                onBlur={() => void flush()}
                rows={3}
                placeholder="Write your answer here…"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-coral-500"
              />

              {!isReflection && keyWords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {keyWords.map((w, i) => {
                    const used = usedKeyWord(w);
                    return (
                      <button
                        key={`${w}-${i}`}
                        type="button"
                        onClick={() => insertWord(w)}
                        title={used ? `${w} — used` : `Insert "${w}"`}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition border ${
                          used
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                            : "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-transparent hover:bg-violet-200 dark:hover:bg-violet-900/50"
                        }`}
                      >
                        {used && <span aria-hidden="true">✓ </span>}
                        {w}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <ReferenceChips references={q.references} />

          <p className="h-4 mt-1 text-xs text-zinc-400">
            {status === "saving"
              ? "Saving…"
              : status === "saved"
                ? "Saved ✓ (your guardian can see this)"
                : status === "error"
                  ? "Couldn't save — check your connection."
                  : ""}
          </p>
        </>
      )}
    </div>
  );
}

/* ── Adult: reveal toggle + personal answer ────────────────────────── */

function AdultQuestion({
  index,
  packId,
  q,
  packScriptures,
  saved,
  live,
}: {
  index: number;
  packId: string;
  q: StudyQuestion;
  packScriptures: Array<{ reference: string; text: string }>;
  saved: SavedStudyResponse | undefined;
  live?: boolean;
}) {
  // Blank paragraph answer = personal/discussion question: nothing to reveal.
  const hasAnswer = !!q.answer.trim();
  const [revealed, setRevealed] = useState(false);
  const scriptureMatches = useMemo(
    () => matchPackScriptures(q.question, packScriptures),
    [q.question, packScriptures],
  );
  const [openScriptures, setOpenScriptures] = useState<Set<string>>(
    () => new Set(),
  );
  const toggleScripture = (ref: string) =>
    setOpenScriptures((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  const [note, setNote] = useState(saved?.response ?? "");
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");

  // Ref so the beacon path always sees the latest typed value (the
  // textarea only flushes via fetch on blur — without this backstop a
  // user who types and immediately clicks a nav link loses the answer).
  const noteRef = useRef(note);
  noteRef.current = note;

  const save = async () => {
    setStatus("saving");
    const ok = await postResponse(packId, index, q.question, note);
    setStatus(ok ? "saved" : "error");
  };

  // sendBeacon survives the page unload that cancels in-flight fetches.
  const beaconFlush = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
    const note = noteRef.current;
    if (!note.trim()) return;
    const payload = {
      contentPackId: packId,
      questionIndex: index,
      question: q.question.slice(0, 500),
      response: note,
    };
    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    navigator.sendBeacon("/api/daily/response", blob);
  }, [packId, index, q.question]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") beaconFlush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", beaconFlush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", beaconFlush);
      beaconFlush();
    };
  }, [beaconFlush]);

  const { paragraph, text } = splitParagraph(q.question);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-zinc-900 dark:text-zinc-50 flex-1">
          <span className="text-zinc-400 mr-1">{index + 1}.</span>
          {paragraph && (
            <span className="inline-block mr-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 align-middle">
              ¶{paragraph}
            </span>
          )}
          {text}
        </p>
        {!live && (hasAnswer || scriptureMatches.length > 0) && (
          <div className="flex flex-col items-end gap-1 shrink-0 text-sm">
            {hasAnswer && (
              <button
                onClick={() => setRevealed((r) => !r)}
                className="font-medium text-sky-600 dark:text-sky-400 hover:underline"
              >
                {revealed ? "Hide answer" : "Reveal answer"}
              </button>
            )}
            {scriptureMatches.map((s) => {
              const open = openScriptures.has(s.reference);
              return (
                <button
                  key={s.reference}
                  onClick={() => toggleScripture(s.reference)}
                  className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  {open ? `Hide ${s.reference}` : `Reveal ${s.reference}`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!live && hasAnswer && revealed && (
        <div className="mt-3 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 p-3">
          <p className="text-xs font-semibold text-sky-700 dark:text-sky-300 mb-1">
            What the paragraph says
          </p>
          <p className="text-sm text-zinc-800 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap">
            {q.answer}
          </p>
        </div>
      )}

      {!live &&
        scriptureMatches
          .filter((s) => openScriptures.has(s.reference))
          .map((s) => (
            <div
              key={s.reference}
              className="mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3"
            >
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                {s.reference}
              </p>
              <p className="text-sm text-zinc-800 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap">
                {s.text}
              </p>
            </div>
          ))}

      {!live && !hasAnswer && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
          This is a personal question — write your own answer.
        </p>
      )}

      {/* Meeting Live: read-only recap. Falls back to the paragraph
          answer when nothing personal was prepared so the user still
          has something to read. */}
      {live ? (
        (() => {
          const liveAnswer = note.trim() || q.answer.trim();
          const label = note.trim()
            ? "Your prepared answer"
            : hasAnswer
              ? "Paragraph answer"
              : "Your prepared answer";
          return (
            <>
              <div className="mt-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  {label}
                </p>
                {liveAnswer ? (
                  <p className="text-sm text-zinc-800 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap">
                    {liveAnswer}
                  </p>
                ) : (
                  <p className="text-sm italic text-zinc-400">
                    No answer prepared this week.
                  </p>
                )}
              </div>
              <ReferenceChips references={q.references} />
            </>
          );
        })()
      ) : (
        <>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-4 mb-1">
            My answer
          </label>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setStatus("");
            }}
            onBlur={save}
            rows={3}
            placeholder="Write your personal answer here…"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-coral-500"
          />
          <ReferenceChips references={q.references} />
          <p className="h-4 mt-1 text-xs text-zinc-400">
            {status === "saving"
              ? "Saving…"
              : status === "saved"
                ? "Saved ✓"
                : status === "error"
                  ? "Couldn't save — check your connection."
                  : ""}
          </p>
        </>
      )}
    </div>
  );
}
