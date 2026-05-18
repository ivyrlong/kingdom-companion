"use client";

import { useRef, useState } from "react";

interface RowResult {
  line: number;
  date: string;
  status: "created" | "replaced" | "error";
  message?: string;
  instances?: number;
}
interface BulkResult {
  total: number;
  created: number;
  replaced: number;
  errors: number;
  results: RowResult[];
}

const TEMPLATE =
  "date,scriptureRef,scriptureText,comment,simplifiedComment\n" +
  '2026-01-01,Psalm 1:1,"Happy is the man that does not walk in the counsel of the wicked.","Today\'s text reminds us to choose our associations wisely.","Choosing good friends helps us stay close to Jehovah."\n';

export default function DailyTextBulk() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BulkResult | null>(null);

  const onFile = async (file: File) => {
    setError("");
    setResult(null);
    setFileName(file.name);
    setCsv(await file.text());
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "daily-text-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const upload = async () => {
    if (!csv.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/daily-text/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Upload failed.");
      } else {
        setResult(data as BulkResult);
      }
    } catch {
      setError("Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const badge = (s: RowResult["status"]) =>
    s === "created"
      ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
      : s === "replaced"
        ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
        : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400";

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-violet-50 dark:bg-violet-600/10 border border-violet-200 dark:border-violet-500/20 px-5 py-4 text-sm text-violet-700 dark:text-violet-300">
        Upload a CSV with columns{" "}
        <span className="font-mono font-semibold">
          date, scriptureRef, scriptureText, comment, simplifiedComment
        </span>{" "}
        — one row per day. Dates should be{" "}
        <span className="font-mono">YYYY-MM-DD</span>. A day that already exists
        will be <span className="font-semibold">replaced</span>.
        <button
          onClick={downloadTemplate}
          className="ml-2 underline font-medium hover:text-violet-900 dark:hover:text-violet-100"
        >
          Download template
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg transition"
        >
          Choose CSV file
        </button>
        {fileName && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {fileName}
          </span>
        )}
        <button
          onClick={upload}
          disabled={loading || !csv.trim()}
          className="px-6 py-2 text-sm font-medium bg-coral-600 hover:bg-coral-700 disabled:bg-coral-400 text-white rounded-lg transition"
        >
          {loading ? "Importing…" : "Import"}
        </button>
      </div>

      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {result.total} rows:
            </span>
            <span className="text-green-600 dark:text-green-400">
              {result.created} created
            </span>
            <span className="text-amber-600 dark:text-amber-400">
              {result.replaced} replaced
            </span>
            <span className="text-red-600 dark:text-red-400">
              {result.errors} errors
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-zinc-500">
                    Line
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-zinc-500">
                    Date
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-zinc-500">
                    Status
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-zinc-500">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r) => (
                  <tr
                    key={r.line}
                    className="border-t border-zinc-100 dark:border-zinc-800/50"
                  >
                    <td className="px-3 py-2 text-zinc-500">{r.line}</td>
                    <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                      {r.date}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${badge(r.status)}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">
                      {r.status === "error"
                        ? r.message
                        : `${r.instances ?? 0} game${
                            r.instances === 1 ? "" : "s"
                          } generated`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
