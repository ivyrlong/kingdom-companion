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

interface WordEntry {
  word: string;
  hint: string;
}

const DEFAULT_WORDS: WordEntry[] = [
  { word: "JEHOVAH", hint: "The true God's name" },
  { word: "BIBLE", hint: "God's inspired Word" },
  { word: "PRAYER", hint: "Talking to God" },
  { word: "KINDNESS", hint: "A fruit of the spirit" },
  { word: "DAVID", hint: "He fought Goliath" },
  { word: "MOSES", hint: "He led Israel out of Egypt" },
  { word: "PARADISE", hint: "The future Earth" },
  { word: "CREATION", hint: "What God made" },
  { word: "FAITH", hint: "Believing without seeing" },
  { word: "NOAH", hint: "He built an ark" },
  { word: "RUTH", hint: "A loyal Moabite woman" },
  { word: "JONAH", hint: "Swallowed by a great fish" },
  { word: "GRACE", hint: "Undeserved kindness" },
  { word: "BAPTISM", hint: "A symbol of dedication" },
];

const DEFAULT_MAX_WRONG = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/* ------------------------------------------------------------------ */
/*  Canvas drawing helpers                                             */
/* ------------------------------------------------------------------ */

function drawHangman(
  canvas: HTMLCanvasElement,
  wrongCount: number,
  isDark: boolean
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Colors from coral palette
  const gallowsColor = isDark ? "#a8a29e" : "#57534e"; // stone for gallows
  const ropeColor = isDark ? "#d4a574" : "#92400e"; // amber-ish rope
  const bodyColor = "#FF8269"; // coral-400
  const bodyStroke = "#dc4a2d"; // coral-600

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // --- Gallows ---
  ctx.strokeStyle = gallowsColor;
  ctx.lineWidth = 4;

  // Base
  ctx.beginPath();
  ctx.moveTo(w * 0.15, h * 0.9);
  ctx.lineTo(w * 0.55, h * 0.9);
  ctx.stroke();

  // Vertical post
  ctx.beginPath();
  ctx.moveTo(w * 0.35, h * 0.9);
  ctx.lineTo(w * 0.35, h * 0.1);
  ctx.stroke();

  // Horizontal beam
  ctx.beginPath();
  ctx.moveTo(w * 0.35, h * 0.1);
  ctx.lineTo(w * 0.65, h * 0.1);
  ctx.stroke();

  // Rope
  ctx.strokeStyle = ropeColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.65, h * 0.1);
  ctx.lineTo(w * 0.65, h * 0.2);
  ctx.stroke();

  // --- Body parts (drawn based on wrongCount) ---
  ctx.strokeStyle = bodyStroke;
  ctx.fillStyle = bodyColor;
  ctx.lineWidth = 3;

  const cx = w * 0.65; // center x for figure

  // 1: Head
  if (wrongCount >= 1) {
    const headR = w * 0.06;
    ctx.beginPath();
    ctx.arc(cx, h * 0.2 + headR, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 2: Body
  if (wrongCount >= 2) {
    const bodyTop = h * 0.2 + w * 0.12;
    const bodyBottom = h * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx, bodyTop);
    ctx.lineTo(cx, bodyBottom);
    ctx.stroke();
  }

  // 3: Left arm
  if (wrongCount >= 3) {
    const shoulderY = h * 0.35;
    ctx.beginPath();
    ctx.moveTo(cx, shoulderY);
    ctx.lineTo(cx - w * 0.12, h * 0.45);
    ctx.stroke();
  }

  // 4: Right arm
  if (wrongCount >= 4) {
    const shoulderY = h * 0.35;
    ctx.beginPath();
    ctx.moveTo(cx, shoulderY);
    ctx.lineTo(cx + w * 0.12, h * 0.45);
    ctx.stroke();
  }

  // 5: Left leg
  if (wrongCount >= 5) {
    const hipY = h * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx, hipY);
    ctx.lineTo(cx - w * 0.1, h * 0.72);
    ctx.stroke();
  }

  // 6: Right leg
  if (wrongCount >= 6) {
    const hipY = h * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx, hipY);
    ctx.lineTo(cx + w * 0.1, h * 0.72);
    ctx.stroke();
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Hangman({ gameId, userId, contentPack, ageGroup }: Props) {
  const { status, finalScore, startSession, endSession, reset } =
    useGameSession({ gameId, userId });

  const difficulty = getDifficulty(ageGroup);
  const MAX_WRONG = difficulty === "easy" ? 8 : difficulty === "hard" ? 5 : DEFAULT_MAX_WRONG;

  // Word pool
  const [wordPool, setWordPool] = useState<WordEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Round state
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [wrongCount, setWrongCount] = useState(0);
  const [roundOver, setRoundOver] = useState(false);
  const [roundWon, setRoundWon] = useState(false);

  // Session-wide state
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [wordsWon, setWordsWon] = useState(0);
  const [wordsPlayed, setWordsPlayed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDarkRef = useRef(false);

  // Build word pool from contentPack or defaults
  const buildWordPool = useCallback((): WordEntry[] => {
    let pool: WordEntry[];
    if (
      contentPack?.vocabulary &&
      contentPack.vocabulary.length >= 3
    ) {
      const hints =
        contentPack.keyPhrases && contentPack.keyPhrases.length > 0
          ? contentPack.keyPhrases
          : contentPack.themes && contentPack.themes.length > 0
            ? contentPack.themes
            : [];

      pool = contentPack.vocabulary.map((word, i) => ({
        word: word.toUpperCase().replace(/[^A-Z]/g, ""),
        hint: hints[i % Math.max(hints.length, 1)] ?? "Bible vocabulary",
      }));
    } else {
      pool = [...DEFAULT_WORDS];
    }

    // Filter by word length based on difficulty
    if (difficulty === "easy") {
      const short = pool.filter((w) => w.word.length <= 5);
      if (short.length >= 3) pool = short;
    } else if (difficulty === "hard") {
      const long = pool.filter((w) => w.word.length >= 6);
      if (long.length >= 3) pool = long;
    }

    return pool;
  }, [contentPack, difficulty]);

  // Detect dark mode for canvas
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    isDarkRef.current = document.documentElement.classList.contains("dark") || mq.matches;

    const observer = new MutationObserver(() => {
      isDarkRef.current = document.documentElement.classList.contains("dark");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Draw / redraw hangman whenever wrongCount changes
  useEffect(() => {
    if (status !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Ensure canvas resolution matches display size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);

    drawHangman(canvas, wrongCount, isDarkRef.current);
  }, [wrongCount, status, roundOver]);

  // Physical keyboard support
  useEffect(() => {
    if (status !== "playing" || roundOver) return;

    const handler = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key) && !guessedLetters.has(key)) {
        handleGuess(key);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, roundOver, guessedLetters, wordPool, currentIndex, wrongCount]);

  const currentWord = wordPool[currentIndex]?.word ?? "";
  const currentHint = wordPool[currentIndex]?.hint ?? "";

  const isWordComplete = currentWord
    .split("")
    .every((ch) => guessedLetters.has(ch));

  // Handle a letter guess
  const handleGuess = useCallback(
    (letter: string) => {
      if (roundOver || guessedLetters.has(letter)) return;

      const newGuessed = new Set(guessedLetters);
      newGuessed.add(letter);
      setGuessedLetters(newGuessed);

      if (!currentWord.includes(letter)) {
        // Wrong guess
        const newWrong = wrongCount + 1;
        setWrongCount(newWrong);

        if (newWrong >= MAX_WRONG) {
          // Lost this round
          setRoundOver(true);
          setRoundWon(false);
          setStreak(0);
          setWordsPlayed((p) => p + 1);
        }
      } else {
        // Check if word is now complete
        const allRevealed = currentWord
          .split("")
          .every((ch) => newGuessed.has(ch));

        if (allRevealed) {
          // Won this round
          const bonus = Math.max(0, (MAX_WRONG - wrongCount) * 20);
          const roundPoints = 100 + bonus;
          setScore((s) => s + roundPoints);
          setStreak((s) => s + 1);
          setWordsWon((w) => w + 1);
          setWordsPlayed((p) => p + 1);
          setRoundOver(true);
          setRoundWon(true);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }
      }
    },
    [roundOver, guessedLetters, currentWord, wrongCount]
  );

  // Start the game session
  const startGame = useCallback(async () => {
    const pool = shuffleArray(buildWordPool());
    setWordPool(pool);
    setCurrentIndex(0);
    setGuessedLetters(new Set());
    setWrongCount(0);
    setRoundOver(false);
    setRoundWon(false);
    setScore(0);
    setStreak(0);
    setWordsWon(0);
    setWordsPlayed(0);
    setShowHint(false);
    setShowConfetti(false);
    await startSession();
  }, [startSession, buildWordPool]);

  // Move to next word
  const nextWord = useCallback(() => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= wordPool.length) {
      // No more words, end session
      endSession(score);
      return;
    }
    setCurrentIndex(nextIdx);
    setGuessedLetters(new Set());
    setWrongCount(0);
    setRoundOver(false);
    setRoundWon(false);
    setShowHint(false);
  }, [currentIndex, wordPool.length, score, endSession]);

  // Finish session manually
  const finishGame = useCallback(() => {
    endSession(score);
  }, [endSession, score]);

  // ---- RENDER ---- //

  // Start screen
  if (status === "idle") {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Bible Hangman
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
          Guess the Bible-themed word one letter at a time. You have {MAX_WRONG} tries
          per word — earn bonus points for fewer wrong guesses!
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
            {wordsWon === wordsPlayed ? "Perfect!" : "Well Done!"}
          </h1>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-sm mx-auto mb-6">
            <p className="text-5xl font-bold text-coral-600 dark:text-coral-400 mb-4">
              {finalScore?.toLocaleString()}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {wordsWon}/{wordsPlayed} words guessed correctly
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                reset();
                startGame();
              }}
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

  // ---- Playing screen ---- //

  const wrongLetters = ALPHABET.filter(
    (l) => guessedLetters.has(l) && !currentWord.includes(l)
  );
  const correctLetters = ALPHABET.filter(
    (l) => guessedLetters.has(l) && currentWord.includes(l)
  );

  return (
    <div>
      <Confetti active={showConfetti} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Bible Hangman
        </h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">
            Score: {score}
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            Word {currentIndex + 1}/{wordPool.length}
          </span>
          {streak > 1 && (
            <span className="text-amber-500 font-medium">
              {streak} streak!
            </span>
          )}
        </div>
      </div>

      {/* Hearts / tries remaining */}
      <div className="flex items-center gap-1 mb-4">
        {Array.from({ length: MAX_WRONG }).map((_, i) => (
          <span
            key={i}
            className={`text-xl transition-transform ${
              i < MAX_WRONG - wrongCount
                ? "text-coral-500 scale-100"
                : "text-zinc-300 dark:text-zinc-700 scale-75"
            }`}
          >
            {i < MAX_WRONG - wrongCount ? "\u2764" : "\u2661"}
          </span>
        ))}
        <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-2">
          {MAX_WRONG - wrongCount} remaining
        </span>
      </div>

      {/* Main area: canvas + word display */}
      <div className="flex flex-col sm:flex-row gap-6 items-center justify-center mb-6">
        {/* Canvas */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-2">
          <canvas
            ref={canvasRef}
            className="w-[200px] h-[220px] sm:w-[220px] sm:h-[240px]"
          />
        </div>

        {/* Word + hint */}
        <div className="flex flex-col items-center gap-4">
          {/* Letter blanks */}
          <div className="flex flex-wrap gap-2 justify-center">
            {currentWord.split("").map((ch, i) => {
              const revealed = guessedLetters.has(ch);
              const lost = roundOver && !roundWon && !revealed;
              return (
                <div
                  key={i}
                  className={`w-9 h-11 sm:w-10 sm:h-12 flex items-center justify-center border-b-2 text-xl font-bold transition-all ${
                    revealed
                      ? "border-coral-400 dark:border-coral-500 text-zinc-900 dark:text-zinc-50"
                      : lost
                        ? "border-red-400 text-red-500"
                        : "border-zinc-300 dark:border-zinc-600 text-transparent"
                  }`}
                >
                  {revealed ? ch : lost ? ch : "\u00A0"}
                </div>
              );
            })}
          </div>

          {/* Hint toggle */}
          <button
            onClick={() => setShowHint((h) => !h)}
            className="text-sm text-coral-600 dark:text-coral-400 hover:underline transition"
          >
            {showHint ? "Hide hint" : "Show hint"}
          </button>

          {showHint && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 italic bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">
              {currentHint}
            </p>
          )}

          {/* Round result message */}
          {roundOver && (
            <div className="text-center">
              {roundWon ? (
                <p className="text-green-600 dark:text-green-400 font-semibold">
                  Correct! +{100 + Math.max(0, (MAX_WRONG - wrongCount) * 20)}{" "}
                  points
                </p>
              ) : (
                <p className="text-red-500 dark:text-red-400 font-semibold">
                  The word was:{" "}
                  <span className="uppercase">{currentWord}</span>
                </p>
              )}

              <div className="flex gap-2 mt-3 justify-center">
                <button
                  onClick={nextWord}
                  className="px-5 py-2 bg-coral-600 hover:bg-coral-700 text-white font-medium rounded-lg transition"
                >
                  Next Word
                </button>
                <button
                  onClick={finishGame}
                  className="px-5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition"
                >
                  End Game
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* On-screen keyboard */}
      <div className="grid grid-cols-9 sm:grid-cols-9 gap-1.5 max-w-md mx-auto">
        {ALPHABET.map((letter) => {
          const guessed = guessedLetters.has(letter);
          const isCorrect = guessed && currentWord.includes(letter);
          const isWrong = guessed && !currentWord.includes(letter);

          let classes =
            "w-full aspect-square sm:h-11 flex items-center justify-center rounded-lg font-bold text-sm sm:text-base transition-all ";

          if (isCorrect) {
            classes +=
              "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700 cursor-default";
          } else if (isWrong) {
            classes +=
              "bg-red-100 dark:bg-red-900/30 text-red-400 dark:text-red-500 border border-red-200 dark:border-red-800 cursor-default";
          } else {
            classes +=
              "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-coral-400 dark:hover:border-coral-500 hover:bg-coral-50 dark:hover:bg-coral-900/10 active:scale-95 cursor-pointer";
          }

          return (
            <button
              key={letter}
              onClick={() => handleGuess(letter)}
              disabled={guessed || roundOver}
              className={classes}
              aria-label={`Guess letter ${letter}`}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
