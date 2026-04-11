"use client";

import { useState } from "react";
import ContentIngestion from "./ContentIngestion";
import ContentPackManager from "./ContentPackManager";

export default function ContentTabs() {
  const [tab, setTab] = useState<"create" | "manage">("manage");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 mb-8 w-fit">
        <button
          onClick={() => setTab("manage")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            tab === "manage"
              ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700"
          }`}
        >
          Manage Packs
        </button>
        <button
          onClick={() => setTab("create")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            tab === "create"
              ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700"
          }`}
        >
          Create New
        </button>
      </div>

      {tab === "create" ? <ContentIngestion /> : <ContentPackManager />}
    </div>
  );
}
