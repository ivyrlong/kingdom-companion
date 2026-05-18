"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ── Types ─────────────────────────────────────────────────────────── */

interface Game {
  id: string;
  slug: string;
  title: string;
  category: string;
  ageGroup: string;
  isActive: boolean;
  cardImages: Record<string, string>;
}

const SLOTS = [
  "SHARED",
  "LITTLE_ONES",
  "YOUTH",
  "ADULT",
  "FAMILY",
] as const;
type Slot = (typeof SLOTS)[number];

const SLOT_LABELS: Record<Slot, string> = {
  SHARED: "All ages",
  LITTLE_ONES: "Little Ones",
  YOUTH: "Youth",
  ADULT: "Adult",
  FAMILY: "Family",
};

function tierColor(tier: string): string {
  switch (tier) {
    case "LITTLE_ONES":
      return "bg-sky-100 dark:bg-sky-300/20 text-sky-700 dark:text-sky-300";
    case "YOUTH":
      return "bg-violet-100 dark:bg-violet-300/20 text-violet-700 dark:text-violet-300";
    case "ADULT":
      return "bg-coral-100 dark:bg-coral-300/20 text-coral-700 dark:text-coral-300";
    case "FAMILY":
      return "bg-golden-100 dark:bg-golden-300/20 text-golden-600 dark:text-golden-300";
    default:
      return "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400";
  }
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function GameImageManager() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchGames = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/games");
      if (res.ok) {
        setGames(await res.json());
      } else {
        setError("Failed to load games.");
      }
    } catch {
      setError("Failed to load games.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const applyUpdate = (gameId: string, cardImages: Record<string, string>) => {
    setGames((prev) =>
      prev.map((g) => (g.id === gameId ? { ...g, cardImages } : g)),
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300 flex justify-between items-start">
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-4 text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">
          Loading games...
        </p>
      ) : games.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-zinc-500 dark:text-zinc-400">No games found.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {games.map((game) => (
            <GameRow
              key={game.id}
              game={game}
              onUpdated={(imgs) => applyUpdate(game.id, imgs)}
              onError={setError}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── One game, with its 5 slots ────────────────────────────────────── */

function GameRow({
  game,
  onUpdated,
  onError,
}: {
  game: Game;
  onUpdated: (cardImages: Record<string, string>) => void;
  onError: (msg: string) => void;
}) {
  const shared = game.cardImages.SHARED;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
          {game.title}
        </h3>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tierColor(game.ageGroup)}`}
        >
          {SLOT_LABELS[game.ageGroup as Slot] ?? game.ageGroup}
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
          {game.category}
        </span>
        {!game.isActive && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400">
            Hidden
          </span>
        )}
        <span className="ml-auto text-xs font-mono text-zinc-400 dark:text-zinc-500">
          {game.slug}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {SLOTS.map((slot) => (
          <SlotCell
            key={slot}
            gameId={game.id}
            slot={slot}
            value={game.cardImages[slot]}
            sharedFallback={slot !== "SHARED" ? shared : undefined}
            onUpdated={onUpdated}
            onError={onError}
          />
        ))}
      </div>
    </div>
  );
}

/* ── One slot: preview + upload + clear ────────────────────────────── */

function SlotCell({
  gameId,
  slot,
  value,
  sharedFallback,
  onUpdated,
  onError,
}: {
  gameId: string;
  slot: Slot;
  value: string | undefined;
  sharedFallback: string | undefined;
  onUpdated: (cardImages: Record<string, string>) => void;
  onError: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setBusy(true);
    onError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slot", slot);
      const res = await fetch(`/api/admin/games/${gameId}`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.cardImages ?? {});
      } else {
        const data = await res.json().catch(() => null);
        onError(data?.error || "Upload failed.");
      }
    } catch {
      onError("Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleClear = async () => {
    if (!window.confirm(`Remove the ${SLOT_LABELS[slot]} image for this game?`))
      return;
    setBusy(true);
    onError("");
    try {
      const res = await fetch(
        `/api/admin/games/${gameId}?slot=${slot}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.cardImages ?? {});
      } else {
        const data = await res.json().catch(() => null);
        onError(data?.error || "Could not remove image.");
      }
    } catch {
      onError("Could not remove image.");
    } finally {
      setBusy(false);
    }
  };

  const usingFallback = !value && !!sharedFallback;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {SLOT_LABELS[slot]}
        </span>
        {slot === "SHARED" && (
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            default
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title={value ? "Replace image" : "Upload image"}
        className="block w-full aspect-video rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 relative group disabled:opacity-60"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={`${SLOT_LABELS[slot]} card art`}
            className="w-full h-full object-cover"
          />
        ) : usingFallback ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sharedFallback}
            alt="All ages card art (fallback)"
            className="w-full h-full object-cover opacity-40 grayscale"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-2xl text-zinc-300 dark:text-zinc-600">
            +
          </span>
        )}

        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs">
            Working…
          </span>
        )}
        {usingFallback && !busy && (
          <span className="absolute bottom-1 left-1 right-1 text-[10px] text-center text-zinc-500 dark:text-zinc-400 bg-white/70 dark:bg-zinc-900/70 rounded px-1 py-0.5">
            uses All ages
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <div className="flex gap-2 mt-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="text-xs text-coral-600 hover:text-coral-700 dark:text-coral-400 dark:hover:text-coral-300 disabled:opacity-50"
        >
          {value ? "Replace" : "Upload"}
        </button>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            disabled={busy}
            className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
