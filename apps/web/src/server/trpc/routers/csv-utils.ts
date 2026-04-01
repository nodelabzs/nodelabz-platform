/**
 * CSV export utilities.
 *
 * Handles escaping of field values that contain commas, double-quotes,
 * or newlines — wrapping them in double-quotes per RFC 4180.
 */

export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";

  const str = String(value);

  // If the field contains a comma, double-quote, or newline, wrap it in quotes
  // and escape any embedded double-quotes by doubling them.
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function buildCsvString(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(","));
  return [headerLine, ...dataLines].join("\n");
}
