"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useGameSession } from "@/hooks/useGameSession";
import type { GameProps } from "@/app/(dashboard)/games/[slug]/page";
import Confetti from "@/components/Confetti";

type Props = GameProps;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_PHRASES = [
  "GOD IS GOOD",
  "TRUST JEHOVAH",
  "BE KIND",
  "LOVE OTHERS",
  "PRAY OFTEN",
  "READ THE BIBLE",
  "DO NOT GIVE UP",
  "SEEK PEACE",
  "SHOW LOVE",
  "HAVE FAITH",
];

/** Bible-themed emoji symbols used as cipher substitutes */
const CIPHER_SYMBOLS = [
  "\u{1F4DC}", // scroll
  "\u{1F54A}", // dove
  "\u2B50",    // star
  "\u2764\uFE0F", // heart
  "\u2720",    // cross (Maltese)
  "\u{1F30D}", // earth
  "\u{1F56F}", // candle
  "\u{1F3F5}", // rosette
  "\u2618",    // shamrock / clover
  "\u{1F54B}", // mosque (temple-like)
  "\u2728",    // sparkles
  "\u{1F30A}", // wave
  "\u{1F33F}", // herb
  "\u{1F33E}", // sheaf
  "\u{1F343}", // leaf
  "\u26A1",    // lightning
  "\u{1F31F}", // glowing star
  "\u2600\uFE0F", // sun
  "\u{1F308}", // rainbow
  "\u{1F3B6}", // musical notes
  "\u{1F3BA}", // trumpet
  "\u{1F480}", // skull (not Bible-y, placeholder)
  "\u{1F54C}", // mosque
  "\u{1F3D4}", // mountain
  "\u{1F333}", // tree
  "\u{1F347}", // grapes
];

const POINTS_PER_PHRASE = 200;
const HINT_PENALTY = 30;
const UNDO_PENALTY = 10;
const MAX_ROUNDS = 5;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build a 1-to-1 mapping from each unique letter to a unique symbol */
function buildCipher(phrase: string): Map<string, string> {
  const letters = Array.from(
    new Set(
      phrase
        .toUpperCase()
        .split("")
        .filter((ch) => /[A-Z]/.test(ch))
    )
  );
  const pool = shuffle(CIPHER_SYMBOLS).slice(0, letters.length);
  const map = new Map<string, string>();
  letters.forEach((letter, i) => map.set(letter, pool[i]));
  return map;
}

