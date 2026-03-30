"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useGameSession } from "@/hooks/useGameSession";
import type { GameProps } from "@/app/(dashboard)/games/[slug]/page";

type Props = GameProps;

type Direction = [number, number];
const DIRECTIONS: Direction[] = [
  [0, 1],   // right
  [1, 0],   // down
  [1, 1],   // diagonal down-right
  [-1, 1],  // diagonal up-right
  [0, -1],  // left
  [-1, 0],  // up
  [-1, -1], // diagonal up-left
  [1, -1],  // diagonal down-left
];

const DEFAULT_WORDS = [
  "JEHOVAH", "KINGDOM", "FAITH", "PRAYER", "BIBLE",
  "LOVE", "HOPE", "SPIRIT", "GRACE", "PEACE",
  "TRUTH", "MERCY", "PRAISE", "GLORY", "JOY",
];

interface PlacedWord {
  word: string;
  startRow: number;
  startCol: number;
  direction: Direction;
}

function generateGrid(
  words: string[],
  size: number
): { grid: string[][]; placed: PlacedWord[] } {
  const grid: string[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "")
  );
  const placed: PlacedWord[] = [];

  const sortedWords = [...words]
    .map((w) => w.toUpperCase().replace(/[^A-Z]/g, ""))
    .filter((w) => w.length > 0 && w.length <= size)
    .sort((a, b) => b.length - a.length);

  for (const word of sortedWords) {
    let attempts = 0;
    let didPlace = false;

    while (attempts < 100 && !didPlace) {
      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const maxRow = size - (dir[0] === 1 ? word.length : dir[0] === -1 ? 0 : 0);
      const minRow = dir[0] === -1 ? word.length - 1 : 0;
      const maxCol = size - (dir[1] === 1 ? word.length : dir[1] === -1 ? 0 : 0);
      const minCol = dir[1] === -1 ? word.length - 1 : 0;

      if (minRow > maxRow || minCol > maxCol) {
        attempts++;
        continue;
      }

      const startRow = minRow + Math.floor(Math.random() * (maxRow - minRow + 1));
      const startCol = minCol + Math.floor(Math.random() * (maxCol - minCol + 1));

      let canPlace = true;
      for (let i = 0; i < word.length; i++) {
        const r = startRow + dir[0] * i;
        const c = startCol + dir[1] * i;
        if (r < 0 || r >= size || c < 0 || c >= size) {
          canPlace = false;
          break;
        }
        if (grid[r][c] !== "" && grid[r][c] !== word[i]) {
          canPlace = false;
          break;
        }
      }

      if (canPlace) {
        for (let i = 0; i < word.length; i++) {
          grid[startRow + dir[0] * i][startCol + dir[1] * i] = word[i];
        }
        placed.push({ word, startRow, startCol, direction: dir });
        didPlace = true;
      }
      attempts++;
    }
  }

  // Fill empty cells with random letters
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === "") {
        grid[r][c] = ALPHABET[Math.floor(Math.random() * 26)];
      }
    }
  }

  return { grid, placed };
}

