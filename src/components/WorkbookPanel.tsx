"use client";

/**
 * WorkbookPanel — the OCLM (Life & Ministry) study guide for prep + live.
 *
 * Renders the imported workbook outline as a per-age experience:
 * - Little Ones get a "things to listen for!" listening card seeded from
 *   the week's vocabulary plus a colorful, icon-led agenda.
 * - Youth get the full agenda with per-part note jotting and reference
 *   chips that open the cited source at wol.jw.org in a new tab.
 * - Adults get the same agenda plus per-part notebook entries and a
 *   collapsible references panel per section.
 *
 * The same panel powers both the prep tab and Meeting Live. In live mode
 * note inputs become read-only previews (so admins/parents don't lose
 * what they prepped) and a duration badge becomes the focus.
 *
 * Notes are persisted to localStorage keyed by pack id + part id. Server
 * persistence (DailyResponse) is a planned follow-up.
 */

import { useEffect, useMemo, useState } from "react";
import { scaffoldFor, type PartScaffold } from "@/lib/oclm-scaffolding";
import type { OclmPartKind } from "@/lib/wol-import";
import FillInBlankCard from "./FillInBlankCard";

// ── Shared types (mirror lib/wol-import.ts shapes) ────────────────────

export type OclmSectionKind =
  | "OPENING"
  | "TREASURES"
  | "MINISTRY"
  | "LIVING"
  | "CLOSING";

export interface WorkbookReference {
  type: "scripture" | "publication" | "crossArticle" | "footnote" | "internal";
  label: string;
  url?: string;
  scriptureRef?: string;
}

export interface WorkbookPart {
  number?: number;
  kind: string;
  section: OclmSectionKind;
  title: string;
  durationMin?: number;
  scenarioTag?: string;
  songNumber?: number;
  videoUrl?: string;
  videoTitle?: string;
  references: WorkbookReference[];
  promptQuestions: string[];
  /** Present after an admin runs "Generate AI insights" on the pack. */
  aiContent?: {
    kidSummary: string;
    familyDiscussionQuestion: string;
    listeningPhrases: string[];
  };
}

export interface WorkbookSection {
  kind: OclmSectionKind;
  title: string;
  parts: WorkbookPart[];
}

interface Props {
  ageGroup: string;
  packId: string;
  title: string;
  bibleReadingRange?: { reference: string } | null;
  bibleReadingAssignment?: { reference: string } | null;
  songs: number[];
  sections: WorkbookSection[];
  vocabulary: string[];
  attribution: string | null;
  sourceUrl: string | null;
  /** When true, render in Meeting-Live mode: read-only notes, agenda focus. */
  live: boolean;
}

// ── Section presentation ──────────────────────────────────────────────

const SECTION_LABEL: Record<OclmSectionKind, string> = {
  OPENING: "Opening",
  TREASURES: "Treasures From God's Word",
  MINISTRY: "Apply Yourself to the Field Ministry",
  LIVING: "Living as Christians",
  CLOSING: "Closing",
};

const SECTION_ICON: Record<OclmSectionKind, string> = {
  OPENING: "♪",
  TREASURES: "💎",
  MINISTRY: "🌾",
  LIVING: "🐑", // sheep — no cross imagery per audience expectations
  CLOSING: "♪",
};

const SECTION_TONE: Record<OclmSectionKind, string> = {
  OPENING: "from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 text-zinc-700 dark:text-zinc-300",
  TREASURES: "from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-900/10 text-emerald-800 dark:text-emerald-200",
  MINISTRY: "from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10 text-amber-800 dark:text-amber-200",
  LIVING: "from-violet-100 to-violet-50 dark:from-violet-900/30 dark:to-violet-900/10 text-violet-800 dark:text-violet-200",
  CLOSING: "from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 text-zinc-700 dark:text-zinc-300",
};

function partKey(packId: string, part: WorkbookPart, idx: number): string {
  return `${packId}:${part.section}:${part.number ?? idx}:${part.title}`;
}

