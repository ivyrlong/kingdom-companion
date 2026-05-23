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
  /** Prep answers keyed by question index, so Meeting Live resumes them. */
  savedResponses: Record<number, SavedStudyResponse>;
  /** When true the panel is shown in the live-meeting tab. */
  live?: boolean;
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

/* ── Container ─────────────────────────────────────────────────────── */

export default function WatchtowerStudyPanel(
  props: WatchtowerStudyPanelProps,
) {
  const baseQuestions = props.questions.filter((q) => q.question.trim());
  const [celebrating, fire] = useCelebrate();

  const isLittle = props.ageGroup === "LITTLE_ONES";
  const isYouth =
    props.ageGroup === "YOUTH" || props.ageGroup === "FAMILY";

  // Little Ones only ever see questions an admin wrote a Simplified answer
  // for — everything else is automatically hidden (no adult-answer fallback).
  const questions = isLittle
    ? baseQuestions.filter((q) => (q.simplifiedAnswer ?? "").trim())
    : baseQuestions;

  if (questions.length === 0) return null;

  return (
    <section className="mb-8">
      <Confetti active={celebrating} duration={1500} count={60} />
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          {isLittle
            ? "Watchtower Story Time"
            : props.live
              ? "Your Watchtower comments"
              : "Watchtower Study"}
        </h2>
        {props.live && (
          <span className="text-xs font-medium text-violet-600 dark:text-violet-300">
            Your prepared answers are loaded
          </span>
        )}
      </div>

      {isLittle ? (
        <LittlesStudy
          questions={questions}
          imageUrl={props.imageUrl}
          fire={fire}
        />
      ) : isYouth ? (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <YouthQuestion
              key={i}
              index={i}
              packId={props.packId}
              q={q}
              allAnswers={questions.map((x) => x.answer)}
              saved={props.savedResponses[i]}
              live={props.live}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <AdultQuestion
              key={i}
              index={i}
              packId={props.packId}
              q={q}
              saved={props.savedResponses[i]}
              live={props.live}
            />
          ))}
        </div>
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

  const next = () => {
    setImgOpen(false);
    setAnsOpen(false);
    setIdx((i) => i + 1);
    if (idx + 1 >= questions.length) fire();
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pic}
                alt=""
                className={`w-full h-full object-cover transition-all duration-700 ${
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

      <div className="mt-5 flex justify-end">
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
  saved,
  live,
}: {
  index: number;
  packId: string;
  q: StudyQuestion;
  allAnswers: string[];
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
  const [built, setBuilt] = useState(saved?.data?.builtAnswer ?? "");
  const [note, setNote] = useState(saved?.response ?? "");
  const [revealed, setRevealed] = useState(false);
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");

  // Refs so the debounced save always reads the latest values.
  const noteRef = useRef(note);
  noteRef.current = note;
  const builtRef = useRef(built);
  builtRef.current = built;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const flush = useCallback(async () => {
    setStatus("saving");
    const ok = await postResponse(
      packId,
      index,
      q.question,
      noteRef.current,
      // Discussion questions store only the written answer — no built/MC.
      isReflection
        ? undefined
        : { mode: modeRef.current, builtAnswer: builtRef.current },
    );
    setStatus(ok ? "saved" : "error");
  }, [packId, index, q.question, isReflection]);

  // Auto-save the built / selected answer shortly after it changes.
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
  }, [built, mode, flush]);

  const addWord = (w: string) =>
    setBuilt((b) => (b ? `${b} ${w}` : w));
  const backspace = () =>
    setBuilt((b) => b.split(" ").slice(0, -1).join(" "));

  const { paragraph, text } = splitParagraph(q.question);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
      <p className="font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
        <span className="text-zinc-400 mr-1">{index + 1}.</span>
        {paragraph && (
          <span className="inline-block mr-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 align-middle">
            ¶{paragraph}
          </span>
        )}
        {text}
      </p>

      {!live && !isReflection && (
        <>
          {/* Mode toggle */}
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
                {m === "build" ? "Build it myself" : "Multiple choice"}
              </button>
            ))}
          </div>

          {mode === "build" ? (
            <div className="mb-4">
              <div className="min-h-[2.75rem] rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100">
                {built || (
                  <span className="text-zinc-400">
                    Tap words below to build your comment…
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {keyWords.map((w, i) => (
                  <button
                    key={`${w}-${i}`}
                    onClick={() => addWord(w)}
                    className="px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium hover:bg-violet-200 dark:hover:bg-violet-900/50 transition"
                  >
                    {w}
                  </button>
                ))}
              </div>
              {built && (
                <div className="mt-2 flex gap-3">
                  <button
                    onClick={backspace}
                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    ← Remove last word
                  </button>
                  <button
                    onClick={() => setBuilt("")}
                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-4 space-y-2">
              {options.map((opt, i) => {
                const selected = built === opt;
                const isCorrect =
                  revealed && opt.trim() === q.answer.trim();
                return (
                  <button
                    key={i}
                    onClick={() => setBuilt(opt)}
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

          {/* Reveal the paragraph answer */}
          {revealed ? (
            <div className="mb-4 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 p-3">
              <p className="text-xs font-semibold text-sky-700 dark:text-sky-300 mb-1">
                What the paragraph says
              </p>
              <p className="text-sm text-zinc-800 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap">
                {q.answer}
              </p>
            </div>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className="mb-4 text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              Reveal paragraph answer
            </button>
          )}
        </>
      )}

      {/* Personal answer */}
      {live && built && (
        <div className="mb-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
            Your prepared answer
          </p>
          <p className="text-sm text-zinc-800 dark:text-zinc-100 whitespace-pre-wrap">
            {built}
          </p>
        </div>
      )}
      {!live && isReflection && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
          This is a personal question — share your own thoughts.
        </p>
      )}
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        {isReflection ? "My answer" : "My own answer"}
        {live ? " (add to it during the meeting)" : ""}
      </label>
      <textarea
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
      <p className="h-4 mt-1 text-xs text-zinc-400">
        {status === "saving"
          ? "Saving…"
          : status === "saved"
            ? "Saved ✓ (your guardian can see this)"
            : status === "error"
              ? "Couldn't save — check your connection."
              : ""}
      </p>
    </div>
  );
}

/* ── Adult: reveal toggle + personal answer ────────────────────────── */

function AdultQuestion({
  index,
  packId,
  q,
  saved,
  live,
}: {
  index: number;
  packId: string;
  q: StudyQuestion;
  saved: SavedStudyResponse | undefined;
  live?: boolean;
}) {
  // Blank paragraph answer = personal/discussion question: nothing to reveal.
  const hasAnswer = !!q.answer.trim();
  const [revealed, setRevealed] = useState(false);
  const [note, setNote] = useState(saved?.response ?? "");
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");

  const save = async () => {
    setStatus("saving");
    const ok = await postResponse(packId, index, q.question, note);
    setStatus(ok ? "saved" : "error");
  };

  const { paragraph, text } = splitParagraph(q.question);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">
          <span className="text-zinc-400 mr-1">{index + 1}.</span>
          {paragraph && (
            <span className="inline-block mr-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 align-middle">
              ¶{paragraph}
            </span>
          )}
          {text}
        </p>
        {!live && hasAnswer && (
          <button
            onClick={() => setRevealed((r) => !r)}
            className="shrink-0 text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline"
          >
            {revealed ? "Hide answer" : "Reveal answer"}
          </button>
        )}
      </div>

      {!live && hasAnswer && revealed && (
        <div className="mt-3 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 p-3">
          <p className="text-sm text-zinc-800 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap">
            {q.answer}
          </p>
        </div>
      )}

      {!live && !hasAnswer && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
          This is a personal question — write your own answer.
        </p>
      )}

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
      <p className="h-4 mt-1 text-xs text-zinc-400">
        {status === "saving"
          ? "Saving…"
          : status === "saved"
            ? "Saved ✓"
            : status === "error"
              ? "Couldn't save — check your connection."
              : ""}
      </p>
    </div>
  );
}
