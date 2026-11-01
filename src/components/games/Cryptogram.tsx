"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useGameSession } from "@/hooks/useGameSession";
import type { GameProps } from "@/app/(dashboard)/games/[slug]/page";
import Confetti from "@/components/Confetti";
import { fetchCatalogWords } from "@/lib/game-vocab";
import { useSessionWordHistory } from "@/hooks/useSessionWordHistory";

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

/** Bible-themed emoji symbols used as cipher substitutes. 26 entries,
 *  one per letter of the alphabet. No cross imagery (project rule). */
const CIPHER_SYMBOLS = [
  "\u{1F4DC}", // scroll
  "\u{1F54A}", // dove
  "⭐",    // star
  "❤️", // heart
  "\u{1F956}", // bread (loaves)
  "\u{1F30D}", // earth
  "\u{1F56F}", // candle
  "\u{1F3F5}", // rosette
  "☘",    // shamrock / clover
  "\u{1F54B}", // kaaba
  "✨",    // sparkles
  "\u{1F30A}", // wave
  "\u{1F33F}", // herb
  "\u{1F33E}", // sheaf
  "\u{1F343}", // leaf
  "⚡",    // lightning
  "\u{1F31F}", // glowing star
  "☀️", // sun
  "\u{1F308}", // rainbow
  "\u{1F3B6}", // musical notes
  "\u{1F3BA}", // trumpet
  "\u{1F410}", // goat
  "\u{1F54C}", // temple
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

/** Unique [A-Z] letters appearing in `phrase`, in sorted order. */
function uniqueLettersOf(phrase: string): string[] {
  return Array.from(
    new Set(phrase.split("").filter((ch) => /[A-Z]/.test(ch)))
  ).sort();
}

/**
 * Verify that `cipher` is a complete 1-to-1 substitution mapping for
 * every unique letter in `phrase`, and that encoding + decoding the
 * phrase through the cipher roundtrips exactly back to itself.
 * Returns an error description, or null when valid.
 */
function validatePuzzle(
  phrase: string,
  cipher: Map<string, string>
): string | null {
  const letters = phrase.split("").filter((ch) => /[A-Z]/.test(ch));
  const unique = Array.from(new Set(letters));
  if (cipher.size !== unique.length) {
    return `cipher size ${cipher.size} != unique letters ${unique.length}`;
  }
  const usedSymbols = new Set<string>();
  for (const l of unique) {
    const s = cipher.get(l);
    if (!s) return `no symbol for letter ${l}`;
    if (usedSymbols.has(s)) return `symbol ${s} assigned to multiple letters`;
    usedSymbols.add(s);
  }
  const inverse = new Map<string, string>();
  cipher.forEach((s, l) => inverse.set(s, l));
  for (const l of letters) {
    const s = cipher.get(l)!;
    if (inverse.get(s) !== l) return `roundtrip fail at letter ${l}`;
  }
  return null;
}

/**
 * Build a validated 1-to-1 cipher mapping. Retries a few times in case
 * a shuffle produces an invalid pool (shouldn't happen with distinct
 * symbol entries, but the retry costs nothing and gives us a hard
 * guarantee the puzzle shipped to the UI is well-formed).
 */
function buildCipher(phrase: string): Map<string, string> {
  const letters = uniqueLettersOf(phrase);
  if (letters.length > CIPHER_SYMBOLS.length) {
    throw new Error(
      `Cryptogram phrase has ${letters.length} unique letters, only ${CIPHER_SYMBOLS.length} cipher symbols available.`
    );
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const pool = shuffle([...CIPHER_SYMBOLS]).slice(0, letters.length);
    const map = new Map<string, string>();
    letters.forEach((letter, i) => map.set(letter, pool[i]));
    if (!validatePuzzle(phrase, map)) return map;
  }
  throw new Error("Cryptogram failed to build a valid cipher after 5 tries");
}

/**
 * Gather phrases from a content pack, the shared catalog, or the
 * hardcoded defaults — in that order of preference. `catalogPhrases`
 * comes from /api/vocabulary/random?type=PHRASE and feeds standalone
 * play when no pack is attached.
 */
function gatherPhrases(
  contentPack: Props["contentPack"] | undefined,
  catalogPhrases: string[],
): string[] {
  if (contentPack) {
    const phrases: string[] = [];

    if (contentPack.keyPhrases && contentPack.keyPhrases.length > 0) {
      phrases.push(
        ...contentPack.keyPhrases.map((p) => p.toUpperCase().trim())
      );
    }

    if (
      phrases.length < MAX_ROUNDS &&
      contentPack.vocabulary &&
      contentPack.vocabulary.length >= 2
    ) {
      const vocab = shuffle(contentPack.vocabulary);
      for (
        let i = 0;
        i + 1 < vocab.length && phrases.length < MAX_ROUNDS * 2;
        i += 2
      ) {
        const combined = `${vocab[i]} ${vocab[i + 1]}`.toUpperCase().trim();
        if (combined.length >= 4 && combined.length <= 30) {
          phrases.push(combined);
        }
      }
    }

    const usable = phrases.filter(
      (p) => uniqueLettersOf(p).length <= CIPHER_SYMBOLS.length
    );
    if (usable.length > 0) return shuffle(usable);
  }

  if (catalogPhrases.length > 0) {
    const normalized = catalogPhrases
      .map((p) => p.toUpperCase().trim())
      .filter(
        (p) =>
          p.length >= 4 &&
          p.length <= 40 &&
          uniqueLettersOf(p).length <= CIPHER_SYMBOLS.length,
      );
    if (normalized.length > 0) return shuffle(normalized);
  }

  return shuffle(DEFAULT_PHRASES);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface HistoryEntry {
  symbol: string;
  previousLetter: string; // "" if the symbol had no guess before
  activePos: number | null;
}

export default function Cryptogram({ gameId, userId, contentPack }: GameProps) {
  const { status, finalScore, startSession, endSession, reset } =
    useGameSession({ gameId, userId });

  // --- game state -----------------------------------------------
  const [allPhrases, setAllPhrases] = useState<string[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [cipher, setCipher] = useState<Map<string, string>>(new Map());
  // Guesses keyed by cipher SYMBOL (not tile position) so every tile
  // displaying a given symbol automatically shows the same guess.
  const [symbolGuesses, setSymbolGuesses] = useState<Map<string, string>>(
    new Map()
  );
  const [activePos, setActivePos] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [undosUsed, setUndosUsed] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [shakingSymbol, setShakingSymbol] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [roundComplete, setRoundComplete] = useState(false);

  // Shared PHRASE catalog, fetched once on mount — fuels standalone
  // play. Each session also uses a localStorage-backed anti-repeat
  // store so the same phrases don't recur between sessions.
  const [catalogPhrases, setCatalogPhrases] = useState<string[]>([]);
  const phraseHistory = useSessionWordHistory("cryptogram");

  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCatalogWords({ type: "PHRASE", limit: 100, minLen: 6, maxLen: 40 })
      .then((phrases) => {
        if (!cancelled) setCatalogPhrases(phrases);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const phrase = allPhrases[roundIndex] ?? "";

  /** Unique letters in the current phrase, sorted alphabetically. */
  const uniqueLetters = useMemo(() => uniqueLettersOf(phrase), [phrase]);

  /** Phrase indices that hold a letter (used to drive tile layout). */
  const letterPositions = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < phrase.length; i++) {
      if (/[A-Z]/.test(phrase[i])) positions.push(i);
    }
    return positions;
  }, [phrase]);

  /** Reverse map: symbol -> letter (the ground-truth cipher inverse). */
  const symbolToLetter = useMemo(() => {
    const m = new Map<string, string>();
    cipher.forEach((sym, letter) => m.set(sym, letter));
    return m;
  }, [cipher]);

  /** Current displayed guess for a tile position. */
  const guessAt = useCallback(
    (posIdx: number): string | undefined => {
      const letter = phrase[letterPositions[posIdx]];
      if (!letter) return undefined;
      const symbol = cipher.get(letter);
      if (!symbol) return undefined;
      return symbolGuesses.get(symbol);
    },
    [phrase, letterPositions, cipher, symbolGuesses]
  );

  /** Puzzle solved when every unique letter is mapped to itself via
   *  its symbol guess. */
  const isSolved = useMemo(() => {
    if (uniqueLetters.length === 0) return false;
    for (const letter of uniqueLetters) {
      const symbol = cipher.get(letter);
      if (!symbol) return false;
      if (symbolGuesses.get(symbol) !== letter) return false;
    }
    return true;
  }, [uniqueLetters, cipher, symbolGuesses]);

  // --- start game -----------------------------------------------
  const startGame = useCallback(async () => {
    const candidatePool = gatherPhrases(contentPack, catalogPhrases);
    // Pull a fresh MAX_ROUNDS-sized slice avoiding phrases already
    // used in prior local sessions. pickFresh resets the history
    // automatically once the pool is exhausted.
    const picked = phraseHistory.pickFresh(candidatePool, MAX_ROUNDS);
    phraseHistory.markUsed(picked);
    const phrases = picked.length > 0 ? picked : candidatePool;
    setAllPhrases(phrases);
    setRoundIndex(0);
    setTotalScore(0);
    setHintsUsed(0);
    setUndosUsed(0);
    setShowConfetti(false);

    const firstPhrase = phrases[0] ?? DEFAULT_PHRASES[0];
    setCipher(buildCipher(firstPhrase));
    setSymbolGuesses(new Map());
    setActivePos(null);
    setHistory([]);
    setRoundComplete(false);

    await startSession();
  }, [startSession, contentPack, catalogPhrases, phraseHistory]);

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
      setShowConfetti(true);
      endSession(newTotal);
    } else {
      setTimeout(() => {
        setRoundIndex(nextRound);
        const nextPhrase = allPhrases[nextRound];
        setCipher(buildCipher(nextPhrase));
        setSymbolGuesses(new Map());
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
      const correct = phrase[letterPositions[posIdx]];
      if (guessAt(posIdx) === correct) return; // already locked in

      setActivePos(posIdx);
      setDrawerOpen(true);
    },
    [roundComplete, guessAt, phrase, letterPositions]
  );

  const handleSymbolPick = useCallback(
    (drawerSymbol: string) => {
      if (activePos === null) return;

      const chosenLetter = symbolToLetter.get(drawerSymbol);
      if (!chosenLetter) return;

      const correctLetter = phrase[letterPositions[activePos]];
      const activeSymbol = cipher.get(correctLetter);
      if (!activeSymbol) return;

      // Record undo state for the active symbol.
      const prev = symbolGuesses.get(activeSymbol) ?? "";
      setHistory((h) => [
        ...h,
        { symbol: activeSymbol, previousLetter: prev, activePos },
      ]);

      // Reassign: assigning chosenLetter to activeSymbol updates every
      // tile showing activeSymbol in one shot. Also clear chosenLetter
      // from any other symbol it was previously bound to (one letter →
      // one symbol).
      const newGuesses = new Map(symbolGuesses);
      for (const [sym, lt] of newGuesses) {
        if (lt === chosenLetter && sym !== activeSymbol) {
          newGuesses.delete(sym);
        }
      }
      newGuesses.set(activeSymbol, chosenLetter);
      setSymbolGuesses(newGuesses);

      if (chosenLetter !== correctLetter) {
        setShakingSymbol(activeSymbol);
        if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
        shakeTimerRef.current = setTimeout(() => setShakingSymbol(null), 500);
      }

      // Advance to the next tile whose symbol still isn't correct;
      // skip tiles sharing a symbol with the one we just picked for.
      const nextPos = findNextEmptyPos(
        activePos,
        newGuesses,
        letterPositions,
        phrase,
        cipher
      );
      setActivePos(nextPos);
      if (nextPos === null) setDrawerOpen(false);
    },
    [
      activePos,
      symbolToLetter,
      phrase,
      letterPositions,
      cipher,
      symbolGuesses,
    ]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    const newGuesses = new Map(symbolGuesses);

    if (last.previousLetter) {
      newGuesses.set(last.symbol, last.previousLetter);
    } else {
      newGuesses.delete(last.symbol);
    }

    setSymbolGuesses(newGuesses);
    setHistory((h) => h.slice(0, -1));
    setUndosUsed((u) => u + 1);
    setActivePos(last.activePos);
  }, [history, symbolGuesses]);

  const handleHint = useCallback(() => {
    // Reveal one still-unrevealed letter by assigning its correct
    // letter to its cipher symbol — updates every tile with that
    // symbol in one shot.
    const candidates = uniqueLetters.filter((letter) => {
      const symbol = cipher.get(letter);
      return symbol ? symbolGuesses.get(symbol) !== letter : false;
    });
    if (candidates.length === 0) return;

    const pickLetter =
      candidates[Math.floor(Math.random() * candidates.length)];
    const pickSymbol = cipher.get(pickLetter);
    if (!pickSymbol) return;

    const prev = symbolGuesses.get(pickSymbol) ?? "";
    setHistory((h) => [
      ...h,
      { symbol: pickSymbol, previousLetter: prev, activePos },
    ]);

    const newGuesses = new Map(symbolGuesses);
    // Clear this letter if currently (incorrectly) assigned elsewhere.
    for (const [sym, lt] of newGuesses) {
      if (lt === pickLetter && sym !== pickSymbol) {
        newGuesses.delete(sym);
      }
    }
    newGuesses.set(pickSymbol, pickLetter);
    setSymbolGuesses(newGuesses);
    setHintsUsed((h) => h + 1);
  }, [uniqueLetters, cipher, symbolGuesses, activePos]);

  // --- render helpers -------------------------------------------
  const renderPhrase = () => {
    // Walk the phrase once, grouping into words. Letters become
    // tappable tiles; punctuation/digits/other non-letters render as
    // static glyphs so the word keeps its visual shape without
    // producing phantom tiles that break the N-letter structure.
    type Cell =
      | { kind: "tile"; phraseIdx: number; posIdx: number; letter: string }
      | { kind: "punct"; phraseIdx: number; ch: string };

    const words: Cell[][] = [];
    let currentWord: Cell[] = [];
    let posCounter = 0;

    for (let i = 0; i < phrase.length; i++) {
      const ch = phrase[i];
      if (ch === " ") {
        if (currentWord.length > 0) {
          words.push(currentWord);
          currentWord = [];
        }
      } else if (/[A-Z]/.test(ch)) {
        currentWord.push({
          kind: "tile",
          phraseIdx: i,
          posIdx: posCounter,
          letter: ch,
        });
        posCounter++;
      } else {
        currentWord.push({ kind: "punct", phraseIdx: i, ch });
      }
    }
    if (currentWord.length > 0) words.push(currentWord);

    return (
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-3 sm:gap-x-6 sm:gap-y-4">
        {words.map((word, wIdx) => (
          <div key={wIdx} className="flex items-end gap-0.5 sm:gap-1">
            {word.map((cell) => {
              if (cell.kind === "punct") {
                return (
                  <span
                    key={`p-${cell.phraseIdx}`}
                    className="h-14 sm:h-16 flex items-end pb-1 text-xl sm:text-2xl font-bold text-zinc-500 dark:text-zinc-400 select-none"
                  >
                    {cell.ch}
                  </span>
                );
              }
              const { posIdx, letter: correctLetter } = cell;
              const guessedLetter = guessAt(posIdx);
              const isCorrect = guessedLetter === correctLetter;
              const isActive = activePos === posIdx;
              const symbol = cipher.get(correctLetter) ?? "?";
              const isShaking = shakingSymbol === symbol;

              return (
                <button
                  key={`t-${posIdx}`}
                  onClick={() => handleBlankTap(posIdx)}
                  disabled={isCorrect}
                  className={`
                    relative flex flex-col items-center justify-end
                    w-8 h-14 sm:w-10 sm:h-16
                    rounded-lg border-2 transition-all duration-150
                    ${
                      isCorrect
                        ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-600"
                        : isActive
                          ? "border-coral-500 bg-coral-50 dark:bg-coral-950/30 dark:border-coral-400 ring-2 ring-coral-300 dark:ring-coral-700"
                          : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 hover:border-coral-300 dark:hover:border-coral-600"
                    }
                    ${isShaking ? "animate-shake" : ""}
                  `}
                >
                  <span className="text-xs sm:text-sm leading-none mt-1 select-none">
                    {symbol}
                  </span>
                  <span
                    className={`text-base sm:text-lg font-bold mb-1 ${
                      isCorrect
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
          Each letter has been replaced by a symbol. Crack the code and reveal
          the hidden Bible phrase!
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
  const solvedCount = uniqueLetters.filter((l) => {
    const s = cipher.get(l);
    return s ? symbolGuesses.get(s) === l : false;
  }).length;
  const totalUnique = uniqueLetters.length;

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
            width: `${totalUnique > 0 ? (solvedCount / totalUnique) * 100 : 0}%`,
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
              const isRevealed = symbolGuesses.get(symbol) === letter;

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
/*  Utility: find the next tile whose symbol isn't yet correctly       */
/*  resolved, skipping tiles that share a symbol with `current` (all   */
/*  such tiles already display the same guess).                        */
/* ------------------------------------------------------------------ */

function findNextEmptyPos(
  current: number,
  symbolGuesses: Map<string, string>,
  letterPositions: number[],
  phrase: string,
  cipher: Map<string, string>
): number | null {
  const total = letterPositions.length;
  if (total === 0) return null;
  const currentLetter = phrase[letterPositions[current]];
  const currentSymbol = cipher.get(currentLetter);

  for (let offset = 1; offset <= total; offset++) {
    const idx = (current + offset) % total;
    const correctLetter = phrase[letterPositions[idx]];
    const symbol = cipher.get(correctLetter);
    if (!symbol) continue;
    if (symbol === currentSymbol) continue;
    if (symbolGuesses.get(symbol) !== correctLetter) return idx;
  }
  return null;
}
