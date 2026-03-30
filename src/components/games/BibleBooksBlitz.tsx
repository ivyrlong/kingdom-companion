"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useGameSession } from "@/hooks/useGameSession";
import {
  getBooksForDifficulty,
  ALL_BOOKS,
  type Difficulty,
} from "@/lib/game-data/bible-books";

import type { GameProps } from "@/app/(dashboard)/games/[slug]/page";

type Props = GameProps;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function BibleBooksBlitz({ gameId, userId }: Props) {
  const { status, finalScore, startSession, endSession, reset } =
    useGameSession({ gameId, userId });

  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [correctOrder, setCorrectOrder] = useState<string[]>([]);
  const [playerOrder, setPlayerOrder] = useState<string[]>([]);
  const [available, setAvailable] = useState<string[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [lastWrong, setLastWrong] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = useCallback(
    async (diff: Difficulty) => {
      setDifficulty(diff);
      const books = getBooksForDifficulty(diff);
      setCorrectOrder(books);
      setPlayerOrder([]);
      setAvailable(shuffle(books));
      setTimeElapsed(0);
      setMistakes(0);
      setLastWrong(null);
      await startSession();
    },
    [startSession]
  );

  useEffect(() => {
    if (status === "playing") {
      timerRef.current = setInterval(
        () => setTimeElapsed((t) => t + 1),
        1000
      );
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const handleBookClick = useCallback(
    (book: string) => {
      if (status !== "playing") return;

      const nextIndex = playerOrder.length;
      const expectedBook = correctOrder[nextIndex];

      if (book === expectedBook) {
        const newPlayerOrder = [...playerOrder, book];
        setPlayerOrder(newPlayerOrder);
        setAvailable((prev) => prev.filter((b) => b !== book));
        setLastWrong(null);

        if (newPlayerOrder.length === correctOrder.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          const timeBonus = Math.max(0, 300 - timeElapsed) * 10;
          const mistakePenalty = mistakes * 50;
          const baseScore = correctOrder.length * 100;
          const score = Math.max(0, baseScore + timeBonus - mistakePenalty);
          endSession(score);
        }
      } else {
        setMistakes((m) => m + 1);
        setLastWrong(book);
        setTimeout(() => setLastWrong(null), 600);
      }
    },
    [status, playerOrder, correctOrder, timeElapsed, mistakes, endSession]
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Start screen
  if (status === "idle") {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Bible Books Blitz
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
          Tap the books of the Bible in the correct order, as fast as you can!
        </p>

        <div className="space-y-3 max-w-sm mx-auto">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Choose difficulty:
          </p>
          {(
            [
              ["easy", "Easy (10 books)", "Genesis to Deuteronomy + more"],
              ["medium", "Medium (20 books)", "Mixed Hebrew & Greek"],
              ["hard", "Hard (All 66 books)", "The complete Bible"],
            ] as const
          ).map(([diff, label, desc]) => (
            <button
              key={diff}
              onClick={() => startGame(diff)}
              className="w-full p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-teal-300 dark:hover:border-teal-700 transition text-left"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {label}
              </span>
              <span className="block text-sm text-zinc-500 dark:text-zinc-400">
                {desc}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Finished screen
  if (status === "finished") {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Completed!
        </h1>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-sm mx-auto mb-6">
          <p className="text-5xl font-bold text-teal-600 dark:text-teal-400 mb-4">
            {finalScore?.toLocaleString()}
          </p>
          <div className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
            <p>
              Time: {formatTime(timeElapsed)} | Mistakes: {mistakes}
            </p>
            <p>
              Difficulty:{" "}
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} (
              {correctOrder.length} books)
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              reset();
              startGame(difficulty);
            }}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition"
          >
            Play Again
          </button>
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition"
          >
            Change Difficulty
          </button>
        </div>
      </div>
    );
  }

  // Playing screen
  const nextExpected = correctOrder[playerOrder.length];
  const nextExpectedIndex = ALL_BOOKS.indexOf(nextExpected) + 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Bible Books Blitz
        </h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">
            {formatTime(timeElapsed)}
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            {playerOrder.length}/{correctOrder.length}
          </span>
          {mistakes > 0 && (
            <span className="text-red-500">{mistakes} mistakes</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 mb-4">
        <div
          className="bg-teal-500 h-2 rounded-full transition-all duration-300"
          style={{
            width: `${(playerOrder.length / correctOrder.length) * 100}%`,
          }}
        />
      </div>

      {/* Hint */}
      <p className="text-center text-sm text-zinc-400 dark:text-zinc-500 mb-4">
        Next: Book #{nextExpectedIndex} of the Bible
      </p>

      {/* Placed books */}
      {playerOrder.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4 p-3 bg-teal-50 dark:bg-teal-900/10 rounded-xl min-h-[3rem]">
          {playerOrder.map((book, i) => (
            <span
              key={i}
              className="px-2.5 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-medium"
            >
              {book}
            </span>
          ))}
        </div>
      )}

      {/* Available books */}
      <div className="flex flex-wrap gap-2">
        {available.map((book) => (
          <button
            key={book}
            onClick={() => handleBookClick(book)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
              lastWrong === book
                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse"
                : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20"
            }`}
          >
            {book}
          </button>
        ))}
      </div>
    </div>
  );
}
