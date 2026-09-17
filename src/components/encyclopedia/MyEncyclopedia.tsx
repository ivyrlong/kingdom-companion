"use client";

import { useMemo, useState, useCallback } from "react";

/* ── Types ─────────────────────────────────────────────────────────── */

export interface EncyclopediaItem {
  id: string;
  slug: string;
  term: string;
  /** Fallback text when contentByTier for the viewer's tier isn't present. */
  definition: string;
  imageUrl: string | null;
  bibleRef: string | null;
  category: "PEOPLE" | "PLACES" | "THINGS" | "EVENTS";
  collectedAt: string | null; // ISO; null = not collected yet (curated only)
  viewedAt: string | null; // ISO; null + collected = still "New"
  source: string | null; // game slug it was found in
  kind: "curated" | "personal";
  /** Optional richer fields — populated for Bible-character-style entries. */
  era?: string | null;
  timeline?: Array<{ when: string; event: string }> | null;
  locations?: string[];
  /** Three-tier language content. When present, prefer over `definition`. */
  contentByTier?: {
    littleOnes?: TierContent;
    youth?: TierContent;
    adult?: TierContent;
  } | null;
}

export interface TierContent {
  shortDescription?: string;
  longBlurb?: string;
  trivia?: Array<{
    question: string;
    answer: string;
    bibleRef?: string;
    source?: "rewritten" | "derived";
  }>;
  cluesHardToEasy?: string[];
}

export interface EncyclopediaCaps {
  name: string; // "Sticker Book" | "Discovery Journal" | "Study Notebook"
  canAuthor: boolean;
  mode: "PLAYFUL" | "STUDY";
  showSilhouettes: boolean;
  receivesCurated: boolean;
  /** Viewer's age group — used to pick the right tier from contentByTier. */
  viewerAgeGroup?: "LITTLE_ONES" | "YOUTH" | "ADULT" | "FAMILY";
}

/** Pick the right tier's content for the current viewer. FAMILY defaults to
 *  youth (safe middle when a whole family shares a device). Falls through
 *  gracefully if the specific tier isn't populated. */
export function pickTier(
  item: EncyclopediaItem,
  ageGroup: EncyclopediaCaps["viewerAgeGroup"],
): TierContent | null {
  const c = item.contentByTier;
  if (!c) return null;
  switch (ageGroup) {
    case "LITTLE_ONES":
      return c.littleOnes ?? c.youth ?? c.adult ?? null;
    case "ADULT":
      return c.adult ?? c.youth ?? c.littleOnes ?? null;
    case "YOUTH":
    case "FAMILY":
    default:
      return c.youth ?? c.adult ?? c.littleOnes ?? null;
  }
}

const CATEGORIES = ["PEOPLE", "PLACES", "THINGS", "EVENTS"] as const;
const CATEGORY_LABEL: Record<string, string> = {
  PEOPLE: "Person",
  PLACES: "Place",
  THINGS: "Thing",
  EVENTS: "Event",
};

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

interface PersonalDraft {
  id?: string;
  term: string;
  category: EncyclopediaItem["category"];
  bibleRef: string;
  note: string;
  imageUrl: string;
}

