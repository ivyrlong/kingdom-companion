"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { GameProps } from "@/app/(dashboard)/games/[slug]/page";

/**
 * Meeting Bingo — a calm meeting-live aid for Little Ones.
 * A 3x3 card of words/phrases; the child taps a square when they hear it
 * during the meeting. Three in a row (row, column, or diagonal) = BINGO!
 *
 * Phrases come from the meeting content pack's keyPhrases (with vocabulary
 * as backup). Played standalone (no pack) it falls back to a gentle bank of
 * Bible/meeting words appropriate for little ones.
 */

// Fallback bank when there is no content pack. JW/Bible-appropriate, simple
// words a young child can listen for at any meeting. No holiday/cross imagery.
const DEFAULT_PHRASES = [
  "Jehovah",
  "Jesus",
  "Bible",
  "Kingdom",
  "love",
  "faith",
  "hope",
  "pray",
  "good news",
  "paradise",
  "obey",
  "kind",
  "truth",
  "song",
];

// The 8 ways to win on a 3x3 card.
const LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCard(pool: string[]): string[] {
  // Dedupe case-insensitively, top up from defaults, shuffle, take 9.
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of [...pool, ...DEFAULT_PHRASES]) {
    const phrase = raw.trim();
    const key = phrase.toLowerCase();
    if (phrase && !seen.has(key)) {
      seen.add(key);
      unique.push(phrase);
    }
  }
  return shuffle(unique).slice(0, 9);
}

export default function MeetingBingo({
  contentPack,
  contentPackTitle,
}: GameProps) {
  const storageKey = `meeting-bingo:${contentPackTitle ?? "default"}`;

  const pool = useMemo(() => {
    const fromPack = [
      ...(contentPack?.keyPhrases ?? []),
      ...(contentPack?.vocabulary ?? []),
    ];
    return fromPack.length > 0 ? fromPack : [];
  }, [contentPack]);

  const [card, setCard] = useState<string[]>([]);
  const [marked, setMarked] = useState<boolean[]>(() =>
    Array(9).fill(false)
  );

  // Initialise after mount (avoids SSR/hydration mismatch from random shuffle).
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          card: string[];
          marked: boolean[];
        };
        if (
          Array.isArray(parsed.card) &&
          parsed.card.length === 9 &&
          Array.isArray(parsed.marked) &&
          parsed.marked.length === 9
        ) {
          setCard(parsed.card);
          setMarked(parsed.marked);
          return;
        }
      }
    } catch {
      // ignore corrupt storage
    }
    setCard(buildCard(pool));
    setMarked(Array(9).fill(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist whenever a full card + marks exist.
  useEffect(() => {
    if (card.length !== 9) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ card, marked }));
    } catch {
      // storage unavailable — non-blocking
    }
  }, [card, marked, storageKey]);

  const bingoCount = useMemo(
    () => LINES.filter((line) => line.every((i) => marked[i])).length,
    [marked]
  );
  const markedCount = marked.filter(Boolean).length;
  const blackout = markedCount === 9;

  // Gentle celebration cue when a new line is completed.
  const [celebrate, setCelebrate] = useState(false);
  const prevBingoRef = useRef(0);
  useEffect(() => {
    if (bingoCount > prevBingoRef.current) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 2600);
      prevBingoRef.current = bingoCount;
      return () => clearTimeout(t);
    }
    prevBingoRef.current = bingoCount;
  }, [bingoCount]);

  const toggle = useCallback((i: number) => {
    setMarked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }, []);

  const clearMarks = useCallback(() => {
    setMarked(Array(9).fill(false));
    prevBingoRef.current = 0;
    setCelebrate(false);
  }, []);

  const newCard = useCallback(() => {
    setCard(buildCard(pool));
    setMarked(Array(9).fill(false));
    prevBingoRef.current = 0;
    setCelebrate(false);
  }, [pool]);

  if (card.length !== 9) {
    return (
      <div className="w-full max-w-xl mx-auto py-16 text-center text-zinc-400">
        Loading your card…
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Meeting Bingo
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Tap a square when you hear it at the meeting. Get three in a row for
          BINGO!
        </p>
      </div>

      {/* Celebration / status banner */}
      <div
        className={`rounded-2xl px-5 py-3 text-center font-bold shadow-sm transition-transform ${
          blackout
            ? "bg-gradient-to-r from-golden-200 to-coral-200 text-coral-700"
            : bingoCount > 0
              ? "bg-gradient-to-r from-sky-100 to-violet-100 text-violet-700"
              : "bg-white/60 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 font-medium"
        } ${celebrate ? "scale-105" : "scale-100"}`}
        aria-live="polite"
      >
        {blackout
          ? "🌟 Full Card! You found them all! 🌟"
          : bingoCount > 0
            ? `🎉 BINGO! ${bingoCount} line${bingoCount > 1 ? "s" : ""}! Keep listening!`
            : "Listen carefully… you can do it!"}
      </div>

      {/* 3x3 card */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {card.map((phrase, i) => {
          const isMarked = marked[i];
          return (
            <button
              key={`${phrase}-${i}`}
              type="button"
              onClick={() => toggle(i)}
              style={{ touchAction: "manipulation" }}
              className={`
                aspect-square rounded-2xl p-2 select-none
                flex items-center justify-center text-center
                font-bold leading-tight shadow-md
                transition-transform duration-150 active:scale-95
                ${
                  isMarked
                    ? "bg-gradient-to-br from-coral-400 to-coral-600 text-white ring-4 ring-coral-300 dark:ring-coral-700"
                    : "bg-gradient-to-br from-sky-50 to-violet-100 dark:from-zinc-800 dark:to-zinc-800 text-violet-700 dark:text-violet-300"
                }
              `}
            >
              <span className="text-xs sm:text-base break-words">
                {phrase}
                {isMarked && <span className="block text-lg sm:text-2xl">✓</span>}
              </span>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between bg-white/60 dark:bg-zinc-800/60 rounded-xl px-5 py-3 shadow-sm">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Squares marked:{" "}
          <span className="text-lg font-bold text-foreground">
            {markedCount}
          </span>
          /9
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clearMarks}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-600 active:scale-95 transition-transform"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={newCard}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-coral-600 text-white hover:bg-coral-700 active:scale-95 transition-transform"
          >
            New Card
          </button>
        </div>
      </div>

      {/* Grown-up tip */}
      <div className="rounded-xl bg-violet-50 dark:bg-violet-600/10 border border-violet-200 dark:border-violet-500/20 px-5 py-4">
        <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-1">
          Grown-up tip
        </p>
        <p className="text-sm text-violet-500 dark:text-violet-300">
          Keep it quiet and calm — a gentle point at the square is enough. Try
          for a full card by the end of the meeting!
        </p>
      </div>
    </div>
  );
}
