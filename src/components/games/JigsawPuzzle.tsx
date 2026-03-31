"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useGameSession } from "@/hooks/useGameSession";
import type { GameProps } from "@/app/(dashboard)/games/[slug]/page";
import Confetti from "@/components/Confetti";

/* ---------- Types ---------- */

type Difficulty = "2x2" | "3x3" | "4x4";

interface PuzzlePiece {
  /** Unique id for this piece */
  id: number;
  /** The row this piece belongs to on the solved board */
  correctRow: number;
  /** The column this piece belongs to on the solved board */
  correctCol: number;
}

interface BoardSlot {
  row: number;
  col: number;
  /** The piece currently placed here, or null if empty */
  pieceId: number | null;
}

/* ---------- Constants ---------- */

const GRID_SIZES: Record<Difficulty, number> = {
  "2x2": 2,
  "3x3": 3,
  "4x4": 4,
};

const SCORE_BASE: Record<Difficulty, number> = {
  "2x2": 100,
  "3x3": 300,
  "4x4": 600,
};

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; desc: string }[] = [
  { value: "2x2", label: "Easy (2x2)", desc: "4 pieces" },
  { value: "3x3", label: "Medium (3x3)", desc: "9 pieces" },
  { value: "4x4", label: "Hard (4x4)", desc: "16 pieces" },
];

/** CSS gradient used as a placeholder when no image URL is provided */
const PLACEHOLDER_GRADIENT =
  "linear-gradient(135deg, #FF8269 0%, #F3B840 25%, #75CFF0 50%, #AC94F4 75%, #FFD5B7 100%)";

/* ---------- Helpers ---------- */

