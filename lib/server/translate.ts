import { normalizeLanguage } from "@/lib/languages";
import { translateWithGemini } from "@/lib/server/gemini";

export async function translateText(text: string, source: string, target: string) {
  const from = normalizeLanguage(source);
  const to = normalizeLanguage(target);
  return !text || from === to ? text : translateWithGemini(text, to);
}
