"use client";

import { useState, useMemo } from "react";

interface BookItem {
  id: string;
  slug: string;
  term: string;
  definition: string;
  imageUrl: string | null;
  bibleRef: string | null;
  category: "PEOPLE" | "PLACES" | "THINGS" | "EVENTS";
  collectedAt: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  PEOPLE: "People",
  PLACES: "Places",
  THINGS: "Things",
  EVENTS: "Events",
};

const FILTERS = ["All", "PEOPLE", "PLACES", "THINGS", "EVENTS"] as const;

function categoryColor(category: string): string {
  switch (category) {
    case "PEOPLE":
      return "bg-amber-100 dark:bg-amber-300/20 text-amber-700 dark:text-amber-300";
    case "PLACES":
      return "bg-emerald-100 dark:bg-emerald-300/20 text-emerald-700 dark:text-emerald-300";
    case "THINGS":
      return "bg-coral-100 dark:bg-coral-300/20 text-coral-700 dark:text-coral-300";
    case "EVENTS":
      return "bg-violet-100 dark:bg-violet-300/20 text-violet-700 dark:text-violet-300";
    default:
      return "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400";
  }
}

export default function EncyclopediaBook({ items }: { items: BookItem[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [selected, setSelected] = useState<BookItem | null>(null);

  const filtered = useMemo(
    () => (filter === "All" ? items : items.filter((i) => i.category === filter)),
    [filter, items],
  );

  const collectedCount = items.filter((i) => i.collectedAt).length;
  const totalCount = items.length;
  const progressPct =
    totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          📖 My Encyclopedia
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Find words and pictures while playing games to add them to your book!
        </p>
      </div>

      {/* Progress card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Your collection
          </p>
          <p className="text-sm font-bold text-coral-600 dark:text-coral-400">
            {collectedCount} / {totalCount} found
          </p>
        </div>
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-coral-500 to-amber-400 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 mb-6 w-fit flex-wrap">
        {FILTERS.map((f) => {
          const count =
            f === "All"
              ? items.length
              : items.filter((i) => i.category === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                filter === f
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {f === "All" ? "All" : CATEGORY_LABELS[f]}
              {count > 0 && (
                <span className="ml-1.5 text-xs opacity-60">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">
            {items.length === 0
              ? "No entries yet. Ask a grown-up to add some!"
              : "No entries in this section yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((item) => {
            const collected = !!item.collectedAt;
            return (
              <button
                key={item.id}
                onClick={() => collected && setSelected(item)}
                disabled={!collected}
                className={`group bg-white dark:bg-zinc-900 rounded-2xl border-2 overflow-hidden transition shadow-sm ${
                  collected
                    ? "border-coral-200 dark:border-coral-800 hover:border-coral-400 dark:hover:border-coral-600 hover:shadow-lg cursor-pointer"
                    : "border-zinc-200 dark:border-zinc-800 opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="aspect-square bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center p-3">
                  {collected ? (
                    item.imageUrl ? (
                      <img
                        src={item.imageUrl.startsWith("/") ? item.imageUrl : `/${item.imageUrl}`}
                        alt={item.term}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <span className="text-5xl">📖</span>
                    )
                  ) : (
                    <span className="text-5xl text-zinc-300 dark:text-zinc-700">?</span>
                  )}
                </div>
                <div className="p-3 text-center">
                  <p
                    className={`text-sm font-bold mb-1 ${
                      collected
                        ? "text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-400 dark:text-zinc-600"
                    }`}
                  >
                    {collected ? item.term : "???"}
                  </p>
                  <span
                    className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${categoryColor(item.category)}`}
                  >
                    {CATEGORY_LABELS[item.category]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 z-10 p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-full transition"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="aspect-square bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center p-6">
              {selected.imageUrl ? (
                <img
                  src={selected.imageUrl.startsWith("/") ? selected.imageUrl : `/${selected.imageUrl}`}
                  alt={selected.term}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-7xl">📖</span>
              )}
            </div>

            <div className="p-6 text-center">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                {selected.term}
              </h2>
              <span
                className={`inline-block text-xs font-medium px-3 py-1 rounded-full mb-4 ${categoryColor(selected.category)}`}
              >
                {CATEGORY_LABELS[selected.category]}
              </span>
              <p className="text-zinc-700 dark:text-zinc-300 mb-3">
                {selected.definition}
              </p>
              {selected.bibleRef && (
                <p className="text-sm text-coral-600 dark:text-coral-400 italic">
                  {selected.bibleRef}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
