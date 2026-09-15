"use client";

/**
 * StickerManager — upload / list / edit / delete stickers.
 *
 * Design: the strict filename convention documented in prompts/sticker-prompts.md
 * means most uploads need zero manual metadata entry. The staging list shows
 * each dropped file with its auto-filled fields pre-populated; the admin can
 * override anything before hitting "Upload all". People stickers auto-link to
 * their Character row by (variant, role) match — the row's canonical portrait
 * is set to the first sticker uploaded for that character.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  guessStickerFromFilename,
  type StickerKindSlug,
} from "@/lib/sticker-metadata";

// ── Types ─────────────────────────────────────────────────────────────

interface CharacterLite {
  id: string;
  slug: string;
  name: string;
  familyName: string | null;
  role: string;
  variant: string;
}

interface StickerRow {
  id: string;
  slug: string;
  name: string;
  kind: StickerKindSlug;
  path: string;
  altText: string;
  tags: string[];
  ageAppropriate: string[];
  sortOrder: number;
  isActive: boolean;
  character: CharacterLite | null;
  createdAt: string;
}

interface Staged {
  key: string; // stable across renders
  file: File;
  previewUrl: string;
  slug: string;
  name: string;
  kind: StickerKindSlug;
  characterSlug: string; // "" = no character
  altText: string;
  tags: string; // comma-separated in the UI
  status: "pending" | "uploading" | "done" | "error";
  errorMessage?: string;
}

const KIND_OPTIONS: { value: StickerKindSlug; label: string }[] = [
  { value: "PERSON", label: "Person" },
  { value: "ANIMAL_PAIR", label: "Animal pair (Isaiah)" },
  { value: "ANIMAL_SOLO", label: "Animal (solo)" },
  { value: "PLANT", label: "Plant / fruit" },
  { value: "HOME", label: "Home / land" },
  { value: "SKY", label: "Sky / water" },
];

// ── Helpers ───────────────────────────────────────────────────────────

/** Given a filename + character list, build a Staged item ready to upload. */
function stageFile(file: File, characters: CharacterLite[]): Staged {
  const guess = guessStickerFromFilename(file.name);
  let characterSlug = "";
  if (guess?.kind === "PERSON" && guess.variant && guess.role) {
    const match = characters.find(
      (c) => c.variant === guess.variant && c.role === guess.role,
    );
    if (match) characterSlug = match.slug;
  }
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    previewUrl: URL.createObjectURL(file),
    slug: guess?.suggestedSlug ?? "",
    name: guess?.suggestedName ?? "",
    kind: guess?.kind ?? "PERSON",
    characterSlug,
    altText: "",
    tags: "",
    status: "pending",
  };
}

// ── Component ─────────────────────────────────────────────────────────

