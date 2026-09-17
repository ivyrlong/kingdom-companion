"use client";

/**
 * ParadiseCanvas — the drag-and-drop paradise builder.
 *
 * Behavior:
 * - Tap a sticker in the tray to add it at the canvas centre.
 * - Drag any placed sticker to move it. Pointer-based, works on mouse + touch.
 * - Tap a placed sticker to select it: shows delete (×) and resize handles.
 * - Drag the resize handle to scale (0.3× – 3×).
 * - Tapping outside a sticker deselects.
 * - Any change flags dirty; auto-save fires 1.5s after the last change.
 * - Explicit "Save" button flushes immediately.
 * - "Reset" clears every placement (with confirm).
 * - Stickers overlap freely; the same sticker can appear many times.
 * - Soft cap of 60 placements per page — page still functions past that,
 *   just shows a gentle warning.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Placement } from "@/lib/paradise";

// ── Types ─────────────────────────────────────────────────────────────

interface StickerLite {
  id: string;
  slug: string;
  name: string;
  kind:
    | "PERSON"
    | "BIBLE_CHARACTER"
    | "ANIMAL_PAIR"
    | "ANIMAL_SOLO"
    | "PLANT"
    | "HOME"
    | "SKY";
  path: string;
  altText: string;
}

interface Props {
  pageId: string;
  initialName: string;
  scene: { id: string; slug: string; name: string; path: string };
  initialPlacements: unknown[];
}

// ── Constants ────────────────────────────────────────────────────────

const BASE_STICKER_WIDTH_PCT = 0.15; // 15% of canvas width at scale=1
const MIN_SCALE = 0.3;
const MAX_SCALE = 3.0;
const SOFT_CAP = 60;
const AUTOSAVE_MS = 1500;

const KIND_TABS: { kind: StickerLite["kind"] | "ALL"; label: string }[] = [
  { kind: "ALL", label: "All" },
  { kind: "PERSON", label: "People" },
  { kind: "BIBLE_CHARACTER", label: "Bible Characters" },
  { kind: "ANIMAL_PAIR", label: "Isaiah Pairs" },
  { kind: "ANIMAL_SOLO", label: "Animals" },
  { kind: "PLANT", label: "Plants" },
  { kind: "HOME", label: "Homes" },
  { kind: "SKY", label: "Sky" },
];

// ── Utils ────────────────────────────────────────────────────────────

function makeId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Coerce whatever we got from the DB into a safe Placement array. */
function normalisePlacements(raw: unknown[]): Placement[] {
  const out: Placement[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const p = item as Partial<Placement>;
    if (typeof p.id !== "string" || typeof p.stickerSlug !== "string") continue;
    if (typeof p.x !== "number" || typeof p.y !== "number") continue;
    if (typeof p.scale !== "number") continue;
    out.push({
      id: p.id,
      stickerSlug: p.stickerSlug,
      x: clamp(p.x, -0.2, 1.2),
      y: clamp(p.y, -0.2, 1.2),
      scale: clamp(p.scale, MIN_SCALE, MAX_SCALE),
      rotation: typeof p.rotation === "number" ? p.rotation : undefined,
    });
  }
  return out;
}

// ── Component ────────────────────────────────────────────────────────

