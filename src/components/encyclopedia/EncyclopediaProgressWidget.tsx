import Link from "next/link";

interface RecentEntry {
  term: string;
  imageUrl: string | null;
}

interface Props {
  collected: number;
  total: number;
  recent: RecentEntry[];
}

export default function EncyclopediaProgressWidget({
  collected,
  total,
  recent,
}: Props) {
  if (total === 0) return null;

  const pct = Math.round((collected / total) * 100);

  return (
    <Link
      href="/encyclopedia"
      className="block bg-gradient-to-br from-amber-50 to-coral-50 dark:from-amber-900/20 dark:to-coral-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-2xl p-5 mb-6 hover:shadow-lg transition group"
    >
      <div className="flex items-start gap-4">
        <div className="text-4xl flex-shrink-0">📖</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50">
              My Encyclopedia
            </h3>
            <span className="text-sm font-bold text-coral-600 dark:text-coral-400">
              {collected} / {total}
            </span>
          </div>

          <p className="text-xs text-zinc-600 dark:text-zinc-300 mb-3">
            {collected === 0
              ? "Find words while playing games to start your book!"
              : collected === total
                ? "You found them all! Great job!"
                : `${total - collected} more to discover.`}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-white/60 dark:bg-zinc-800/60 rounded-full h-2 mb-3">
            <div
              className="bg-gradient-to-r from-coral-500 to-amber-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Recent finds */}
          {recent.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide font-semibold text-zinc-500 dark:text-zinc-400">
                Recent:
              </span>
              <div className="flex gap-1.5">
                {recent.slice(0, 4).map((entry, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-amber-200 dark:border-amber-700 overflow-hidden flex items-center justify-center"
                    title={entry.term}
                  >
                    {entry.imageUrl ? (
                      <img
                        src={
                          entry.imageUrl.startsWith("/")
                            ? entry.imageUrl
                            : `/${entry.imageUrl}`
                        }
                        alt={entry.term}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs">📖</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 self-center text-coral-600 dark:text-coral-400 group-hover:translate-x-1 transition-transform">
          →
        </div>
      </div>
    </Link>
  );
}