export default function StickerManager() {
  const [characters, setCharacters] = useState<CharacterLite[]>([]);
  const [stickers, setStickers] = useState<StickerRow[]>([]);
  const [staged, setStaged] = useState<Staged[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<StickerRow | null>(null);
  const [kindFilter, setKindFilter] = useState<StickerKindSlug | "">("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch("/api/admin/characters"),
        fetch("/api/admin/stickers"),
      ]);
      if (!cRes.ok) {
        console.error("Failed to load characters:", cRes.status, await cRes.text());
      }
      if (!sRes.ok) {
        console.error("Failed to load stickers:", sRes.status, await sRes.text());
      }
      const cs = cRes.ok ? await cRes.json() : [];
      const ss = sRes.ok ? await sRes.json() : [];
      setCharacters(cs);
      setStickers(ss);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // Clean up object URLs when staged items go away.
  useEffect(() => {
    return () => {
      staged.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Backfill character auto-match on any staged rows where characters weren't
  // loaded yet at drop time. Runs whenever the character list arrives or
  // changes — otherwise a fast drop right after page load races the fetch
  // and PERSON rows land with an empty character link.
  useEffect(() => {
    if (characters.length === 0) return;
    setStaged((cur) => {
      let changed = false;
      const next = cur.map((s) => {
        if (s.characterSlug || s.kind !== "PERSON") return s;
        const guess = guessStickerFromFilename(s.file.name);
        if (!guess?.variant || !guess?.role) return s;
        const match = characters.find(
          (c) => c.variant === guess.variant && c.role === guess.role,
        );
        if (!match) return s;
        changed = true;
        return { ...s, characterSlug: match.slug };
      });
      return changed ? next : cur;
    });
  }, [characters]);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      const next = list.map((f) => stageFile(f, characters));
      setStaged((cur) => [...cur, ...next]);
    },
    [characters],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

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
    const pending = staged.filter((s) => s.status !== "done");
    for (const s of pending) {
      updateStaged(s.key, { status: "uploading", errorMessage: undefined });
      try {
        const fd = new FormData();
        fd.append("file", s.file);
        fd.append("slug", s.slug);
        fd.append("name", s.name);
        fd.append("kind", s.kind);
        if (s.characterSlug) fd.append("characterSlug", s.characterSlug);
        if (s.altText) fd.append("altText", s.altText);
        if (s.tags) fd.append("tags", s.tags);
        const res = await fetch("/api/admin/stickers", { method: "POST", body: fd });
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
    // Reload the grid + character list so newly-linked characters lose their
    // "no sticker yet" state.
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

  const filteredStickers = kindFilter
    ? stickers.filter((s) => s.kind === kindFilter)
    : stickers;

  return (
    <div className="space-y-6">
      {/* Drop zone */}
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
            ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
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
          Drop sticker PNGs here, or click to browse
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Filenames like <code>sticker-people-blonde-mother.png</code> auto-fill
          all fields; anything else can be edited before upload.
        </p>
      </div>

      {/* Staged files */}
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
                className="px-4 py-1.5 text-sm font-medium rounded-md bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
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
                characters={characters}
                onChange={(patch) => updateStaged(s.key, patch)}
                onRemove={() => removeStaged(s.key)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Existing stickers */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-100">
            Library ({filteredStickers.length}
            {kindFilter && ` of ${stickers.length}`})
          </h3>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as StickerKindSlug | "")}
            className="text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 px-2 py-1"
          >
            <option value="">All kinds</option>
            {KIND_OPTIONS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : filteredStickers.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No stickers yet. Drop some PNGs above to start.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredStickers.map((s) => (
              <button
                key={s.id}
                onClick={() => setEditing(s)}
                className={`text-left rounded-lg border overflow-hidden transition hover:shadow-md ${
                  s.isActive
                    ? "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                    : "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 opacity-60"
                }`}
              >
                <div className="aspect-square bg-[radial-gradient(circle,#f3f3f3_1px,transparent_1px)] [background-size:8px_8px] dark:bg-[radial-gradient(circle,#333_1px,transparent_1px)] flex items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/${s.path}`}
                    alt={s.altText || s.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="p-2">
                  <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">
                    {s.name}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {s.character
                      ? `${s.character.familyName ?? ""} · ${s.character.role}`
                      : s.kind.toLowerCase().replace("_", " ")}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <EditModal
          sticker={editing}
          characters={characters}
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

// ── Sub-components ────────────────────────────────────────────────────

function StagedRow({
  s,
  characters,
  onChange,
  onRemove,
}: {
  s: Staged;
  characters: CharacterLite[];
  onChange: (patch: Partial<Staged>) => void;
  onRemove: () => void;
}) {
  const statusBadge = () => {
    if (s.status === "done") return <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">✓ done</span>;
    if (s.status === "uploading") return <span className="text-sky-600 dark:text-sky-400 text-xs font-medium">uploading…</span>;
    if (s.status === "error") return <span className="text-rose-600 dark:text-rose-400 text-xs font-medium">✕ {s.errorMessage}</span>;
    return null;
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={s.previewUrl}
        alt=""
        className="w-14 h-14 object-contain rounded bg-[radial-gradient(circle,#f3f3f3_1px,transparent_1px)] [background-size:6px_6px]"
      />
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
        <select
          value={s.kind}
          onChange={(e) => onChange({ kind: e.target.value as StickerKindSlug })}
          className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100"
        >
          {KIND_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
        <select
          value={s.characterSlug}
          onChange={(e) => onChange({ characterSlug: e.target.value })}
          disabled={s.kind !== "PERSON"}
          className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 disabled:opacity-50"
        >
          <option value="">— no character —</option>
          {characters.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name} ({c.variant} {c.role})
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col items-end gap-1">
        {statusBadge()}
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
  sticker,
  characters,
  onClose,
  onSaved,
  onDeleted,
}: {
  sticker: StickerRow;
  characters: CharacterLite[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(sticker.name);
  const [slug, setSlug] = useState(sticker.slug);
  const [kind, setKind] = useState<StickerKindSlug>(sticker.kind);
  const [characterSlug, setCharacterSlug] = useState(sticker.character?.slug ?? "");
  const [altText, setAltText] = useState(sticker.altText);
  const [tags, setTags] = useState(sticker.tags.join(", "));
  const [ageAppropriate, setAgeAppropriate] = useState(sticker.ageAppropriate.join(", "));
  const [sortOrder, setSortOrder] = useState(sticker.sortOrder);
  const [isActive, setIsActive] = useState(sticker.isActive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/stickers/${sticker.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          kind,
          characterSlug: kind === "PERSON" ? (characterSlug || null) : null,
          altText,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          ageAppropriate: ageAppropriate.split(",").map((a) => a.trim()).filter(Boolean),
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
    if (!confirm(`Delete sticker "${sticker.name}"? This cannot be undone.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/stickers/${sticker.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? `HTTP ${res.status}`);
        setSaving(false);
      } else {
        onDeleted();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "network error");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-zinc-950 rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Edit sticker</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
            ✕
          </button>
        </div>
        <div className="p-5 flex gap-5">
          <div className="w-40 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/${sticker.path}`}
              alt={sticker.altText || sticker.name}
              className="w-full aspect-square object-contain rounded-lg bg-[radial-gradient(circle,#f3f3f3_1px,transparent_1px)] [background-size:8px_8px]"
            />
          </div>
          <div className="flex-1 space-y-3">
            <Field label="Name">
              <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Slug">
              <input value={slug} onChange={(e) => setSlug(e.target.value)} className={`${INPUT} font-mono`} />
            </Field>
            <Field label="Kind">
              <select value={kind} onChange={(e) => setKind(e.target.value as StickerKindSlug)} className={INPUT}>
                {KIND_OPTIONS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Character (people only)">
              <select
                value={characterSlug}
                onChange={(e) => setCharacterSlug(e.target.value)}
                disabled={kind !== "PERSON"}
                className={`${INPUT} disabled:opacity-50`}
              >
                <option value="">— no character —</option>
                {characters.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name} ({c.variant} {c.role})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Alt text">
              <input value={altText} onChange={(e) => setAltText(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Tags (comma-separated)">
              <input value={tags} onChange={(e) => setTags(e.target.value)} className={INPUT} placeholder="isaiah-11, prayer" />
            </Field>
            <Field label="Age appropriate (comma-separated)">
              <input value={ageAppropriate} onChange={(e) => setAgeAppropriate(e.target.value)} className={INPUT} placeholder="LITTLE_ONES, YOUTH" />
            </Field>
            <div className="flex gap-3">
              <Field label="Sort order">
                <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} className={INPUT} />
              </Field>
              <label className="flex items-center gap-2 pt-6">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                <span className="text-sm text-zinc-700 dark:text-zinc-200">Active (shown in tray)</span>
              </label>
            </div>
            {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          </div>
        </div>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between">
          <button
            onClick={remove}
            disabled={saving}
            className="px-3 py-1.5 text-sm rounded-md border border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-1.5 text-sm font-medium rounded-md bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
            >
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
