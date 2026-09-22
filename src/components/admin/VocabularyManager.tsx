"use client";

/**
 * Vocabulary Manager — admin tool for the shared vocabulary catalog.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  Search + type filter                                       │
 *   ├─────────────┬───────────────────────────────────────────────┤
 *   │ Sidebar     │  Terms list with checkbox column              │
 *   │ - Inbox     │  Each row: word/phrase, category chips,       │
 *   │ - Bible…    │            useCount, pack count               │
 *   │ - Prayer    │                                                │
 *   │ - …         │  Bulk bar (visible when any selected):        │
 *   │             │    [Add category ▼] [Remove ▼] [Delete]       │
 *   └─────────────┴───────────────────────────────────────────────┘
 *
 * The Inbox = uncategorised terms. Every other left-nav item is a
 * category filter. The right pane is one list with different filter
 * state depending on which nav item is active.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  termCount: number;
}

interface Term {
  id: string;
  term: string;
  display: string;
  type: "WORD" | "PHRASE";
  ageAppropriate: string[];
  bibleRef: string | null;
  useCount: number;
  categories: Array<{ id: string; slug: string; name: string; icon: string | null }>;
  packLinkCount: number;
}

type Filter =
  | { kind: "inbox" }
  | { kind: "category"; slug: string; name: string }
  | { kind: "all" };

export default function VocabularyManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [terms, setTerms] = useState<Term[]>([]);
  const [totalTerms, setTotalTerms] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>({ kind: "inbox" });
  const [typeFilter, setTypeFilter] = useState<"" | "WORD" | "PHRASE">("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/vocabulary/categories");
      if (!res.ok) return;
      const body = await res.json();
      setCategories(body.categories ?? []);
      setUncategorizedCount(body.uncategorizedCount ?? 0);
    } catch {
      // silent
    }
  }, []);

  const loadTerms = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (typeFilter) params.set("type", typeFilter);
      if (filter.kind === "category") params.set("category", filter.slug);
      else if (filter.kind === "inbox") params.set("uncategorized", "1");
      params.set("limit", "200");
      const res = await fetch(`/api/admin/vocabulary?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Failed (${res.status})`);
        return;
      }
      const body = await res.json();
      setTerms(body.terms ?? []);
      setTotalTerms(body.total ?? 0);
      setSelected(new Set()); // reset selection when the list changes
    } finally {
      setLoading(false);
    }
  }, [filter, typeFilter, query]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);
  useEffect(() => {
    loadTerms();
  }, [loadTerms]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === terms.length) setSelected(new Set());
    else setSelected(new Set(terms.map((t) => t.id)));
  };

  const bulkAdd = async () => {
    if (!bulkCategory || selected.size === 0) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/vocabulary/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          termIds: [...selected],
          add: [bulkCategory],
        }),
      });
      const body = await res.json();
      if (res.ok) {
        setMessage(`✓ Added to ${body.added} term(s).`);
        await Promise.all([loadTerms(), loadCategories()]);
      } else {
        setError(body.error || "Failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const bulkRemove = async (categoryId: string) => {
    if (selected.size === 0) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/vocabulary/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          termIds: [...selected],
          remove: [categoryId],
        }),
      });
      const body = await res.json();
      if (res.ok) {
        setMessage(`✓ Removed from ${body.removed} link(s).`);
        await Promise.all([loadTerms(), loadCategories()]);
      } else {
        setError(body.error || "Failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `Delete ${selected.size} term(s)? This removes them from the catalog completely and cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      let deleted = 0;
      for (const id of selected) {
        const res = await fetch(`/api/admin/vocabulary/${id}`, {
          method: "DELETE",
        });
        if (res.ok) deleted++;
      }
      setMessage(`✓ Deleted ${deleted} term(s).`);
      await Promise.all([loadTerms(), loadCategories()]);
    } finally {
      setBusy(false);
    }
  };

  const activeLabel = useMemo(() => {
    if (filter.kind === "inbox")
      return `Inbox — uncategorised (${uncategorizedCount})`;
    if (filter.kind === "category") return filter.name;
    return "All terms";
  }, [filter, uncategorizedCount]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Vocabulary Catalog
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Sort, categorise, and prune the shared word + phrase catalog.
          </p>
        </div>
      </div>

      {(message || error) && (
        <div className="space-y-2 mb-4">
          {message && (
            <div className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">
              {message}
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="space-y-1">
          <button
            onClick={() => setFilter({ kind: "inbox" })}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
              filter.kind === "inbox"
                ? "bg-coral-100 dark:bg-coral-900/40 text-coral-700 dark:text-coral-300 font-medium"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            📥 Inbox
            <span className="float-right text-xs text-zinc-400">
              {uncategorizedCount}
            </span>
          </button>
          <button
            onClick={() => setFilter({ kind: "all" })}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
              filter.kind === "all"
                ? "bg-coral-100 dark:bg-coral-900/40 text-coral-700 dark:text-coral-300 font-medium"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            🗂 All terms
          </button>
          <div className="pt-3 pb-1 text-[10px] uppercase tracking-wide font-semibold text-zinc-400">
            Categories
          </div>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() =>
                setFilter({ kind: "category", slug: c.slug, name: c.name })
              }
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                filter.kind === "category" && filter.slug === c.slug
                  ? "bg-coral-100 dark:bg-coral-900/40 text-coral-700 dark:text-coral-300 font-medium"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {c.icon && <span className="mr-1">{c.icon}</span>}
              {c.name}
              <span className="float-right text-xs text-zinc-400">
                {c.termCount}
              </span>
            </button>
          ))}
        </aside>

        {/* Main pane */}
        <main className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mr-3">
              {activeLabel}
              <span className="ml-2 text-sm font-normal text-zinc-500">
                ({totalTerms} total)
              </span>
            </h2>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none focus:ring-2 focus:ring-coral-400"
            />
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as "" | "WORD" | "PHRASE")
              }
              className="px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
            >
              <option value="">All types</option>
              <option value="WORD">Words only</option>
              <option value="PHRASE">Phrases only</option>
            </select>
          </div>

          {/* Bulk actions bar */}
          {selected.size > 0 && (
            <div className="rounded-lg border border-coral-200 dark:border-coral-900/40 bg-coral-50/50 dark:bg-coral-900/10 p-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-coral-700 dark:text-coral-300">
                {selected.size} selected
              </span>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              >
                <option value="">— Category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={bulkAdd}
                disabled={!bulkCategory || busy}
                className="px-3 py-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50"
              >
                Add category
              </button>
              {filter.kind === "category" && (
                <button
                  onClick={() =>
                    bulkRemove(
                      categories.find((c) => c.slug === filter.slug)?.id ?? "",
                    )
                  }
                  disabled={busy}
                  className="px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50"
                >
                  Remove from &ldquo;{filter.name}&rdquo;
                </button>
              )}
              <button
                onClick={bulkDelete}
                disabled={busy}
                className="ml-auto px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50"
              >
                Delete
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-zinc-500 hover:text-zinc-700"
              >
                Clear
              </button>
            </div>
          )}

          {/* Terms list */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {loading ? (
              <div className="p-6 text-sm text-zinc-500">Loading…</div>
            ) : terms.length === 0 ? (
              <div className="p-6 text-sm text-zinc-500">
                No terms match this filter.
              </div>
            ) : (
              <>
                <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50">
                  <input
                    type="checkbox"
                    checked={selected.size === terms.length && terms.length > 0}
                    onChange={toggleAll}
                    className="cursor-pointer"
                  />
                  <span className="text-xs uppercase tracking-wide text-zinc-500 font-medium">
                    {terms.length} shown
                    {totalTerms > terms.length && ` (of ${totalTerms})`}
                  </span>
                </div>
                <ul>
                  {terms.map((t) => (
                    <li
                      key={t.id}
                      className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 flex items-center gap-3"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(t.id)}
                        onChange={() => toggle(t.id)}
                        className="cursor-pointer shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {t.display}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-zinc-400">
                            {t.type}
                          </span>
                          {t.bibleRef && (
                            <span className="text-xs italic text-zinc-500">
                              {t.bibleRef}
                            </span>
                          )}
                        </div>
                        {t.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {t.categories.map((c) => (
                              <span
                                key={c.id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                              >
                                {c.icon && <span>{c.icon}</span>}
                                {c.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-xs text-zinc-400 shrink-0">
                        <div>{t.packLinkCount} pack(s)</div>
                        {t.useCount > 0 && <div>used {t.useCount}×</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
