/**
 * Pure helpers for scripts/import-class-list.mjs, kept apart so they can be
 * unit tested without a spreadsheet or a deployment.
 */

/** Same rule as MATRIC_REGEX in lib/constants.ts. */
export const MATRIC_REGEX = /^([a-zA-Z]{2}\/)?\d{2}\/\d{4}$/;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const collapse = (value) => value.replace(/\s+/g, " ").trim();

/** "POPOOLA" -> "Popoola", "ADE-BELLO" -> "Ade-Bello". Mixed-case input is left alone. */
const titleCaseIfShouting = (value) =>
  value === value.toUpperCase()
    ? value.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase())
    : value;

/**
 * An exceljs cell value as plain text. Cells can hold strings, numbers,
 * hyperlinks (`{ text, hyperlink }`), rich text (`{ richText: [...] }`) or
 * formula results (`{ result }`).
 */
export const cellText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join("");
  if ("text" in value) return cellText(value.text);
  if ("result" in value) return cellText(value.result);
  return "";
};

/**
 * Find the header row and the columns we need by their labels, so reordered
 * or extra columns don't matter. `rows` is an array of arrays of cell text.
 * Returns null when no row has both a "Matric" and a "Surname" header.
 */
export const findColumns = (rows) => {
  for (const [index, row] of rows.entries()) {
    const labels = row.map((cell) => collapse(cell ?? "").toLowerCase());
    const find = (test) => labels.findIndex((label) => label && test(label));
    const columns = {
      surname: find((l) => l.startsWith("surname")),
      otherNames: find((l) => l.startsWith("other name")),
      matric: find((l) => l.startsWith("matric")),
      personalEmail: find((l) => l.includes("personal") && l.includes("email")),
      phone: find((l) => l.includes("phone")),
    };
    if (columns.surname !== -1 && columns.matric !== -1) return { headerIndex: index, columns };
  }
  return null;
};

/**
 * One spreadsheet row -> a user for `ops.importClassList` (the personal email
 * becomes the user's email), or `{ error }` saying why it was skipped.
 */
export const mapClassListRow = (row, columns, { departmentId, level }) => {
  const get = (column) => (column === -1 ? "" : collapse(row[column] ?? ""));

  const surname = titleCaseIfShouting(get(columns.surname));
  const otherNames = titleCaseIfShouting(get(columns.otherNames));
  const fullName = collapse(`${surname} ${otherNames}`);
  const matricNumber = get(columns.matric).replace(/\s/g, "").toUpperCase();
  const email = get(columns.personalEmail).replace(/\s/g, "").toLowerCase();
  const phone = get(columns.phone);

  if (!fullName) return { error: "missing name" };
  if (!MATRIC_REGEX.test(matricNumber)) return { error: `bad matric "${matricNumber}"` };
  if (!EMAIL_REGEX.test(email)) return { error: `bad personal email "${email}"` };

  return {
    fullName,
    matricNumber,
    departmentId,
    level,
    email,
    ...(phone ? { phone } : {}),
  };
};
