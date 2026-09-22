"use client";

/**
 * FillInBlankCard — compact, embeddable fill-in-blank exercise.
 *
 * Where it's used: inside a WorkbookPanel PartRow, seeded from the AI-
 * generated `kidSummary` for that part (see src/lib/oclm-insights.ts).
 * The mechanic mirrors the Daily Text Youth panel — same word bank +
 * tappable slot pattern — so a user who already learned it there feels
 * at home here.
 *
 * SSR safety: initial bank order matches the answers (deterministic),
 * then a client-only useEffect shuffles it. See fill-in-blank.ts and
 * the earlier hydration-mismatch fix in DailyTextPanel.
 */

import { useEffect, useMemo, useState } from "react";
import { buildBlanks, shuffle } from "@/lib/fill-in-blank";

interface Props {
  /**
   * Stable per-instance key — used to name the celebrate-once ref and
   * (optionally) restore local state. Callers can compose this from
   * packId + partKey.
   */
  storageKey: string;
  /** The text to blank out — usually `aiContent.kidSummary`. */
  text: string;
  /**
   * Focus vocabulary (workbook vocab). `buildBlanks` prefers these when
   * choosing which words to hide, so the exercise reinforces the week's
   * target words.
   */
  vocabulary: string[];
  /** Show a small compliment when the user gets all blanks right. */
  onSolved?: () => void;
}

export default function FillInBlankCard({
  text,
  vocabulary,
  storageKey,
  onSolved,
}: Props) {
  const { tokens, answers } = useMemo(
    () => buildBlanks(text, vocabulary),
    [text, vocabulary],
  );

  const [placed, setPlaced] = useState<(string | null)[]>(
    answers.map(() => null),
  );
  // Deterministic initial order for SSR parity — shuffle after mount.
  const [bank, setBank] = useState<string[]>(answers);
  useEffect(() => {
    setBank(shuffle(answers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers.join("|")]);

  // If the underlying text changes (e.g. AI insights regenerated), reset.
  useEffect(() => {
    setPlaced(answers.map(() => null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

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
      nextPlaced.every(
        (p, i) => (p ?? "").toLowerCase() === answers[i].toLowerCase(),
      ) &&
      !celebrated
    ) {
      setCelebrated(true);
      onSolved?.();
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

  if (answers.length === 0) return null;

  return (
    <div
      className="mt-2 rounded-lg border border-violet-200 dark:border-violet-900/40 bg-violet-50/60 dark:bg-violet-900/10 px-3 py-2"
      data-storage-key={storageKey}
    >
      <p className="text-[10px] uppercase tracking-wide text-violet-700 dark:text-violet-300 font-semibold flex items-center gap-1">
        <span aria-hidden>✏️</span> Fill it in
      </p>

      <p className="mt-1 text-sm leading-relaxed text-zinc-800 dark:text-zinc-100">
        {tokens.map((t, i) =>
          t.blank === undefined ? (
            <span key={i}>{t.w} </span>
          ) : (
            <span key={i}>
              {t.pre}
              <button
                onClick={() => placed[t.blank!] && removeWord(t.blank!)}
                className={`inline-flex min-w-[4rem] justify-center mx-0.5 px-2 py-0.5 rounded-md border-b-2 align-baseline text-sm ${
                  placed[t.blank!]
                    ? "bg-violet-100 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300"
                    : "bg-white dark:bg-zinc-800 border-violet-300 text-transparent"
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
        <div className="mt-2 flex flex-wrap gap-1">
          {bank.map((w, i) => (
            <button
              key={`${w}-${i}`}
              onClick={() => placeWord(w)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-900/40 text-xs font-medium hover:bg-violet-100 dark:hover:bg-violet-900/30 transition"
            >
              {w}
            </button>
          ))}
        </div>
      )}

      {allFilled && (
        <p
          className={`mt-1.5 text-xs font-medium ${
            allCorrect
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-amber-600 dark:text-amber-400"
          }`}
        >
          {allCorrect
            ? "✓ Nice work!"
            : "Almost — tap a word to move it back."}
        </p>
      )}
    </div>
  );
}
