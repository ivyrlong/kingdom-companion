"use client";

import { useState, useEffect, useCallback } from "react";

/* ── Types ──────────────────────────────────────────────────────────── */

interface ScriptureEntry {
  reference: string;
  text: string;
}

interface QuestionEntry {
  question: string;
  answer: string;
  options: string[];
}

interface ContentPack {
  id: string;
  title: string;
  source: string;
  context: string;
  vocabulary: string[];
  scriptures: ScriptureEntry[];
  keyPeople: string[];
  themes: string[];
  questions: QuestionEntry[];
  keyPhrases: string[];
  comment?: string | null;
  simplifiedComment?: string | null;
  createdAt: string;
  meetingWeek?: { id: string; weekOf: string; title: string } | null;
  _count?: { instances: number };
}

/* ── Badge helpers ──────────────────────────────────────────────────── */

function contextColor(ctx: string): string {
  switch (ctx) {
    case "MEETING_PREP":
      return "bg-sky-100 dark:bg-sky-300/20 text-sky-700 dark:text-sky-300";
    case "MEETING_LIVE":
      return "bg-violet-100 dark:bg-violet-300/20 text-violet-700 dark:text-violet-300";
    case "DAILY":
      return "bg-amber-100 dark:bg-amber-300/20 text-amber-700 dark:text-amber-300";
    default:
      return "bg-emerald-100 dark:bg-emerald-300/20 text-emerald-700 dark:text-emerald-300";
  }
}

function sourceLabel(src: string): string {
  switch (src) {
    case "WATCHTOWER":
      return "Watchtower";
    case "OCLM":
      return "Life & Ministry";
    case "DAILY_TEXT":
      return "Daily Text";
    default:
      return "Evergreen";
  }
}

/* ── Main Component ─────────────────────────────────────────────────── */

