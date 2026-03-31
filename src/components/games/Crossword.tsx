"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useGameSession } from "@/hooks/useGameSession";
import type { GameProps } from "@/app/(dashboard)/games/[slug]/page";
import Confetti from "@/components/Confetti";

type Props = GameProps;

/* ─── Types ─────────────────────────────────────────────────────────── */

type Dir = "across" | "down";

interface ClueEntry {
  number: number;
  word: string;
  clue: string;
  row: number;
  col: number;
  dir: Dir;
}

interface Cell {
  letter: string;
  clueNumbers: { across?: number; down?: number };
  /** true = part of a word slot */
  active: boolean;
}

/* ─── Built-in Word Banks ───────────────────────────────────────────── */

interface WordDef {
  word: string;
  clue: string;
}

const BANK_PEOPLE: WordDef[] = [
  { word: "ESTHER", clue: "Brave queen who saved her people" },
  { word: "PETER", clue: "Apostle who walked on water briefly" },
  { word: "NOAH", clue: "Builder of the ark" },
  { word: "PAUL", clue: "Wrote many letters to congregations" },
  { word: "MOSES", clue: "Led Israel out of Egypt" },
  { word: "RUTH", clue: "Loyal daughter-in-law of Naomi" },
  { word: "DAVID", clue: "Shepherd boy who defeated Goliath" },
  { word: "SARAH", clue: "Wife of Abraham and mother of Isaac" },
];

const BANK_ENCOURAGEMENT: WordDef[] = [
  { word: "HOPE", clue: "Confident expectation for the future" },
  { word: "LOVE", clue: "Greatest quality according to 1 Corinthians 13" },
  { word: "FAITH", clue: "Assured expectation of things not yet seen" },
  { word: "PRAY", clue: "Communicate with Jehovah" },
  { word: "BIBLE", clue: "God's inspired Word" },
  { word: "KIND", clue: "Showing consideration for others" },
  { word: "PEACE", clue: "A fruit of the spirit and a calm state" },
  { word: "JOY", clue: "Deep happiness from serving God" },
];

const WORD_BANKS = [BANK_PEOPLE, BANK_ENCOURAGEMENT];

/* ─── Crossword Grid Generator ──────────────────────────────────────── */

interface Placement {
  word: string;
  clue: string;
  row: number;
  col: number;
  dir: Dir;
}

/**
 * Generate a crossword layout from a list of word/clue pairs.
 * Uses constraint-based placement: each word after the first attempts
 * to cross an already-placed word on a shared letter.
 */
