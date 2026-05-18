"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";

/* ── Types ─────────────────────────────────────────────────────────── */

export interface EncyclopediaEntry {
  id: string;
  slug: string;
  term: string;
  definition: string;
  imageUrl: string | null;
  bibleRef: string | null;
  category: "PEOPLE" | "PLACES" | "THINGS" | "EVENTS";
  triggers: string[];
  ageGroup: string;
  isActive: boolean;
}

interface CollectedRecord {
  entryId: string;
  collectedAt: string;
  source: string | null;
}

interface EncyclopediaContextValue {
  enabled: boolean;
  entries: EncyclopediaEntry[];
  collectedIds: Set<string>;
  /**
   * Called by games when the user encounters something potentially collectible.
   * The token is normalized (lowercased, spaces→dashes) and matched against entry
   * slugs and triggers. If matched and not yet collected, opens the celebration modal.
   */
  discover: (token: string, sourceGameSlug?: string) => void;
  refresh: () => Promise<void>;
}

const EncyclopediaContext = createContext<EncyclopediaContextValue>({
  enabled: false,
  entries: [],
  collectedIds: new Set(),
  discover: () => {},
  refresh: async () => {},
});

export function useEncyclopedia() {
  return useContext(EncyclopediaContext);
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function normalize(token: string): string {
  return token
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ── Provider ──────────────────────────────────────────────────────── */

export default function EncyclopediaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  // Authoritative gating lives in /api/encyclopedia: it returns entries only
  // for users who actually receive curated findings (per their capabilities),
  // so here we just need to be signed in. Non-participants get an empty set
  // and nothing is ever discovered.
  const enabled = status === "authenticated";

  const [entries, setEntries] = useState<EncyclopediaEntry[]>([]);
  const [collectedIds, setCollectedIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<EncyclopediaEntry | null>(null);
  const [pendingSource, setPendingSource] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  // Track what we've shown so we don't double-popup the same token in a session
  const shownInSessionRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch("/api/encyclopedia");
      if (!res.ok) return;
      const data = await res.json();
      setEntries(data.entries ?? []);
      setCollectedIds(new Set((data.collected ?? []).map((c: CollectedRecord) => c.entryId)));
    } catch {
      // silent — encyclopedia is a non-blocking enrichment
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  /* Lookup by slug or any trigger */
  const entryByToken = useMemo(() => {
    const map = new Map<string, EncyclopediaEntry>();
    for (const entry of entries) {
      map.set(entry.slug, entry);
      for (const trigger of entry.triggers) {
        const key = normalize(trigger);
        if (key && !map.has(key)) map.set(key, entry);
      }
    }
    return map;
  }, [entries]);

  const discover = useCallback(
    (token: string, sourceGameSlug?: string) => {
      if (!enabled) return;
      const key = normalize(token);
      if (!key) return;
      const entry = entryByToken.get(key);
      if (!entry) return;
      if (collectedIds.has(entry.id)) return;
      if (shownInSessionRef.current.has(entry.id)) return;
      shownInSessionRef.current.add(entry.id);
      setPending(entry);
      setPendingSource(sourceGameSlug);
    },
    [enabled, entryByToken, collectedIds]
  );

  const handleCollect = useCallback(async () => {
    if (!pending) return;
    setSaving(true);
    try {
      const res = await fetch("/api/encyclopedia/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: pending.id, source: pendingSource }),
      });
      if (res.ok) {
        setCollectedIds((prev) => {
          const next = new Set(prev);
          next.add(pending.id);
          return next;
        });
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
      setPending(null);
      setPendingSource(undefined);
    }
  }, [pending, pendingSource]);

  const handleSkip = useCallback(() => {
    setPending(null);
    setPendingSource(undefined);
  }, []);

  const value = useMemo(
    () => ({ enabled, entries, collectedIds, discover, refresh }),
    [enabled, entries, collectedIds, discover, refresh]
  );

  return (
    <EncyclopediaContext.Provider value={value}>
      {children}
      {pending && (
        <DiscoveryModal
          entry={pending}
          saving={saving}
          onCollect={handleCollect}
          onSkip={handleSkip}
        />
      )}
    </EncyclopediaContext.Provider>
  );
}

/* ── Discovery Modal ───────────────────────────────────────────────── */

function DiscoveryModal({
  entry,
  saving,
  onCollect,
  onSkip,
}: {
  entry: EncyclopediaEntry;
  saving: boolean;
  onCollect: () => void;
  onSkip: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in"
      onClick={onSkip}
    >
      <div
        className="relative max-w-sm w-full bg-gradient-to-br from-amber-50 to-coral-50 dark:from-amber-900/40 dark:to-coral-900/40 rounded-3xl shadow-2xl border-4 border-amber-300 dark:border-amber-600 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sparkle banner */}
        <div className="bg-amber-400 dark:bg-amber-600 px-4 py-2 text-center">
          <p className="text-white font-bold text-sm uppercase tracking-wide">
            ✨ You Found Something! ✨
          </p>
        </div>

        <div className="p-6 text-center">
          {entry.imageUrl ? (
            <img
              src={entry.imageUrl.startsWith("/") ? entry.imageUrl : `/${entry.imageUrl}`}
              alt={entry.term}
              className="w-32 h-32 mx-auto mb-4 object-contain rounded-2xl bg-white dark:bg-zinc-900 p-2 shadow-md"
            />
          ) : (
            <div className="w-32 h-32 mx-auto mb-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-md flex items-center justify-center text-5xl">
              📖
            </div>
          )}

          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            {entry.term}
          </h3>

          <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2">
            {entry.definition}
          </p>

          {entry.bibleRef && (
            <p className="text-xs text-coral-600 dark:text-coral-400 italic mb-4">
              {entry.bibleRef}
            </p>
          )}

          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-4">
            Add it to your book?
          </p>

          <div className="flex gap-2 justify-center">
            <button
              onClick={onSkip}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-white/40 dark:hover:bg-zinc-800/40 rounded-xl transition"
            >
              Maybe later
            </button>
            <button
              onClick={onCollect}
              disabled={saving}
              className="px-6 py-2 text-sm font-bold bg-coral-600 hover:bg-coral-700 disabled:bg-zinc-400 text-white rounded-xl transition shadow-md"
            >
              {saving ? "Adding..." : "Add to my book!"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
