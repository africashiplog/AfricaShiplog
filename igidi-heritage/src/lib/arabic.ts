/**
 * Arabic search normalization.
 *
 * Used ONLY to build search keys (`searchText`, `normalized`) and to normalize
 * queries — the original spelling of every name is always stored and displayed
 * untouched.
 *
 * Folds the variations that commonly differ between sources and typists:
 * - diacritics (tashkeel), superscript alef, tatweel
 * - hamza forms of alef (أ إ آ ٱ) -> ا ; ؤ -> و ; ئ -> ي ; standalone ء removed
 * - alef maqsura ى -> ي ; ta marbuta ة -> ه
 * - Hassaniya/Maghrebi letters: گ ڭ ݣ -> ك (so "إيگيدي" matches "إيكيدي"),
 *   ڤ -> ف, ڨ -> ق, پ -> ب
 * - Persian/Urdu forms: ی -> ي, ک -> ك
 * - Arabic-Indic and Persian digits -> ASCII digits
 * - Latin text is lower-cased and stripped of accents (é -> e)
 */
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

const CHAR_MAP: Record<string, string> = {
  "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ٲ": "ا", "ٳ": "ا",
  "ؤ": "و", "ئ": "ي", "ى": "ي", "ی": "ي", "ة": "ه",
  "گ": "ك", "ڭ": "ك", "ݣ": "ك", "ک": "ك",
  "ڤ": "ف", "ڨ": "ق", "پ": "ب",
  "ء": "",
};

export function normalizeArabic(input: string | null | undefined): string {
  if (!input) return "";
  let s = input.normalize("NFKD").replace(/[̀-ͯ]/g, ""); // Latin accents
  s = s.replace(DIACRITICS, "");
  s = s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  s = s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  s = Array.from(s, (ch) => (ch in CHAR_MAP ? CHAR_MAP[ch] : ch)).join("");
  s = s.toLowerCase();
  // Punctuation -> space, collapse whitespace
  s = s.replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
  return s;
}

/** Builds a single search key from many (possibly empty) name fragments. */
export function buildSearchText(parts: Array<string | null | undefined>): string {
  const seen = new Set<string>();
  for (const p of parts) {
    const n = normalizeArabic(p);
    if (n) seen.add(n);
  }
  return Array.from(seen).join(" | ");
}

/** Query tokens (normalized). The leading Arabic article "ال" is stripped so "المدفن" matches "مدفن". */
export function queryTokens(query: string): string[] {
  return normalizeArabic(query)
    .split(" ")
    .map((t) => (t.length > 3 && t.startsWith("ال") ? t.slice(2) : t))
    .filter((t) => t.length > 0);
}

/** URL slug: keeps Arabic letters (normalized), hyphen-separated. */
export function slugify(input: string): string {
  const base = normalizeArabic(input).replace(/\s+/g, "-").slice(0, 80);
  return base || "record";
}