function generateCrossword(wordDefs: WordDef[]): {
  grid: Cell[][];
  clues: ClueEntry[];
  gridRows: number;
  gridCols: number;
} {
  // Sort words longest-first to maximise crossing opportunities
  const sorted = [...wordDefs]
    .map((wd) => ({
      word: wd.word.toUpperCase().replace(/[^A-Z]/g, ""),
      clue: wd.clue,
    }))
    .filter((wd) => wd.word.length >= 2)
    .sort((a, b) => b.word.length - a.word.length);

  if (sorted.length === 0) {
    return { grid: [], clues: [], gridRows: 0, gridCols: 0 };
  }

  const bestOf = (attempts: number): Placement[] => {
    let best: Placement[] = [];

    for (let attempt = 0; attempt < attempts; attempt++) {
      const placements = tryPlace(sorted);
      if (placements.length > best.length) {
        best = placements;
      }
      if (best.length === sorted.length) break;
    }
    return best;
  };

  const placements = bestOf(40);

  // Normalise coordinates so min row/col = 0
  if (placements.length === 0) {
    return { grid: [], clues: [], gridRows: 0, gridCols: 0 };
  }

  let minR = Infinity,
    minC = Infinity,
    maxR = -Infinity,
    maxC = -Infinity;

  for (const p of placements) {
    const endR = p.dir === "down" ? p.row + p.word.length - 1 : p.row;
    const endC = p.dir === "across" ? p.col + p.word.length - 1 : p.col;
    minR = Math.min(minR, p.row);
    minC = Math.min(minC, p.col);
    maxR = Math.max(maxR, endR);
    maxC = Math.max(maxC, endC);
  }

  const gridRows = maxR - minR + 1;
  const gridCols = maxC - minC + 1;

  // Shift placements
  for (const p of placements) {
    p.row -= minR;
    p.col -= minC;
  }

  // Build grid
  const grid: Cell[][] = Array.from({ length: gridRows }, () =>
    Array.from({ length: gridCols }, () => ({
      letter: "",
      clueNumbers: {},
      active: false,
    }))
  );

  // Assign clue numbers: sort placements by position (top-to-bottom, left-to-right)
  placements.sort((a, b) => a.row - b.row || a.col - b.col);

  let nextNum = 1;
  const numMap = new Map<string, number>(); // "row,col" -> number

  const clues: ClueEntry[] = [];

  for (const p of placements) {
    const key = `${p.row},${p.col}`;
    if (!numMap.has(key)) {
      numMap.set(key, nextNum++);
    }
    const num = numMap.get(key)!;

    clues.push({
      number: num,
      word: p.word,
      clue: p.clue,
      row: p.row,
      col: p.col,
      dir: p.dir,
    });

    for (let i = 0; i < p.word.length; i++) {
      const r = p.dir === "down" ? p.row + i : p.row;
      const c = p.dir === "across" ? p.col + i : p.col;
      grid[r][c].letter = p.word[i];
      grid[r][c].active = true;
      if (i === 0) {
        grid[r][c].clueNumbers[p.dir] = num;
      }
    }
  }

  return { grid, clues, gridRows, gridCols };
}

/**
 * Core placement algorithm. Places words one by one, trying to cross
 * previously-placed words. Returns the placements it managed.
 */
