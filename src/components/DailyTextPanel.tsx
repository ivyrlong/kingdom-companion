"use client";

import { useMemo, useState, useCallback } from "react";
import Confetti from "@/components/Confetti";

export interface DailyTextPanelProps {
  ageGroup: string;
  packId: string;
  reference: string;
  text: string;
  comment: string | null;
  simplifiedComment: string | null;
  imageUrl: string | null;
  vocabulary: string[];
  questions: string[];
  savedResponses: Record<number, string>;
}

const STOPWORDS = new Set([
  "the","and","that","with","this","from","have","will","your","you","are",
  "was","for","his","her","him","they","them","their","what","when","which",
  "into","unto","shall","not","but","all","who","how","why","our","out","one",
  "also","may","can","has","had","were","been","does","did","then","than",
  "upon","over","such","more","most","some","any","each","every","there",
]);

/* ── Shared celebration ────────────────────────────────────────────── */

function useCelebrate(): [boolean, () => void] {
  const [on, setOn] = useState(false);
  const fire = useCallback(() => {
    setOn(true);
    window.setTimeout(() => setOn(false), 1600);
  }, []);
  return [on, fire];
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function DailyTextPanel(props: DailyTextPanelProps) {
  const [celebrating, fire] = useCelebrate();

  return (
    <>
      <Confetti active={celebrating} duration={1500} count={60} />
      {props.ageGroup === "LITTLE_ONES" ? (
        <LittleOnes {...props} fire={fire} />
      ) : props.ageGroup === "YOUTH" || props.ageGroup === "FAMILY" ? (
        <Youth {...props} fire={fire} />
      ) : (
        <Adult {...props} />
      )}
    </>
  );
}

/* ── Little Ones: 3 tap-to-reveal cards ────────────────────────────── */

function LittleOnes({
  reference,
  text,
  simplifiedComment,
  imageUrl,
  fire,
}: DailyTextPanelProps & { fire: () => void }) {
  const [refOpen, setRefOpen] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);
  const [qOpen, setQOpen] = useState(false);

  const tap = (open: boolean, set: (v: boolean) => void) => {
    if (!open) {
      set(true);
      fire();
    }
  };

  const cardBase =
    "rounded-3xl border-2 p-5 flex flex-col items-center justify-center text-center min-h-[220px] select-none transition-transform active:scale-95 shadow-md";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* 1 — Scripture reference */}
      <button
        onClick={() => tap(refOpen, setRefOpen)}
        className={`${cardBase} ${
          refOpen
            ? "bg-gradient-to-br from-coral-100 to-golden-100 border-coral-300 dark:from-coral-900/30 dark:to-golden-900/20 dark:border-coral-700"
            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
        }`}
      >
        <span className="text-xs font-medium text-zinc-400 mb-2">
          Today&apos;s scripture
        </span>
        <span
          className={`font-extrabold leading-tight transition-all ${
            refOpen
              ? "text-2xl sm:text-3xl bg-gradient-to-r from-coral-600 to-golden-500 bg-clip-text text-transparent"
              : "text-xl text-zinc-700 dark:text-zinc-300"
          }`}
        >
          {reference}
        </span>
        <span className="mt-3 text-sm text-zinc-400">
          {refOpen ? "✨ Yay! ✨" : "Tap me!"}
        </span>
      </button>

      {/* 2 — Linked image: B&W → colour */}
      <button
        onClick={() => tap(imgOpen, setImgOpen)}
        className={`${cardBase} relative overflow-hidden p-0 ${
          imgOpen
            ? "border-sky-300 dark:border-sky-700"
            : "border-zinc-200 dark:border-zinc-800"
        }`}
      >
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
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
            <span className="text-5xl mb-2">🖼️</span>
            <span className="text-sm">Picture coming soon</span>
          </div>
        )}
      </button>

      {/* 3 — Simplified lesson behind a ? */}
      <button
        onClick={() => tap(qOpen, setQOpen)}
        className={`${cardBase} ${
          qOpen
            ? "bg-gradient-to-br from-violet-100 to-sky-100 border-violet-300 dark:from-violet-900/30 dark:to-sky-900/20 dark:border-violet-700"
            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
        }`}
      >
        {qOpen ? (
          <>
            <span className="text-xs font-semibold text-violet-600 dark:text-violet-300 mb-2">
              Today&apos;s lesson
            </span>
            <span className="text-base text-zinc-800 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap">
              {simplifiedComment?.trim() ||
                "Ask a grown-up to talk about today's scripture with you!"}
            </span>
          </>
        ) : (
          <>
            <span className="text-6xl font-black text-violet-400">?</span>
            <span className="mt-3 text-sm text-zinc-400">Tap to find out!</span>
          </>
        )}
      </button>
    </div>
  );
}

/* ── Youth: fill-in-the-blank + comment + questions ────────────────── */

interface Token {
  blank?: number;
  core?: string;
  pre?: string;
  post?: string;
  w?: string;
}