/** Gather phrases from a content pack or fall back to defaults */
function gatherPhrases(
  contentPack?: Props["contentPack"]
): string[] {
  if (contentPack) {
    const phrases: string[] = [];

    // Prefer keyPhrases
    if (contentPack.keyPhrases && contentPack.keyPhrases.length > 0) {
      phrases.push(
        ...contentPack.keyPhrases.map((p) => p.toUpperCase().trim())
      );
    }

    // If we still need more, combine vocabulary words into short phrases
    if (
      phrases.length < MAX_ROUNDS &&
      contentPack.vocabulary &&
      contentPack.vocabulary.length >= 2
    ) {
      const vocab = shuffle(contentPack.vocabulary);
      for (let i = 0; i + 1 < vocab.length && phrases.length < MAX_ROUNDS * 2; i += 2) {
        const combined = `${vocab[i]} ${vocab[i + 1]}`.toUpperCase().trim();
        if (combined.length >= 4 && combined.length <= 30) {
          phrases.push(combined);
        }
      }
    }

    if (phrases.length > 0) return shuffle(phrases);
  }

  return shuffle(DEFAULT_PHRASES);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface HistoryEntry {
  position: number; // index into phrase (letter-only positions)
  letter: string;
}

export default function Cryptogram({ gameId, userId, contentPack }: GameProps) {
  const { status, finalScore, startSession, endSession, reset } =
    useGameSession({ gameId, userId });

  // --- game state -----------------------------------------------
  const [allPhrases, setAllPhrases] = useState<string[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [cipher, setCipher] = useState<Map<string, string>>(new Map());
  const [guesses, setGuesses] = useState<Map<number, string>>(new Map()); // posIndex -> letter
  const [activePos, setActivePos] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [undosUsed, setUndosUsed] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [shakingPos, setShakingPos] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [roundComplete, setRoundComplete] = useState(false);

  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const phrase = allPhrases[roundIndex] ?? "";

  /** Unique letters in the current phrase */
  const uniqueLetters = useMemo(() => {
    return Array.from(
      new Set(
        phrase
          .split("")
          .filter((ch) => /[A-Z]/.test(ch))
      )
    ).sort();
  }, [phrase]);

  /** Reverse map: symbol -> letter */
  const symbolToLetter = useMemo(() => {
    const m = new Map<string, string>();
    cipher.forEach((sym, letter) => m.set(sym, letter));
    return m;
  }, [cipher]);

  /** Array of letter-only positions (indices into phrase string that are letters) */
  const letterPositions = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < phrase.length; i++) {
      if (/[A-Z]/.test(phrase[i])) positions.push(i);
    }
    return positions;
  }, [phrase]);

  /** Check if the round is fully and correctly solved */
  const isSolved = useMemo(() => {
    if (letterPositions.length === 0) return false;
    for (let posIdx = 0; posIdx < letterPositions.length; posIdx++) {
      const correctLetter = phrase[letterPositions[posIdx]];
      if (guesses.get(posIdx) !== correctLetter) return false;
    }
    return true;
  }, [letterPositions, guesses, phrase]);

  // --- start game -----------------------------------------------
  const startGame = useCallback(async () => {
    const phrases = gatherPhrases(contentPack);
    setAllPhrases(phrases);
    setRoundIndex(0);
    setTotalScore(0);
    setHintsUsed(0);
    setUndosUsed(0);
    setShowConfetti(false);

    const firstPhrase = phrases[0] ?? DEFAULT_PHRASES[0];
    const newCipher = buildCipher(firstPhrase);
    setCipher(newCipher);
    setGuesses(new Map());
    setActivePos(null);
    setHistory([]);
    setRoundComplete(false);

    await startSession();
  }, [startSession, contentPack]);

  // --- advance round / detect solve -----------------------------
  useEffect(() => {
    if (status !== "playing" || !isSolved || roundComplete) return;

    setRoundComplete(true);
    const roundScore = Math.max(
      0,
      POINTS_PER_PHRASE - hintsUsed * HINT_PENALTY - undosUsed * UNDO_PENALTY
    );
    const newTotal = totalScore + roundScore;
    setTotalScore(newTotal);

    const nextRound = roundIndex + 1;

    if (nextRound >= MAX_ROUNDS || nextRound >= allPhrases.length) {
      // Game over
      setShowConfetti(true);
      endSession(newTotal);
    } else {
      // Short delay then next round
      setTimeout(() => {
        setRoundIndex(nextRound);
        const nextPhrase = allPhrases[nextRound];
        setCipher(buildCipher(nextPhrase));
        setGuesses(new Map());
        setActivePos(null);
        setHistory([]);
        setHintsUsed(0);
        setUndosUsed(0);
        setRoundComplete(false);
      }, 1200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSolved]);

  // --- interaction handlers -------------------------------------
  const handleBlankTap = useCallback(
    (posIdx: number) => {
      if (roundComplete) return;
      // If the position is already correctly locked, ignore
      const correctLetter = phrase[letterPositions[posIdx]];
      if (guesses.get(posIdx) === correctLetter) return;

      setActivePos(posIdx);
      setDrawerOpen(true);
    },
    [roundComplete, phrase, letterPositions, guesses]
  );

  const handleSymbolPick = useCallback(
    (symbol: string) => {
      if (activePos === null) return;

      const letterForSymbol = symbolToLetter.get(symbol);
      if (!letterForSymbol) return;

      const correctLetter = phrase[letterPositions[activePos]];

      // Push to history before changing
      const prev = guesses.get(activePos);
      setHistory((h) => [
        ...h,
        { position: activePos, letter: prev ?? "" },
      ]);

      const newGuesses = new Map(guesses);
      newGuesses.set(activePos, letterForSymbol);
      setGuesses(newGuesses);

      if (letterForSymbol !== correctLetter) {
        // Wrong guess — shake
        setShakingPos(activePos);
        if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
        shakeTimerRef.current = setTimeout(() => setShakingPos(null), 500);
      }

      // Auto-advance to the next unfilled blank
      const nextPos = findNextEmptyPos(activePos, newGuesses, letterPositions, phrase);
      setActivePos(nextPos);
      if (nextPos === null) setDrawerOpen(false);
    },
    [activePos, symbolToLetter, phrase, letterPositions, guesses]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    const newGuesses = new Map(guesses);

    if (last.letter) {
      newGuesses.set(last.position, last.letter);
    } else {
      newGuesses.delete(last.position);
    }

    setGuesses(newGuesses);
    setHistory((h) => h.slice(0, -1));
    setUndosUsed((u) => u + 1);
    setActivePos(last.position);
  }, [history, guesses]);

  const handleHint = useCallback(() => {
    // Reveal a random unsolved position
    const unsolved = letterPositions
      .map((_, posIdx) => posIdx)
      .filter((posIdx) => guesses.get(posIdx) !== phrase[letterPositions[posIdx]]);

    if (unsolved.length === 0) return;

    const pick = unsolved[Math.floor(Math.random() * unsolved.length)];
    const correctLetter = phrase[letterPositions[pick]];

    const prev = guesses.get(pick);
    setHistory((h) => [...h, { position: pick, letter: prev ?? "" }]);

    const newGuesses = new Map(guesses);
    newGuesses.set(pick, correctLetter);
    setGuesses(newGuesses);
    setHintsUsed((h) => h + 1);
  }, [letterPositions, guesses, phrase]);

  // --- render helpers -------------------------------------------
  const renderPhrase = () => {
    const words: { chars: { phraseIdx: number; posIdx: number; ch: string }[] }[] = [];
    let currentWord: { phraseIdx: number; posIdx: number; ch: string }[] = [];
    let posCounter = 0;

    for (let i = 0; i < phrase.length; i++) {
      const ch = phrase[i];
      if (ch === " ") {
        if (currentWord.length > 0) {
          words.push({ chars: currentWord });
          currentWord = [];
        }
      } else {
        currentWord.push({ phraseIdx: i, posIdx: posCounter, ch });
        posCounter++;
      }
    }
    if (currentWord.length > 0) words.push({ chars: currentWord });

    return (
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-3 sm:gap-x-6 sm:gap-y-4">
        {words.map((word, wIdx) => (
          <div key={wIdx} className="flex gap-0.5 sm:gap-1">
            {word.chars.map(({ posIdx, ch }) => {
              const guessedLetter = guesses.get(posIdx);
              const correctLetter = ch;
              const isCorrect = guessedLetter === correctLetter;
              const isActive = activePos === posIdx;
              const isShaking = shakingPos === posIdx;
              const symbol = cipher.get(correctLetter) ?? "?";

              return (
                <button
                  key={posIdx}
                  onClick={() => handleBlankTap(posIdx)}
                  disabled={isCorrect && guessedLetter !== undefined}
                  className={`
                    relative flex flex-col items-center justify-end
                    w-8 h-14 sm:w-10 sm:h-16
                    rounded-lg border-2 transition-all duration-150
                    ${
                      isCorrect && guessedLetter !== undefined
                        ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-600"
                        : isActive
                          ? "border-coral-500 bg-coral-50 dark:bg-coral-950/30 dark:border-coral-400 ring-2 ring-coral-300 dark:ring-coral-700"
                          : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 hover:border-coral-300 dark:hover:border-coral-600"
                    }
                    ${isShaking ? "animate-shake" : ""}
                  `}
                >
                  {/* Symbol at the top */}
                  <span className="text-xs sm:text-sm leading-none mt-1 select-none">
                    {symbol}
                  </span>
                  {/* Letter guess or underscore */}
                  <span
                    className={`text-base sm:text-lg font-bold mb-1 ${
                      isCorrect && guessedLetter
                        ? "text-emerald-600 dark:text-emerald-400"
                        : guessedLetter
                          ? "text-coral-600 dark:text-coral-400"
                          : "text-zinc-300 dark:text-zinc-600"
                    }`}
                  >
                    {guessedLetter ?? "_"}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  /* ---------- idle screen ---------- */
  if (status === "idle") {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Cryptogram
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
          Each letter has been replaced by a symbol. Crack the code and reveal the hidden
          Bible phrase!
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

  /* ---------- finished screen ---------- */
  if (status === "finished") {
    return (
      <>
        <Confetti active={showConfetti} />
        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Well Done!
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">
            You decoded {Math.min(roundIndex + 1, allPhrases.length)} phrase
            {roundIndex > 0 ? "s" : ""}!
          </p>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-sm mx-auto mb-6">
            <p className="text-5xl font-bold text-coral-600 dark:text-coral-400 mb-4">
              {finalScore?.toLocaleString()}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {roundIndex + 1} round{roundIndex > 0 ? "s" : ""} completed
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

  /* ---------- playing screen ---------- */
  const solvedCount = letterPositions.filter(
    (_, posIdx) => guesses.get(posIdx) === phrase[letterPositions[posIdx]]
  ).length;

  return (
    <div className="flex flex-col min-h-[calc(100dvh-10rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Cryptogram
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">
            Round {roundIndex + 1}/{Math.min(MAX_ROUNDS, allPhrases.length)}
          </span>
          <span className="font-medium text-coral-600 dark:text-coral-400">
            {totalScore} pts
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 mb-6">
        <div
          className="bg-coral-500 h-2 rounded-full transition-all duration-300"
          style={{
            width: `${
              letterPositions.length > 0
                ? (solvedCount / letterPositions.length) * 100
                : 0
            }%`,
          }}
        />
      </div>

      {/* Round-complete flash */}
      {roundComplete && status === "playing" && (
        <div className="text-center mb-4 animate-pulse">
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            Correct! Next phrase incoming...
          </span>
        </div>
      )}

      {/* Phrase display */}
      <div className="flex-1 flex items-center justify-center px-2 mb-4">
        {renderPhrase()}
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-3 mb-3">
        <button
          onClick={handleUndo}
          disabled={history.length === 0 || roundComplete}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Undo
        </button>
        <button
          onClick={handleHint}
          disabled={roundComplete}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-golden-400 dark:border-golden-600 bg-golden-50 dark:bg-golden-900/30 text-golden-700 dark:text-golden-300 hover:bg-golden-100 dark:hover:bg-golden-900/50 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Hint (-{HINT_PENALTY} pts)
        </button>
        <button
          onClick={() => setDrawerOpen((o) => !o)}
          disabled={roundComplete}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-coral-600 hover:bg-coral-700 text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {drawerOpen ? "Hide Key" : "Show Key"}
        </button>
      </div>

      {/* Symbol Key Drawer */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${drawerOpen ? "max-h-72 opacity-100" : "max-h-0 opacity-0"}
        `}
      >
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:p-4">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2 text-center">
            Tap a blank above, then tap a symbol below to guess
          </p>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 justify-items-center">
            {uniqueLetters.map((letter) => {
              const symbol = cipher.get(letter);
              if (!symbol) return null;

              // Has this symbol been correctly placed somewhere?
              const isRevealed = letterPositions.some(
                (_, posIdx) =>
                  guesses.get(posIdx) === letter &&
                  phrase[letterPositions[posIdx]] === letter
              );

              return (
                <button
                  key={letter}
                  onClick={() => handleSymbolPick(symbol)}
                  disabled={activePos === null || roundComplete}
                  className={`
                    flex flex-col items-center justify-center
                    w-10 h-12 sm:w-12 sm:h-14
                    rounded-lg border transition-all
                    ${
                      isRevealed
                        ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30"
                        : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-coral-50 dark:hover:bg-coral-950/20 hover:border-coral-300 dark:hover:border-coral-600"
                    }
                    disabled:opacity-40 disabled:cursor-not-allowed
                  `}
                >
                  <span className="text-lg leading-none">{symbol}</span>
                  {isRevealed && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {letter}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Utility: find the next empty (unsolved) position after `current`   */
/* ------------------------------------------------------------------ */

function findNextEmptyPos(
  current: number,
  guessMap: Map<number, string>,
  letterPositions: number[],
  phrase: string
): number | null {
  const total = letterPositions.length;
  for (let offset = 1; offset < total; offset++) {
    const idx = (current + offset) % total;
    const correctLetter = phrase[letterPositions[idx]];
    if (guessMap.get(idx) !== correctLetter) return idx;
  }
  return null;
}
