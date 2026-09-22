import { toCitation } from "@/lib/scripture";

/**
 * A scripture citation, rendered as a pill that opens the verse on
 * jw.org — in the JW Library app when it's installed, in the web reader
 * otherwise.
 *
 * This is the shared primitive for the house rule: wherever a verse is
 * only *cited*, it becomes one of these; wherever the verse text itself
 * is available, show it verbatim and put this pill beside it.
 *
 * Visually matches `RefChip` in WorkbookPanel (the sky tone it uses for
 * `type: "scripture"`), so a citation looks the same wherever it turns
 * up. RefChip keeps its own implementation because it renders
 * publication and cross-article references too, and its URLs come from
 * hrefs scraped out of the WOL article rather than being built from the
 * reference string.
 *
 * An unparseable reference still renders — as a plain, unlinked pill —
 * so a typo never produces a dead link.
 */
export default function ScripturePill({
  reference,
  className = "",
}: {
  reference: string;
  className?: string;
}) {
  const { label, url } = toCitation(reference);
  if (!label) return null;

  const pill = (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900/40 ${className}`}
    >
      {label}
    </span>
  );

  if (!url) return pill;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:opacity-80 transition"
      title={`Open ${label} on jw.org`}
    >
      {pill}
    </a>
  );
}
