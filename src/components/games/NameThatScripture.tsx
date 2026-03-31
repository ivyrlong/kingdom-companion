"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useGameSession } from "@/hooks/useGameSession";
import type { GameProps } from "@/app/(dashboard)/games/[slug]/page";
import { SCRIPTURE_PAIRS } from "@/lib/game-data/scripture-pairs";
import Confetti from "@/components/Confetti";

type Props = GameProps;

interface Round {
  text: string;
  correctAnswer: string;
  options: string[];
}

const BIBLE_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "Psalms", "Proverbs", "Ecclesiastes",
  "Isaiah", "Jeremiah", "Ezekiel", "Daniel", "Hosea",
  "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Timothy", "2 Timothy",
  "Hebrews", "James", "1 Peter", "2 Peter", "1 John",
  "Revelation",
];

function getBookFromRef(ref: string): string {
  // Extract the book name (everything before the first digit that starts chapter:verse)
  const match = ref.match(/^(.+?)\s+\d/);
  return match ? match[1].trim() : ref;
}

function generateRounds(
  scriptures: { reference: string; text: string }[],
  count: number
): Round[] {
  const shuffled = [...scriptures].sort(() => Math.random() - 0.5);
  const rounds: Round[] = [];

  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const scripture = shuffled[i];
    const correctBook = getBookFromRef(scripture.reference);

    // Pick 3 random wrong answers
    const wrongBooks = BIBLE_BOOKS.filter((b) => b !== correctBook)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const options = [correctBook, ...wrongBooks].sort(
      () => Math.random() - 0.5
    );

    rounds.push({
      text: scripture.text || `"${scripture.reference}"`,
      correctAnswer: correctBook,
      options,
    });
  }

  return rounds;
}

export default function NameThatScripture({ gameId, userId, contentPack }: Props) {
  const { status, finalScore, startSession, endSession, reset } =
    useGameSession({ gameId, userId });

  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = useCallback(async () => {
    const scriptures =
      contentPack?.scriptures && contentPack.scriptures.length > 0
        ? contentPack.scriptures
        : SCRIPTURE_PAIRS.map((p) => ({ reference: p.reference, text: p.text }));

    const newRounds = generateRounds(scriptures, 10);
    setRounds(newRounds);
    setCurrentRound(0);
    setSelected(null);
    setShowResult(false);
    setCorrectCount(0);
    setTimeElapsed(0);
    await startSession();
  }, [startSession, contentPack]);

  useEffect(() => {
    if (status === "playing") {
      timerRef.current = setInterval(() => setTimeElapsed((t) => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (showResult) return;
      setSelected(answer);
      setShowResult(true);

      const isCorrect = answer === rounds[currentRound].correctAnswer;
      if (isCorrect) setCorrectCount((c) => c + 1);

      setTimeout(() => {
        const nextRound = currentRound + 1;
        if (nextRound >= rounds.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          const correct = correctCount + (isCorrect ? 1 : 0);
          const accuracy = correct / rounds.length;
          const timeBonus = Math.max(0, 120 - timeElapsed) * 3;
          const score = Math.round(correct * 100 * accuracy + timeBonus);
          endSession(score);
        } else {
          setCurrentRound(nextRound);
          setSelected(null);
          setShowResult(false);
        }
      }, 1200);
    },
    [showResult, rounds, currentRound, correctCount, timeElapsed, endSession]
  );

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // Start screen
  if (status === "idle") {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Name That Scripture
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
          Read the verse and identify which book of the Bible it comes from!
        </p>
        <button
          onClick={startGame}
          className="px-8 py-3 bg-coral-600 hover:bg-coral-700 text-white font-medium rounded-xl text-lg transition"
        >
          Start Game
        </button>
      </div>
    );
  }

  // Finished screen
  if (status === "finished") {
    return (
      <>
      <Confetti active={status === "finished"} />
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          {correctCount === rounds.length ? "Perfect Score!" : "Game Over!"}
        </h1>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-sm mx-auto mb-6">
          <p className="text-5xl font-bold text-coral-600 dark:text-coral-400 mb-4">
            {finalScore?.toLocaleString()}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {correctCount}/{rounds.length} correct | Time: {formatTime(timeElapsed)}
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { reset(); startGame(); }}
            className="px-6 py-2.5 bg-coral-600 hover:bg-coral-700 text-white font-medium rounded-lg transition"
          >
            Play Again
          </button>
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition"
          >
            Back
          </button>
        </div>
      </div>
      </>
    );
  }

  // Playing screen
  const round = rounds[currentRound];
  if (!round) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Name That Scripture
        </h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">{formatTime(timeElapsed)}</span>
          <span className="text-zinc-500 dark:text-zinc-400">
            {currentRound + 1}/{rounds.length}
          </span>
          <span className="text-coral-600 dark:text-coral-400">
            {correctCount} correct
          </span>
        </div>
      </div>

      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 mb-8">
        <div
          className="bg-coral-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentRound + 1) / rounds.length) * 100}%` }}
        />
      </div>

      {/* Verse text */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
        <p className="text-lg text-zinc-700 dark:text-zinc-300 italic leading-relaxed text-center">
          &ldquo;{round.text}&rdquo;
        </p>
      </div>

      {/* Options */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-4">
        Which book is this from?
      </p>
      <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
        {round.options.map((option) => {
          let classes = "p-4 rounded-xl text-center font-medium transition border-2 ";
          if (showResult) {
            if (option === round.correctAnswer) {
              classes +=
                "bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600 text-green-700 dark:text-green-300";
            } else if (option === selected) {
              classes +=
                "bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 text-red-700 dark:text-red-300";
            } else {
              classes +=
                "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500";
            }
          } else {
            classes +=
              "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-coral-300 dark:hover:border-coral-600 hover:bg-coral-50 dark:hover:bg-coral-900/10 cursor-pointer";
          }

          return (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              disabled={showResult}
              className={classes}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
