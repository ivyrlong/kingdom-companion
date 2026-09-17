"use client";

import { useState, useEffect, useCallback } from "react";

/* ── Types ─────────────────────────────────────────────────────────── */

interface EncyclopediaEntry {
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

interface ImageAsset {
  id: string;
  filename: string;
  path: string;
  altText: string;
  categories: string[];
}

const CATEGORIES = ["PEOPLE", "PLACES", "THINGS", "EVENTS"] as const;
const CATEGORY_LABELS: Record<string, string> = {
  PEOPLE: "People",
  PLACES: "Places",
  THINGS: "Things",
  EVENTS: "Events",
};

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

const EMPTY_ENTRY: Omit<EncyclopediaEntry, "id"> = {
  slug: "",
  term: "",
  definition: "",
  imageUrl: null,
  bibleRef: null,
  category: "THINGS",
  triggers: [],
  ageGroup: "LITTLE_ONES",
  isActive: true,
};

/* ── Component ─────────────────────────────────────────────────────── */

export default function EncyclopediaManager() {
  const [entries, setEntries] = useState<EncyclopediaEntry[]>([]);
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<EncyclopediaEntry | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [entriesRes, imagesRes] = await Promise.all([
        fetch("/api/admin/encyclopedia"),
        fetch("/api/admin/images"),
      ]);
      if (entriesRes.ok) {
        setEntries(await entriesRes.json());
      } else {
        setError("Failed to load entries.");
      }
      if (imagesRes.ok) {
        setImages(await imagesRes.json());
      }
    } catch {
      setError("Failed to load entries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this entry? Users who have collected it will lose it.")) return;
    try {
      const res = await fetch(`/api/admin/encyclopedia/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      } else {
        setError("Failed to delete entry.");
      }
    } catch {
      setError("Failed to delete entry.");
    }
  };

  const handleSave = async (entry: EncyclopediaEntry | (Omit<EncyclopediaEntry, "id"> & { id?: string })) => {
    const isNew = !("id" in entry) || !entry.id;
    const url = isNew
      ? "/api/admin/encyclopedia"
      : `/api/admin/encyclopedia/${entry.id}`;
    const method = isNew ? "POST" : "PATCH";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      if (res.ok) {
        const saved = await res.json();
        if (isNew) {
          setEntries((prev) =>
            [...prev, saved].sort((a, b) => a.term.localeCompare(b.term)),
          );
        } else {
          setEntries((prev) =>
            prev
              .map((e) => (e.id === saved.id ? saved : e))
              .sort((a, b) => a.term.localeCompare(b.term)),
          );
        }
        setEditing(null);
        setCreating(false);
        return true;
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to save entry.");
        return false;
      }
    } catch {
      setError("Failed to save entry.");
      return false;
    }
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

      <JsonImporter onImported={fetchAll} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </p>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-coral-600 hover:bg-coral-700 text-white text-sm font-medium rounded-lg transition"
        >
          + New Entry
        </button>
      </div>

      {loading ? (
        <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-zinc-500 dark:text-zinc-400">
            No entries yet. Click <span className="font-medium">+ New Entry</span> to add the first one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:shadow-md transition"
            >
              <div className="aspect-video bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
                {entry.imageUrl ? (
                  <img
                    src={entry.imageUrl.startsWith("/") ? entry.imageUrl : `/${entry.imageUrl}`}
                    alt={entry.term}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-4xl text-zinc-300 dark:text-zinc-700">📖</span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {entry.term}
                  </h3>
                  {!entry.isActive && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2 font-mono">
                  {entry.slug}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-3 line-clamp-2">
                  {entry.definition}
                </p>
                <div className="flex flex-wrap gap-1 mb-3">
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${categoryColor(entry.category)}`}
                  >
                    {CATEGORY_LABELS[entry.category]}
                  </span>
                  {entry.bibleRef && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {entry.bibleRef}
                    </span>
                  )}
                  {entry.triggers.length > 0 && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                      +{entry.triggers.length} trigger{entry.triggers.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditing(entry)}
                    className="text-xs text-coral-600 hover:text-coral-700 dark:text-coral-400 dark:hover:text-coral-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <EntryEditor
          initial={editing ?? { ...EMPTY_ENTRY }}
          images={images}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

/* ── Editor Modal ──────────────────────────────────────────────────── */

function EntryEditor({
  initial,
  images,
  onCancel,
  onSave,
}: {
  initial: EncyclopediaEntry | Omit<EncyclopediaEntry, "id">;
  images: ImageAsset[];
  onCancel: () => void;
  onSave: (entry: EncyclopediaEntry | (Omit<EncyclopediaEntry, "id"> & { id?: string })) => Promise<boolean>;
}) {
  const [term, setTerm] = useState(initial.term);
  const [slug, setSlug] = useState(initial.slug);
  const [definition, setDefinition] = useState(initial.definition);
  const [imageUrl, setImageUrl] = useState<string | null>(initial.imageUrl);
  const [bibleRef, setBibleRef] = useState(initial.bibleRef ?? "");
  const [category, setCategory] = useState<EncyclopediaEntry["category"]>(initial.category);
  const [triggersStr, setTriggersStr] = useState(initial.triggers.join(", "));
  const [isActive, setIsActive] = useState(initial.isActive);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Auto-generate slug from term if user hasn't customized it
  const handleTermChange = (value: string) => {
    setTerm(value);
    const autoSlug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!slug || slug === initial.slug) {
      setSlug(autoSlug);
    }
  };

  const handleSubmit = async () => {
    if (!term.trim() || !slug.trim() || !definition.trim()) return;
    setSaving(true);
    const triggers = triggersStr.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = {
      ...("id" in initial ? { id: initial.id } : {}),
      term: term.trim(),
      slug: slug.trim(),
      definition: definition.trim(),
      imageUrl,
      bibleRef: bibleRef.trim() || null,
      category,
      triggers,
      ageGroup: "LITTLE_ONES" as const,
      isActive,
    };
    const ok = await onSave(payload);
    setSaving(false);
    if (!ok) return;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onCancel}
    >
      <div
        className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {"id" in initial ? "Edit Entry" : "New Entry"}
            </h2>
            <button
              onClick={onCancel}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* Term */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Term
              </label>
              <input
                type="text"
                value={term}
                onChange={(e) => handleTermChange(e.target.value)}
                placeholder="e.g. Ark"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-coral-500"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Slug <span className="text-zinc-400">(unique, lowercase, dash-separated)</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. ark"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-coral-500"
              />
            </div>

            {/* Definition */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Definition <span className="text-zinc-400">(simple words, 1–2 sentences)</span>
              </label>
              <textarea
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                placeholder="A big boat that Noah built to keep his family and the animals safe from the flood."
                rows={3}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-coral-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const active = category === c;
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setCategory(c)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full transition border ${
                        active
                          ? `${categoryColor(c)} border-transparent`
                          : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-coral-300"
                      }`}
                    >
                      {CATEGORY_LABELS[c]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Image */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Image
              </label>
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <img
                    src={imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}
                    alt="Selected"
                    className="w-20 h-20 object-contain rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-2xl text-zinc-300 dark:text-zinc-600">
                    📖
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setImagePickerOpen(true)}
                    className="text-sm text-coral-600 hover:text-coral-700 dark:text-coral-400"
                  >
                    {imageUrl ? "Change image" : "Pick from gallery"}
                  </button>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bible reference */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Bible Reference <span className="text-zinc-400">(optional)</span>
              </label>
              <input
                type="text"
                value={bibleRef}
                onChange={(e) => setBibleRef(e.target.value)}
                placeholder="e.g. Genesis 6:14"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-coral-500"
              />
            </div>

            {/* Triggers */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Triggers <span className="text-zinc-400">(extra keywords/refs that count, comma separated)</span>
              </label>
              <input
                type="text"
                value={triggersStr}
                onChange={(e) => setTriggersStr(e.target.value)}
                placeholder="e.g. noah's ark, ark of noah, Genesis 6:14"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-coral-500"
              />
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                The slug always counts. Add alternates here to catch more matches.
              </p>
            </div>

            {/* Active toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Active (visible to children)
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !term.trim() || !slug.trim() || !definition.trim()}
              className="px-5 py-2 text-sm font-medium bg-coral-600 hover:bg-coral-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-lg"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      {imagePickerOpen && (
        <ImagePickerModal
          images={images}
          onPick={(path) => {
            setImageUrl(path);
            setImagePickerOpen(false);
          }}
          onCancel={() => setImagePickerOpen(false)}
        />
      )}
    </div>
  );
}

/* ── Image Picker ──────────────────────────────────────────────────── */

function ImagePickerModal({
  images,
  onPick,
  onCancel,
}: {
  images: ImageAsset[];
  onPick: (path: string) => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onCancel}
    >
      <div
        className="relative max-w-3xl w-full max-h-[80vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Pick an image
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 text-zinc-400 hover:text-zinc-600"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {images.length === 0 ? (
          <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">
            No images uploaded yet. Upload some in the Image Manager first.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {images.map((img) => (
              <button
                key={img.id}
                onClick={() => onPick(img.path)}
                className="aspect-square rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent hover:border-coral-400 transition"
              >
                <img
                  src={`/${img.path}`}
                  alt={img.altText || img.filename}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── JSON importer ─────────────────────────────────────────────────── */

interface ImportResult {
  slug: string;
  status: "created" | "updated" | "skipped" | "error";
  linkedStickerSlug?: string;
  message?: string;
}

interface ImportSummary {
  total: number;
  created: number;
  updated: number;
  unlinked: number;
  errors: number;
  results: ImportResult[];
}

/**
 * Bulk drop-in for encyclopedia JSON files. Accepts one or many files at
 * a time; each file is parsed client-side, sent as a batch to
 * /api/admin/encyclopedia/import, and results are shown per-slug. Both
 * the simple shape ({slug, term, definition}) and the rich Bible-
 * character shape ({slug, name, content: {littleOnes, youth, adult}})
 * are accepted server-side — the client just uploads whatever's in the
 * files.
 */
function JsonImporter({ onImported }: { onImported: () => void }) {
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      // Read each file, parse, and collect entries. One file may contain
      // a single entry object OR an array of entries OR an { entries: [] }
      // wrapper — normalise to a flat list before posting.
      const entries: unknown[] = [];
      for (const file of Array.from(files)) {
        if (!file.name.toLowerCase().endsWith(".json")) continue;
        const text = await file.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          setError(
            `${file.name}: not valid JSON — ${e instanceof Error ? e.message : "parse error"}`,
          );
          setBusy(false);
          return;
        }
        if (Array.isArray(parsed)) {
          entries.push(...parsed);
        } else if (
          parsed &&
          typeof parsed === "object" &&
          Array.isArray((parsed as Record<string, unknown>).entries)
        ) {
          entries.push(...((parsed as { entries: unknown[] }).entries));
        } else {
          entries.push(parsed);
        }
      }
      if (entries.length === 0) {
        setError("No JSON files found in the drop.");
        setBusy(false);
        return;
      }

      const res = await fetch("/api/admin/encyclopedia/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? `HTTP ${res.status}`);
        setBusy(false);
        return;
      }
      const body = (await res.json()) as ImportSummary;
      setSummary(body);
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          📥 Import JSON
        </h3>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Drop <code>.json</code> from <code>prompts/encyclopedia/</code> — upserts by slug, auto-links to matching sticker.
        </p>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) void handleFiles(e.dataTransfer.files);
        }}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
          dragOver
            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
            : "border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-900/60"
        }`}
      >
        <label className="block cursor-pointer">
          <input
            type="file"
            multiple
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <p className="text-sm text-zinc-700 dark:text-zinc-200 font-medium">
            {busy ? "Uploading…" : "Drop JSON files here, or click to browse"}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Accepts a single object, an array, or {"{ entries: [...] }"}. Rich
            content (contentByTier / timeline / locations / era) and simple
            entries both fine.
          </p>
        </label>
      </div>

      {error && (
        <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}

      {summary && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-zinc-700 dark:text-zinc-200">
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              ✓ {summary.created} created
            </span>
            {" · "}
            <span className="font-medium text-sky-700 dark:text-sky-400">
              {summary.updated} updated
            </span>
            {summary.unlinked > 0 && (
              <>
                {" · "}
                <span className="text-amber-700 dark:text-amber-400">
                  {summary.unlinked} without linked sticker
                </span>
              </>
            )}
            {summary.errors > 0 && (
              <>
                {" · "}
                <span className="text-rose-700 dark:text-rose-400">
                  {summary.errors} errors
                </span>
              </>
            )}
          </p>
          {summary.results.filter((r) => r.status === "error").length > 0 && (
            <ul className="text-xs text-rose-600 dark:text-rose-400 space-y-0.5">
              {summary.results
                .filter((r) => r.status === "error")
                .map((r) => (
                  <li key={r.slug}>
                    <code>{r.slug}</code>: {r.message}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
