"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ── Types ─────────────────────────────────────────────────────────── */

interface ImageAsset {
  id: string;
  filename: string;
  path: string;
  altText: string;
  category: string;
  ageGroup: string;
  tags: string[];
  width: number | null;
  height: number | null;
  createdAt: string;
}

const CATEGORIES = [
  "All",
  "SCENE",
  "CHARACTER",
  "ILLUSTRATION",
  "OUTLINE",
  "PHOTO",
  "COLORING_SVG",
  "COLORING_OUTLINE",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  SCENE: "Scene",
  CHARACTER: "Character",
  ILLUSTRATION: "Illustration",
  OUTLINE: "Outline",
  PHOTO: "Photo",
  COLORING_SVG: "Coloring SVG",
  COLORING_OUTLINE: "Coloring Outline",
};

const AGE_GROUPS = ["LITTLE_ONES", "YOUTH", "ADULT", "FAMILY"] as const;

const AGE_GROUP_LABELS: Record<string, string> = {
  LITTLE_ONES: "Little Ones",
  YOUTH: "Youth",
  ADULT: "Adult",
  FAMILY: "Family",
};

/* ── Badge helpers (matches GameTabs color scheme) ─────────────────── */

function ageGroupColor(ageGroup: string): string {
  switch (ageGroup) {
    case "LITTLE_ONES":
      return "bg-sky-100 dark:bg-sky-300/20 text-sky-700 dark:text-sky-300";
    case "YOUTH":
      return "bg-violet-100 dark:bg-violet-300/20 text-violet-700 dark:text-violet-300";
    case "ADULT":
      return "bg-golden-100 dark:bg-golden-300/20 text-golden-600 dark:text-golden-300";
    case "FAMILY":
      return "bg-peach-100 dark:bg-peach-300/20 text-peach-500 dark:text-peach-300";
    default:
      return "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400";
  }
}

