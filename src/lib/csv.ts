// Minimal RFC-4180 CSV parser — no dependency.
// Handles quoted fields, "" escaped quotes, and commas / newlines inside
// quotes (Daily Text comments contain all of these). Returns rows of cells.
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const s = input;

  while (i < s.length) {
    const c = s[i];

    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += c;
        i += 1;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i += 1;
    } else if (c === ",") {
      row.push(field);
      field = "";
      i += 1;
    } else if (c === "\r") {
      i += 1; // CRLF — newline handled by the \n
    } else if (c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      i += 1;
    } else {
      field += c;
      i += 1;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop blank lines (e.g. a trailing newline at end of file).
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

// Parse with a header row -> array of objects keyed by lowercased header.
export function parseCsvObjects(
  input: string,
): { headers: string[]; rows: Record<string, string>[] } {
  const grid = parseCsv(input);
  if (grid.length === 0) return { headers: [], rows: [] };
  const headers = grid[0].map((h) => h.trim().toLowerCase());
  const rows = grid.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows };
}
