"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AwardedEntry } from "@/lib/award";

/**
 * Ephemeral toast shown when the user is awarded a new encyclopedia
 * entry (typically a Bible character sticker). Pops from the top-right,
 * auto-dismisses after 6 seconds. Tapping it links to the entry in the
 * user's encyclopedia.
 *
 * Usage:
 *   const [award, setAward] = useState<AwardedEntry | null>(null);
 *   const entry = await rollForRandomAward("workbook-save");
 *   if (entry) setAward(entry);
 *   ...
 *   <AwardToast award={award} onDismiss={() => setAward(null)} />
 */
export default function AwardToast({
  award,
  onDismiss,
}: {
  award: AwardedEntry | null;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!award) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      // give the fade-out a moment before clearing state upstream
      setTimeout(onDismiss, 300);
    }, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [award?.slug]);

  if (!award) return null;

  return (
    <div
      role="status"
      className={`fixed top-4 right-4 z-[100] max-w-sm transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      <Link
        href="/encyclopedia"
        className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-2xl ring-1 ring-emerald-700/30 hover:from-emerald-600 hover:to-emerald-700 transition"
      >
        {award.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={award.imageUrl}
            alt=""
            className="w-14 h-14 rounded-xl bg-white/20 p-1 object-contain"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
            🎁
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-100">
            🎉 You found
          </div>
          <div className="text-sm font-bold truncate">{award.term}!</div>
          <div className="text-[11px] text-emerald-100/90 mt-0.5">
            Tap to view in your encyclopedia
          </div>
        </div>
      </Link>
    </div>
  );
}
