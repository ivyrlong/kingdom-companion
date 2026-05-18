"use client";

import { useState } from "react";

export default function DailyTextForm() {
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [scriptureRef, setScriptureRef] = useState("");
  const [scriptureText, setScriptureText] = useState("");
  const [comment, setComment] = useState("");
  const [simplifiedComment, setSimplifiedComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    title: string;
    instancesCreated: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/daily-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          scriptureRef,
          scriptureText,
          comment,
          simplifiedComment,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create daily text");
      }

      const data = await res.json();
      setSuccess({
        title: data.title,
        instancesCreated: data.instancesCreated,
      });
      setScriptureRef("");
      setScriptureText("");
      setComment("");
      setSimplifiedComment("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {success && (
        <div className="bg-coral-50 dark:bg-coral-900/20 border border-coral-200 dark:border-coral-800 rounded-xl p-4 mb-6">
          <p className="font-medium text-coral-700 dark:text-coral-300">
            Published: {success.title}
          </p>
          <p className="text-sm text-coral-600 dark:text-coral-400">
            {success.instancesCreated} game
            {success.instancesCreated !== 1 ? "s" : ""} auto-generated
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-coral-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Scripture Reference
          </label>
          <input
            type="text"
            value={scriptureRef}
            onChange={(e) => setScriptureRef(e.target.value)}
            required
            placeholder='e.g. "Psalm 37:4"'
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-coral-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Scripture Text (NWT)
          </label>
          <textarea
            value={scriptureText}
            onChange={(e) => setScriptureText(e.target.value)}
            required
            rows={3}
            placeholder="Paste the verse text here..."
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-coral-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Comment
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            rows={6}
            placeholder="Paste the Daily Text comment here..."
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-coral-500 font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Simplified comment{" "}
            <span className="text-zinc-400">(for Little Ones — required)</span>
          </label>
          <textarea
            value={simplifiedComment}
            onChange={(e) => setSimplifiedComment(e.target.value)}
            required
            rows={4}
            placeholder="A short, simple lesson from this scripture for young children..."
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-coral-500"
          />
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-coral-600 hover:bg-coral-700 disabled:bg-coral-400 text-white font-medium rounded-lg transition"
        >
          {loading ? "Publishing..." : "Publish Daily Text"}
        </button>
      </form>
    </div>
  );
}
