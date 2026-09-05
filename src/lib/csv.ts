/** Minimal CSV serializer — Excel and every spreadsheet tool opens CSV natively. */
export function toCsv(rows: Record<string, unknown>[], columns: { key: string; header: string }[]): string {
  const escape = (value: unknown): string => {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const header = columns.map((c) => escape(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => escape(row[c.key])).join(","));
  // BOM so Excel opens Arabic text as UTF-8 instead of guessing a legacy codepage.
  return "﻿" + [header, ...lines].join("\r\n");
}