function toItem(p: {
  id: string;
  term: string;
  category: EncyclopediaItem["category"];
  bibleRef: string | null;
  note: string;
  imageUrl: string | null;
  createdAt: string;
}): EncyclopediaItem {
  return {
    id: p.id,
    slug: p.id,
    term: p.term,
    definition: p.note,
    imageUrl: p.imageUrl,
    bibleRef: p.bibleRef,
    category: p.category,
    collectedAt: p.createdAt,
    viewedAt: p.createdAt, // personal entries are never "New"
    source: null,
    kind: "personal",
  };
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function MyEncyclopedia({
  items,
  caps,
}: {
  items: EncyclopediaItem[];
  caps: EncyclopediaCaps;
}) {
  const [list, setList] = useState<EncyclopediaItem[]>(items);
  const [viewedIds, setViewedIds] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.viewedAt).map((i) => i.id)),
  );
  const [error, setError] = useState("");

  const isCollected = useCallback(
    (i: EncyclopediaItem) => i.collectedAt != null,
    [],
  );
  const isNew = useCallback(
    (i: EncyclopediaItem) =>
      i.kind === "curated" && i.collectedAt != null && !viewedIds.has(i.id),
    [viewedIds],
  );

  // In Study/notebook mode there are no mystery silhouettes — only show
  // things the user actually owns (collected curated + personal).
  const effective = useMemo(
    () => (caps.showSilhouettes ? list : list.filter(isCollected)),
    [list, caps.showSilhouettes, isCollected],
  );

  const ownedCount = effective.filter(isCollected).length;
  const total = effective.length;

  const newList = useMemo(
    () =>
      effective
        .filter(isNew)
        .sort((a, b) =>
          (b.collectedAt ?? "").localeCompare(a.collectedAt ?? ""),
        ),
    [effective, isNew],
  );
  const newCount = newList.length;

  const letters = useMemo(() => {
    const set = new Set<string>();
    effective.forEach((i) => set.add(letterOf(i.term)));
    return Array.from(set).sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });
  }, [effective]);

  const [tab, setTab] = useState<string>(
    caps.receivesCurated ? "NEW" : "ALL",
  );

  const visibleItems = useMemo(() => {
    if (tab === "NEW") return newList;
    if (tab === "ALL")
      return [...effective].sort((a, b) => a.term.localeCompare(b.term));
    return effective
      .filter((i) => letterOf(i.term) === tab)
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [tab, newList, effective]);

  const [popup, setPopup] = useState<{
    list: EncyclopediaItem[];
    index: number;
  } | null>(null);
  const [editing, setEditing] = useState<PersonalDraft | null>(null);

  const markViewed = useCallback(
    (entry: EncyclopediaItem) => {
      if (entry.kind !== "curated" || entry.collectedAt == null) return;
      if (viewedIds.has(entry.id)) return;
      setViewedIds((prev) => new Set(prev).add(entry.id));
      fetch("/api/encyclopedia/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id }),
      }).catch(() => {});
    },
    [viewedIds],
  );

  const openCard = useCallback(
    (entry: EncyclopediaItem) => {
      const openable = visibleItems.filter((i) => isCollected(i));
      const index = openable.findIndex((i) => i.id === entry.id);
      if (index < 0) return;
      setPopup({ list: openable, index });
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

  const savePersonal = useCallback(async (draft: PersonalDraft) => {
    const isEdit = !!draft.id;
    const res = await fetch(
      isEdit
        ? `/api/encyclopedia/personal/${draft.id}`
        : "/api/encyclopedia/personal",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: draft.term,
          note: draft.note,
          category: draft.category,
          bibleRef: draft.bibleRef || null,
          imageUrl: draft.imageUrl || null,
        }),
      },
    );
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error || "Could not save your entry.");
      return false;
    }
    const saved = await res.json();
    const mapped = toItem({
      id: saved.id,
      term: saved.term,
      category: saved.category,
      bibleRef: saved.bibleRef,
      note: saved.note,
      imageUrl: saved.imageUrl,
      createdAt: saved.createdAt ?? new Date().toISOString(),
    });
    setList((prev) =>
      isEdit
        ? prev.map((i) => (i.id === mapped.id ? mapped : i))
        : [...prev, mapped],
    );
    setEditing(null);
    setPopup(null);
    return true;
  }, []);

  const deletePersonal = useCallback(async (id: string) => {
    if (!window.confirm("Delete this entry? This can't be undone.")) return;
    const res = await fetch(`/api/encyclopedia/personal/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setList((prev) => prev.filter((i) => i.id !== id));
      setPopup(null);
    } else {
      setError("Could not delete that entry.");
    }
  }, []);

  const addLabel = caps.mode === "STUDY" ? "＋ Add reference" : "＋ Add my own";
  const blankDraft: PersonalDraft = {
    term: "",
    category: "THINGS",
    bibleRef: "",
    note: "",
    imageUrl: "",
  };

  /* ── Empty state ─────────────────────────────────────────────────── */

  if (total === 0 && !caps.canAuthor) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📖</div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Your {caps.name} is waiting!
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Play games to find your first sticker. They&apos;ll appear here in
          your very own Bible book.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-4 text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Progress */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {caps.name}
          </p>
          <p className="text-sm font-bold text-coral-600 dark:text-coral-400">
            {caps.showSilhouettes
              ? `${ownedCount} of ${total} found`
              : `${total} ${total === 1 ? "entry" : "entries"}`}
          </p>
        </div>
        {caps.showSilhouettes && (
          <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-coral-400 to-golden-300 rounded-full transition-all duration-500"
              style={{ width: `${total ? (ownedCount / total) * 100 : 0}%` }}
            />
          </div>
        )}
      </div>

      {/* Rail + add */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1">
          {caps.receivesCurated && (
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
                    tab === "NEW" ? "bg-white/25" : "bg-coral-600 text-white"
                  }`}
                >
                  {newCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setTab("ALL")}
            className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-bold transition ${
              tab === "ALL"
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-violet-300"
            }`}
          >
            All
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
        {caps.canAuthor && (
          <button
            onClick={() => setEditing({ ...blankDraft })}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-bold bg-coral-600 hover:bg-coral-700 text-white shadow-sm transition"
          >
            {addLabel}
          </button>
        )}
      </div>

      {/* Grid */}
      {visibleItems.length === 0 ? (
        <div className="text-center py-14 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-zinc-500 dark:text-zinc-400">
            {tab === "NEW"
              ? "No new finds right now — go play a game to discover more!"
              : caps.canAuthor
                ? "Nothing here yet. Use the Add button to start your own."
                : "Nothing on this page yet. Keep playing to fill it up!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {visibleItems.map((item) => {
            if (!isCollected(item)) {
              const lk = LOCKED[item.category] ?? LOCKED.THINGS;
              // When we have a linked-sticker or imageUrl, render the
              // actual sticker as a silhouette — brightness(0) collapses
              // the RGB channels to black but PNG alpha is preserved, so
              // the character shape is visible in solid dark. Falls back
              // to a plain "?" tile for entries with no art yet.
              const silhouetteSrc = item.imageUrl
                ? item.imageUrl.startsWith("/")
                  ? item.imageUrl
                  : `/${item.imageUrl}`
                : null;
              return (
                <div
                  key={item.id}
                  title="Keep playing to find this one!"
                  className={`relative aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center px-2 select-none overflow-hidden ${lk.ring}`}
                >
                  {silhouetteSrc ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={silhouetteSrc}
                        alt=""
                        aria-hidden
                        className="absolute inset-2 max-w-[calc(100%-1rem)] max-h-[calc(100%-1rem)] w-auto h-auto m-auto object-contain opacity-40"
                        style={{ filter: "brightness(0)" }}
                      />
                      <span className="relative text-4xl font-black opacity-70 drop-shadow-sm">
                        ?
                      </span>
                      <span className="relative text-[10px] mt-1 font-semibold">
                        {lk.label}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-black opacity-60">?</span>
                      <span className="text-[10px] mt-1 font-semibold">
                        {lk.label}
                      </span>
                    </>
                  )}
                </div>
              );
            }
            const personal = item.kind === "personal";
            return (
              <button
                key={item.id}
                onClick={() => openCard(item)}
                className="group relative aspect-square rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm hover:shadow-md hover:border-coral-300 dark:hover:border-coral-700 transition"
              >
                {personal ? (
                  <span className="absolute top-1.5 left-1.5 z-10 text-[10px] font-bold bg-violet-600 text-white px-2 py-0.5 rounded-full shadow">
                    ✎ mine
                  </span>
                ) : (
                  isNew(item) && (
                    <span className="absolute top-1.5 left-1.5 z-10 text-[10px] font-bold bg-coral-600 text-white px-2 py-0.5 rounded-full shadow">
                      NEW!
                    </span>
                  )
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
                    <span className="text-3xl">
                      {personal ? "📝" : "📖"}
                    </span>
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
          caps={caps}
          hasPrev={popup.index > 0}
          hasNext={popup.index < popup.list.length - 1}
          onPrev={() => navigate(-1)}
          onNext={() => navigate(1)}
          onClose={() => setPopup(null)}
          onReadAloud={readAloud}
          onEdit={(e) =>
            setEditing({
              id: e.id,
              term: e.term,
              category: e.category,
              bibleRef: e.bibleRef ?? "",
              note: e.definition,
              imageUrl: e.imageUrl ?? "",
            })
          }
          onDelete={deletePersonal}
        />
      )}

      {editing && (
        <EditorModal
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={savePersonal}
        />
      )}
    </div>
  );
}

/* ── Pop-up ────────────────────────────────────────────────────────── */

function EntryModal({
  entry,
  caps,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  onReadAloud,
  onEdit,
  onDelete,
}: {
  entry: EncyclopediaItem;
  caps: EncyclopediaCaps;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onReadAloud: (e: EncyclopediaItem) => void;
  onEdit: (e: EncyclopediaItem) => void;
  onDelete: (id: string) => void;
}) {
  const personal = entry.kind === "personal";
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
            {personal ? "My entry" : (CATEGORY_LABEL[entry.category] ?? "Sticker")}
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
              {personal ? "📝" : "📖"}
            </div>
          )}

          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            {entry.term}
          </h3>
          {(() => {
            // Prefer tiered content for the viewer's age when present;
            // fall back to the plain definition otherwise.
            const tier = pickTier(entry, caps.viewerAgeGroup);
            const body = tier?.longBlurb ?? tier?.shortDescription ?? entry.definition;
            return (
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2 whitespace-pre-wrap">
                {body}
              </p>
            );
          })()}
          {entry.era && (
            <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400 font-semibold mb-2">
              {entry.era}
            </p>
          )}
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
            {personal
              ? "Your own entry"
              : `Found in ${prettyGame(entry.source)}`}
            {entry.collectedAt ? ` · ${fmtDate(entry.collectedAt)}` : ""}
          </p>

          {personal && (
            <div className="flex justify-center gap-4 mb-4">
              <button
                onClick={() => onEdit(entry)}
                className="text-sm font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(entry.id)}
                className="text-sm font-semibold text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          )}

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

/* ── Editor (create / edit a personal entry) ───────────────────────── */

function EditorModal({
  initial,
  onCancel,
  onSave,
}: {
  initial: PersonalDraft;
  onCancel: () => void;
  onSave: (draft: PersonalDraft) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<PersonalDraft>(initial);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof PersonalDraft>(k: K, v: PersonalDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const submit = async () => {
    if (!draft.term.trim() || !draft.note.trim()) return;
    setSaving(true);
    const ok = await onSave({
      ...draft,
      term: draft.term.trim(),
      note: draft.note.trim(),
      bibleRef: draft.bibleRef.trim(),
      imageUrl: draft.imageUrl.trim(),
    });
    setSaving(false);
    if (!ok) return;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4"
      onClick={onCancel}
    >
      <div
        className="relative max-w-md w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          {initial.id ? "Edit entry" : "New entry"}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Term
            </label>
            <input
              type="text"
              value={draft.term}
              onChange={(e) => set("term", e.target.value)}
              placeholder="e.g. Faith"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-coral-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("category", c)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                    draft.category === c
                      ? "bg-coral-600 border-coral-600 text-white"
                      : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-coral-300"
                  }`}
                >
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Scripture reference{" "}
              <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              type="text"
              value={draft.bibleRef}
              onChange={(e) => set("bibleRef", e.target.value)}
              placeholder="e.g. Hebrews 11:1"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-coral-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Note
            </label>
            <textarea
              value={draft.note}
              onChange={(e) => set("note", e.target.value)}
              rows={4}
              placeholder="What you want to remember about this…"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-coral-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Image URL <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              type="text"
              value={draft.imageUrl}
              onChange={(e) => set("imageUrl", e.target.value)}
              placeholder="/uploads/…"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-coral-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !draft.term.trim() || !draft.note.trim()}
            className="px-5 py-2 text-sm font-medium bg-coral-600 hover:bg-coral-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-lg"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