function tryPlace(words: { word: string; clue: string }[]): Placement[] {
  // Internal representation uses a sparse map for flexibility
  const occupied = new Map<string, string>(); // "r,c" -> letter
  const placements: Placement[] = [];

  const k = (r: number, c: number) => `${r},${c}`;

  const getCell = (r: number, c: number): string | undefined =>
    occupied.get(k(r, c));

  /**
   * Check if a word can be placed at (row, col) in the given direction.
   * Validates:
   *  1. Every cell is either empty or already holds the same letter (crossing)
   *  2. End-cap cells (before start and after end) are empty
   *  3. Adjacent cells (perpendicular neighbours of non-crossing cells)
   *     don't create unintended adjacency
   */
  const canPlace = (
    word: string,
    row: number,
    col: number,
    dir: Dir
  ): boolean => {
    const dr = dir === "down" ? 1 : 0;
    const dc = dir === "across" ? 1 : 0;

    // End-cap before start must be empty
    const beforeR = row - dr;
    const beforeC = col - dc;
    if (getCell(beforeR, beforeC) !== undefined) return false;

    // End-cap after end must be empty
    const afterR = row + dr * word.length;
    const afterC = col + dc * word.length;
    if (getCell(afterR, afterC) !== undefined) return false;

    let crossings = 0;

    for (let i = 0; i < word.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const existing = getCell(r, c);

      if (existing !== undefined) {
        if (existing !== word[i]) return false; // Letter conflict
        crossings++;
      } else {
        // Check perpendicular neighbours for non-crossing cells
        // For across words, check above and below
        // For down words, check left and right
        const perpDr = dir === "across" ? 1 : 0;
        const perpDc = dir === "down" ? 1 : 0;

        if (getCell(r + perpDr, c + perpDc) !== undefined) return false;
        if (getCell(r - perpDr, c - perpDc) !== undefined) return false;
      }
    }

    // The first word can have 0 crossings; subsequent words must cross at least once
    if (placements.length > 0 && crossings === 0) return false;

    return true;
  };

  const place = (word: string, clue: string, row: number, col: number, dir: Dir) => {
    const dr = dir === "down" ? 1 : 0;
    const dc = dir === "across" ? 1 : 0;
    for (let i = 0; i < word.length; i++) {
      occupied.set(k(row + dr * i, col + dc * i), word[i]);
    }
    placements.push({ word, clue, row, col, dir });
  };

  // Shuffle to introduce randomness for replayability
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Re-sort so longest comes first (better placement odds)
  shuffled.sort((a, b) => b.word.length - a.word.length);

  // Place first word at origin, across
  place(shuffled[0].word, shuffled[0].clue, 0, 0, "across");

  // Place remaining words
  for (let wi = 1; wi < shuffled.length; wi++) {
    const { word, clue } = shuffled[wi];
    let placed = false;

    // Try to find a crossing with an already-placed word
    // Iterate over every letter in the new word and every occupied cell
    const candidates: { row: number; col: number; dir: Dir; crossCount: number }[] = [];

    for (let li = 0; li < word.length; li++) {
      const letter = word[li];

      for (const p of placements) {
        for (let pi = 0; pi < p.word.length; pi++) {
          if (p.word[pi] !== letter) continue;

          // The crossing cell coordinates
          const cr = p.dir === "down" ? p.row + pi : p.row;
          const cc = p.dir === "across" ? p.col + pi : p.col;

          // New word goes in opposite direction
          const newDir: Dir = p.dir === "across" ? "down" : "across";
          const startRow = newDir === "down" ? cr - li : cr;
          const startCol = newDir === "across" ? cc - li : cc;

          if (canPlace(word, startRow, startCol, newDir)) {
            // Count how many crossings this placement achieves
            let crossCount = 0;
            const dr2 = newDir === "down" ? 1 : 0;
            const dc2 = newDir === "across" ? 1 : 0;
            for (let k2 = 0; k2 < word.length; k2++) {
              const existing = getCell(startRow + dr2 * k2, startCol + dc2 * k2);
              if (existing === word[k2]) crossCount++;
            }
            candidates.push({ row: startRow, col: startCol, dir: newDir, crossCount });
          }
        }
      }
    }

    if (candidates.length > 0) {
      // Prefer placements with more crossings
      candidates.sort((a, b) => b.crossCount - a.crossCount);
      // Take the best candidate (with some randomness among top candidates)
      const topCount = candidates[0].crossCount;
      const topCandidates = candidates.filter((c) => c.crossCount === topCount);
      const pick = topCandidates[Math.floor(Math.random() * topCandidates.length)];
      place(word, clue, pick.row, pick.col, pick.dir);
      placed = true;
    }

    if (!placed) {
      // Try placing without crossing as last resort (isolated)
      // We try positions around the existing grid
      for (let offset = 2; offset <= 10; offset++) {
        for (const dir of ["across", "down"] as Dir[]) {
          // Find bounding box of current placements
          let maxR = -Infinity, maxC = -Infinity;
          for (const [key2] of occupied) {
            const [r2, c2] = key2.split(",").map(Number);
            maxR = Math.max(maxR, r2);
            maxC = Math.max(maxC, c2);
          }
          const tryRow = dir === "down" ? 0 : maxR + offset;
          const tryCol = dir === "across" ? 0 : maxC + offset;

          if (canPlace(word, tryRow, tryCol, dir)) {
            place(word, clue, tryRow, tryCol, dir);
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
    }
  }

  return placements;
}

/* ─── Keyboard Layout ───────────────────────────────────────────────── */

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

/* ─── Component ─────────────────────────────────────────────────────── */

export default function Crossword({ gameId, userId, contentPack }: Props) {
  const { status, finalScore, startSession, endSession, reset } =
    useGameSession({ gameId, userId });

  const [grid, setGrid] = useState<Cell[][]>([]);
  const [clues, setClues] = useState<ClueEntry[]>([]);
  const [gridRows, setGridRows] = useState(0);
  const [gridCols, setGridCols] = useState(0);
  const [userLetters, setUserLetters] = useState<Map<string, string>>(new Map());
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [activeDir, setActiveDir] = useState<Dir>("across");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [wordsCompleted, setWordsCompleted] = useState<Set<string>>(new Set());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  /* ── Derive word definitions ────────────────────────────────────── */

  const wordDefs = useMemo<WordDef[]>(() => {
    if (contentPack?.vocabulary && contentPack.vocabulary.length >= 4) {
      return contentPack.vocabulary
        .slice(0, 12)
        .map((v) => {
          const upper = v.toUpperCase().replace(/[^A-Z]/g, "");
          return {
            word: upper,
            clue: generateSimpleClue(upper),
          };
        })
        .filter((wd) => wd.word.length >= 2);
    }
    // Pick a random built-in bank
    const bank = WORD_BANKS[Math.floor(Math.random() * WORD_BANKS.length)];
    return bank;
  }, [contentPack]);

  /* ── Start / timer ──────────────────────────────────────────────── */

  const startGame = useCallback(async () => {
    const result = generateCrossword(wordDefs);
    setGrid(result.grid);
    setClues(result.clues);
    setGridRows(result.gridRows);
    setGridCols(result.gridCols);
    setUserLetters(new Map());
    setSelectedCell(null);
    setActiveDir("across");
    setHintsUsed(0);
    setWordsCompleted(new Set());
    setTimeElapsed(0);
    await startSession();
  }, [wordDefs, startSession]);

  useEffect(() => {
    if (status === "playing") {
      timerRef.current = setInterval(() => setTimeElapsed((t) => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  /* ── Helpers ────────────────────────────────────────────────────── */

  const cellKey = (r: number, c: number) => `${r},${c}`;

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  /** Get the active clue for the currently selected cell + direction */
  const activeClue = useMemo<ClueEntry | null>(() => {
    if (!selectedCell) return null;
    const { row, col } = selectedCell;

    // Find the clue whose span covers this cell in the active direction
    for (const clue of clues) {
      if (clue.dir !== activeDir) continue;
      const dr = clue.dir === "down" ? 1 : 0;
      const dc = clue.dir === "across" ? 1 : 0;
      for (let i = 0; i < clue.word.length; i++) {
        if (clue.row + dr * i === row && clue.col + dc * i === col) {
          return clue;
        }
      }
    }
    // Fallback: try the other direction
    const otherDir: Dir = activeDir === "across" ? "down" : "across";
    for (const clue of clues) {
      if (clue.dir !== otherDir) continue;
      const dr = clue.dir === "down" ? 1 : 0;
      const dc = clue.dir === "across" ? 1 : 0;
      for (let i = 0; i < clue.word.length; i++) {
        if (clue.row + dr * i === row && clue.col + dc * i === col) {
          return clue;
        }
      }
    }
    return null;
  }, [selectedCell, activeDir, clues]);

  /** Cells belonging to the active clue */
  const activeClueCells = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    if (!activeClue) return s;
    const dr = activeClue.dir === "down" ? 1 : 0;
    const dc = activeClue.dir === "across" ? 1 : 0;
    for (let i = 0; i < activeClue.word.length; i++) {
      s.add(cellKey(activeClue.row + dr * i, activeClue.col + dc * i));
    }
    return s;
  }, [activeClue]);

  /** Check if a word is fully and correctly filled */
  const isWordComplete = useCallback(
    (clue: ClueEntry, letters: Map<string, string>): boolean => {
      const dr = clue.dir === "down" ? 1 : 0;
      const dc = clue.dir === "across" ? 1 : 0;
      for (let i = 0; i < clue.word.length; i++) {
        const key = cellKey(clue.row + dr * i, clue.col + dc * i);
        if (letters.get(key) !== clue.word[i]) return false;
      }
      return true;
    },
    []
  );

  /** Check all words and update completed set. Returns true if puzzle is done. */
  const checkCompletion = useCallback(
    (letters: Map<string, string>): boolean => {
      const completed = new Set<string>();
      for (const c of clues) {
        const wKey = `${c.number}-${c.dir}`;
        if (isWordComplete(c, letters)) {
          completed.add(wKey);
        }
      }
      setWordsCompleted(completed);
      return completed.size === clues.length;
    },
    [clues, isWordComplete]
  );

  /* ── Cell tap / click ───────────────────────────────────────────── */

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!grid[row]?.[col]?.active) return;

      if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
        // Tap same cell -> toggle direction
        setActiveDir((d) => (d === "across" ? "down" : "across"));
      } else {
        setSelectedCell({ row, col });
      }
    },
    [selectedCell, grid]
  );

  /* ── Advance to next cell in active direction ───────────────────── */

  const advanceCell = useCallback(
    (row: number, col: number, dir: Dir): { row: number; col: number } | null => {
      const dr = dir === "down" ? 1 : 0;
      const dc = dir === "across" ? 1 : 0;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < gridRows && nc >= 0 && nc < gridCols && grid[nr]?.[nc]?.active) {
        return { row: nr, col: nc };
      }
      return null;
    },
    [grid, gridRows, gridCols]
  );

  /* ── Letter input ───────────────────────────────────────────────── */

  const handleLetterInput = useCallback(
    (letter: string) => {
      if (!selectedCell) return;

      const key = cellKey(selectedCell.row, selectedCell.col);
      const next = new Map(userLetters);
      next.set(key, letter.toUpperCase());
      setUserLetters(next);

      const done = checkCompletion(next);
      if (done) {
        if (timerRef.current) clearInterval(timerRef.current);
        const wordPoints = clues.length * 150;
        const hintPenalty = hintsUsed * 30;
        const timeBonus = Math.max(0, 300 - timeElapsed) * 3;
        const score = Math.max(0, wordPoints - hintPenalty + timeBonus);
        endSession(score);
        return;
      }

      // Advance to next cell
      const nextCell = advanceCell(selectedCell.row, selectedCell.col, activeDir);
      if (nextCell) {
        setSelectedCell(nextCell);
      }
    },
    [selectedCell, userLetters, checkCompletion, clues.length, hintsUsed, timeElapsed, endSession, advanceCell, activeDir]
  );

  /* ── Backspace ──────────────────────────────────────────────────── */

  const handleBackspace = useCallback(() => {
    if (!selectedCell) return;
    const key = cellKey(selectedCell.row, selectedCell.col);
    const current = userLetters.get(key);

    if (current) {
      // Clear current cell
      const next = new Map(userLetters);
      next.delete(key);
      setUserLetters(next);
    } else {
      // Move back one cell
      const dr = activeDir === "down" ? 1 : 0;
      const dc = activeDir === "across" ? 1 : 0;
      const pr = selectedCell.row - dr;
      const pc = selectedCell.col - dc;
      if (pr >= 0 && pr < gridRows && pc >= 0 && pc < gridCols && grid[pr]?.[pc]?.active) {
        setSelectedCell({ row: pr, col: pc });
        const prevKey = cellKey(pr, pc);
        const next = new Map(userLetters);
        next.delete(prevKey);
        setUserLetters(next);
      }
    }
  }, [selectedCell, userLetters, activeDir, gridRows, gridCols, grid]);

  /* ── Physical keyboard ──────────────────────────────────────────── */

  useEffect(() => {
    if (status !== "playing") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        e.preventDefault();
        handleLetterInput(key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (selectedCell) {
          const nc = { row: selectedCell.row, col: selectedCell.col + 1 };
          if (nc.col < gridCols && grid[nc.row]?.[nc.col]?.active) {
            setSelectedCell(nc);
            setActiveDir("across");
          }
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (selectedCell) {
          const nc = { row: selectedCell.row, col: selectedCell.col - 1 };
          if (nc.col >= 0 && grid[nc.row]?.[nc.col]?.active) {
            setSelectedCell(nc);
            setActiveDir("across");
          }
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (selectedCell) {
          const nc = { row: selectedCell.row + 1, col: selectedCell.col };
          if (nc.row < gridRows && grid[nc.row]?.[nc.col]?.active) {
            setSelectedCell(nc);
            setActiveDir("down");
          }
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (selectedCell) {
          const nc = { row: selectedCell.row - 1, col: selectedCell.col };
          if (nc.row >= 0 && grid[nc.row]?.[nc.col]?.active) {
            setSelectedCell(nc);
            setActiveDir("down");
          }
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        setActiveDir((d) => (d === "across" ? "down" : "across"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, selectedCell, handleLetterInput, handleBackspace, grid, gridRows, gridCols]);

  /* ── Clue tap: jump to word ─────────────────────────────────────── */

  const handleClueTap = useCallback((clue: ClueEntry) => {
    setSelectedCell({ row: clue.row, col: clue.col });
    setActiveDir(clue.dir);
  }, []);

  /* ── Hint: reveal one letter ────────────────────────────────────── */

  const handleHint = useCallback(() => {
    if (!activeClue) return;

    const dr = activeClue.dir === "down" ? 1 : 0;
    const dc = activeClue.dir === "across" ? 1 : 0;
    const next = new Map(userLetters);

    // Find first empty or wrong cell in the active word
    for (let i = 0; i < activeClue.word.length; i++) {
      const key = cellKey(activeClue.row + dr * i, activeClue.col + dc * i);
      if (next.get(key) !== activeClue.word[i]) {
        next.set(key, activeClue.word[i]);
        setUserLetters(next);
        setHintsUsed((h) => h + 1);

        const done = checkCompletion(next);
        if (done) {
          if (timerRef.current) clearInterval(timerRef.current);
          const wordPoints = clues.length * 150;
          const hintPenalty = (hintsUsed + 1) * 30;
          const timeBonus = Math.max(0, 300 - timeElapsed) * 3;
          const score = Math.max(0, wordPoints - hintPenalty + timeBonus);
          endSession(score);
        }
        return;
      }
    }
  }, [activeClue, userLetters, checkCompletion, clues.length, hintsUsed, timeElapsed, endSession]);

  /* ── Clear word ─────────────────────────────────────────────────── */

  const handleClearWord = useCallback(() => {
    if (!activeClue) return;

    const dr = activeClue.dir === "down" ? 1 : 0;
    const dc = activeClue.dir === "across" ? 1 : 0;
    const next = new Map(userLetters);

    for (let i = 0; i < activeClue.word.length; i++) {
      const key = cellKey(activeClue.row + dr * i, activeClue.col + dc * i);
      next.delete(key);
    }

    setUserLetters(next);
    setSelectedCell({ row: activeClue.row, col: activeClue.col });
    checkCompletion(next);
  }, [activeClue, userLetters, checkCompletion]);

  /* ── Completed-word cell set (for green highlighting) ───────────── */

  const completedCells = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    for (const c of clues) {
      const wKey = `${c.number}-${c.dir}`;
      if (!wordsCompleted.has(wKey)) continue;
      const dr = c.dir === "down" ? 1 : 0;
      const dc = c.dir === "across" ? 1 : 0;
      for (let i = 0; i < c.word.length; i++) {
        s.add(cellKey(c.row + dr * i, c.col + dc * i));
      }
    }
    return s;
  }, [clues, wordsCompleted]);

  /* ── Clue lists ─────────────────────────────────────────────────── */

  const acrossClues = useMemo(
    () => clues.filter((c) => c.dir === "across").sort((a, b) => a.number - b.number),
    [clues]
  );

  const downClues = useMemo(
    () => clues.filter((c) => c.dir === "down").sort((a, b) => a.number - b.number),
    [clues]
  );

  /* ── Dynamic cell size ──────────────────────────────────────────── */

  const cellSize = useMemo(() => {
    // Aim for a grid that fits within ~360px on mobile
    if (gridCols === 0) return 36;
    const maxWidth = 360;
    const size = Math.floor(maxWidth / gridCols);
    return Math.max(28, Math.min(44, size));
  }, [gridCols]);

  /* ════════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════════ */

  // ─── Idle Screen ───
  if (status === "idle") {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Bible Crossword
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
          Fill in the crossword using Bible-themed words. Tap a clue to jump to
          it, use the keyboard to type, and try to use as few hints as possible!
        </p>
        <button
          onClick={startGame}
          className="px-8 py-3 bg-coral-600 hover:bg-coral-700 text-white font-medium rounded-xl text-lg transition"
        >
          Start Puzzle
        </button>
      </div>
    );
  }

  // ─── Finished Screen ───
  if (status === "finished") {
    return (
      <>
        <Confetti active={status === "finished"} />
        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Puzzle Complete!
          </h1>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-sm mx-auto mb-6">
            <p className="text-5xl font-bold text-coral-600 dark:text-coral-400 mb-4">
              {finalScore?.toLocaleString()}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Time: {formatTime(timeElapsed)} | Hints used: {hintsUsed}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {clues.length} words completed
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

  // ─── Playing Screen ───
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Bible Crossword
        </h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">
            {formatTime(timeElapsed)}
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            {wordsCompleted.size}/{clues.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
        <div
          className="bg-coral-500 h-2 rounded-full transition-all duration-300"
          style={{
            width: `${clues.length > 0 ? (wordsCompleted.size / clues.length) * 100 : 0}%`,
          }}
        />
      </div>

      {/* Active clue display */}
      {activeClue && (
        <div className="bg-coral-50 dark:bg-coral-950/30 border border-coral-200 dark:border-coral-800 rounded-lg px-4 py-2 text-sm">
          <span className="font-bold text-coral-700 dark:text-coral-300">
            {activeClue.number} {activeClue.dir === "across" ? "Across" : "Down"}:
          </span>{" "}
          <span className="text-coral-600 dark:text-coral-400">
            {activeClue.clue}
          </span>
        </div>
      )}

      {/* Crossword Grid */}
      <div className="overflow-x-auto pb-2" ref={gridContainerRef}>
        <div
          className="inline-grid gap-0.5 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${gridCols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${gridRows}, ${cellSize}px)`,
          }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              if (!cell.active) {
                return (
                  <div
                    key={cellKey(r, c)}
                    style={{ width: cellSize, height: cellSize }}
                  />
                );
              }

              const key = cellKey(r, c);
              const isSelected =
                selectedCell?.row === r && selectedCell?.col === c;
              const isInActiveWord = activeClueCells.has(key);
              const isCompleted = completedCells.has(key);
              const userLetter = userLetters.get(key) ?? "";

              // Determine which clue number to show
              const clueNum =
                cell.clueNumbers.across ?? cell.clueNumbers.down;

              let bgClass: string;
              if (isSelected) {
                bgClass =
                  "bg-coral-300 dark:bg-coral-700 ring-2 ring-coral-500";
              } else if (isCompleted) {
                bgClass =
                  "bg-emerald-100 dark:bg-emerald-900/40";
              } else if (isInActiveWord) {
                bgClass =
                  "bg-coral-100 dark:bg-coral-900/30";
              } else {
                bgClass =
                  "bg-white dark:bg-zinc-900";
              }

              return (
                <div
                  key={key}
                  onClick={() => handleCellClick(r, c)}
                  className={`relative flex items-center justify-center cursor-pointer select-none
                    border border-zinc-300 dark:border-zinc-600 rounded-md transition-colors
                    ${bgClass}`}
                  style={{ width: cellSize, height: cellSize }}
                >
                  {/* Clue number */}
                  {clueNum !== undefined && (
                    <span
                      className="absolute text-zinc-400 dark:text-zinc-500 font-medium leading-none"
                      style={{
                        fontSize: Math.max(8, cellSize * 0.25),
                        top: 1,
                        left: 2,
                      }}
                    >
                      {clueNum}
                    </span>
                  )}
                  {/* User letter */}
                  <span
                    className={`font-bold ${
                      isCompleted
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-zinc-800 dark:text-zinc-100"
                    }`}
                    style={{ fontSize: Math.max(14, cellSize * 0.5) }}
                  >
                    {userLetter}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={handleHint}
          disabled={!activeClue}
          className="px-4 py-2 text-sm font-medium bg-golden-100 dark:bg-golden-900/30 text-golden-700 dark:text-golden-300 rounded-lg hover:bg-golden-200 dark:hover:bg-golden-900/50 disabled:opacity-40 transition"
        >
          Hint ({hintsUsed})
        </button>
        <button
          onClick={handleClearWord}
          disabled={!activeClue}
          className="px-4 py-2 text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 transition"
        >
          Clear Word
        </button>
        <button
          onClick={() => setActiveDir((d) => (d === "across" ? "down" : "across"))}
          className="px-4 py-2 text-sm font-medium bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-lg hover:bg-sky-200 dark:hover:bg-sky-900/50 transition"
        >
          {activeDir === "across" ? "Across >" : "Down v"}
        </button>
      </div>

      {/* Clue Lists */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Across */}
        <div>
          <h3 className="font-bold text-sm text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">
            Across
          </h3>
          <ul className="space-y-1">
            {acrossClues.map((c) => {
              const wKey = `${c.number}-${c.dir}`;
              const done = wordsCompleted.has(wKey);
              const isActive =
                activeClue?.number === c.number && activeClue?.dir === c.dir;

              return (
                <li
                  key={wKey}
                  onClick={() => handleClueTap(c)}
                  className={`text-sm cursor-pointer rounded-md px-2 py-1.5 transition-colors ${
                    done
                      ? "line-through text-zinc-400 dark:text-zinc-600"
                      : isActive
                        ? "bg-coral-100 dark:bg-coral-900/30 text-coral-700 dark:text-coral-300"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className="font-bold mr-1">{c.number}.</span>
                  {c.clue}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Down */}
        <div>
          <h3 className="font-bold text-sm text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">
            Down
          </h3>
          <ul className="space-y-1">
            {downClues.map((c) => {
              const wKey = `${c.number}-${c.dir}`;
              const done = wordsCompleted.has(wKey);
              const isActive =
                activeClue?.number === c.number && activeClue?.dir === c.dir;

              return (
                <li
                  key={wKey}
                  onClick={() => handleClueTap(c)}
                  className={`text-sm cursor-pointer rounded-md px-2 py-1.5 transition-colors ${
                    done
                      ? "line-through text-zinc-400 dark:text-zinc-600"
                      : isActive
                        ? "bg-coral-100 dark:bg-coral-900/30 text-coral-700 dark:text-coral-300"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className="font-bold mr-1">{c.number}.</span>
                  {c.clue}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* On-screen keyboard */}
      <div className="mt-2 space-y-1.5">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1">
            {ri === 2 && (
              <button
                onClick={handleBackspace}
                className="h-10 px-3 text-xs font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition active:scale-95"
              >
                DEL
              </button>
            )}
            {row.map((letter) => (
              <button
                key={letter}
                onClick={() => handleLetterInput(letter)}
                className="h-10 w-8 sm:w-9 text-sm font-bold bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200
                  border border-zinc-300 dark:border-zinc-600 rounded-lg
                  hover:bg-coral-50 dark:hover:bg-coral-900/20
                  active:bg-coral-200 dark:active:bg-coral-800 active:scale-95 transition"
              >
                {letter}
              </button>
            ))}
            {ri === 2 && (
              <button
                onClick={() => setActiveDir((d) => (d === "across" ? "down" : "across"))}
                className="h-10 px-2 text-xs font-medium bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-lg hover:bg-sky-200 dark:hover:bg-sky-900/50 transition active:scale-95"
              >
                {activeDir === "across" ? "ACR" : "DWN"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Utility: generate a simple clue from a word ───────────────────── */

function generateSimpleClue(word: string): string {
  const upper = word.toUpperCase();
  const len = upper.length;

  // Show first and last letter with blanks
  if (len <= 3) {
    return `${upper[0]}${"_".repeat(len - 1)} (${len} letters)`;
  }

  return `Starts with "${upper[0]}", ends with "${upper[len - 1]}" (${len} letters)`;
}
