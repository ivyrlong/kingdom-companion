"use client";

/**
 * MeetingMaze — a fresh maze per meeting week, seeded by pack id so
 * everyone playing this week's meeting solves the same maze (and it
 * changes deterministically next week).
 *
 * Age-tiered sizing:
 *   • Little Ones — 6×6 (solvable in <30 seconds)
 *   • Youth       — 12×12
 *   • Adult/Fam   — 15×15 (mild challenge, still under a minute)
 *
 * Controls: arrow keys, WASD, and swipe on touchscreens. Player moves
 * one cell per key press / swipe; walls block; reaching the end cell
 * fires a confetti burst.
 *
 * Content tie-in: start and end labels come from pack.themes[0] and
 * pack.keyPeople[0] when available, so the maze feels like part of the
 * week's material even though the maze layout itself is purely
 * geometric.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Confetti from "@/components/Confetti";
import { canMove, generateMaze, hashSeed, type Maze } from "@/lib/maze";
import type { GameProps } from "@/components/games/registry";

// ── Size per age group ────────────────────────────────────────────────

const SIZE: Record<string, number> = {
  LITTLE_ONES: 6,
  YOUTH: 12,
  FAMILY: 12,
  ADULT: 15,
};

// ── SVG geometry constants ────────────────────────────────────────────

const CELL_PX = 32;
const WALL_STROKE = 3;

export default function MeetingMaze({
  gameId,
  ageGroup,
  contentPack,
  contentPackTitle,
}: GameProps) {
  const size = SIZE[ageGroup ?? "FAMILY"] ?? 12;

  // Seed choice: pack title + gameId → same maze for everyone this week,
  // fresh maze next week. Fallback to gameId alone when running the
  // game standalone (no pack).
  const seedStr = `${contentPackTitle ?? "no-pack"}::${gameId}`;
  const seed = useMemo(() => hashSeed(seedStr), [seedStr]);

  const [maze, setMaze] = useState<Maze>(() => generateMaze(size, size, seed));
  useEffect(() => {
    // Regenerate if inputs change (age-group swap, pack swap).
    setMaze(generateMaze(size, size, seed));
    setPos({ x: 0, y: 0 });
    setSolved(false);
  }, [size, seed]);

  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [solved, setSolved] = useState(false);

  const startLabel =
    (contentPack?.themes?.[0] || "Start").toString().slice(0, 16);
  const endLabel =
    (contentPack?.keyPeople?.[0] ||
      contentPack?.themes?.[1] ||
      "Finish").toString().slice(0, 16);

  // ── Movement ────────────────────────────────────────────────────────

  const move = useCallback(
    (dir: "n" | "e" | "s" | "w") => {
      if (solved) return;
      setPos((prev) => {
        if (!canMove(maze, prev.x, prev.y, dir)) return prev;
        const dx = dir === "e" ? 1 : dir === "w" ? -1 : 0;
        const dy = dir === "s" ? 1 : dir === "n" ? -1 : 0;
        const next = { x: prev.x + dx, y: prev.y + dy };
        if (next.x === maze.end.x && next.y === maze.end.y) {
          setSolved(true);
        }
        return next;
      });
    },
    [maze, solved],
  );

  // Keyboard input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "w") { move("n"); e.preventDefault(); }
      else if (k === "arrowright" || k === "d") { move("e"); e.preventDefault(); }
      else if (k === "arrowdown" || k === "s") { move("s"); e.preventDefault(); }
      else if (k === "arrowleft" || k === "a") { move("w"); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  // Touch/swipe input — 20px minimum, dominant axis wins.
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const THRESH = 20;
    if (Math.abs(dx) < THRESH && Math.abs(dy) < THRESH) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? "e" : "w");
    } else {
      move(dy > 0 ? "s" : "n");
    }
  };

  const reset = () => {
    setPos({ x: 0, y: 0 });
    setSolved(false);
  };

  // ── Render ──────────────────────────────────────────────────────────

  const svgSize = size * CELL_PX + WALL_STROKE;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
        Meeting Maze
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        {solved
          ? `You made it! 🎉 From ${startLabel} to ${endLabel}.`
          : `Guide your dot from ${startLabel} to ${endLabel}. Arrow keys, WASD, or swipe.`}
      </p>

      <Confetti active={solved} duration={2000} count={80} />

      <div
        className="mx-auto touch-none select-none inline-block"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <svg
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="bg-white dark:bg-zinc-900 rounded-lg shadow-inner border border-zinc-200 dark:border-zinc-800"
          role="img"
          aria-label="Maze puzzle"
        >
          {/* Start (green) and end (coral) cells */}
          <rect
            x={maze.start.x * CELL_PX + WALL_STROKE / 2}
            y={maze.start.y * CELL_PX + WALL_STROKE / 2}
            width={CELL_PX}
            height={CELL_PX}
            fill="rgba(16, 185, 129, 0.18)"
          />
          <rect
            x={maze.end.x * CELL_PX + WALL_STROKE / 2}
            y={maze.end.y * CELL_PX + WALL_STROKE / 2}
            width={CELL_PX}
            height={CELL_PX}
            fill="rgba(244, 114, 89, 0.28)"
          />

          {/* Walls */}
          <g
            stroke="currentColor"
            strokeWidth={WALL_STROKE}
            strokeLinecap="round"
            className="text-zinc-700 dark:text-zinc-300"
          >
            {maze.cells.map((c) => {
              const x0 = c.x * CELL_PX + WALL_STROKE / 2;
              const y0 = c.y * CELL_PX + WALL_STROKE / 2;
              const x1 = x0 + CELL_PX;
              const y1 = y0 + CELL_PX;
              return (
                <g key={`${c.x},${c.y}`}>
                  {c.walls.n && <line x1={x0} y1={y0} x2={x1} y2={y0} />}
                  {c.walls.e && <line x1={x1} y1={y0} x2={x1} y2={y1} />}
                  {c.walls.s && <line x1={x0} y1={y1} x2={x1} y2={y1} />}
                  {c.walls.w && <line x1={x0} y1={y0} x2={x0} y2={y1} />}
                </g>
              );
            })}
          </g>

          {/* Player token */}
          <circle
            cx={pos.x * CELL_PX + CELL_PX / 2 + WALL_STROKE / 2}
            cy={pos.y * CELL_PX + CELL_PX / 2 + WALL_STROKE / 2}
            r={CELL_PX / 3}
            className="fill-coral-500"
            style={{
              transition: "cx 120ms ease-out, cy 120ms ease-out",
            }}
          />

          {/* End flag */}
          <text
            x={maze.end.x * CELL_PX + CELL_PX / 2 + WALL_STROKE / 2}
            y={maze.end.y * CELL_PX + CELL_PX / 2 + WALL_STROKE / 2 + 5}
            textAnchor="middle"
            fontSize={CELL_PX * 0.6}
            className="fill-coral-700 dark:fill-coral-300 pointer-events-none"
          >
            ★
          </text>
        </svg>
      </div>

      {/* Direction pad — visible on touch devices, useful on desktop too. */}
      <div className="mt-4 flex justify-center">
        <div className="grid grid-cols-3 gap-1 w-40">
          <div />
          <button
            onClick={() => move("n")}
            aria-label="Up"
            className="aspect-square rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-lg"
          >
            ↑
          </button>
          <div />
          <button
            onClick={() => move("w")}
            aria-label="Left"
            className="aspect-square rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-lg"
          >
            ←
          </button>
          <button
            onClick={reset}
            aria-label="Reset"
            className="aspect-square rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-sm"
          >
            ↻
          </button>
          <button
            onClick={() => move("e")}
            aria-label="Right"
            className="aspect-square rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-lg"
          >
            →
          </button>
          <div />
          <button
            onClick={() => move("s")}
            aria-label="Down"
            className="aspect-square rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-lg"
          >
            ↓
          </button>
          <div />
        </div>
      </div>
    </div>
  );
}
