"use client";

/**
 * ParadiseList — the "your paradise pages" grid + scene picker for creating
 * a new page. Each page card links into the canvas editor at /paradise/[id].
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SceneLite {
  id: string;
  slug: string;
  name: string;
  path: string;
  moodTags: string[];
  paletteAccent: string | null;
}

interface PageRow {
  id: string;
  name: string;
  updatedAt: string;
  placements: unknown;
  scene: { id: string; slug: string; name: string; path: string };
}

export default function ParadiseList() {
  const router = useRouter();
  const [pages, setPages] = useState<PageRow[]>([]);
  const [scenes, setScenes] = useState<SceneLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [pRes, sRes] = await Promise.all([
          fetch("/api/paradise-pages"),
          fetch("/api/scenes"),
        ]);
        if (pRes.ok) setPages(await pRes.json());
        if (sRes.ok) setScenes(await sRes.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const createPage = async (sceneId: string) => {
    setCreating(sceneId);
    setError(null);
    try {
      const res = await fetch("/api/paradise-pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sceneId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? `HTTP ${res.status}`);
        setCreating(null);
        return;
      }
      const page = await res.json();
      router.push(`/paradise/${page.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "network error");
      setCreating(null);
    }
  };

  const deletePage = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/paradise-pages/${id}`, { method: "DELETE" });
    if (res.ok) setPages((cur) => cur.filter((p) => p.id !== id));
  };

  const placementCount = (p: PageRow): number => {
    return Array.isArray(p.placements) ? p.placements.length : 0;
  };

  if (loading) {
    return <p className="text-zinc-500 dark:text-zinc-400">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
          Your paradise pages ({pages.length})
        </h2>
        <button
          onClick={() => setPicking((p) => !p)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition"
        >
          {picking ? "Cancel" : "+ New page"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {picking && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-100 mb-3">
            Pick a scene to start with
          </h3>
          {scenes.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No scenes available yet. An admin can upload them at{" "}
              <code>/admin/scenes</code>.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {scenes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => createPage(s.id)}
                  disabled={creating !== null}
                  className="text-left rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:shadow-md transition disabled:opacity-50"
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
                    {s.moodTags.length > 0 && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {s.moodTags.join(" · ")}
                      </div>
                    )}
                  </div>
                  {creating === s.id && (
                    <div className="px-3 pb-3 text-xs text-emerald-700 dark:text-emerald-400">
                      Creating…
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {pages.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            No pages yet. Hit <strong>+ New page</strong> to start building your first
            paradise scene.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((p) => (
            <div
              key={p.id}
              className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:shadow-md transition"
            >
              <Link href={`/paradise/${p.id}`} className="block">
                <div className="aspect-[2/1] bg-zinc-100 dark:bg-zinc-900 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/${p.scene.path}`}
                    alt={p.scene.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {placementCount(p)} sticker{placementCount(p) === 1 ? "" : "s"}
                  </div>
                </div>
              </Link>
              <div className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-zinc-800 dark:text-zinc-100">
                    {p.name}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    on {p.scene.name}
                  </div>
                </div>
                <button
                  onClick={() => deletePage(p.id, p.name)}
                  className="text-xs text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 px-2 py-1"
                  aria-label={`Delete ${p.name}`}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