function buildBlanks(text: string, vocab: string[]) {
  const vocabSet = new Set(vocab.map((v) => v.toLowerCase().trim()));
  const raw = text.split(/\s+/).filter(Boolean);
  const tokens: Token[] = [];
  const eligibleIdx: number[] = [];

  raw.forEach((word, i) => {
    const m = word.match(/^([^\w]*)([\w'’-]+)([^\w]*)$/);
    if (!m) {
      tokens.push({ w: word });
      return;
    }
    const [, pre, core, post] = m;
    tokens.push({ w: word, core, pre, post });
    const lc = core.toLowerCase();
    if (core.length >= 4 && !STOPWORDS.has(lc) && /^[A-Za-z'’-]+$/.test(core)) {
      eligibleIdx.push(i);
    }
  });

  // Prefer words that are in the day's vocabulary; spread the rest out.
  const preferred = eligibleIdx.filter((i) =>
    vocabSet.has((tokens[i].core ?? "").toLowerCase()),
  );
  const others = eligibleIdx.filter((i) => !preferred.includes(i));
  const maxBlanks = Math.max(3, Math.min(6, Math.round(raw.length / 12)));
  const chosen = [...preferred, ...others].slice(0, maxBlanks).sort((a, b) => a - b);

  const answers: string[] = [];
  chosen.forEach((idx, bi) => {
    const t = tokens[idx];
    answers.push(t.core ?? "");
    tokens[idx] = { blank: bi, core: t.core, pre: t.pre, post: t.post };
  });

  return { tokens, answers };
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function Youth({
  packId,
  reference,
  text,
  comment,
  vocabulary,
  questions,
  savedResponses,
  fire,
}: DailyTextPanelProps & { fire: () => void }) {
  const { tokens, answers } = useMemo(
    () => buildBlanks(text, vocabulary),
    [text, vocabulary],
  );
  const [placed, setPlaced] = useState<(string | null)[]>(
    answers.map(() => null),
  );
  const [bank, setBank] = useState<string[]>(() => shuffle(answers));
  const [celebrated, setCelebrated] = useState(false);

  const placeWord = (word: string) => {
    const slot = placed.findIndex((p) => p === null);
    if (slot < 0) return;
    const nextPlaced = [...placed];
    nextPlaced[slot] = word;
    setPlaced(nextPlaced);
    const bi = bank.indexOf(word);
    if (bi >= 0) {
      const nb = [...bank];
      nb.splice(bi, 1);
      setBank(nb);
    }
    if (
      nextPlaced.every((p, i) => (p ?? "").toLowerCase() === answers[i].toLowerCase()) &&
      !celebrated
    ) {
      setCelebrated(true);
      fire();
    }
  };

  const removeWord = (slot: number) => {
    const w = placed[slot];
    if (!w) return;
    const nextPlaced = [...placed];
    nextPlaced[slot] = null;
    setPlaced(nextPlaced);
    setBank((b) => [...b, w]);
  };

  const allFilled = placed.every((p) => p !== null);
  const allCorrect =
    allFilled &&
    placed.every(
      (p, i) => (p ?? "").toLowerCase() === answers[i].toLowerCase(),
    );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-coral-600 dark:text-coral-400">
          {reference}
        </p>
        <p className="mt-2 text-lg leading-relaxed text-zinc-800 dark:text-zinc-100">
          {tokens.map((t, i) =>
            t.blank === undefined ? (
              <span key={i}>{t.w} </span>
            ) : (
              <span key={i}>
                {t.pre}
                <button
                  onClick={() => placed[t.blank!] && removeWord(t.blank!)}
                  className={`inline-flex min-w-[5rem] justify-center mx-0.5 px-2 py-0.5 rounded-md border-b-2 align-baseline ${
                    placed[t.blank!]
                      ? "bg-coral-50 dark:bg-coral-900/20 border-coral-400 text-coral-700 dark:text-coral-300"
                      : "bg-zinc-100 dark:bg-zinc-800 border-zinc-400 text-transparent"
                  }`}
                >
                  {placed[t.blank!] ?? "____"}
                </button>
                {t.post}{" "}
              </span>
            ),
          )}
        </p>

        {bank.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {bank.map((w, i) => (
              <button
                key={`${w}-${i}`}
                onClick={() => placeWord(w)}
                className="px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium hover:bg-violet-200 dark:hover:bg-violet-900/50 transition"
              >
                {w}
              </button>
            ))}
          </div>
        )}
        {allFilled && (
          <p
            className={`mt-3 text-sm font-medium ${
              allCorrect
                ? "text-green-600 dark:text-green-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {allCorrect ? "✓ Nice work — that's the verse!" : "Almost — tap a word to move it back and try again."}
          </p>
        )}
      </div>

      {comment && (
        <div>
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Comment
          </p>
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {comment}
          </p>
        </div>
      )}

      {questions.length > 0 && (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <ResponseBox
              key={idx}
              packId={packId}
              index={idx}
              question={q}
              initial={savedResponses[idx] ?? ""}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ResponseBox({
  packId,
  index,
  question,
  initial,
}: {
  packId: string;
  index: number;
  question: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");

  const save = async () => {
    if (value === initial && status === "") return;
    setStatus("saving");
    try {
      const res = await fetch("/api/daily/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentPackId: packId,
          questionIndex: index,
          question,
          response: value,
        }),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        {question}
      </label>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setStatus("");
        }}
        onBlur={save}
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

/* ── Adult: plain ──────────────────────────────────────────────────── */

function Adult({ reference, text, comment }: DailyTextPanelProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8">
      <p className="text-sm font-semibold text-coral-600 dark:text-coral-400 mb-1">
        {reference}
      </p>
      <p className="text-lg text-zinc-800 dark:text-zinc-100 leading-relaxed mb-5">
        “{text}”
      </p>
      {comment && (
        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {comment}
        </p>
      )}
    </div>
  );
}