export default function ContentPackManager() {
  const [packs, setPacks] = useState<ContentPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<ContentPack | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterContext, setFilterContext] = useState<string>("All");
  const [imagesPack, setImagesPack] = useState<{
    id: string;
    title: string;
  } | null>(null);

  /* ── Fetch packs ─────────────────────────────────────────────────── */

  const fetchPacks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content-packs");
      if (res.ok) setPacks(await res.json());
    } catch {
      setError("Failed to load content packs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPacks();
  }, [fetchPacks]);

  /* ── Delete ──────────────────────────────────────────────────────── */

  const handleDelete = async (id: string, title: string) => {
    if (
      !window.confirm(
        `Delete "${title}"? This will also remove all associated game instances. This cannot be undone.`,
      )
    )
      return;

    try {
      const res = await fetch(`/api/admin/content-packs/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPacks((prev) => prev.filter((p) => p.id !== id));
        if (editingId === id) {
          setEditingId(null);
          setEditData(null);
        }
      }
    } catch {
      setError("Failed to delete content pack.");
    }
  };

  /* ── Start editing ───────────────────────────────────────────────── */

  const startEdit = (id: string) => {
    const pack = packs.find((p) => p.id === id);
    if (pack) {
      setEditData({ ...pack });
      setEditingId(id);
      setError("");
    }
  };

  /* ── Save edits ──────────────────────────────────────────────────── */

  const handleSave = async () => {
    if (!editData || !editingId) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/content-packs/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editData.title,
          source: editData.source,
          context: editData.context,
          vocabulary: editData.vocabulary,
          scriptures: editData.scriptures,
          keyPeople: editData.keyPeople,
          themes: editData.themes,
          questions: editData.questions,
          keyPhrases: editData.keyPhrases,
          comment: editData.comment ?? null,
          simplifiedComment: editData.simplifiedComment ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setEditingId(null);
      setEditData(null);
      fetchPacks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  /* ── Filter ──────────────────────────────────────────────────────── */

  const filtered =
    filterContext === "All"
      ? packs
      : packs.filter((p) => p.context === filterContext);

  /* ── Edit panel ──────────────────────────────────────────────────── */

  if (editingId && editData) {
    return (
      <ContentPackEditor
        data={editData}
        onChange={setEditData}
        onSave={handleSave}
        onCancel={() => {
          setEditingId(null);
          setEditData(null);
        }}
        saving={saving}
        error={error}
      />
    );
  }

  /* ── Pack list ───────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Filter tabs */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 w-fit flex-wrap">
        {["All", "MEETING_PREP", "MEETING_LIVE", "DAILY", "EVERGREEN"].map(
          (ctx) => {
            const count =
              ctx === "All"
                ? packs.length
                : packs.filter((p) => p.context === ctx).length;
            return (
              <button
                key={ctx}
                onClick={() => setFilterContext(ctx)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  filterContext === ctx
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700"
                }`}
              >
                {ctx === "All"
                  ? "All"
                  : ctx === "MEETING_PREP"
                    ? "Meeting Prep"
                    : ctx === "MEETING_LIVE"
                      ? "Meeting Live"
                      : ctx === "DAILY"
                        ? "Daily"
                        : "Evergreen"}
                {count > 0 && (
                  <span className="ml-1 text-xs opacity-60">({count})</span>
                )}
              </button>
            );
          },
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 mx-auto border-4 border-coral-600 border-t-transparent rounded-full" />
          <p className="text-zinc-500 dark:text-zinc-400 mt-3">
            Loading content packs...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500 dark:text-zinc-400">
            {packs.length === 0
              ? "No content packs yet."
              : "No packs in this category."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((pack) => (
            <div
              key={pack.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-coral-300 dark:hover:border-coral-700 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                    {pack.title}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${contextColor(pack.context)}`}
                    >
                      {pack.context.replace("_", " ")}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {sourceLabel(pack.source)}
                    </span>
                    {pack._count && pack._count.instances > 0 && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-coral-50 dark:bg-coral-900/20 text-coral-600 dark:text-coral-400">
                        {pack._count.instances} games
                      </span>
                    )}
                  </div>
                  {/* Content summary */}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-zinc-400">
                    {pack.vocabulary.length > 0 && (
                      <span>{pack.vocabulary.length} vocab</span>
                    )}
                    {pack.scriptures.length > 0 && (
                      <span>{pack.scriptures.length} scriptures</span>
                    )}
                    {pack.keyPeople.length > 0 && (
                      <span>{pack.keyPeople.length} people</span>
                    )}
                    {pack.questions.length > 0 && (
                      <span>{pack.questions.length} questions</span>
                    )}
                    {pack.keyPhrases.length > 0 && (
                      <span>{pack.keyPhrases.length} phrases</span>
                    )}
                  </div>
                  {pack.meetingWeek && (
                    <p className="text-xs text-zinc-400 mt-1">
                      Week:{" "}
                      {new Date(pack.meetingWeek.weekOf).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </p>
                  )}
                  <p className="text-xs text-zinc-400 mt-1">
                    Created{" "}
                    {new Date(pack.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() =>
                      setImagesPack({ id: pack.id, title: pack.title })
                    }
                    className="px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition"
                  >
                    Images
                  </button>
                  <button
                    onClick={() => startEdit(pack.id)}
                    className="px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(pack.id, pack.title)}
                    className="px-3 py-1.5 text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {imagesPack && (
        <PackImagesModal
          packId={imagesPack.id}
          packTitle={imagesPack.title}
          onClose={() => setImagesPack(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Pack Images Modal
   ═══════════════════════════════════════════════════════════════════════ */

const PI_CATEGORIES = [
  "SCENE",
  "CHARACTER",
  "ILLUSTRATION",
  "OUTLINE",
  "PHOTO",
  "COLORING_SVG",
  "COLORING_OUTLINE",
] as const;
const PI_AGE_GROUPS = ["LITTLE_ONES", "YOUTH", "ADULT", "FAMILY"] as const;

interface PackImage {
  id: string;
  filename: string;
  path: string;
  categories: string[];
  ageGroup: string;
}

function PackImagesModal({
  packId,
  packTitle,
  onClose,
}: {
  packId: string;
  packTitle: string;
  onClose: () => void;
}) {
  const [images, setImages] = useState<PackImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>("ILLUSTRATION");
  const [ageGroup, setAgeGroup] = useState<string>("FAMILY");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/images?packId=${packId}`);
      setImages(res.ok ? await res.json() : []);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [packId]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("categories", JSON.stringify([category]));
      fd.append("ageGroup", ageGroup);
      fd.append("contentPackId", packId);
      const res = await fetch("/api/admin/images", {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        setFile(null);
        await load();
      } else {
        const d = await res.json().catch(() => null);
        setErr(d?.error || "Upload failed.");
      }
    } catch {
      setErr("Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const unlink = async (id: string) => {
    setErr("");
    const res = await fetch(`/api/admin/images/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentPackId: null }),
    });
    if (res.ok) setImages((prev) => prev.filter((i) => i.id !== id));
    else setErr("Could not unlink that image.");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Images
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 truncate">
          {packTitle}
        </p>

        {err && (
          <div className="mb-4 text-sm text-red-600 dark:text-red-400">
            {err}
          </div>
        )}

        {/* Linked images */}
        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-6 text-center">
            Loading…
          </p>
        ) : images.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-6 text-center">
            No images linked to this pack yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
            {images.map((img) => (
              <div
                key={img.id}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden"
              >
                <div className="aspect-square bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      img.path.startsWith("/") ? img.path : `/${img.path}`
                    }
                    alt={img.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => unlink(img.id)}
                  className="w-full text-xs py-1.5 text-red-500 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  Unlink
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload to this pack */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Add an image to this pack
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-zinc-600 dark:text-zinc-300"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm"
            >
              {PI_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm"
            >
              {PI_AGE_GROUPS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <button
              onClick={upload}
              disabled={!file || busy}
              className="px-4 py-1.5 text-sm font-medium bg-coral-600 hover:bg-coral-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-lg transition"
            >
              {busy ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Content Pack Editor
   ═══════════════════════════════════════════════════════════════════════ */

function ContentPackEditor({
  data,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
}: {
  data: ContentPack;
  onChange: (d: ContentPack) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
}) {
  const addToList = (field: "vocabulary" | "keyPeople" | "themes" | "keyPhrases", item: string) => {
    if (!item || (data[field] as string[]).includes(item)) return;
    onChange({ ...data, [field]: [...(data[field] as string[]), item] });
  };

  const removeFromList = (field: "vocabulary" | "keyPeople" | "themes" | "keyPhrases", index: number) => {
    onChange({
      ...data,
      [field]: (data[field] as string[]).filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Edit Content Pack
        </h2>
        <button
          onClick={onCancel}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>

      {/* Title / Source / Context */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Title
          </label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-coral-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Source
          </label>
          <select
            value={data.source}
            onChange={(e) => onChange({ ...data, source: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-coral-500"
          >
            <option value="WATCHTOWER">Watchtower Study</option>
            <option value="OCLM">Life & Ministry Workbook</option>
            <option value="EVERGREEN">Evergreen (General)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Context
          </label>
          <select
            value={data.context}
            onChange={(e) => onChange({ ...data, context: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-coral-500"
          >
            <option value="MEETING_PREP">Meeting Preparation</option>
            <option value="MEETING_LIVE">Meeting Live</option>
            <option value="DAILY">Daily</option>
            <option value="EVERGREEN">Evergreen</option>
          </select>
        </div>
      </div>

      {(data.context === "DAILY" || data.source === "DAILY_TEXT") && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            Daily Text
          </h3>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Comment <span className="text-zinc-400">(Youth / Adult)</span>
            </label>
            <textarea
              value={data.comment ?? ""}
              onChange={(e) => onChange({ ...data, comment: e.target.value })}
              rows={5}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-coral-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Simplified comment{" "}
              <span className="text-zinc-400">(Little Ones)</span>
            </label>
            <textarea
              value={data.simplifiedComment ?? ""}
              onChange={(e) =>
                onChange({ ...data, simplifiedComment: e.target.value })
              }
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-coral-500 text-sm"
            />
          </div>
          <p className="text-xs text-zinc-400">
            Pictures for this day are managed with the{" "}
            <span className="font-medium">Images</span> button on the pack
            list.
          </p>
        </div>
      )}

      {/* Vocabulary */}
      <ListEditor
        title="Vocabulary"
        description={`${data.vocabulary.length} terms — used for Word Search, Crossword, Hangman`}
        items={data.vocabulary}
        onRemove={(i) => removeFromList("vocabulary", i)}
        onAdd={(item) => addToList("vocabulary", item)}
      />

      {/* Scriptures */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
          Scriptures
        </h3>
        <p className="text-xs text-zinc-400 mb-3">
          {data.scriptures.length} references — used for Scripture Match, Name
          That Scripture
        </p>
        <div className="space-y-2 mb-3">
          {data.scriptures.map((s, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input
                value={s.reference}
                onChange={(e) => {
                  const updated = [...data.scriptures];
                  updated[i] = { ...updated[i], reference: e.target.value };
                  onChange({ ...data, scriptures: updated });
                }}
                className="w-40 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                placeholder="Reference"
              />
              <input
                value={s.text}
                onChange={(e) => {
                  const updated = [...data.scriptures];
                  updated[i] = { ...updated[i], text: e.target.value };
                  onChange({ ...data, scriptures: updated });
                }}
                className="flex-1 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                placeholder="Verse text (optional)"
              />
              <button
                onClick={() =>
                  onChange({
                    ...data,
                    scriptures: data.scriptures.filter((_, idx) => idx !== i),
                  })
                }
                className="text-red-400 hover:text-red-600 text-sm px-1"
              >
                x
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            onChange({
              ...data,
              scriptures: [...data.scriptures, { reference: "", text: "" }],
            })
          }
          className="text-sm text-coral-600 hover:text-coral-700"
        >
          + Add scripture
        </button>
      </div>

      {/* Key People */}
      <ListEditor
        title="Key People"
        description={`${data.keyPeople.length} names — used for Who Am I?`}
        items={data.keyPeople}
        onRemove={(i) => removeFromList("keyPeople", i)}
        onAdd={(item) => addToList("keyPeople", item)}
      />

      {/* Themes */}
      <ListEditor
        title="Themes"
        description={`${data.themes.length} themes`}
        items={data.themes}
        onRemove={(i) => removeFromList("themes", i)}
        onAdd={(item) => addToList("themes", item)}
      />

      {/* Key Phrases */}
      <ListEditor
        title="Key Phrases"
        description={`${data.keyPhrases.length} phrases — used for Cryptogram, Meeting Bingo`}
        items={data.keyPhrases}
        onRemove={(i) => removeFromList("keyPhrases", i)}
        onAdd={(item) => addToList("keyPhrases", item)}
      />

      {/* Questions */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
          Questions
        </h3>
        <p className="text-xs text-zinc-400 mb-3">
          {data.questions.length} questions — used for Trivia
        </p>
        <div className="space-y-3 mb-3">
          {data.questions.map((q, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 space-y-2"
            >
              <div className="flex gap-2">
                <input
                  value={q.question}
                  onChange={(e) => {
                    const updated = [...data.questions];
                    updated[i] = { ...updated[i], question: e.target.value };
                    onChange({ ...data, questions: updated });
                  }}
                  className="flex-1 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100"
                  placeholder="Question"
                />
                <button
                  onClick={() =>
                    onChange({
                      ...data,
                      questions: data.questions.filter((_, idx) => idx !== i),
                    })
                  }
                  className="text-red-400 hover:text-red-600 text-sm px-1"
                >
                  x
                </button>
              </div>
              <input
                value={q.answer}
                onChange={(e) => {
                  const updated = [...data.questions];
                  updated[i] = { ...updated[i], answer: e.target.value };
                  onChange({ ...data, questions: updated });
                }}
                className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100"
                placeholder="Answer"
              />
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            onChange({
              ...data,
              questions: [
                ...data.questions,
                { question: "", answer: "", options: [] },
              ],
            })
          }
          className="text-sm text-coral-600 hover:text-coral-700"
        >
          + Add question
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-6 py-2.5 bg-coral-600 hover:bg-coral-700 disabled:bg-coral-400 text-white font-medium rounded-lg transition"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Reusable list editor ──────────────────────────────────────────── */

function ListEditor({
  title,
  description,
  items,
  onRemove,
  onAdd,
}: {
  title: string;
  description: string;
  items: string[];
  onRemove: (index: number) => void;
  onAdd: (item: string) => void;
}) {
  const [value, setValue] = useState("");

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue("");
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
        {title}
      </h3>
      <p className="text-xs text-zinc-400 mb-3">{description}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-coral-50 dark:bg-coral-900/20 text-coral-700 dark:text-coral-300 rounded-lg text-sm"
          >
            {item}
            <button
              onClick={() => onRemove(i)}
              className="text-coral-400 hover:text-red-500 ml-0.5"
            >
              x
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-sm text-zinc-400">
            None — add manually
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
          placeholder={`Add ${title.toLowerCase()}...`}
        />
        <button
          onClick={handleAdd}
          className="text-sm text-coral-600 hover:text-coral-700 px-2"
        >
          Add
        </button>
      </div>
    </div>
  );
}
