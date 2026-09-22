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
  // Rich fields — present on JSON-imported entries. The old simple
  // form editor doesn't touch these; use "Edit as JSON" to modify.
  era?: string | null;
  timeline?: unknown;
  locations?: string[];
  contentByTier?: unknown;
  stickerId?: string | null;
}

interface ImageAsset {
  id: string;
  filename: string;
  path: string;
  altText: string;
  categories: string[];
}

interface StickerOption {
  id: string;
  slug: string;
  name: string;
  kind: string;
  path: string;
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
  const [stickers, setStickers] = useState<StickerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<EncyclopediaEntry | null>(null);
  const [creating, setCreating] = useState(false);
  // Import textarea contents lifted here so "Edit as JSON" on any entry
  // card can populate it with that entry's current rich data. Round-
  // trips via the same POST /api/admin/encyclopedia/import endpoint
  // (upsert by slug).
  const [importPaste, setImportPaste] = useState("");

  const editAsJson = useCallback((entry: EncyclopediaEntry) => {
    const shape: Record<string, unknown> = {
      slug: entry.slug,
      name: entry.term,
      category: entry.category,
      bibleRef: entry.bibleRef,
      ageGroup: entry.ageGroup,
      isActive: entry.isActive,
      triggers: entry.triggers,
    };
    if (entry.era != null) shape.era = entry.era;
    if (entry.timeline != null) shape.timeline = entry.timeline;
    if (entry.locations && entry.locations.length > 0) {
      shape.locations = entry.locations;
    }
    if (entry.contentByTier != null) shape.content = entry.contentByTier;
    // Keep the plain definition too so simple entries round-trip
    // faithfully. Rich entries can drop it since contentByTier is the
    // canonical source.
    if (!entry.contentByTier) shape.definition = entry.definition;
    setImportPaste(JSON.stringify(shape, null, 2));
    // Nudge the page to the top so the textarea is in view.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [entriesRes, imagesRes, stickersRes] = await Promise.all([
        fetch("/api/admin/encyclopedia"),
        fetch("/api/admin/images"),
        fetch("/api/admin/stickers"),
      ]);
      if (entriesRes.ok) {
        setEntries(await entriesRes.json());
      } else {
        setError("Failed to load entries.");
      }
      if (imagesRes.ok) {
        setImages(await imagesRes.json());
      }
      if (stickersRes.ok) {
        setStickers(await stickersRes.json());
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

      <JsonImporter
        value={importPaste}
        onChange={setImportPaste}
        onImported={fetchAll}
      />

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
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => setEditing(entry)}
                    className="text-xs text-coral-600 hover:text-coral-700 dark:text-coral-400 dark:hover:text-coral-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => editAsJson(entry)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                    title="Loads the entry's full data into the JSON importer at the top. Edit + hit Import to save."
                  >
                    Edit as JSON
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
          stickers={stickers}
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
  stickers,
  onCancel,
  onSave,
}: {
  initial: EncyclopediaEntry | Omit<EncyclopediaEntry, "id">;
  images: ImageAsset[];
  stickers: StickerOption[];
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

  // ── Rich fields (all optional; expand via <details> when needed) ────
  const initContent = (initial.contentByTier ?? {}) as ContentByTier;
  const [era, setEra] = useState<string>(initial.era ?? "");
  const [stickerId, setStickerId] = useState<string>(initial.stickerId ?? "");
  const [locationsList, setLocationsList] = useState<string[]>(
    Array.isArray(initial.locations) ? [...initial.locations] : [],
  );
  const [timeline, setTimeline] = useState<TimelineItem[]>(
    Array.isArray(initial.timeline) ? [...(initial.timeline as TimelineItem[])] : [],
  );
  const [littleOnes, setLittleOnes] = useState<TierContentDraft>(
    initTierDraft(initContent.littleOnes),
  );
  const [youth, setYouth] = useState<TierContentDraft>(
    initTierDraft(initContent.youth),
  );
  const [adult, setAdult] = useState<TierContentDraft>(
    initTierDraft(initContent.adult),
  );

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
    // Collapse the three tier drafts back into contentByTier only if
    // ANY tier has content — otherwise null so the entry stays "simple".
    const rawContent: ContentByTier = {
      littleOnes: tierDraftToPayload(littleOnes),
      youth: tierDraftToPayload(youth),
      adult: tierDraftToPayload(adult),
    };
    const anyTierContent =
      Object.keys(rawContent.littleOnes ?? {}).length > 0 ||
      Object.keys(rawContent.youth ?? {}).length > 0 ||
      Object.keys(rawContent.adult ?? {}).length > 0;
    const contentByTier = anyTierContent
      ? Object.fromEntries(
          Object.entries(rawContent).filter(
            ([, v]) => v && Object.keys(v).length > 0,
          ),
        )
      : null;

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
      era: era.trim() || null,
      timeline: timeline.length > 0 ? timeline : null,
      locations: locationsList,
      contentByTier,
      stickerId: stickerId || null,
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

            {/* ── Sticker link (BIBLE_CHARACTER + others) ────────── */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Linked sticker <span className="text-zinc-400">(collectable art)</span>
              </label>
              <select
                value={stickerId}
                onChange={(e) => setStickerId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
              >
                <option value="">— none —</option>
                {stickers
                  .filter((s) => s.kind === "BIBLE_CHARACTER")
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.slug})
                    </option>
                  ))}
              </select>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                Only Bible-character stickers listed. When linked, the sticker
                becomes the entry&apos;s portrait and unlocks as a collectable
                once the child discovers this entry.
              </p>
            </div>

            {/* ── Era + Locations (Bible-character style entries) ── */}
            <details className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                🕰 Era &amp; locations
              </summary>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Era
                  </label>
                  <input
                    type="text"
                    value={era}
                    onChange={(e) => setEra(e.target.value)}
                    placeholder='e.g. "Patriarchs", "Kings", "Gospels"'
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                  />
                </div>
                <StringListEditor
                  label="Locations"
                  values={locationsList}
                  onChange={setLocationsList}
                  placeholder="e.g. Egypt"
                />
              </div>
            </details>

            {/* ── Timeline ─────────────────────────────────────── */}
            <details className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                📜 Timeline ({timeline.length})
              </summary>
              <div className="mt-3">
                <TimelineEditor values={timeline} onChange={setTimeline} />
              </div>
            </details>

            {/* ── Per-tier content (Little Ones / Youth / Adult) ─── */}
            {(
              [
                ["littleOnes", "🧸 Little Ones content", littleOnes, setLittleOnes],
                ["youth", "🌱 Youth content", youth, setYouth],
                ["adult", "📖 Adult content", adult, setAdult],
              ] as const
            ).map(([key, label, tier, setTier]) => (
              <details
                key={key}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3"
              >
                <summary className="cursor-pointer text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  {label}
                  <span className="text-zinc-400 font-normal ml-2 text-xs">
                    ({tier.trivia.length} trivia · {tier.cluesHardToEasy.length} clues)
                  </span>
                </summary>
                <div className="mt-3">
                  <TierContentEditor tier={tier} onChange={setTier} />
                </div>
              </details>
            ))}
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
 * Encyclopedia JSON importer. Two ways in — pick whichever's less
 * friction for the moment:
 *   1. Paste the JSON straight from your AI tool into the textarea and
 *      hit Import. One entry, an array, or {entries: [...]} all fine.
 *   2. Drop one or many .json files into the file zone.
 *
 * Both routes go through /api/admin/encyclopedia/import — same
 * validation, same upsert-by-slug, same auto-link to matching Sticker.
 */