export default function BibleWordSearch({ gameId, userId, contentPack }: Props) {
  const { status, finalScore, startSession, endSession, reset } =
    useGameSession({ gameId, userId });

  const [grid, setGrid] = useState<string[][]>([]);
  const [placedWords, setPlacedWords] = useState<PlacedWord[]>([]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [selectedCells, setSelectedCells] = useState<[number, number][]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const startGame = useCallback(async () => {
    const words =
      contentPack?.vocabulary && contentPack.vocabulary.length >= 5
        ? contentPack.vocabulary.slice(0, 12)
        : DEFAULT_WORDS.slice(0, 10);

    const size = Math.max(10, Math.ceil(Math.sqrt(words.join("").length * 3)));
    const { grid: newGrid, placed } = generateGrid(words, size);

    setGrid(newGrid);
    setPlacedWords(placed);
    setFoundWords(new Set());
    setSelectedCells([]);
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

  const getCellKey = (r: number, c: number) => `${r},${c}`;

  const getSelectedWord = useCallback(
    (cells: [number, number][]) => {
      return cells.map(([r, c]) => grid[r]?.[c] ?? "").join("");
    },
    [grid]
  );

  const checkSelection = useCallback(
    (cells: [number, number][]) => {
      const word = getSelectedWord(cells);
      const reversed = [...word].reverse().join("");

      for (const pw of placedWords) {
        if (
          (pw.word === word || pw.word === reversed) &&
          !foundWords.has(pw.word)
        ) {
          const newFound = new Set(foundWords);
          newFound.add(pw.word);
          setFoundWords(newFound);

          if (newFound.size === placedWords.length) {
            if (timerRef.current) clearInterval(timerRef.current);
            const timeBonus = Math.max(0, 180 - timeElapsed) * 5;
            const wordPoints = placedWords.length * 100;
            endSession(wordPoints + timeBonus);
          }
          return true;
        }
      }
      return false;
    },
    [getSelectedWord, placedWords, foundWords, timeElapsed, endSession]
  );

  const handleCellMouseDown = (r: number, c: number) => {
    setIsSelecting(true);
    setSelectedCells([[r, c]]);
  };

  const handleCellMouseEnter = (r: number, c: number) => {
    if (!isSelecting) return;
    const start = selectedCells[0];
    if (!start) return;

    // Build a straight line from start to current
    const dr = Math.sign(r - start[0]);
    const dc = Math.sign(c - start[1]);
    const dist = Math.max(Math.abs(r - start[0]), Math.abs(c - start[1]));

    // Only allow straight lines (horizontal, vertical, diagonal)
    const isDiagonal = Math.abs(r - start[0]) === Math.abs(c - start[1]);
    const isStraight = r === start[0] || c === start[1] || isDiagonal;
    if (!isStraight) return;

    const cells: [number, number][] = [];
    for (let i = 0; i <= dist; i++) {
      cells.push([start[0] + dr * i, start[1] + dc * i]);
    }
    setSelectedCells(cells);
  };

  const handleMouseUp = () => {
    if (isSelecting && selectedCells.length > 1) {
      checkSelection(selectedCells);
    }
    setIsSelecting(false);
    setSelectedCells([]);
  };

  const selectedSet = new Set(selectedCells.map(([r, c]) => getCellKey(r, c)));

  // Get all cells that are part of found words for highlighting
  const foundCellSet = new Set<string>();
  for (const pw of placedWords) {
    if (foundWords.has(pw.word)) {
      for (let i = 0; i < pw.word.length; i++) {
        foundCellSet.add(
          getCellKey(
            pw.startRow + pw.direction[0] * i,
            pw.startCol + pw.direction[1] * i
          )
        );
      }
    }
  }

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // Start screen
  if (status === "idle") {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Bible Word Search
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
          Find all the hidden words in the grid. Click and drag to select letters.
        </p>
        <button
          onClick={startGame}
          className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl text-lg transition"
        >
          Start Game
        </button>
      </div>
    );
  }

  // Finished screen
  if (status === "finished") {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          All Words Found!
        </h1>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-sm mx-auto mb-6">
          <p className="text-5xl font-bold text-teal-600 dark:text-teal-400 mb-4">
            {finalScore?.toLocaleString()}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Time: {formatTime(timeElapsed)} | {placedWords.length} words found
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { reset(); startGame(); }}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition"
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
    );
  }

  // Playing screen
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Bible Word Search
        </h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">{formatTime(timeElapsed)}</span>
          <span className="text-zinc-500 dark:text-zinc-400">
            {foundWords.size}/{placedWords.length} words
          </span>
        </div>
      </div>

      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 mb-4">
        <div
          className="bg-teal-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(foundWords.size / placedWords.length) * 100}%` }}
        />
      </div>

      {/* Word list */}
      <div className="flex flex-wrap gap-2 mb-4">
        {placedWords.map((pw) => (
          <span
            key={pw.word}
            className={`px-2 py-1 rounded text-xs font-medium ${
              foundWords.has(pw.word)
                ? "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 line-through"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {pw.word}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        className="inline-grid gap-0 select-none"
        style={{ gridTemplateColumns: `repeat(${grid[0]?.length ?? 0}, 1fr)` }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const key = getCellKey(r, c);
            const isSelected = selectedSet.has(key);
            const isFound = foundCellSet.has(key);

            return (
              <div
                key={key}
                onMouseDown={() => handleCellMouseDown(r, c)}
                onMouseEnter={() => handleCellMouseEnter(r, c)}
                className={`w-8 h-8 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors ${
                  isFound
                    ? "bg-teal-200 dark:bg-teal-800 text-teal-800 dark:text-teal-200"
                    : isSelected
                      ? "bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100"
                      : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                } border border-zinc-200 dark:border-zinc-700`}
              >
                {cell}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
