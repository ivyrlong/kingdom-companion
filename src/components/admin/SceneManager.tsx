"use client";

/**
 * SceneManager — upload / list / edit / delete backdrop scenes.
 *
 * Simpler than StickerManager: no character linking, no kind enum, and the
 * filename convention is just `scene-<slug>.png`. Mood tags help the game
 * pick appropriate scenes for a given moment ("day" for morning devotional,
 * "night" for evening quiet time, etc.) but are free-form strings.
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface SceneRow {
  id: string;
  slug: string;
  name: string;
  path: string;
  moodTags: string[];
  paletteAccent: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

interface Staged {
  key: string;
  file: File;
  previewUrl: string;
  slug: string;
  name: string;
  moodTags: string; // comma-separated in the UI
  paletteAccent: string;
  status: "pending" | "uploading" | "done" | "error";
  errorMessage?: string;
}

/** Guess slug + name from a filename like `scene-lakeside.png`. */
function guessScene(filename: string): { slug: string; name: string } {
  const base = filename.replace(/\.[a-z0-9]+$/i, "").toLowerCase();
  const parts = base.split("-");
  if (parts[0] === "scene" && parts.length >= 2) {
    const slug = parts.slice(1).join("-");
    const name = parts
      .slice(1)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
    return { slug, name };
  }
  return { slug: base, name: base };
}

function stageFile(file: File): Staged {
  const guess = guessScene(file.name);
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    previewUrl: URL.createObjectURL(file),
    slug: guess.slug,
    name: guess.name,
    moodTags: "",
    paletteAccent: "",
    status: "pending",
  };
}