// ── Reference chip ────────────────────────────────────────────────────

function RefChip({ r }: { r: WorkbookReference }) {
  const tone =
    r.type === "scripture"
      ? "bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900/40"
      : r.type === "publication"
        ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/40"
        : r.type === "crossArticle"
          ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-900/40"
          : "bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";

  const inner = (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border ${tone}`}
    >
      {r.label}
    </span>
  );

  if (!r.url) return inner;
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:opacity-80"
    >
      {inner}
    </a>
  );
}

// ── Per-part note (Youth / Adult) ─────────────────────────────────────

function PartNote({
  storageKey,
  placeholder,
  live,
}: {
  storageKey: string;
  placeholder: string;
  live: boolean;
}) {
  const [note, setNote] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(storageKey);
      if (v) setNote(v);
    } catch {
      // localStorage may be unavailable (private mode etc.) — ignore.
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(storageKey, note);
    } catch {
      // ignore
    }
  }, [note, loaded, storageKey]);

  if (live) {
    if (!note.trim()) {
      return (
        <p className="text-xs italic text-zinc-400 dark:text-zinc-500">
          No notes prepared.
        </p>
      );
    }
    return (
      <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap rounded bg-zinc-50 dark:bg-zinc-900/60 p-2">
        {note}
      </div>
    );
  }

  return (
    <textarea
      value={note}
      onChange={(e) => setNote(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full mt-1 px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none focus:ring-2 focus:ring-coral-500"
    />
  );
}

// ── Per-part row ──────────────────────────────────────────────────────

function PartRow({
  part,
  ageGroup,
  packId,
  idx,
  live,
}: {
  part: WorkbookPart;
  ageGroup: string;
  packId: string;
  idx: number;
  live: boolean;
}) {
  const isLittle = ageGroup === "LITTLE_ONES";
  const showNotes = !isLittle && part.kind !== "song";
  const noteKey = `oclm-note:${partKey(packId, part, idx)}`;

  const notePlaceholder =
    ageGroup === "ADULT"
      ? "Outline / discussion notes…"
      : "What I want to remember…";

  const scaffold = scaffoldFor(part.kind as OclmPartKind);

  return (
    <li className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {part.number !== undefined && (
          <span className="text-zinc-400 tabular-nums text-sm">
            {part.number}.
          </span>
        )}
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">
          {part.title}
        </span>
        {part.durationMin !== undefined && (
          <span className="text-xs text-zinc-500">
            ({part.durationMin} min)
          </span>
        )}
        {part.scenarioTag && (
          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
            {part.scenarioTag}
          </span>
        )}
        {part.videoUrl && (
          <a
            href={part.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-coral-600 dark:text-coral-400 hover:underline"
          >
            ▶ {part.videoTitle || "video"}
          </a>
        )}
      </div>

      {scaffold?.focus && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {scaffold.focus}
        </p>
      )}

      {part.references.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {part.references.map((r, i) => (
            <RefChip key={i} r={r} />
          ))}
        </div>
      )}

      {part.aiContent && (
        <PartAiBlock ai={part.aiContent} ageGroup={ageGroup} />
      )}

      {/*
        Fill-in-the-blank exercise seeded from the AI kid summary.
        Little Ones already get the summary read aloud in the panel
        above; Youth and Adult get the interactive version here so
        they can turn the summary into a memory exercise.
      */}
      {part.aiContent && !isLittle && (
        <FillInBlankCard
          storageKey={`oclm-fitb:${packId}:${partKey(packId, part, idx)}`}
          text={part.aiContent.kidSummary}
          vocabulary={[
            ...part.aiContent.listeningPhrases,
          ]}
        />
      )}

      {scaffold && (
        <PartScaffoldBlock scaffold={scaffold} ageGroup={ageGroup} />
      )}

      {part.promptQuestions.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500 font-semibold">
            From the workbook
          </p>
          <ul className="mt-0.5 space-y-0.5">
            {part.promptQuestions.map((q, i) => (
              <li
                key={i}
                className="text-sm italic text-zinc-600 dark:text-zinc-400"
              >
                · {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showNotes && (
        <PartNote storageKey={noteKey} placeholder={notePlaceholder} live={live} />
      )}
    </li>
  );
}

/**
 * Per-audience AI insights block. Rendered above the generic scaffold
 * so week-specific content takes visual precedence — but the scaffold
 * still shows underneath as a stable framework.
 *
 *   Little Ones → the kid summary + the phrases they'll hear.
 *   Youth       → the family discussion question + phrases as chips.
 *   Adult       → both the summary and the family discussion question.
 */
function PartAiBlock({
  ai,
  ageGroup,
}: {
  ai: NonNullable<WorkbookPart["aiContent"]>;
  ageGroup: string;
}) {
  const isLittle = ageGroup === "LITTLE_ONES";

  return (
    <div className="mt-2 rounded-lg border border-sky-200 dark:border-sky-900/40 bg-sky-50/70 dark:bg-sky-900/10 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-sky-700 dark:text-sky-300 font-semibold flex items-center gap-1">
        <span aria-hidden>✨</span> This week
      </p>

      {isLittle ? (
        <p className="mt-1 text-sm text-sky-900 dark:text-sky-100 leading-snug">
          {ai.kidSummary}
        </p>
      ) : (
        <>
          {ageGroup === "ADULT" && (
            <p className="mt-1 text-sm text-sky-900 dark:text-sky-100 leading-snug">
              {ai.kidSummary}
            </p>
          )}
          <p className="mt-1 text-sm italic text-sky-800 dark:text-sky-200">
            💬 {ai.familyDiscussionQuestion}
          </p>
        </>
      )}

      {ai.listeningPhrases.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {ai.listeningPhrases.map((p, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white dark:bg-zinc-900 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900/40"
            >
              <span aria-hidden>👂</span> {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Per-audience prep block for a workbook part. Little Ones get a single
 * "listen for" cue (or nothing if the scaffold doesn't have one — songs,
 * prayers). Youth and Adult get a labeled prep-prompt list.
 */
function PartScaffoldBlock({
  scaffold,
  ageGroup,
}: {
  scaffold: PartScaffold;
  ageGroup: string;
}) {
  if (ageGroup === "LITTLE_ONES") {
    if (!scaffold.little) return null;
    return (
      <p className="mt-2 text-sm text-coral-700 dark:text-coral-300 bg-coral-50/60 dark:bg-coral-900/10 rounded px-2 py-1.5">
        👂 {scaffold.little}
      </p>
    );
  }

  const prompts =
    ageGroup === "ADULT" ? scaffold.adultPrompts : scaffold.youthPrompts;
  if (!prompts.length) return null;

  return (
    <div className="mt-2">
      <p className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400 font-semibold">
        How to prepare
      </p>
      <ul className="mt-0.5 space-y-0.5">
        {prompts.map((p, i) => (
          <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300">
            · {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Little Ones listening card ────────────────────────────────────────

function ListeningCard({ vocabulary }: { vocabulary: string[] }) {
  const picks = useMemo(() => vocabulary.slice(0, 6), [vocabulary]);
  const [hits, setHits] = useState<Set<string>>(new Set());

  if (picks.length === 0) return null;

  return (
    <div className="rounded-2xl border-2 border-coral-200 dark:border-coral-900/40 bg-coral-50 dark:bg-coral-900/10 p-4">
      <h3 className="text-base font-bold text-coral-800 dark:text-coral-200 mb-1">
        Listen for these! 👂
      </h3>
      <p className="text-xs text-coral-700/80 dark:text-coral-300/80 mb-3">
        Tap a word when you hear it during the meeting.
      </p>
      <div className="flex flex-wrap gap-2">
        {picks.map((w) => {
          const on = hits.has(w);
          return (
            <button
              key={w}
              type="button"
              onClick={() => {
                const next = new Set(hits);
                if (on) next.delete(w);
                else next.add(w);
                setHits(next);
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                on
                  ? "bg-emerald-500 text-white shadow"
                  : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-coral-200 dark:border-coral-900/40"
              }`}
            >
              {on ? "✓ " : ""}
              {w}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────

export default function WorkbookPanel({
  ageGroup,
  packId,
  title,
  bibleReadingRange,
  bibleReadingAssignment,
  songs,
  sections,
  vocabulary,
  attribution,
  sourceUrl,
  live,
}: Props) {
  const isLittle = ageGroup === "LITTLE_ONES";

  // Auto-collect: on entry to Meeting Live for this pack, POST every
  // token we can plausibly match against a curated Encyclopedia entry
  // (vocabulary + workbook part titles + AI listening phrases). Runs
  // exactly once per (packId, live=true) — a per-pack sessionStorage
  // guard keeps it from re-firing across live/prep tab flips.
  const [autoCollectedCount, setAutoCollectedCount] = useState<number | null>(null);
  useEffect(() => {
    if (!live) return;
    const guardKey = `oclm-autocollect:${packId}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(guardKey)) return;

    const tokens: string[] = [
      ...vocabulary,
      ...sections.flatMap((s) =>
        s.parts.flatMap((p) => [
          p.title,
          ...(p.aiContent?.listeningPhrases ?? []),
        ]),
      ),
    ];
    if (tokens.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/encyclopedia/collect-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokens, source: `oclm-meeting:${packId}` }),
        });
        if (!res.ok || cancelled) return;
        const body = await res.json();
        if (typeof window !== "undefined") {
          sessionStorage.setItem(guardKey, "1");
        }
        if (typeof body.newlyCollected === "number" && body.newlyCollected > 0) {
          setAutoCollectedCount(body.newlyCollected);
          window.setTimeout(() => setAutoCollectedCount(null), 5000);
        }
      } catch {
        // silent — encyclopedia collection is a non-blocking enrichment
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [live, packId, vocabulary, sections]);

  return (
    <section className="space-y-5 mb-8">
      {autoCollectedCount !== null && autoCollectedCount > 0 && (
        <div
          role="status"
          className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-emerald-500 text-white shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2"
        >
          ✨ +{autoCollectedCount} Bible word{autoCollectedCount > 1 ? "s" : ""} added to your book!
        </div>
      )}
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-coral-50 to-amber-50 dark:from-coral-900/20 dark:to-amber-900/20 border border-coral-200 dark:border-coral-900/30 p-5">
        <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          {live && (
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              Meeting Live
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {bibleReadingRange && (
            <span className="px-2.5 py-1 rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200">
              📖 {bibleReadingRange.reference}
            </span>
          )}
          {bibleReadingAssignment && (
            <span className="px-2.5 py-1 rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200">
              🎙 Student: {bibleReadingAssignment.reference}
            </span>
          )}
          {songs.map((n, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200"
            >
              ♪ Song {n}
            </span>
          ))}
        </div>
      </div>

      {/* Little Ones get a focused listening card up top */}
      {isLittle && <ListeningCard vocabulary={vocabulary} />}

      {/* Section + part rows */}
      <div className="space-y-4">
        {sections.map((s, si) => (
          <div key={si}>
            <div
              className={`px-4 py-2 rounded-lg bg-gradient-to-r font-semibold text-sm flex items-center gap-2 ${SECTION_TONE[s.kind]}`}
            >
              <span aria-hidden>{SECTION_ICON[s.kind]}</span>
              {SECTION_LABEL[s.kind]}
            </div>
            <ul className="mt-2 space-y-2">
              {s.parts.map((p, pi) => (
                <PartRow
                  key={pi}
                  part={p}
                  ageGroup={ageGroup}
                  packId={packId}
                  idx={pi}
                  live={live}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {attribution && (
        <p className="text-[10px] text-zinc-400 dark:text-zinc-600 italic">
          {attribution}
          {sourceUrl && (
            <>
              {" "}
              ·{" "}
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                Open on wol.jw.org
              </a>
            </>
          )}
        </p>
      )}
    </section>
  );
}
