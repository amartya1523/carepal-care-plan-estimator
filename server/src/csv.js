/**
 * CSV export for the ops team. Opens cleanly in Excel and Google Sheets:
 * UTF-8 BOM (so Hindi names survive), CRLF line endings, quoted fields,
 * and a guard against spreadsheet formula injection from user input.
 */

const FORMULA_START = /^[=+\-@\t\r]/;

export function toCsvValue(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n']/.test(text) || text !== text.trim() ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(columns, rows) {
  const header = columns.map((c) => toCsvValue(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => toCsvValue(c.value(row))).join(','));
  return `\uFEFF${[header, ...body].join('\r\n')}\r\n`;
}
