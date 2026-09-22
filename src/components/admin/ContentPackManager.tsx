"use client";

import { useState, useEffect, useCallback } from "react";
import type { WorkbookSection, WorkbookPart } from "@/components/WorkbookPanel";

/* ── Types ──────────────────────────────────────────────────────────── */

interface ScriptureEntry {
  reference: string;
  text: string;
}

interface QuestionEntry {
  question: string;
  answer: string;
  // Watchtower study (optional): kid-level answer, comment-building word
  // bank, multiple-choice options, and a per-question Little Ones picture.
  // Older packs may omit these.
  simplifiedAnswer?: string;
  keyWords?: string[];
  imageUrl?: string;
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
  // Pictures linked to this pack (via the Images button). Loaded when the
  // single pack is fetched for editing; powers the per-question picker.
  images?: { id: string; path: string; altText: string; filename: string }[];
  _count?: { instances: number };
  // OCLM workbook outline — present only for source=OCLM packs. Editing
  // reaches inside each part to adjust the AI-generated summary and
  // family discussion question.
  sections?: WorkbookSection[];
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
  // AI insights modal state — copy the prompt out, paste the response back.
  const [insightsPack, setInsightsPack] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [insightsMessage, setInsightsMessage] = useState<string>("");

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
        return;
      }
      // Surface server error rather than silently failing — previously
      // a non-2xx response left the user staring at an unchanged list
      // with no indication of why.
      const body = await res.json().catch(() => ({}));
      setError(
        body.message || body.error || `Delete failed (${res.status}).`,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to delete content pack.",
      );
    }
  };

  /* ── AI insights (OCLM only, manual copy/paste flow) ─────────────── */

  const openInsightsModal = (id: string, title: string) => {
    setInsightsMessage("");
    setError("");
    setInsightsPack({ id, title });
  };

  const handleInsightsSaved = (title: string, matched: number, missing: number) => {
    setInsightsPack(null);
    setInsightsMessage(
      `✓ "${title}": ${matched} parts got insights${missing > 0 ? ` (${missing} missing)` : ""}.`,
    );
  };

  /* ── Start editing ───────────────────────────────────────────────── */

  const startEdit = async (id: string) => {
    setError("");
    // Fetch the single pack so we get its linked images (the list payload
    // omits them) for the per-question Little Ones picture picker.
    // cache: "no-store" guarantees a fresh read every time — important so
    // images uploaded from /admin/images in another tab show up immediately.
    try {
      const res = await fetch(`/api/admin/content-packs/${id}`, {
        cache: "no-store",
      });
      if (res.ok) {
        setEditData((await res.json()) as ContentPack);
        setEditingId(id);
        return;
      }
    } catch {
      // fall back to the list copy below
    }
    const pack = packs.find((p) => p.id === id);
    if (pack) {
      setEditData({ ...pack });
      setEditingId(id);
    }
  };

  /**
   * Re-fetch just the linked images for the pack currently being edited.
   * Used by:
   *   - the "Refresh" link beside the per-question picture picker, so the
   *     admin can manually pull in images uploaded elsewhere without
   *     losing the changes they've already typed
   *   - a visibilitychange listener that fires when this tab regains focus,
   *     which handles the "uploaded in another tab" case automatically
   */
  const refreshEditImages = useCallback(async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/admin/content-packs/${editingId}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const fresh = (await res.json()) as ContentPack;
      setEditData((prev) => (prev ? { ...prev, images: fresh.images } : prev));
    } catch {
      // best-effort — leave the existing list alone on failure
    }
  }, [editingId]);

  useEffect(() => {
    if (!editingId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshEditImages();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [editingId, refreshEditImages]);

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
          // Only send the workbook outline for OCLM packs — the schema
          // accepts it as optional, but posting an empty array on a
          // Watchtower pack would nuke any existing data.
          ...(editData.source === "OCLM" && editData.sections
            ? { sections: editData.sections }
            : {}),
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
        onRefreshImages={refreshEditImages}
        saving={saving}
        error={error}
      />
    );
  }

  /* ── Pack list ───────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {(insightsMessage || error) && (
        <div className="space-y-2">
          {insightsMessage && (
            <div className="text-sm text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/20 rounded-lg px-3 py-2">
              {insightsMessage}
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>
      )}
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
                  {pack.source === "OCLM" && (
                    <button
                      onClick={() => openInsightsModal(pack.id, pack.title)}
                      className="px-3 py-1.5 text-sm bg-sky-100 dark:bg-sky-900/40 hover:bg-sky-200 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 rounded-lg transition"
                      title="Get a prompt to run through ChatGPT / Claude, then paste the JSON response back in."
                    >
                      ✨ AI Insights
                    </button>
                  )}
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

      {insightsPack && (
        <InsightsModal
          packId={insightsPack.id}
          packTitle={insightsPack.title}
          onClose={() => setInsightsPack(null)}
          onSaved={(matched, missing) =>
            handleInsightsSaved(insightsPack.title, matched, missing)
          }
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
  onRefreshImages,
  onSave,
  onCancel,
  saving,
  error,
}: {
  data: ContentPack;
  onChange: (d: ContentPack) => void;
  onRefreshImages: () => Promise<void>;
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

  // Watchtower study packs get the full manual Q&A editor (paragraph answer,
  // simplified answer, comment-building key words, multiple-choice options).
  const isWatchtower = data.source === "WATCHTOWER";

  // Reorder helper — used by the per-question Up/Down buttons. Order matters
  // for the Watchtower study flow and during the meeting.
  const moveQuestion = (from: number, to: number) => {
    if (to < 0 || to >= data.questions.length) return;
    const next = [...data.questions];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange({ ...data, questions: next });
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
            <option value="DAILY_TEXT">Daily Text</option>
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

      {/* OCLM workbook outline — per-part AI content editor */}
      {data.source === "OCLM" && data.sections && data.sections.length > 0 && (
        <OclmWorkbookEditor
          sections={data.sections}
          onChange={(next) => onChange({ ...data, sections: next })}
        />
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
          {isWatchtower
            ? `${data.questions.length} questions — power the Meeting → Watchtower Study experience. Auto-parsing is unreliable, so enter these by hand.`
            : `${data.questions.length} questions — used for Trivia`}
        </p>
        <div className="space-y-3 mb-3">
          {data.questions.map((q, i) => {
            const patch = (p: Partial<QuestionEntry>) => {
              const updated = [...data.questions];
              updated[i] = { ...updated[i], ...p };
              onChange({ ...data, questions: updated });
            };
            return (
              <div
                key={i}
                className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 space-y-2"
              >
                <div className="flex gap-2">
                  <textarea
                    value={q.question}
                    onChange={(e) => patch({ question: e.target.value })}
                    rows={isWatchtower ? 2 : 1}
                    className="flex-1 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100"
                    placeholder="Question"
                  />
                  <div className="flex flex-col gap-0.5 self-start">
                    <button
                      type="button"
                      onClick={() => moveQuestion(i, i - 1)}
                      disabled={i === 0}
                      aria-label="Move question up"
                      title="Move up"
                      className="w-7 h-7 flex items-center justify-center text-sm rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 disabled:text-zinc-300 dark:disabled:text-zinc-700 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(i, i + 1)}
                      disabled={i === data.questions.length - 1}
                      aria-label="Move question down"
                      title="Move down"
                      className="w-7 h-7 flex items-center justify-center text-sm rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 disabled:text-zinc-300 dark:disabled:text-zinc-700 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...data,
                          questions: data.questions.filter(
                            (_, idx) => idx !== i,
                          ),
                        })
                      }
                      aria-label="Delete question"
                      title="Delete"
                      className="w-7 h-7 flex items-center justify-center text-sm rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <textarea
                  value={q.answer}
                  onChange={(e) => patch({ answer: e.target.value })}
                  rows={isWatchtower ? 2 : 1}
                  className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100"
                  placeholder={
                    isWatchtower
                      ? "Paragraph answer (shown on “Reveal”)"
                      : "Answer"
                  }
                />
                {isWatchtower && (
                  <>
                    <textarea
                      value={q.simplifiedAnswer ?? ""}
                      onChange={(e) =>
                        patch({ simplifiedAnswer: e.target.value })
                      }
                      rows={2}
                      className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100"
                      placeholder="Simplified answer for Little Ones (optional — falls back to the paragraph answer)"
                    />
                    <input
                      value={(q.keyWords ?? []).join(", ")}
                      onChange={(e) =>
                        patch({
                          keyWords: e.target.value
                            .split(",")
                            .map((w) => w.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100"
                      placeholder="Key words, comma-separated (optional — auto-filled from the answer if blank)"
                    />
                    <textarea
                      value={(q.options ?? []).join("\n")}
                      onChange={(e) =>
                        patch({
                          options: e.target.value
                            .split("\n")
                            .map((o) => o.trim())
                            .filter(Boolean),
                        })
                      }
                      rows={3}
                      className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100"
                      placeholder="Multiple-choice options, one per line (optional — auto-built from other answers if blank)"
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={q.imageUrl ?? ""}
                        onChange={(e) => patch({ imageUrl: e.target.value })}
                        className="flex-1 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="">
                          Little Ones picture: none (use the pack&apos;s shared
                          picture)
                        </option>
                        {(data.images ?? []).map((img) => (
                          <option key={img.id} value={img.path}>
                            {img.altText || img.filename}
                          </option>
                        ))}
                      </select>
                      {q.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            q.imageUrl.startsWith("/")
                              ? q.imageUrl
                              : `/${q.imageUrl}`
                          }
                          alt=""
                          className="h-10 w-10 object-cover rounded border border-zinc-200 dark:border-zinc-700"
                        />
                      )}
                    </div>
                    {/* Only render the refresh link on the first question to
                        avoid 18 repeats; it refreshes the list for every
                        picker since they all share data.images. */}
                    {i === 0 && (
                      <p className="text-xs text-zinc-400">
                        {(data.images ?? []).length} picture(s) available.{" "}
                        <button
                          type="button"
                          onClick={() => void onRefreshImages()}
                          className="text-coral-600 dark:text-coral-400 hover:underline"
                        >
                          Refresh
                        </button>{" "}
                        if you just uploaded more.
                      </p>
                    )}
                    {(data.images ?? []).length === 0 && i === 0 && (
                      <p className="text-xs text-zinc-400">
                        No pictures linked yet — upload via{" "}
                        <span className="font-medium">
                          /admin/images
                        </span>{" "}
                        (link to this pack), or use the{" "}
                        <span className="font-medium">Images</span> button on
                        the pack list, then click Refresh above.
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={() =>
            onChange({
              ...data,
              questions: [
                ...data.questions,
                {
                  question: "",
                  answer: "",
                  simplifiedAnswer: "",
                  keyWords: [],
                  options: [],
                  imageUrl: "",
                },
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

/* ═══════════════════════════════════════════════════════════════════════
   OCLM workbook editor — per-part AI content editor for Life & Ministry
   packs. Shows the whole meeting outline with an editable "This week"
   card (kid summary + family question + listening phrases) on every
   non-song part. Songs and prayers pass through untouched.
   ═══════════════════════════════════════════════════════════════════════ */

const SECTION_LABELS: Record<string, string> = {
  OPENING: "Opening",
  TREASURES: "Treasures From God's Word",
  MINISTRY: "Apply Yourself to the Field Ministry",
  LIVING: "Living as Christians",
  CLOSING: "Closing",
};

function OclmWorkbookEditor({
  sections,
  onChange,
}: {
  sections: WorkbookSection[];
  onChange: (next: WorkbookSection[]) => void;
}) {
  const updatePart = (
    si: number,
    pi: number,
    patch: Partial<WorkbookPart>,
  ) => {
    const next = sections.map((s, i) =>
      i === si
        ? {
            ...s,
            parts: s.parts.map((p, j) => (j === pi ? { ...p, ...patch } : p)),
          }
        : s,
    );
    onChange(next);
  };

  const partsWithAi = sections.reduce(
    (n, s) => n + s.parts.filter((p) => p.aiContent).length,
    0,
  );
  const partsTotal = sections.reduce(
    (n, s) => n + s.parts.filter((p) => p.kind !== "song").length,
    0,
  );

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
          Life &amp; Ministry Outline
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {partsWithAi} of {partsTotal} parts have AI insights. Use the ✨
          AI Insights button on the pack row to regenerate all of them, or
          hand-edit individual parts below.
        </p>
      </div>

      {sections.map((section, si) => (
        <div key={si} className="space-y-2">
          <p className="text-xs uppercase tracking-wide font-semibold text-zinc-500 dark:text-zinc-400">
            {SECTION_LABELS[section.kind] ?? section.kind}
          </p>
          <div className="space-y-3">
            {section.parts.map((part, pi) => (
              <PartAiEditor
                key={pi}
                part={part}
                onChange={(patch) => updatePart(si, pi, patch)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PartAiEditor({
  part,
  onChange,
}: {
  part: WorkbookPart;
  onChange: (patch: Partial<WorkbookPart>) => void;
}) {
  const isSong = part.kind === "song";
  const ai = part.aiContent;

  const setAi = (patch: Partial<NonNullable<WorkbookPart["aiContent"]>>) => {
    onChange({
      aiContent: {
        kidSummary: ai?.kidSummary ?? "",
        familyDiscussionQuestion: ai?.familyDiscussionQuestion ?? "",
        listeningPhrases: ai?.listeningPhrases ?? [],
        ...patch,
      },
    });
  };

  const clearAi = () => onChange({ aiContent: undefined });

  const [newPhrase, setNewPhrase] = useState("");
  const addPhrase = () => {
    if (!newPhrase.trim()) return;
    setAi({
      listeningPhrases: [...(ai?.listeningPhrases ?? []), newPhrase.trim()],
    });
    setNewPhrase("");
  };
  const removePhrase = (idx: number) => {
    setAi({
      listeningPhrases: (ai?.listeningPhrases ?? []).filter((_, i) => i !== idx),
    });
  };

  return (
    <div
      className={`rounded-lg border p-3 ${
        isSong
          ? "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex items-baseline flex-wrap gap-2">
        {part.number !== undefined && (
          <span className="text-xs text-zinc-400 tabular-nums">
            {part.number}.
          </span>
        )}
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {part.title}
        </span>
        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
          {part.kind}
        </span>
        {ai && (
          <button
            onClick={clearAi}
            className="ml-auto text-[11px] text-red-500 hover:text-red-700"
            title="Remove AI insights from this part"
          >
            Clear AI
          </button>
        )}
      </div>

      {isSong ? (
        <p className="mt-1 text-xs text-zinc-400 italic">
          Songs don&apos;t get AI insights.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-0.5">
              Kid summary
            </label>
            <textarea
              value={ai?.kidSummary ?? ""}
              onChange={(e) => setAi({ kidSummary: e.target.value })}
              placeholder={
                ai
                  ? ""
                  : "(no AI insights yet — type something to add, or run ✨ AI Insights)"
              }
              rows={2}
              className="w-full px-2 py-1.5 text-sm rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-0.5">
              Family discussion question
            </label>
            <textarea
              value={ai?.familyDiscussionQuestion ?? ""}
              onChange={(e) => setAi({ familyDiscussionQuestion: e.target.value })}
              rows={2}
              className="w-full px-2 py-1.5 text-sm rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-0.5">
              Listening phrases
            </label>
            <div className="flex flex-wrap gap-1 mb-1">
              {(ai?.listeningPhrases ?? []).map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded text-xs"
                >
                  {p}
                  <button
                    onClick={() => removePhrase(i)}
                    className="text-sky-400 hover:text-red-500"
                    aria-label={`Remove ${p}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {(ai?.listeningPhrases ?? []).length === 0 && (
                <span className="text-xs text-zinc-400 italic">
                  None yet.
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <input
                value={newPhrase}
                onChange={(e) => setNewPhrase(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPhrase())}
                placeholder="Add a phrase..."
                className="flex-1 px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-sky-400"
              />
              <button
                onClick={addPhrase}
                className="text-xs text-sky-600 hover:text-sky-700 px-2"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   AI Insights Modal — copy prompt out, paste JSON response back.
   Zero API cost: the admin runs the prompt through ChatGPT / Claude web.
   ═══════════════════════════════════════════════════════════════════════ */

function InsightsModal({
  packId,
  packTitle,
  onClose,
  onSaved,
}: {
  packId: string;
  packTitle: string;
  onClose: () => void;
  onSaved: (matched: number, missing: number) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [promptError, setPromptError] = useState("");
  const [pasted, setPasted] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPrompt(true);
      setPromptError("");
      try {
        const res = await fetch(`/api/admin/oclm-insights/${packId}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setPromptError(body.error || `Failed (${res.status})`);
          return;
        }
        if (!cancelled) setPrompt(body.prompt || "");
      } catch (e) {
        if (!cancelled) {
          setPromptError(
            e instanceof Error ? e.message : "Failed to load prompt.",
          );
        }
      } finally {
        if (!cancelled) setLoadingPrompt(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [packId]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setSaveError("Clipboard access denied — select the prompt manually.");
    }
  };

  const savePasted = async () => {
    if (!pasted.trim()) {
      setSaveError("Paste the AI's JSON response before saving.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/admin/oclm-insights/${packId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: pasted }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(body.error || `Failed (${res.status})`);
        return;
      }
      onSaved(body.matched ?? 0, (body.missingIds ?? []).length);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Failed to save insights.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-baseline justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              ✨ AI Insights — {packTitle}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Manual flow — no API key needed. Copy the prompt into ChatGPT or
              Claude web, then paste its JSON reply back here.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Step 1 — Prompt */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                1. Copy this prompt
              </h3>
              <button
                onClick={copyPrompt}
                disabled={loadingPrompt || !!promptError}
                className="text-xs px-3 py-1 rounded bg-sky-100 dark:bg-sky-900/40 hover:bg-sky-200 text-sky-700 dark:text-sky-300 disabled:opacity-50"
              >
                {copied ? "✓ Copied" : "Copy prompt"}
              </button>
            </div>
            {promptError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {promptError}
              </p>
            )}
            <textarea
              value={loadingPrompt ? "Loading…" : prompt}
              readOnly
              rows={10}
              className="w-full font-mono text-xs px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            />
          </section>

          {/* Step 2 — Paste */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
              2. Paste the JSON response here
            </h3>
            <p className="text-xs text-zinc-500 mb-2">
              Paste the entire response — {"{"} entries: [...] {"}"} object or
              a bare array. Code fences are stripped automatically.
            </p>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder='{"entries": [{"id": "TREASURES:1", "kidSummary": "...", ...}, ...]}'
              rows={8}
              className="w-full font-mono text-xs px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-sky-500"
            />
            {saveError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {saveError}
              </p>
            )}
          </section>
        </div>

        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg"
          >
            Close
          </button>
          <button
            onClick={savePasted}
            disabled={saving || !pasted.trim()}
            className="px-4 py-2 text-sm bg-sky-500 hover:bg-sky-600 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save insights"}
          </button>
        </div>
      </div>
    </div>
  );
}
