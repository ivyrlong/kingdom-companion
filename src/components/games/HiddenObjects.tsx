"use client";

/**
 * HiddenObjects — a "find the hidden things" game generated from the
 * existing Scene + Sticker libraries. No admin authoring needed;
 * every round is procedurally generated:
 *   - random scene backdrop
 *   - ~30 stickers placed at varied scales, rotations, tints, and
 *     overlaps (any sticker can peek from behind another — that's
 *     just z-order)
 *   - 10 target items, some "find 3 of X" for the count-hunt variant
 *
 * Tap a placement to find it. Right sticker = flash + tick off,
 * requiredCount ratchets down. Wrong sticker = brief red flash on
 * the placement (no score penalty — this game is playful).
 *
 * "New puzzle" fully re-rolls (fresh scene + fresh placements + fresh
 * targets).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  generatePuzzle,
  type Placement,
  type StickerLite,
  type Target,
} from "@/lib/hidden-objects-generator";

// ── Types (matches the /api/scenes and /api/stickers response shape) ──

interface SceneLite {
  id: string;
  slug: string;
  name: string;
  path: string;
  moodTags: string[];
  paletteAccent: string | null;
}

// ── Constants ────────────────────────────────────────────────────────

const BASE_STICKER_WIDTH_PCT = 0.10; // 10% of canvas width at scale 1

// ── Utils ────────────────────────────────────────────────────────────

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Component ────────────────────────────────────────────────────────

interface Round {
  scene: SceneLite;
  placements: Placement[];
  targets: Target[];
}

export default function HiddenObjects() {
  const [scenes, setScenes] = useState<SceneLite[]>([]);
  const [stickers, setStickers] = useState<StickerLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [round, setRound] = useState<Round | null>(null);
  const [foundCounts, setFoundCounts] = useState<Record<string, number>>({});
  const [wrongFlashIds, setWrongFlashIds] = useState<Set<string>>(new Set());
  const [tappedPlacementIds, setTappedPlacementIds] = useState<Set<string>>(new Set());

  // Sticker slug → StickerLite (for icon paths on found stickers, etc.)
  const stickerBySlug = useMemo(() => {
    const m = new Map<string, StickerLite>();
    for (const s of stickers) m.set(s.slug, s);
    return m;
  }, [stickers]);

  useEffect(() => {
    (async () => {
      try {
        const [sceneRes, stickerRes] = await Promise.all([
          fetch("/api/scenes"),
          fetch("/api/stickers"),
        ]);
        if (!sceneRes.ok || !stickerRes.ok) {
          setLoadError("Could not load scenes or stickers.");
          setLoading(false);
          return;
        }
        const sceneList: SceneLite[] = await sceneRes.json();
        const stickerList: StickerLite[] = await stickerRes.json();
        setScenes(sceneList);
        setStickers(stickerList);
        setLoading(false);
      } catch {
        setLoadError("Network error loading game.");
        setLoading(false);
      }
    })();
  }, []);

  // Once we've loaded scenes and stickers, roll the first round.
  useEffect(() => {
    if (scenes.length > 0 && stickers.length > 0 && !round) {
      setRound(buildRound(scenes, stickers));
    }
  }, [scenes, stickers, round]);

  const newRound = useCallback(() => {
    setRound(buildRound(scenes, stickers));
    setFoundCounts({});
    setWrongFlashIds(new Set());
    setTappedPlacementIds(new Set());
  }, [scenes, stickers]);

  const allDone = useMemo(() => {
    if (!round) return false;
    return round.targets.every(
      (t) => (foundCounts[t.slug] ?? 0) >= t.requiredCount,
    );
  }, [round, foundCounts]);

  const onPlacementTap = (placement: Placement) => {
    if (!round) return;
    if (tappedPlacementIds.has(placement.id)) return; // already cleared
    const target = round.targets.find((t) => t.slug === placement.stickerSlug);
    if (!target) {
      // Wrong slug entirely — brief red flash, sticker stays put.
      flashWrong(placement.id);
      return;
    }
    const currentCount = foundCounts[target.slug] ?? 0;
    const stillNeeded = currentCount < target.requiredCount;
    // Either way (still needed OR extra copy of a fully-found target),
    // the placement clears — extras served their camouflage job and
    // clearing them reveals whatever is behind so trickier targets
    // become reachable.
    if (stillNeeded) {
      setFoundCounts((cur) => ({
        ...cur,
        [target.slug]: (cur[target.slug] ?? 0) + 1,
      }));
    }
    setTappedPlacementIds((cur) => {
      const next = new Set(cur);
      next.add(placement.id);
      return next;
    });
  };

  const flashWrong = (id: string) => {
    setWrongFlashIds((cur) => {
      const next = new Set(cur);
      next.add(id);
      return next;
    });
    setTimeout(() => {
      setWrongFlashIds((cur) => {
        const next = new Set(cur);
        next.delete(id);
        return next;
      });
    }, 500);
  };

  // ── Render ──────────────────────────────────────────────────────

  if (loading) {
    return <p className="text-zinc-500 dark:text-zinc-400">Loading game…</p>;
  }
  if (loadError) {
    return (
      <p className="text-rose-600 dark:text-rose-400">{loadError}</p>
    );
  }
  if (scenes.length === 0 || stickers.length === 0) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">
        Need at least one scene and one sticker to play. Ask an admin to upload
        some at <code>/admin/scenes</code> and <code>/admin/stickers</code>.
      </p>
    );
  }
  if (!round) {
    return <p className="text-zinc-500 dark:text-zinc-400">Preparing puzzle…</p>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Find the Hidden Things
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Scene: <span className="font-medium">{round.scene.name}</span>
          </p>
        </div>
        <button
          onClick={newRound}
          className="px-4 py-2 bg-coral-600 hover:bg-coral-700 text-white text-sm font-medium rounded-lg transition"
        >
          🔀 New puzzle
        </button>
      </div>

      {/* Target list */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3">
        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-2">
          Find these:
        </div>
        <div className="flex flex-wrap gap-2">
          {round.targets.map((t) => {
            const found = foundCounts[t.slug] ?? 0;
            const done = found >= t.requiredCount;
            return (
              <div
                key={t.slug}
                className={`flex items-center gap-2 px-2 py-1 rounded-lg border transition ${
                  done
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                    : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/${t.iconPath}`}
                  alt=""
                  className="w-8 h-8 object-contain"
                  style={{ opacity: done ? 0.5 : 1 }}
                />
                <span className="text-sm font-medium">
                  {t.requiredCount > 1 ? `${found}/${t.requiredCount}× ` : ""}
                  {t.displayName}
                </span>
                {done && <span className="text-emerald-600 dark:text-emerald-400">✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Canvas */}
      <div
        className="relative aspect-[2/1] w-full rounded-2xl overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-800 select-none touch-none"
        style={{
          backgroundImage: `url(/${round.scene.path})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {round.placements.map((p) => {
          const s = stickerBySlug.get(p.stickerSlug);
          if (!s) return null;
          const wasFound = tappedPlacementIds.has(p.id);
          const wrongFlash = wrongFlashIds.has(p.id);
          // Found placements fade to a ghost so what's underneath is
          // both visible AND tappable (pointer-events: none on the
          // button below achieves the click-through).
          const displayOpacity = wasFound ? 0.15 : 1;
          return (
            <button
              key={p.id}
              onClick={() => onPlacementTap(p)}
              aria-label={s.altText || s.name}
              disabled={wasFound}
              className={`absolute transition-opacity duration-500 ${
                wrongFlash
                  ? "ring-4 ring-rose-500 rounded-full"
                  : wasFound
                    ? "ring-2 ring-emerald-400/60 rounded-full"
                    : "cursor-pointer"
              }`}
              style={{
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
                width: `${BASE_STICKER_WIDTH_PCT * p.scale * 100}%`,
                transform: `translate(-50%, -50%)${
                  p.rotation ? ` rotate(${p.rotation}deg)` : ""
                }`,
                background: "transparent",
                border: "none",
                padding: 0,
                pointerEvents: wasFound ? "none" : undefined,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/${s.path}`}
                alt=""
                draggable={false}
                className="w-full h-auto pointer-events-none transition-opacity duration-500"
                style={{ opacity: displayOpacity }}
              />
            </button>
          );
        })}

        {allDone && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
            <div className="bg-white dark:bg-zinc-950 rounded-2xl px-6 py-5 shadow-2xl text-center max-w-sm">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                You found them all!
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Great eye. Ready for a new puzzle?
              </p>
              <button
                onClick={newRound}
                className="w-full px-4 py-2 bg-coral-600 hover:bg-coral-700 text-white text-sm font-medium rounded-lg transition"
              >
                🔀 New puzzle
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Round builder ────────────────────────────────────────────────────

function buildRound(scenes: SceneLite[], stickers: StickerLite[]): Round {
  const scene = pickRandom(scenes);
  const { placements, targets } = generatePuzzle(stickers);
  return { scene, placements, targets };
}