function getDefaultDifficulty(ageGroup?: string): Difficulty {
  switch (ageGroup) {
    case "LITTLE_ONES":
      return "2x2";
    case "ADULT":
      return "4x4";
    default:
      return "3x3"; // YOUTH, FAMILY, undefined
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

/* ---------- Component ---------- */

export default function JigsawPuzzle({
  gameId,
  userId,
  contentPack,
  ageGroup,
  imageUrl,
}: GameProps & { imageUrl?: string }) {
  const { status, finalScore, startSession, endSession, reset } =
    useGameSession({ gameId, userId });

  /* --- Game state --- */
  const [difficulty, setDifficulty] = useState<Difficulty>(
    getDefaultDifficulty(ageGroup)
  );
  const [gridSize, setGridSize] = useState(3);
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [board, setBoard] = useState<BoardSlot[][]>([]);
  const [tray, setTray] = useState<number[]>([]); // piece ids still in the tray
  const [moves, setMoves] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [justPlacedId, setJustPlacedId] = useState<number | null>(null);
  const [selectedTrayPiece, setSelectedTrayPiece] = useState<number | null>(null);

  /* --- Image source --- */
  const resolvedImage = imageUrl || null;

  /* --- Refs --- */
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragPieceId = useRef<number | null>(null);
  const dragGhost = useRef<HTMLDivElement | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  /* --- Derived --- */
  const pieceMap = useRef<Map<number, PuzzlePiece>>(new Map());

  useEffect(() => {
    const m = new Map<number, PuzzlePiece>();
    pieces.forEach((p) => m.set(p.id, p));
    pieceMap.current = m;
  }, [pieces]);

  const cellSizePx = Math.max(60, Math.min(120, Math.floor(360 / gridSize)));
  const boardSizePx = cellSizePx * gridSize;

  /* --- Compute board completion --- */
  const isSolved = useCallback(() => {
    for (const row of board) {
      for (const slot of row) {
        if (slot.pieceId === null) return false;
        const piece = pieceMap.current.get(slot.pieceId);
        if (!piece) return false;
        if (piece.correctRow !== slot.row || piece.correctCol !== slot.col)
          return false;
      }
    }
    return board.length > 0;
  }, [board]);

  /* --- Start game --- */
  const startGame = useCallback(
    async (diff: Difficulty) => {
      const size = GRID_SIZES[diff];
      setDifficulty(diff);
      setGridSize(size);

      const newPieces: PuzzlePiece[] = [];
      let id = 0;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          newPieces.push({ id: id++, correctRow: r, correctCol: c });
        }
      }
      setPieces(newPieces);

      const emptyBoard: BoardSlot[][] = Array.from({ length: size }, (_, r) =>
        Array.from({ length: size }, (_, c) => ({ row: r, col: c, pieceId: null }))
      );
      setBoard(emptyBoard);

      setTray(shuffle(newPieces.map((p) => p.id)));
      setMoves(0);
      setTimeElapsed(0);
      setJustPlacedId(null);
      setSelectedTrayPiece(null);

      await startSession();
    },
    [startSession]
  );

  /* --- Timer --- */
  useEffect(() => {
    if (status === "playing") {
      timerRef.current = setInterval(() => setTimeElapsed((t) => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  /* --- Check completion after board changes --- */
  useEffect(() => {
    if (status !== "playing") return;
    if (tray.length > 0) return;
    if (!isSolved()) return;

    // Puzzle complete!
    if (timerRef.current) clearInterval(timerRef.current);
    const base = SCORE_BASE[difficulty];
    const timePenalty = Math.min(base * 0.5, timeElapsed * 2);
    const totalPieces = gridSize * gridSize;
    // Fewer moves = more bonus: if moves == totalPieces that's optimal
    const moveBonus = Math.max(0, (totalPieces * 2 - moves) * 5);
    const score = Math.max(10, Math.round(base - timePenalty + moveBonus));
    endSession(score);
  }, [board, tray, status, difficulty, gridSize, timeElapsed, moves, endSession, isSolved]);

  /* ---------- Placing a piece on the board ---------- */
  const placePiece = useCallback(
    (pieceId: number, targetRow: number, targetCol: number) => {
      setBoard((prev) => {
        // If the target cell already has a piece, send it back to the tray
        const existing = prev[targetRow][targetCol].pieceId;
        const next = prev.map((row) =>
          row.map((slot) => {
            if (slot.row === targetRow && slot.col === targetCol) {
              return { ...slot, pieceId };
            }
            // If this piece was already placed elsewhere on the board, clear it
            if (slot.pieceId === pieceId) {
              return { ...slot, pieceId: null };
            }
            return slot;
          })
        );

        // Manage tray
        setTray((prevTray) => {
          let newTray = prevTray.filter((id) => id !== pieceId);
          if (existing !== null && existing !== pieceId) {
            newTray = [...newTray, existing];
          }
          return newTray;
        });

        return next;
      });

      setMoves((m) => m + 1);

      // Check if correctly placed for the green flash
      const piece = pieceMap.current.get(pieceId);
      if (piece && piece.correctRow === targetRow && piece.correctCol === targetCol) {
        setJustPlacedId(pieceId);
        setTimeout(() => setJustPlacedId(null), 600);
      }

      setSelectedTrayPiece(null);
    },
    []
  );

  /* ---------- Board cell click (for tap-to-place) ---------- */
  const handleBoardCellClick = useCallback(
    (row: number, col: number) => {
      if (selectedTrayPiece === null) return;
      placePiece(selectedTrayPiece, row, col);
    },
    [selectedTrayPiece, placePiece]
  );

  /* ---------- Tray piece tap (for tap-to-place) ---------- */
  const handleTrayPieceTap = useCallback(
    (pieceId: number) => {
      setSelectedTrayPiece((prev) => (prev === pieceId ? null : pieceId));
    },
    []
  );

  /* ---------- Pointer-based drag & drop ---------- */
  const handlePiecePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, pieceId: number) => {
      // Prevent starting a drag from a piece that's already on the board
      // (only allow dragging from the tray for simplicity)
      if (!tray.includes(pieceId)) return;

      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      dragPieceId.current = pieceId;

      const rect = target.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      // Create a ghost element for dragging
      const ghost = document.createElement("div");
      ghost.style.position = "fixed";
      ghost.style.zIndex = "10000";
      ghost.style.pointerEvents = "none";
      ghost.style.width = `${cellSizePx}px`;
      ghost.style.height = `${cellSizePx}px`;
      ghost.style.borderRadius = "6px";
      ghost.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
      ghost.style.opacity = "0.9";
      ghost.style.left = `${e.clientX - dragOffset.current.x}px`;
      ghost.style.top = `${e.clientY - dragOffset.current.y}px`;
      ghost.style.transition = "none";

      // Render the piece image onto the ghost
      const piece = pieceMap.current.get(pieceId);
      if (piece) {
        if (resolvedImage) {
          ghost.style.backgroundImage = `url(${resolvedImage})`;
          ghost.style.backgroundSize = `${boardSizePx}px ${boardSizePx}px`;
          ghost.style.backgroundPosition = `-${piece.correctCol * cellSizePx}px -${piece.correctRow * cellSizePx}px`;
        } else {
          ghost.style.backgroundImage = PLACEHOLDER_GRADIENT;
          ghost.style.backgroundSize = `${boardSizePx}px ${boardSizePx}px`;
          ghost.style.backgroundPosition = `-${piece.correctCol * cellSizePx}px -${piece.correctRow * cellSizePx}px`;
        }
      }

      document.body.appendChild(ghost);
      dragGhost.current = ghost;

      // Visually hide the tray piece
      target.style.opacity = "0.3";

      e.preventDefault();
    },
    [tray, cellSizePx, boardSizePx, resolvedImage]
  );

  const handlePiecePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragPieceId.current === null || !dragGhost.current) return;
      dragGhost.current.style.left = `${e.clientX - dragOffset.current.x}px`;
      dragGhost.current.style.top = `${e.clientY - dragOffset.current.y}px`;
    },
    []
  );

  const handlePiecePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const pieceId = dragPieceId.current;
      if (pieceId === null) return;

      // Restore tray piece opacity
      e.currentTarget.style.opacity = "1";

      // Remove ghost
      if (dragGhost.current) {
        document.body.removeChild(dragGhost.current);
        dragGhost.current = null;
      }

      // Determine which board cell we're over
      const boardEl = boardRef.current;
      if (boardEl) {
        const boardRect = boardEl.getBoundingClientRect();
        const dropX = e.clientX - boardRect.left;
        const dropY = e.clientY - boardRect.top;

        // Snap threshold: 60% of cell size
        const snapThreshold = cellSizePx * 0.6;

        const col = Math.round(dropX / cellSizePx - 0.5);
        const row = Math.round(dropY / cellSizePx - 0.5);

        if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
          // Check if close enough to snap
          const cellCenterX = (col + 0.5) * cellSizePx;
          const cellCenterY = (row + 0.5) * cellSizePx;
          const pieceCenterX = dropX;
          const pieceCenterY = dropY;
          const dist = Math.sqrt(
            (cellCenterX - pieceCenterX) ** 2 +
              (cellCenterY - pieceCenterY) ** 2
          );

          if (dist < snapThreshold) {
            placePiece(pieceId, row, col);
          }
        }
      }

      dragPieceId.current = null;
    },
    [cellSizePx, gridSize, placePiece]
  );

  /* ---------- Render helpers ---------- */

  /** Returns style for a piece showing its portion of the image */
  const getPieceStyle = (piece: PuzzlePiece): React.CSSProperties => {
    const bgImage = resolvedImage
      ? `url(${resolvedImage})`
      : PLACEHOLDER_GRADIENT;

    return {
      width: cellSizePx,
      height: cellSizePx,
      backgroundImage: bgImage,
      backgroundSize: `${boardSizePx}px ${boardSizePx}px`,
      backgroundPosition: `-${piece.correctCol * cellSizePx}px -${piece.correctRow * cellSizePx}px`,
      backgroundRepeat: "no-repeat",
    };
  };

  /* ========== IDLE SCREEN ========== */
  if (status === "idle") {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Image Puzzle
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
          Drag the pieces to reassemble the image. Pick your difficulty and start
          puzzling!
        </p>

        {/* Difficulty selector */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDifficulty(opt.value)}
              className={`px-5 py-3 rounded-xl border-2 transition text-left sm:text-center ${
                difficulty === opt.value
                  ? "border-coral-500 bg-coral-50 dark:bg-coral-900/20 text-coral-700 dark:text-coral-300"
                  : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600"
              }`}
            >
              <span className="block font-semibold text-sm">{opt.label}</span>
              <span className="block text-xs opacity-70">{opt.desc}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => startGame(difficulty)}
          className="px-8 py-3 bg-coral-600 hover:bg-coral-700 text-white font-medium rounded-xl text-lg transition"
        >
          Start Game
        </button>
      </div>
    );
  }

  /* ========== FINISHED SCREEN ========== */
  if (status === "finished") {
    return (
      <>
        <Confetti active={status === "finished"} />
        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Puzzle Complete!
          </h1>

          {/* Show the solved image */}
          <div
            className="mx-auto mb-6 rounded-xl overflow-hidden shadow-lg"
            style={{
              width: boardSizePx,
              height: boardSizePx,
              backgroundImage: resolvedImage
                ? `url(${resolvedImage})`
                : PLACEHOLDER_GRADIENT,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-sm mx-auto mb-6">
            <p className="text-5xl font-bold text-coral-600 dark:text-coral-400 mb-4">
              {finalScore?.toLocaleString()}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Time: {formatTime(timeElapsed)} | {moves} moves |{" "}
              {difficulty.toUpperCase()}
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                reset();
                startGame(difficulty);
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

  /* ========== PLAYING SCREEN ========== */
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Image Puzzle
        </h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">
            {formatTime(timeElapsed)}
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            {moves} moves
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            {tray.length} left
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 mb-6">
        <div
          className="bg-coral-500 h-2 rounded-full transition-all duration-300"
          style={{
            width: `${((gridSize * gridSize - tray.length) / (gridSize * gridSize)) * 100}%`,
          }}
        />
      </div>

      {/* Board */}
      <div className="flex justify-center mb-6">
        <div
          ref={boardRef}
          className="relative rounded-xl shadow-lg overflow-hidden"
          style={{
            width: boardSizePx,
            height: boardSizePx,
          }}
        >
          {/* Ghost preview behind the grid */}
          <div
            className="absolute inset-0 rounded-xl"
            style={{
              backgroundImage: resolvedImage
                ? `url(${resolvedImage})`
                : PLACEHOLDER_GRADIENT,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.18,
            }}
          />

          {/* Grid cells */}
          <div
            className="relative"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${gridSize}, ${cellSizePx}px)`,
              gridTemplateRows: `repeat(${gridSize}, ${cellSizePx}px)`,
            }}
          >
            {board.flat().map((slot) => {
              const piece =
                slot.pieceId !== null
                  ? pieceMap.current.get(slot.pieceId)
                  : null;
              const isCorrect =
                piece !== null &&
                piece !== undefined &&
                piece.correctRow === slot.row &&
                piece.correctCol === slot.col;
              const isFlashing = slot.pieceId !== null && slot.pieceId === justPlacedId && isCorrect;
              const isSelectedTarget = selectedTrayPiece !== null && slot.pieceId === null;

              return (
                <div
                  key={`${slot.row}-${slot.col}`}
                  onClick={() => handleBoardCellClick(slot.row, slot.col)}
                  className={`relative border transition-all duration-200 ${
                    isFlashing
                      ? "border-green-400 dark:border-green-500 shadow-[inset_0_0_12px_rgba(74,222,128,0.4)]"
                      : "border-zinc-300/50 dark:border-zinc-600/50"
                  } ${
                    isSelectedTarget
                      ? "bg-coral-100/40 dark:bg-coral-800/20 cursor-pointer hover:bg-coral-200/50 dark:hover:bg-coral-700/30"
                      : ""
                  }`}
                  style={{
                    width: cellSizePx,
                    height: cellSizePx,
                  }}
                >
                  {piece && (
                    <div
                      className="absolute inset-0 rounded-sm"
                      style={getPieceStyle(piece)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tray */}
      <div className="bg-zinc-100 dark:bg-zinc-800/60 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 font-medium">
          Pieces ({tray.length} remaining)
          {selectedTrayPiece !== null && (
            <span className="ml-2 text-coral-600 dark:text-coral-400">
              — Tap a board cell to place
            </span>
          )}
        </p>
        <div
          className="flex gap-2 overflow-x-auto pb-2"
          style={{ minHeight: cellSizePx + 16 }}
        >
          {tray.map((pieceId) => {
            const piece = pieceMap.current.get(pieceId);
            if (!piece) return null;

            const isSelected = selectedTrayPiece === pieceId;

            return (
              <div
                key={pieceId}
                onClick={() => handleTrayPieceTap(pieceId)}
                onPointerDown={(e) => handlePiecePointerDown(e, pieceId)}
                onPointerMove={handlePiecePointerMove}
                onPointerUp={handlePiecePointerUp}
                className={`flex-shrink-0 rounded-md cursor-grab active:cursor-grabbing shadow-md hover:shadow-lg transition-shadow touch-none select-none ${
                  isSelected
                    ? "ring-3 ring-coral-500 dark:ring-coral-400 ring-offset-2 ring-offset-zinc-100 dark:ring-offset-zinc-800"
                    : ""
                }`}
                style={{
                  ...getPieceStyle(piece),
                  minWidth: cellSizePx,
                  minHeight: cellSizePx,
                }}
              />
            );
          })}
          {tray.length === 0 && (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 italic py-4">
              All pieces placed!
            </p>
          )}
        </div>
      </div>

      {/* Hint: tap mode instruction on touch devices */}
      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-3">
        Drag pieces onto the board, or tap a piece then tap a cell to place it.
      </p>
    </div>
  );
}
