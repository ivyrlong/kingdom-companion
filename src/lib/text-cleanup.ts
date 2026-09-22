/**
 * Text normalisation applied at ingest time to every ContentPack whose
 * body was scraped/pasted from a print-layout source (Daily Text,
 * Watchtower study, OCLM workbook).
 *
 * Print copies of these publications wrap lines with a soft hyphen —
 * "ap-\npreciation". When the text is copied out of the PDF or scraped
 * from WOL's HTML, the hyphen survives as literal `word- word` in the
 * captured string.
 *
 * The regex `([A-Za-z])-\s+([A-Za-z])` uniquely targets that shape.
 * Real compound words like "self-control" or "full-grown" have no
 * whitespace around the hyphen, so they are never rewritten.
 */

export function rejoinLineBreakHyphens(text: string): string {
  return text.replace(/([A-Za-z])-\s+([A-Za-z])/g, "$1$2");
}

/**
 * Deep-walk any JSON-ish structure and rewrite every string field in
 * place. Returns the same input reference for callers that need to know
 * whether anything changed (compare identity? no — use `count`).
 * The count of strings actually rewritten is returned so backfill scripts
 * can report progress meaningfully.
 */
export function rejoinLineBreakHyphensDeep(node: unknown): number {
  let count = 0;
  const visit = (parent: Record<string, unknown> | unknown[], key: string | number) => {
    const value = (parent as Record<string | number, unknown>)[key];
    if (typeof value === "string") {
      const next = rejoinLineBreakHyphens(value);
      if (next !== value) {
        (parent as Record<string | number, unknown>)[key] = next;
        count++;
      }
    } else if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) visit(value, i);
      } else {
        for (const k of Object.keys(value)) visit(value as Record<string, unknown>, k);
      }
    }
  };
  if (node && typeof node === "object") {
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) visit(node, i);
    } else {
      for (const k of Object.keys(node)) visit(node as Record<string, unknown>, k);
    }
  }
  return count;
}
