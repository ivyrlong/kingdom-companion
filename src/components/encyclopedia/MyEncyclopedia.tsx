"use client";

import { useMemo, useState, useCallback } from "react";

/* ── Types ─────────────────────────────────────────────────────────── */

export interface EncyclopediaItem {
  id: string;
  slug: string;
  term: string;
  definition: string;
  imageUrl: string | null;
  bibleRef: string | null;
  category: "PEOPLE" | "PLACES" | "THINGS" | "EVENTS";
  collectedAt: string | null; // ISO; null = not collected yet
  viewedAt: string | null; // ISO; null + collected = still "New"
  source: string | null; // game slug it was found in
}

const CATEGORY_LABEL: Record<string, string> = {
  PEOPLE: "Person",
  PLACES: "Place",
  THINGS: "Thing",
  EVENTS: "Event",
};

// Locked (not-yet-collected) cards are styled by category only — never by the
// entry's image — so concept entries ("faith") work as well as objects ("ark").
const LOCKED: Record<string, { ring: string; label: string }> = {
  PEOPLE: {
    ring: "border-sky-300 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300",
    label: "A person to find",
  },
  PLACES: {
    ring: "border-golden-300 dark:border-golden-500/40 bg-golden-50 dark:bg-golden-500/10 text-golden-600 dark:text-golden-300",
    label: "A place to find",
  },
  THINGS: {
    ring: "border-coral-300 dark:border-coral-500/40 bg-coral-50 dark:bg-coral-500/10 text-coral-600 dark:text-coral-300",
    label: "Something to find",
  },
  EVENTS: {
    ring: "border-violet-300 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300",
    label: "An event to find",
  },
};

const GAME_TITLES: Record<string, string> = {
  "scripture-memory-match": "Scripture Memory Match",
  "who-am-i": "Who Am I?",
  "bible-word-search": "Bible Word Search",
  "theocratic-trivia": "Theocratic Trivia",
  "meeting-bingo": "Meeting Bingo",
};

function prettyGame(slug: string | null): string {
  if (!slug) return "a game";
  return (
    GAME_TITLES[slug] ??
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function letterOf(term: string): string {
  const c = term.trim().charAt(0).toUpperCase();
  return c >= "A" && c <= "Z" ? c : "#";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function MyEncyclopedia({
  items,
}: {
  items: EncyclopediaItem[];
}) {
  // Locally track which entries have been viewed so the New tab updates
  // instantly when a sticker is opened (server is updated in the background).
  const [viewedIds, setViewedIds] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.viewedAt).map((i) => i.id)),
  );

  const isCollected = useCallback(
    (i: EncyclopediaItem) => i.collectedAt != null,
    [],
  );
  const isNew = useCallback(
    (i: EncyclopediaItem) => i.collectedAt != null && !viewedIds.has(i.id),
    [viewedIds],
  );

  const collectedCount = items.filter(isCollected).length;
  const total = items.length;

  // New list — collected but not yet viewed, newest first.
  const newList = useMemo(
    () =>
      items
        .filter(isNew)
        .sort((a, b) =>
          (b.collectedAt ?? "").localeCompare(a.collectedAt ?? ""),
        ),
    [items, isNew],
  );

  // Letter buckets across ALL entries (so kids see locked silhouettes too).
  const letters = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(letterOf(i.term)));
    return Array.from(set).sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return 1 * -1;
      return a.localeCompare(b);
    });
  }, [items]);

  const [tab, setTab] = useState<string>("NEW");

  const visibleItems = useMemo(() => {
    if (tab === "NEW") return newList;
    return items
      .filter((i) => letterOf(i.term) === tab)
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [tab, newList, items]);

  // Pop-up: freeze the list of openable (collected) cards so prev/next is
  // stable even as the New tab re-filters in the background.
  const [popup, setPopup] = useState<{
    list: EncyclopediaItem[];
    index: number;
  } | null>(null);

  const markViewed = useCallback(
    (entry: EncyclopediaItem) => {
      if (entry.collectedAt == null) return;
      if (viewedIds.has(entry.id)) return;
      setViewedIds((prev) => new Set(prev).add(entry.id));
      fetch("/api/encyclopedia/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id }),
      }).catch(() => {
        /* non-blocking — UI already updated */
      });
    },
    [viewedIds],
  );

  const openCard = useCallback(
    (entry: EncyclopediaItem) => {
      const list = visibleItems.filter((i) => isCollected(i));
      const index = list.findIndex((i) => i.id === entry.id);
      if (index < 0) return;
      setPopup({ list, index });
      markViewed(entry);
    },
    [visibleItems, isCollected, markViewed],
  );

  const navigate = useCallback(
    (dir: -1 | 1) => {
      setPopup((p) => {
        if (!p) return p;
        const next = p.index + dir;
        if (next < 0 || next >= p.list.length) return p;
        markViewed(p.list[next]);
        return { ...p, index: next };
      });
    },
    [markViewed],
  );

  const readAloud = useCallback((entry: EncyclopediaItem) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const parts = [entry.term + ".", entry.definition];
    if (entry.bibleRef) parts.push("You can read about it in " + entry.bibleRef);
    const u = new SpeechSynthesisUtterance(parts.join(" "));
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, []);

  /* ── Empty state ─────────────────────────────────────────────────── */

  if (total === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📖</div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Your encyclopedia is waiting!
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Play games to find your first sticker. They&apos;ll appear here in
          your very own Bible book.
        </p>
      </div>
    );
  }

  const newCount = newList.length;

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            My Bible stickers
          </p>
          <p className="text-sm font-bold text-coral-600 dark:text-coral-400">
            {collectedCount} of {total} found
          </p>
        </div>
        <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-coral-400 to-golden-300 rounded-full transition-all duration-500"
            style={{
              width: `${total ? (collectedCount / total) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Address-book rail */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setTab("NEW")}
          className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-bold transition ${
            tab === "NEW"
              ? "bg-coral-600 text-white shadow-sm"
              : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-coral-300"
          }`}
        >
          ✨ New
          {newCount > 0 && (
            <span
              className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                tab === "NEW"
                  ? "bg-white/25"
                  : "bg-coral-600 text-white"
              }`}
            >
              {newCount}
            </span>
          )}
        </button>
        {letters.map((L) => (
          <button
            key={L}
            onClick={() => setTab(L)}
            className={`shrink-0 w-9 h-9 rounded-full text-sm font-bold transition ${
              tab === L
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-violet-300"
            }`}
          >
            {L}
          </button>
        ))}
      </div>

      {/* Grid */}
      {visibleItems.length === 0 ? (
        <div className="text-center py-14 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-zinc-500 dark:text-zinc-400">
            {tab === "NEW"
              ? "No new stickers right now — go play a game to find more!"
              : "Nothing on this page yet. Keep playing to fill it up!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {visibleItems.map((item) => {
            const collected = isCollected(item);
            if (!collected) {
              const lk = LOCKED[item.category] ?? LOCKED.THINGS;
              return (
                <div
                  key={item.id}
                  title="Keep playing to find this one!"
                  className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center px-2 select-none ${lk.ring}`}
                >
                  <span className="text-4xl font-black opacity-60">?</span>
                  <span className="text-[10px] mt-1 font-semibold">
                    {lk.label}
                  </span>
                </div>
              );
            }
            return (
              <button
                key={item.id}
                onClick={() => openCard(item)}
                className="group relative aspect-square rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm hover:shadow-md hover:border-coral-300 dark:hover:border-coral-700 transition"
              >
                {isNew(item) && (
                  <span className="absolute top-1.5 left-1.5 z-10 text-[10px] font-bold bg-coral-600 text-white px-2 py-0.5 rounded-full shadow">
                    NEW!
                  </span>
                )}
                <div className="h-3/4 w-full bg-gradient-to-br from-sky-50 to-violet-100 dark:from-zinc-800 dark:to-zinc-800 flex items-center justify-center overflow-hidden">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        item.imageUrl.startsWith("/")
                          ? item.imageUrl
                          : `/${item.imageUrl}`
                      }
                      alt={item.term}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <span className="text-4xl">📖</span>
                  )}
                </div>
                <div className="h-1/4 flex items-center justify-center px-1">
                  <span className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">
                    {item.term}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {popup && (
        <EntryModal
          entry={popup.list[popup.index]}
          hasPrev={popup.index > 0}
          hasNext={popup.index < popup.list.length - 1}
          onPrev={() => navigate(-1)}
          onNext={() => navigate(1)}
          onClose={() => setPopup(null)}
          onReadAloud={readAloud}
        />
      )}
    </div>
  );
}

