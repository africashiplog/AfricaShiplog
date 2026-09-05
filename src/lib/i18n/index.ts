import ar, { type Dictionary } from "./dictionaries/ar";

export type Locale = "ar"; // add "en" here once en.ts exists

export const DEFAULT_LOCALE: Locale = "ar";
export const LOCALE_DIRECTION: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
};

const dictionaries: Record<Locale, Dictionary> = { ar };

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/** Currently a thin alias — kept so call sites don't change when more locales land. */
export const t = getDictionary(DEFAULT_LOCALE);
