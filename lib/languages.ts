export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ko", label: "Korean" },
  { code: "es", label: "Spanish" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
] as const;

export type LanguageCode = typeof LANGUAGES[number]["code"];

export function normalizeLanguage(value?: string | null) {
  const code = (value || "en").slice(0, 2).toLowerCase();
  return LANGUAGES.some((language) => language.code === code) ? code : "en";
}