function categoryColor(category: string): string {
  switch (category) {
    case "SCENE":
      return "bg-emerald-100 dark:bg-emerald-300/20 text-emerald-700 dark:text-emerald-300";
    case "CHARACTER":
      return "bg-amber-100 dark:bg-amber-300/20 text-amber-700 dark:text-amber-300";
    case "ILLUSTRATION":
      return "bg-coral-50 dark:bg-coral-900/30 text-coral-700 dark:text-coral-300";
    case "OUTLINE":
      return "bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300";
    case "PHOTO":
      return "bg-blue-100 dark:bg-blue-300/20 text-blue-700 dark:text-blue-300";
    case "COLORING_SVG":
      return "bg-pink-100 dark:bg-pink-300/20 text-pink-700 dark:text-pink-300";
    case "COLORING_OUTLINE":
      return "bg-indigo-100 dark:bg-indigo-300/20 text-indigo-700 dark:text-indigo-300";
    default:
      return "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400";
  }
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function ImageManager() {
  /* State – images & filtering */
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  /* State – upload form */
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("SCENE");
  const [ageGroup, setAgeGroup] = useState<string>("FAMILY");
  const [altText, setAltText] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);

  /* State – drag-and-drop */
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* State – lightbox */
  const [lightbox, setLightbox] = useState<ImageAsset | null>(null);

  /* ── Fetch images ────────────────────────────────────────────────── */

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/images");
      if (res.ok) {
        const data = await res.json();
        setImages(data);
      }
    } catch {
      /* ignore – will show empty state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  /* ── File selection helpers ──────────────────────────────────────── */

  const handleFileSelect = useCallback((selected: File) => {
    setFile(selected);
    const url = URL.createObjectURL(selected);
    setPreview(url);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped && dropped.type.startsWith("image/")) {
        handleFileSelect(dropped);
      }
    },
    [handleFileSelect],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFileSelect(selected);
    },
    [handleFileSelect],
  );

  /* ── Upload ──────────────────────────────────────────────────────── */

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    formData.append("ageGroup", ageGroup);
    formData.append("altText", altText);
    formData.append(
      "tags",
      JSON.stringify(
        tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    );

    try {
      const res = await fetch("/api/admin/images", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        /* Reset form */
        setFile(null);
        setPreview(null);
        setAltText("");
        setTags("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchImages();
      }
    } finally {
      setUploading(false);
    }
  };

  /* ── Delete ──────────────────────────────────────────────────────── */

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this image? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/images?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setImages((prev) => prev.filter((img) => img.id !== id));
      if (lightbox?.id === id) setLightbox(null);
    }
  };

  /* ── Filtered list ───────────────────────────────────────────────── */

  const filtered =
    activeCategory === "All"
      ? images
      : images.filter((img) => img.category === activeCategory);

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <div className="space-y-10">
      {/* ─── Upload Section ───────────────────────────────────────── */}
      <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Upload Image
        </h2>

        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer transition ${
            dragOver
              ? "border-coral-400 bg-coral-100 dark:bg-coral-900/20"
              : "border-zinc-300 dark:border-zinc-700 hover:border-coral-300 hover:bg-coral-50 dark:hover:bg-coral-900/10"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />

          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="max-h-48 rounded-lg object-contain mb-3"
            />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-400 dark:text-zinc-500 mb-3"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )}

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {file
              ? file.name
              : "Drag & drop an image here, or click to browse"}
          </p>
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-coral-500"
            >
              {(
                ["SCENE", "CHARACTER", "ILLUSTRATION", "OUTLINE", "PHOTO", "COLORING_SVG", "COLORING_OUTLINE"] as const
              ).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Age Group
            </label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-coral-500"
            >
              {AGE_GROUPS.map((ag) => (
                <option key={ag} value={ag}>
                  {AGE_GROUP_LABELS[ag]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Alt Text
            </label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image..."
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-coral-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. noah, ark, animals"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-coral-500"
            />
          </div>
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="mt-4 px-6 py-2.5 bg-coral-600 hover:bg-coral-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white disabled:text-zinc-500 dark:disabled:text-zinc-500 text-sm font-medium rounded-lg transition"
        >
          {uploading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Uploading...
            </span>
          ) : (
            "Upload Image"
          )}
        </button>
      </section>

      {/* ─── Image Grid Section ───────────────────────────────────── */}
      <section>
        {/* Category filter tabs */}
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 mb-6 w-fit flex-wrap">
          {CATEGORIES.map((cat) => {
            const count =
              cat === "All"
                ? images.length
                : images.filter((img) => img.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  activeCategory === cat
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                {cat === "All" ? "All" : CATEGORY_LABELS[cat] ?? cat}
                {count > 0 && (
                  <span className="ml-1.5 text-xs opacity-60">({count})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-12">
            <svg
              className="animate-spin h-8 w-8 mx-auto text-coral-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-zinc-500 dark:text-zinc-400 mt-3">
              Loading images...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-500 dark:text-zinc-400 text-lg">
              {images.length === 0
                ? "No images uploaded yet. Use the form above to add your first image."
                : "No images in this category."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((img) => (
              <div
                key={img.id}
                className="group bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:shadow-lg hover:border-coral-300 dark:hover:border-coral-700 transition"
              >
                {/* Thumbnail */}
                <button
                  type="button"
                  onClick={() => setLightbox(img)}
                  className="block w-full aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
                >
                  <img
                    src={`/${img.path}`}
                    alt={img.altText || img.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </button>

                {/* Info */}
                <div className="p-3">
                  <p
                    className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate mb-2"
                    title={img.filename}
                  >
                    {img.filename}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-2">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${categoryColor(img.category)}`}
                    >
                      {CATEGORY_LABELS[img.category] ?? img.category}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ageGroupColor(img.ageGroup)}`}
                    >
                      {AGE_GROUP_LABELS[img.ageGroup] ?? img.ageGroup}
                    </span>
                  </div>

                  {/* Tags */}
                  {img.tags && img.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {img.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(img.id)}
                    className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Lightbox ──────────────────────────────────────────────── */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightbox(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightbox(null);
          }}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-3 right-3 z-10 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Image */}
            <img
              src={`/${lightbox.path}`}
              alt={lightbox.altText || lightbox.filename}
              className="w-full max-h-[70vh] object-contain bg-zinc-100 dark:bg-zinc-800"
            />

            {/* Details */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
              <p className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                {lightbox.filename}
              </p>
              {lightbox.altText && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                  {lightbox.altText}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColor(lightbox.category)}`}
                >
                  {CATEGORY_LABELS[lightbox.category] ?? lightbox.category}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${ageGroupColor(lightbox.ageGroup)}`}
                >
                  {AGE_GROUP_LABELS[lightbox.ageGroup] ?? lightbox.ageGroup}
                </span>
                {lightbox.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {lightbox.width && lightbox.height && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                  {lightbox.width} x {lightbox.height}px
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