function JsonImporter({
  value,
  onChange,
  onImported,
}: {
  value?: string;
  onChange?: (v: string) => void;
  onImported: () => void;
}) {
  // Controlled if the parent supplies value + onChange; else self-owned.
  const [inner, setInner] = useState("");
  const pasted = value ?? inner;
  const setPasted = (v: string) => {
    if (onChange) onChange(v);
    else setInner(v);
  };
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Normalise whatever the user gave us (raw string OR file contents)
  // into a flat list of entry objects to POST. Accepts single object,
  // array, or {entries: [...]}.
  const collectEntries = (text: string): unknown[] | { error: string } => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return {
        error: `Not valid JSON — ${e instanceof Error ? e.message : "parse error"}`,
      };
    }
    if (Array.isArray(parsed)) return parsed;
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as Record<string, unknown>).entries)
    ) {
      return (parsed as { entries: unknown[] }).entries;
    }
    return [parsed];
  };

  const postEntries = async (entries: unknown[]) => {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const res = await fetch("/api/admin/encyclopedia/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? `HTTP ${res.status}`);
        return;
      }
      const body = (await res.json()) as ImportSummary;
      setSummary(body);
      onImported();
      if (body.created + body.updated > 0 && body.errors === 0) {
        setPasted(""); // clear the textarea on a fully-clean success
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "network error");
    } finally {
      setBusy(false);
    }
  };

  const handlePasteImport = () => {
    const text = pasted.trim();
    if (!text) {
      setError("Paste some JSON first.");
      return;
    }
    const entries = collectEntries(text);
    if ("error" in entries) {
      setError(entries.error);
      return;
    }
    void postEntries(entries);
  };

  const handleFiles = async (files: FileList | File[]) => {
    const entries: unknown[] = [];
    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith(".json")) continue;
      const text = await file.text();
      const collected = collectEntries(text);
      if ("error" in collected) {
        setError(`${file.name}: ${collected.error}`);
        return;
      }
      entries.push(...collected);
    }
    if (entries.length === 0) {
      setError("No JSON files found in the drop.");
      return;
    }
    void postEntries(entries);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          📥 Import JSON
        </h3>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Upserts by slug · auto-links to matching sticker
        </p>
      </div>

      {/* Primary path: paste — usually one character at a time straight
          from an AI chat. */}
      <div>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder='Paste one JSON object, an array, or { "entries": [ ... ] }'
          rows={8}
          className="w-full font-mono text-xs px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 resize-y"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={handlePasteImport}
            disabled={busy || !pasted.trim()}
            className="px-4 py-1.5 text-sm font-medium rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
          >
            {busy ? "Importing…" : "Import"}
          </button>
          <button
            onClick={() => {
              setPasted("");
              setSummary(null);
              setError(null);
            }}
            disabled={busy || (!pasted && !summary && !error)}
            className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-30"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Secondary path: drop .json files (for bulk re-imports from
          prompts/encyclopedia/). */}
      <details className="mt-3">
        <summary className="text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer select-none">
          Or drop .json files (bulk import)
        </summary>
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
          className={`mt-2 border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
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
          </label>
        </div>
      </details>

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

/* ── Rich-content editors ─────────────────────────────────────────── */

interface TimelineItem {
  when: string;
  event: string;
}

interface TriviaItem {
  question: string;
  answer: string;
  bibleRef?: string;
  source?: "rewritten" | "derived";
}

interface TierContentDraft {
  shortDescription: string;
  longBlurb: string;
  trivia: TriviaItem[];
  cluesHardToEasy: string[];
}

interface ContentByTier {
  littleOnes?: Partial<TierContentDraft>;
  youth?: Partial<TierContentDraft>;
  adult?: Partial<TierContentDraft>;
}

function initTierDraft(source: Partial<TierContentDraft> | undefined): TierContentDraft {
  return {
    shortDescription: source?.shortDescription ?? "",
    longBlurb: source?.longBlurb ?? "",
    trivia: Array.isArray(source?.trivia) ? [...(source!.trivia as TriviaItem[])] : [],
    cluesHardToEasy: Array.isArray(source?.cluesHardToEasy)
      ? [...(source!.cluesHardToEasy as string[])]
      : [],
  };
}

function tierDraftToPayload(d: TierContentDraft): Partial<TierContentDraft> | undefined {
  const out: Partial<TierContentDraft> = {};
  const sd = d.shortDescription.trim();
  const lb = d.longBlurb.trim();
  if (sd) out.shortDescription = sd;
  if (lb) out.longBlurb = lb;
  const trivia = d.trivia
    .map((t) => ({
      question: t.question.trim(),
      answer: t.answer.trim(),
      bibleRef: t.bibleRef?.trim() || undefined,
      source: t.source,
    }))
    .filter((t) => t.question && t.answer);
  if (trivia.length > 0) out.trivia = trivia;
  const clues = d.cluesHardToEasy.map((c) => c.trim()).filter(Boolean);
  if (clues.length > 0) out.cluesHardToEasy = clues;
  return Object.keys(out).length > 0 ? out : undefined;
}

function StringListEditor({
  label,
  values,
  onChange,
  placeholder,
  ordered,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  ordered?: boolean;
}) {
  const update = (i: number, v: string) => {
    const next = values.slice();
    next[i] = v;
    onChange(next);
  };
  const add = () => onChange([...values, ""]);
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= values.length) return;
    const next = values.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
        {label}
      </label>
      <div className="space-y-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex items-center gap-1">
            {ordered && (
              <span className="w-6 text-xs text-zinc-400 text-right">{i + 1}.</span>
            )}
            <input
              type="text"
              value={v}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100"
            />
            {ordered && (
              <>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30 px-1"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === values.length - 1}
                  className="text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30 px-1"
                  aria-label="Move down"
                >
                  ↓
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-xs text-zinc-400 hover:text-rose-600 px-1"
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
      >
        + Add
      </button>
    </div>
  );
}

function TimelineEditor({
  values,
  onChange,
}: {
  values: TimelineItem[];
  onChange: (next: TimelineItem[]) => void;
}) {
  const update = (i: number, patch: Partial<TimelineItem>) => {
    const next = values.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () => onChange([...values, { when: "", event: "" }]);
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  return (
    <div>
      <div className="space-y-2">
        {values.map((t, i) => (
          <div key={i} className="flex items-start gap-2">
            <input
              type="text"
              value={t.when}
              onChange={(e) => update(i, { when: e.target.value })}
              placeholder="c. 1593 BCE or Later"
              className="w-40 flex-shrink-0 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm"
            />
            <input
              type="text"
              value={t.event}
              onChange={(e) => update(i, { event: e.target.value })}
              placeholder="What happened, in your own words"
              className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-xs text-zinc-400 hover:text-rose-600 px-1 pt-1.5"
              aria-label="Remove event"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
      >
        + Add event
      </button>
    </div>
  );
}

function TriviaEditor({
  values,
  onChange,
}: {
  values: TriviaItem[];
  onChange: (next: TriviaItem[]) => void;
}) {
  const update = (i: number, patch: Partial<TriviaItem>) => {
    const next = values.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () =>
    onChange([...values, { question: "", answer: "", source: "derived" }]);
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  return (
    <div>
      <div className="space-y-2">
        {values.map((t, i) => (
          <div
            key={i}
            className="rounded-md border border-zinc-200 dark:border-zinc-800 p-2 bg-zinc-50 dark:bg-zinc-900/40"
          >
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xs text-zinc-400">#{i + 1}</span>
              <select
                value={t.source ?? "derived"}
                onChange={(e) =>
                  update(i, {
                    source: e.target.value as "rewritten" | "derived",
                  })
                }
                className="text-[11px] rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-1 py-0.5"
              >
                <option value="rewritten">rewritten</option>
                <option value="derived">derived</option>
              </select>
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-auto text-xs text-zinc-400 hover:text-rose-600"
              >
                ✕ remove
              </button>
            </div>
            <input
              type="text"
              value={t.question}
              onChange={(e) => update(i, { question: e.target.value })}
              placeholder="Question"
              className="w-full mb-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={t.answer}
                onChange={(e) => update(i, { answer: e.target.value })}
                placeholder="Answer"
                className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm"
              />
              <input
                type="text"
                value={t.bibleRef ?? ""}
                onChange={(e) => update(i, { bibleRef: e.target.value })}
                placeholder="Ref (optional)"
                className="w-32 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm"
              />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
      >
        + Add question
      </button>
    </div>
  );
}

function TierContentEditor({
  tier,
  onChange,
}: {
  tier: TierContentDraft;
  onChange: (next: TierContentDraft) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
          Short description
        </label>
        <textarea
          value={tier.shortDescription}
          onChange={(e) => onChange({ ...tier, shortDescription: e.target.value })}
          rows={2}
          maxLength={500}
          placeholder="1-2 sentences at this age's reading level"
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
          Long blurb
        </label>
        <textarea
          value={tier.longBlurb}
          onChange={(e) => onChange({ ...tier, longBlurb: e.target.value })}
          rows={4}
          placeholder="Full paragraph"
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
          Trivia ({tier.trivia.length})
        </label>
        <TriviaEditor
          values={tier.trivia}
          onChange={(v) => onChange({ ...tier, trivia: v })}
        />
      </div>
      <StringListEditor
        label={`Clues (hardest to easiest, ${tier.cluesHardToEasy.length})`}
        values={tier.cluesHardToEasy}
        onChange={(v) => onChange({ ...tier, cluesHardToEasy: v })}
        placeholder="I ..."
        ordered
      />
    </div>
  );
}