/* ── Pop-up ────────────────────────────────────────────────────────── */

function EntryModal({
  entry,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  onReadAloud,
}: {
  entry: EncyclopediaItem;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onReadAloud: (e: EncyclopediaItem) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full bg-gradient-to-br from-amber-50 to-coral-50 dark:from-zinc-900 dark:to-zinc-900 rounded-3xl shadow-2xl border-4 border-amber-300 dark:border-amber-600 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-amber-400 dark:bg-amber-600 px-4 py-2 flex items-center justify-between">
          <span className="text-white font-bold text-xs uppercase tracking-wide">
            {CATEGORY_LABEL[entry.category] ?? "Sticker"}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-white/90 hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="p-6 text-center">
          {entry.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                entry.imageUrl.startsWith("/")
                  ? entry.imageUrl
                  : `/${entry.imageUrl}`
              }
              alt={entry.term}
              className="w-36 h-36 mx-auto mb-4 object-contain rounded-2xl bg-white dark:bg-zinc-800 p-2 shadow-md"
            />
          ) : (
            <div className="w-36 h-36 mx-auto mb-4 bg-white dark:bg-zinc-800 rounded-2xl shadow-md flex items-center justify-center text-5xl">
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
            <p className="text-xs font-semibold text-coral-600 dark:text-coral-400 italic mb-3">
              {entry.bibleRef}
            </p>
          )}

          <button
            onClick={() => onReadAloud(entry)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 mb-4"
          >
            🔊 Read it to me
          </button>

          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-4">
            Found in {prettyGame(entry.source)}
            {entry.collectedAt ? ` · ${fmtDate(entry.collectedAt)}` : ""}
          </p>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="px-3 py-2 text-sm font-medium rounded-xl text-zinc-600 dark:text-zinc-300 disabled:opacity-30 hover:bg-white/50 dark:hover:bg-zinc-800/50 transition"
            >
              ‹ Back
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-bold bg-coral-600 hover:bg-coral-700 text-white rounded-xl shadow-md transition"
            >
              Got it!
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="px-3 py-2 text-sm font-medium rounded-xl text-zinc-600 dark:text-zinc-300 disabled:opacity-30 hover:bg-white/50 dark:hover:bg-zinc-800/50 transition"
            >
              Next ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