export default function SceneManager() {
  const [scenes, setScenes] = useState<SceneRow[]>([]);
  const [staged, setStaged] = useState<Staged[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<SceneRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/scenes");
      if (res.ok) setScenes(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      staged.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = (files: FileList | File[]) => {
    const next = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map(stageFile);
    setStaged((cur) => [...cur, ...next]);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, []);

  const removeStaged = (key: string) => {
    setStaged((cur) => {
      const dropped = cur.find((s) => s.key === key);
      if (dropped) URL.revokeObjectURL(dropped.previewUrl);
      return cur.filter((s) => s.key !== key);
    });
  };

  const updateStaged = (key: string, patch: Partial<Staged>) => {
    setStaged((cur) => cur.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  };

  const uploadAll = async () => {
    if (uploading) return;
    setUploading(true);
    for (const s of staged.filter((s) => s.status !== "done")) {
      updateStaged(s.key, { status: "uploading", errorMessage: undefined });
      try {
        const fd = new FormData();
        fd.append("file", s.file);
        fd.append("slug", s.slug);
        fd.append("name", s.name);
        if (s.moodTags) fd.append("moodTags", s.moodTags);
        if (s.paletteAccent) fd.append("paletteAccent", s.paletteAccent);
        const res = await fetch("/api/admin/scenes", { method: "POST", body: fd });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          updateStaged(s.key, {
            status: "error",
            errorMessage: body?.error ?? `HTTP ${res.status}`,
          });
        } else {
          updateStaged(s.key, { status: "done" });
        }
      } catch (e) {
        updateStaged(s.key, {
          status: "error",
          errorMessage: e instanceof Error ? e.message : "network error",
        });
      }
    }
    setUploading(false);
    await load();
  };

  const clearDone = () => {
    setStaged((cur) => {
      const kept: Staged[] = [];
      for (const s of cur) {
        if (s.status === "done") URL.revokeObjectURL(s.previewUrl);
        else kept.push(s);
      }
      return kept;
    });
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
          dragOver
            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
            : "border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-900/60"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/webp,image/jpeg"
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <p className="text-zinc-700 dark:text-zinc-200 font-medium">
          Drop scene PNGs here, or click to browse
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Wide 2:1 backdrops. Filenames like <code>scene-lakeside.png</code>
          {" "}auto-fill slug and name.
        </p>
      </div>

      {staged.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-100">
              Staged ({staged.length}) · {staged.filter((s) => s.status === "done").length} done
            </h3>
            <div className="flex gap-2">
              <button
                onClick={clearDone}
                disabled={!staged.some((s) => s.status === "done")}
                className="px-3 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 disabled:opacity-50"
              >
                Clear done
              </button>
              <button
                onClick={uploadAll}
                disabled={uploading || staged.every((s) => s.status === "done")}
                className="px-4 py-1.5 text-sm font-medium rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload all"}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {staged.map((s) => (
              <StagedRow
                key={s.key}
                s={s}
                onChange={(patch) => updateStaged(s.key, patch)}
                onRemove={() => removeStaged(s.key)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
        <h3 className="font-semibold text-zinc-800 dark:text-zinc-100 mb-3">
          Library ({scenes.length})
        </h3>
        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : scenes.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No scenes yet. Drop some PNGs above to start.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenes.map((s) => (
              <button
                key={s.id}
                onClick={() => setEditing(s)}
                className={`text-left rounded-lg border overflow-hidden transition hover:shadow-md ${
                  s.isActive
                    ? "border-zinc-200 dark:border-zinc-800"
                    : "border-zinc-300 dark:border-zinc-700 opacity-60"
                }`}
              >
                <div className="aspect-[2/1] bg-zinc-100 dark:bg-zinc-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/${s.path}`}
                    alt={s.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <div className="font-medium text-zinc-800 dark:text-zinc-100">
                    {s.name}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {s.moodTags.length > 0 ? s.moodTags.join(" · ") : "no mood tags"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <EditModal
          scene={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
          onDeleted={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function StagedRow({
  s,
  onChange,
  onRemove,
}: {
  s: Staged;
  onChange: (patch: Partial<Staged>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.previewUrl} alt="" className="w-24 h-12 object-cover rounded" />
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 text-sm">
        <input
          value={s.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Display name"
          className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100"
        />
        <input
          value={s.slug}
          onChange={(e) => onChange({ slug: e.target.value })}
          placeholder="slug-kebab"
          className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 font-mono text-xs"
        />
        <input
          value={s.moodTags}
          onChange={(e) => onChange({ moodTags: e.target.value })}
          placeholder="mood tags (day, water)"
          className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100"
        />
        <input
          value={s.paletteAccent}
          onChange={(e) => onChange({ paletteAccent: e.target.value })}
          placeholder="palette (sky, violet…)"
          className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div className="flex flex-col items-end gap-1">
        {s.status === "done" && <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">✓ done</span>}
        {s.status === "uploading" && <span className="text-sky-600 dark:text-sky-400 text-xs font-medium">uploading…</span>}
        {s.status === "error" && <span className="text-rose-600 dark:text-rose-400 text-xs font-medium">✕ {s.errorMessage}</span>}
        <button
          onClick={onRemove}
          disabled={s.status === "uploading"}
          className="text-xs text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-30"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function EditModal({
  scene,
  onClose,
  onSaved,
  onDeleted,
}: {
  scene: SceneRow;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(scene.name);
  const [slug, setSlug] = useState(scene.slug);
  const [moodTags, setMoodTags] = useState(scene.moodTags.join(", "));
  const [paletteAccent, setPaletteAccent] = useState(scene.paletteAccent ?? "");
  const [sortOrder, setSortOrder] = useState(scene.sortOrder);
  const [isActive, setIsActive] = useState(scene.isActive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/scenes/${scene.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          moodTags: moodTags.split(",").map((t) => t.trim()).filter(Boolean),
          paletteAccent: paletteAccent.trim() || null,
          sortOrder,
          isActive,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? `HTTP ${res.status}`);
      } else {
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete scene "${scene.name}"? This cannot be undone.`)) return;
    setSaving(true);
    const res = await fetch(`/api/admin/scenes/${scene.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? `HTTP ${res.status}`);
      setSaving(false);
    } else {
      onDeleted();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-3xl bg-white dark:bg-zinc-950 rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Edit scene</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/${scene.path}`} alt={scene.name} className="w-full aspect-[2/1] object-cover rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Name">
              <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Slug">
              <input value={slug} onChange={(e) => setSlug(e.target.value)} className={`${INPUT} font-mono`} />
            </Field>
            <Field label="Mood tags (comma-separated)">
              <input value={moodTags} onChange={(e) => setMoodTags(e.target.value)} className={INPUT} placeholder="day, water" />
            </Field>
            <Field label="Palette accent">
              <input value={paletteAccent} onChange={(e) => setPaletteAccent(e.target.value)} className={INPUT} placeholder="sky, violet…" />
            </Field>
            <Field label="Sort order">
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} className={INPUT} />
            </Field>
            <label className="flex items-center gap-2 pt-6">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <span className="text-sm text-zinc-700 dark:text-zinc-200">Active (shown in picker)</span>
            </label>
          </div>
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        </div>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between">
          <button onClick={remove} disabled={saving} className="px-3 py-1.5 text-sm rounded-md border border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50">
            Delete
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200">
              Cancel
            </button>
            <button onClick={save} disabled={saving} className="px-4 py-1.5 text-sm font-medium rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const INPUT =
  "w-full px-2 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">{label}</span>
      {children}
    </label>
  );
}
