"use client";

import { useState, useEffect, useCallback } from "react";
import type { GameProps } from "@/app/(dashboard)/games/[slug]/page";
import { useEncyclopedia } from "@/components/encyclopedia/EncyclopediaProvider";

interface TrackedWord {
  label: string;
  colorClass: string;
  gradientFrom: string;
  gradientTo: string;
  textClass: string;
}

const CORE_WORDS: TrackedWord[] = [
  {
    label: "Jehovah",
    colorClass: "sky-300",
    gradientFrom: "from-sky-200",
    gradientTo: "to-sky-400",
    textClass: "text-sky-600",
  },
  {
    label: "Jesus",
    colorClass: "peach-200",
    gradientFrom: "from-peach-100",
    gradientTo: "to-peach-300",
    textClass: "text-peach-500",
  },
  {
    label: "Bible",
    colorClass: "golden-300",
    gradientFrom: "from-golden-200",
    gradientTo: "to-golden-400",
    textClass: "text-golden-600",
  },
];

const EXTRA_WORD_COLORS: TrackedWord[] = [
  {
    label: "",
    colorClass: "violet-300",
    gradientFrom: "from-violet-200",
    gradientTo: "to-violet-400",
    textClass: "text-violet-600",
  },
  {
    label: "",
    colorClass: "coral-300",
    gradientFrom: "from-coral-200",
    gradientTo: "to-coral-400",
    textClass: "text-coral-600",
  },
];

const STORAGE_KEY = "quiet-listeners-counts";

export default function QuietListeners({
  gameId,
  userId,
  contentPack,
}: GameProps) {
  const [tappedIndex, setTappedIndex] = useState<number | null>(null);
  const { discover } = useEncyclopedia();

  // Build the full list of trackable words: core 3 + optional content pack words
  const trackedWords: TrackedWord[] = (() => {
    const words = [...CORE_WORDS];

    if (contentPack) {
      const extraLabels = [
        ...(contentPack.keyPhrases ?? []),
        ...(contentPack.vocabulary ?? []),
      ];
      // Deduplicate against core words (case-insensitive)
      const coreLabelsLower = new Set(
        CORE_WORDS.map((w) => w.label.toLowerCase())
      );
      const unique = extraLabels.filter(
        (l) => !coreLabelsLower.has(l.toLowerCase())
      );
      // Take up to 4 extras so the UI doesn't get too crowded
      unique.slice(0, 4).forEach((label, i) => {
        const template = EXTRA_WORD_COLORS[i % EXTRA_WORD_COLORS.length];
        words.push({ ...template, label });
      });
    }

    return words;
  })();

  // Initialize counts from sessionStorage (or zeros)
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore corrupt data
    }
    return {};
  });

  // Persist counts to sessionStorage whenever they change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
    } catch {
      // sessionStorage full or unavailable — silently ignore
    }
  }, [counts]);

  const increment = useCallback(
    (label: string, index: number) => {
      setCounts((prev) => ({ ...prev, [label]: (prev[label] ?? 0) + 1 }));
      setTappedIndex(index);
      setTimeout(() => setTappedIndex(null), 150);
      // Encyclopedia discovery — try the tapped word
      discover(label, "quiet-listeners");
    },
    [discover]
  );

  const decrement = useCallback((label: string) => {
    setCounts((prev) => ({
      ...prev,
      [label]: Math.max(0, (prev[label] ?? 0) - 1),
    }));
  }, []);

  const handleReset = useCallback(() => {
    if (window.confirm("Reset all counts to zero?")) {
      setCounts({});
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  const total = trackedWords.reduce(
    (sum, w) => sum + (counts[w.label] ?? 0),
    0
  );

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Quiet Listeners
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Tap each time you hear a word during the meeting
        </p>
      </div>

      {/* Tap targets — vertical on mobile, horizontal grid on wider screens */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {trackedWords.slice(0, 3).map((word, i) => (
          <TapCard
            key={word.label}
            word={word}
            count={counts[word.label] ?? 0}
            isTapped={tappedIndex === i}
            onTap={() => increment(word.label, i)}
            onDecrement={() => decrement(word.label)}
          />
        ))}
      </div>

      {/* Extra content-pack words (if any) */}
      {trackedWords.length > 3 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {trackedWords.slice(3).map((word, i) => (
            <TapCard
              key={word.label}
              word={word}
              count={counts[word.label] ?? 0}
              isTapped={tappedIndex === i + 3}
              onTap={() => increment(word.label, i + 3)}
              onDecrement={() => decrement(word.label)}
              compact
            />
          ))}
        </div>
      )}

      {/* Total + Reset */}
      <div className="flex items-center justify-between bg-white/60 dark:bg-zinc-800/60 rounded-xl px-5 py-3 shadow-sm">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Total words heard:{" "}
          <span className="text-lg font-bold text-foreground">{total}</span>
        </span>
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-coral-600 text-white hover:bg-coral-700 active:scale-95 transition-transform"
        >
          Reset
        </button>
      </div>

      {/* Grown-up tip */}
      <div className="rounded-xl bg-violet-50 dark:bg-violet-600/10 border border-violet-200 dark:border-violet-500/20 px-5 py-4">
        <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-1">
          Grown-up tip
        </p>
        <p className="text-sm text-violet-500 dark:text-violet-300">
          Ask: &ldquo;Which word did you hear the most today?&rdquo;
        </p>
      </div>
    </div>
  );
}

/* ---------- TapCard sub-component ---------- */

interface TapCardProps {
  word: TrackedWord;
  count: number;
  isTapped: boolean;
  onTap: () => void;
  onDecrement: () => void;
  compact?: boolean;
}

function TapCard({
  word,
  count,
  isTapped,
  onTap,
  onDecrement,
  compact,
}: TapCardProps) {
  const minHeight = compact ? "min-h-[100px]" : "min-h-[130px]";

  return (
    <div className="relative flex flex-col items-center">
      {/* Main tap target */}
      <button
        type="button"
        onClick={onTap}
        style={{ touchAction: "manipulation" }}
        className={`
          ${minHeight} w-full rounded-2xl
          bg-gradient-to-br ${word.gradientFrom} ${word.gradientTo}
          flex flex-col items-center justify-center gap-1
          shadow-md select-none cursor-pointer
          transition-transform duration-150 ease-out
          active:scale-95
          ${isTapped ? "scale-95" : "scale-100"}
        `}
      >
        <span
          className={`${compact ? "text-base" : "text-xl"} font-bold ${word.textClass}`}
        >
          {word.label}
        </span>
        <span
          className={`${compact ? "text-3xl" : "text-4xl"} font-extrabold ${word.textClass}`}
        >
          {count}
        </span>
      </button>

      {/* Correction -1 button */}
      <button
        type="button"
        onClick={onDecrement}
        disabled={count === 0}
        className={`
          mt-2 px-3 py-1 text-xs font-semibold rounded-lg
          transition-colors
          ${
            count === 0
              ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
              : "bg-white dark:bg-zinc-800 text-coral-600 dark:text-coral-400 hover:bg-coral-50 dark:hover:bg-coral-600/10 shadow-sm"
          }
        `}
      >
        &minus;1
      </button>
    </div>
  );
}
