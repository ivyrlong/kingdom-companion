"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useGameSession } from "@/hooks/useGameSession";
import type { GameProps } from "@/app/(dashboard)/games/[slug]/page";
import Confetti from "@/components/Confetti";

type Props = GameProps;

function getDifficulty(ageGroup?: string) {
  switch (ageGroup) {
    case "LITTLE_ONES": return "easy";
    case "ADULT": return "hard";
    default: return "medium"; // YOUTH, FAMILY, undefined
  }
}

interface TriviaQuestion {
  question: string;
  answer: string;
  options: string[];
}

const DEFAULT_QUESTIONS: TriviaQuestion[] = [
  { question: "How many books are in the Bible?", answer: "66", options: ["66", "73", "39", "27"] },
  { question: "Who was the first king of Israel?", answer: "Saul", options: ["David", "Saul", "Solomon", "Samuel"] },
  { question: "What is the longest book of the Bible?", answer: "Psalms", options: ["Psalms", "Isaiah", "Jeremiah", "Genesis"] },
  { question: "Who built the ark?", answer: "Noah", options: ["Noah", "Moses", "Abraham", "Lot"] },
  { question: "How many days was Jonah in the fish?", answer: "3", options: ["3", "7", "40", "1"] },
  { question: "What is the first book of the Bible?", answer: "Genesis", options: ["Genesis", "Exodus", "Matthew", "Psalms"] },
  { question: "Who wrote most of the Psalms?", answer: "David", options: ["David", "Solomon", "Moses", "Asaph"] },
  { question: "How many apostles did Jesus choose?", answer: "12", options: ["12", "7", "10", "70"] },
  { question: "What was the name of Moses' brother?", answer: "Aaron", options: ["Aaron", "Joshua", "Caleb", "Levi"] },
  { question: "In what city was Jesus born?", answer: "Bethlehem", options: ["Bethlehem", "Nazareth", "Jerusalem", "Capernaum"] },
];

export default function TheocraticTrivia({ gameId, userId, contentPack, ageGroup }: Props) {
  const { status, finalScore, startSession, endSession, reset } =
    useGameSession({ gameId, userId });

  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [streak, setStreak] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const difficulty = getDifficulty(ageGroup);
  const totalRounds = difficulty === "easy" ? 5 : difficulty === "hard" ? 10 : 8;
  const numOptions = difficulty === "easy" ? 3 : 4;
  const answerDelay = difficulty === "hard" ? 800 : 1200;

  const startGame = useCallback(async () => {
    let triviaQuestions: TriviaQuestion[];

    if (contentPack?.questions && contentPack.questions.length >= 3) {
      // Build from content pack
      triviaQuestions = contentPack.questions.map((q) => {
        const opts = q.options && q.options.length >= 2
          ? q.options
          : [q.answer, "True", "False", "Not stated"].filter((v, i, a) => a.indexOf(v) === i);

        // Shuffle options
        const shuffled = [...opts].sort(() => Math.random() - 0.5);
        return { question: q.question, answer: q.answer, options: shuffled.slice(0, numOptions) };
      });
    } else {
      triviaQuestions = [...DEFAULT_QUESTIONS].sort(() => Math.random() - 0.5);
      // Trim options to numOptions for default questions too
      if (numOptions < 4) {
        triviaQuestions = triviaQuestions.map((q) => {
          const correctIdx = q.options.indexOf(q.answer);
          const wrong = q.options.filter((_, i) => i !== correctIdx).slice(0, numOptions - 1);
          return { ...q, options: [q.answer, ...wrong].sort(() => Math.random() - 0.5) };
        });
      }
    }

    setQuestions(triviaQuestions.slice(0, totalRounds));
    setCurrentQ(0);
    setSelected(null);
    setShowResult(false);
    setCorrectCount(0);
    setStreak(0);
    setTimeElapsed(0);
    await startSession();
  }, [startSession, contentPack, totalRounds, numOptions]);

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

      const isCorrect = answer === questions[currentQ].answer;
      const newCorrect = correctCount + (isCorrect ? 1 : 0);
      const newStreak = isCorrect ? streak + 1 : 0;
      if (isCorrect) setCorrectCount(newCorrect);
      setStreak(newStreak);

      setTimeout(() => {
        const next = currentQ + 1;
        if (next >= questions.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          const accuracy = newCorrect / questions.length;
          const timeBonus = Math.max(0, 150 - timeElapsed) * 3;
          const score = Math.round(newCorrect * 100 * (1 + accuracy * 0.5) + timeBonus);
          endSession(score);
        } else {
          setCurrentQ(next);
          setSelected(null);
          setShowResult(false);
        }
      }, answerDelay);
    },
    [showResult, questions, currentQ, correctCount, streak, timeElapsed, endSession, answerDelay]
  );

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // Start screen
  if (status === "idle") {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Theocratic Trivia
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
          Test your Bible knowledge! Answer questions quickly and accurately for the best score.
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
          {correctCount === questions.length ? "Perfect!" : "Great Effort!"}
        </h1>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-sm mx-auto mb-6">
          <p className="text-5xl font-bold text-coral-600 dark:text-coral-400 mb-4">
            {finalScore?.toLocaleString()}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {correctCount}/{questions.length} correct | Time: {formatTime(timeElapsed)}
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
  const q = questions[currentQ];
  if (!q) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Theocratic Trivia
        </h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">{formatTime(timeElapsed)}</span>
          <span className="text-zinc-500 dark:text-zinc-400">
            {currentQ + 1}/{questions.length}
          </span>
          {streak > 1 && (
            <span className="text-amber-500 font-medium">{streak} streak!</span>
          )}
        </div>
      </div>

      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 mb-8">
        <div
          className="bg-coral-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
        <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100 text-center">
          {q.question}
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
        {q.options.map((option) => {
          let classes = "p-4 rounded-xl text-center font-medium transition border-2 ";
          if (showResult) {
            if (option === q.answer) {
              classes +=
                "bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600 text-green-700 dark:text-green-300";
            } else if (option === selected) {
              classes +=
                "bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 text-red-700 dark:text-red-300";
            } else {
              classes +=
                "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400";
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