export default function ParadiseCanvas(props: Props) {
  const [name, setName] = useState(props.initialName);
  const [renamingOpen, setRenamingOpen] = useState(false);
  const [placements, setPlacements] = useState<Placement[]>(() =>
    normalisePlacements(props.initialPlacements),
  );
  const [stickers, setStickers] = useState<StickerLite[]>([]);
  const [loadingStickers, setLoadingStickers] = useState(true);
  const [activeTab, setActiveTab] = useState<StickerLite["kind"] | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Load stickers once on mount.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/stickers");
        if (res.ok) setStickers(await res.json());
      } finally {
        setLoadingStickers(false);
      }
    })();
  }, []);

  // Look-up map: stickerSlug -> StickerLite. Used to render each placement.
  const stickerBySlug = useMemo(() => {
    const m = new Map<string, StickerLite>();
    for (const s of stickers) m.set(s.slug, s);
    return m;
  }, [stickers]);

  // ── Save flow ──────────────────────────────────────────────────────

  const save = useCallback(
    async (nextPlacements?: Placement[], nextName?: string) => {
      const bodyPlacements = nextPlacements ?? placements;
      const bodyName = nextName ?? name;
      setSavingState("saving");
      try {
        const res = await fetch(`/api/paradise-pages/${props.pageId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ placements: bodyPlacements, name: bodyName }),
        });
        if (!res.ok) {
          setSavingState("error");
          return;
        }
        setDirty(false);
        setSavingState("saved");
        setTimeout(() => {
          setSavingState((s) => (s === "saved" ? "idle" : s));
        }, 1600);
      } catch {
        setSavingState("error");
      }
    },
    [placements, name, props.pageId],
  );

  // Debounced auto-save whenever `dirty` flips true.
  useEffect(() => {
    if (!dirty) return;
    const handle = setTimeout(() => {
      save();
    }, AUTOSAVE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, placements, name]);

  // ── Placement mutators ─────────────────────────────────────────────

  const addSticker = (sticker: StickerLite) => {
    // Add at centre. Bring to top by appending to end of array.
    const next: Placement = {
      id: makeId(),
      stickerSlug: sticker.slug,
      x: 0.5,
      y: 0.5,
      scale: 1,
    };
    setPlacements((cur) => [...cur, next]);
    setSelectedId(next.id);
    setDirty(true);
  };

  const bringToFront = (id: string) => {
    setPlacements((cur) => {
      const idx = cur.findIndex((p) => p.id === id);
      if (idx === -1 || idx === cur.length - 1) return cur;
      const next = cur.slice();
      const [it] = next.splice(idx, 1);
      next.push(it);
      return next;
    });
  };

  const updatePlacement = (id: string, patch: Partial<Placement>) => {
    setPlacements((cur) => cur.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setDirty(true);
  };

  const deletePlacement = (id: string) => {
    setPlacements((cur) => cur.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
    setDirty(true);
  };

  const resetAll = () => {
    if (placements.length === 0) return;
    if (!confirm("Clear every sticker from this page? This cannot be undone once saved.")) return;
    setPlacements([]);
    setSelectedId(null);
    setDirty(true);
  };

  // ── Drag + resize handlers ─────────────────────────────────────────
  //
  // Kept as inline pointer-event handlers per placement — attaching once
  // to the placement element and using pointer capture keeps the drag
  // reliable across mouse and touch without a window-level listener.

  const startDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    placement: Placement,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget;
    const canvas = canvasRef.current;
    if (!canvas) return;
    target.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    // Offset between pointer and sticker centre, in fractional coords.
    const offsetX = placement.x - (e.clientX - rect.left) / rect.width;
    const offsetY = placement.y - (e.clientY - rect.top) / rect.height;

    setSelectedId(placement.id);
    bringToFront(placement.id);

    const move = (ev: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const nx = clamp((ev.clientX - r.left) / r.width + offsetX, 0.02, 0.98);
      const ny = clamp((ev.clientY - r.top) / r.height + offsetY, 0.02, 0.98);
      updatePlacement(placement.id, { x: nx, y: ny });
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };

  const startResize = (
    e: React.PointerEvent<HTMLButtonElement>,
    placement: Placement,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget;
    const canvas = canvasRef.current;
    if (!canvas) return;
    target.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + placement.x * rect.width;
    const cy = rect.top + placement.y * rect.height;
    const initialDistance = Math.hypot(e.clientX - cx, e.clientY - cy);
    const initialScale = placement.scale;

    const move = (ev: PointerEvent) => {
      const d = Math.hypot(ev.clientX - cx, ev.clientY - cy);
      const nextScale = clamp(
        (initialScale * d) / Math.max(initialDistance, 1),
        MIN_SCALE,
        MAX_SCALE,
      );
      updatePlacement(placement.id, { scale: nextScale });
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };

  // ── Filtered tray ─────────────────────────────────────────────────

  const trayStickers = useMemo(() => {
    if (activeTab === "ALL") return stickers;
    return stickers.filter((s) => s.kind === activeTab);
  }, [stickers, activeTab]);

  // ── Render ────────────────────────────────────────────────────────

  const commitName = () => {
    setRenamingOpen(false);
    setDirty(true);
  };

  const saveStatusText = (() => {
    switch (savingState) {
      case "saving":
        return "Saving…";
      case "saved":
        return "Saved";
      case "error":
        return "Save failed — will retry";
      default:
        return dirty ? "Unsaved changes" : "";
    }
  })();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/paradise"
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Back
          </Link>
          <div className="flex-1 min-w-0">
            {renamingOpen ? (
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitName();
                  if (e.key === "Escape") setRenamingOpen(false);
                }}
                className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 font-semibold"
              />
            ) : (
              <button
                onClick={() => setRenamingOpen(true)}
                className="font-semibold text-zinc-800 dark:text-zinc-100 hover:underline truncate"
                title="Click to rename"
              >
                {name}
              </button>
            )}
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              on {props.scene.name} · {placements.length} sticker
              {placements.length === 1 ? "" : "s"}
              {placements.length > SOFT_CAP && (
                <span className="text-amber-600 dark:text-amber-400 ml-2">
                  · getting busy!
                </span>
              )}
            </div>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 min-w-[110px] text-right">
            {saveStatusText}
          </span>
          <button
            onClick={resetAll}
            disabled={placements.length === 0}
            className="px-3 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 disabled:opacity-40"
          >
            Reset
          </button>
          <button
            onClick={() => save()}
            className="px-4 py-1.5 text-sm font-medium rounded-md bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Save
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div
          ref={canvasRef}
          onPointerDown={() => setSelectedId(null)}
          className="relative aspect-[2/1] w-full rounded-2xl overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-800 select-none touch-none"
          style={{
            backgroundImage: `url(/${props.scene.path})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {placements.map((p) => {
            const s = stickerBySlug.get(p.stickerSlug);
            if (!s) return null; // sticker was deleted; silently drop
            const isSelected = selectedId === p.id;
            return (
              <div
                key={p.id}
                onPointerDown={(e) => startDrag(e, p)}
                className={`absolute cursor-grab active:cursor-grabbing ${
                  isSelected ? "ring-2 ring-emerald-400 ring-offset-1" : ""
                }`}
                style={{
                  left: `${p.x * 100}%`,
                  top: `${p.y * 100}%`,
                  width: `${BASE_STICKER_WIDTH_PCT * p.scale * 100}%`,
                  transform: `translate(-50%, -50%)${
                    p.rotation ? ` rotate(${p.rotation}deg)` : ""
                  }`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/${s.path}`}
                  alt={s.altText || s.name}
                  draggable={false}
                  className="w-full h-auto pointer-events-none"
                />
                {isSelected && (
                  <>
                    <button
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        deletePlacement(p.id);
                      }}
                      aria-label="Remove sticker"
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow flex items-center justify-center"
                    >
                      ×
                    </button>
                    <button
                      onPointerDown={(e) => startResize(e, p)}
                      aria-label="Resize sticker"
                      className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-sky-600 hover:bg-sky-700 text-white shadow flex items-center justify-center cursor-nwse-resize"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M8 20 L20 8 M14 20 L20 14 M20 20 L20 20" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            );
          })}

          {placements.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 dark:bg-zinc-950/90 rounded-lg px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 shadow">
                Tap a sticker below to add it here.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticker tray */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="flex gap-1 p-2 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
            {KIND_TABS.map((t) => (
              <button
                key={t.kind}
                onClick={() => setActiveTab(t.kind)}
                className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition ${
                  activeTab === t.kind
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="p-3">
            {loadingStickers ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading stickers…</p>
            ) : trayStickers.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No stickers in this category yet.
              </p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {trayStickers.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => addSticker(s)}
                    title={s.name}
                    className="flex-shrink-0 w-20 h-20 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-[radial-gradient(circle,#f3f3f3_1px,transparent_1px)] [background-size:6px_6px] dark:bg-[radial-gradient(circle,#333_1px,transparent_1px)] flex items-center justify-center p-1 hover:border-emerald-400 hover:shadow-md transition"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/${s.path}`}
                      alt={s.altText || s.name}
                      className="max-w-full max-h-full object-contain pointer-events-none"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
