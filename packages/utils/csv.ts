/**
 * Minimal RFC-4180-ish CSV parser: handles quoted fields (including
 * embedded commas, newlines, and doubled `""` escaped quotes), bare
 * unquoted fields, and both CRLF/LF line endings. Deliberately not a
 * naive `.split(',')` — spa descriptions/addresses routinely contain
 * commas, which would silently corrupt columns otherwise.
 *
 * Returns rows of raw string cells; the caller maps them to named
 * fields (see parseCsvRecords below).
 */
export function parseCsv(text: string): string[][] {
  // Strip a UTF-8 BOM if present (common when a CSV is exported from Excel).
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < input.length) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ',') {
      endField();
      i += 1;
      continue;
    }
    if (char === '\r') {
      i += 1;
      continue;
    }
    if (char === '\n') {
      endRow();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  // Final field/row, if the file doesn't end with a trailing newline.
  if (field.length > 0 || row.length > 0) {
    endRow();
  }

  // Drop fully-blank trailing rows (common with a trailing newline).
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

/**
 * Parses CSV text into an array of objects keyed by the header row
 * (first row). Extra/missing columns per data row are tolerated —
 * missing cells become '', extra cells are dropped — so a slightly
 * ragged spreadsheet export doesn't hard-fail the whole file.
 */
export function parseCsvRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const headers = rows[0]!.map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (row[index] ?? '').trim();
    });
    return record;
  });
}
