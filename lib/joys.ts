import { normalizeLanguage } from "./languages";
import { MOCK_PINS, Pin } from "./mockPins";
import { Song } from "./music";

export type Joy = Pin & {
  authorId: string;
  visibility: "public" | "friends";
  sourceLanguage?: string;
};

const LOCAL_JOYS_KEY = "joywalk-demo-joys";

function seededJoys(): Joy[] {
  return MOCK_PINS.map((pin, index) => ({
    ...pin,
    authorId: `demo-${index + 1}`,
    visibility: "public",
    category: pin.category || "other",
    tags: pin.tags?.length ? pin.tags : ["hidden gem"],
    sourceLanguage: "en",
  }));
}

function localJoys(): Joy[] {
  if (typeof window === "undefined") return seededJoys();
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_JOYS_KEY) || "[]") as Array<Joy & { expiresAt?: number }>;
    const now = Date.now();
    return [...saved.filter((joy) => !joy.expiresAt || joy.expiresAt > now), ...seededJoys()];
  } catch {
    return seededJoys();
  }
}

function preferredLanguage(language?: string) {
  if (language) return normalizeLanguage(language);
  if (typeof window === "undefined") return "en";
  return normalizeLanguage(localStorage.getItem("joywalk-language") || navigator.language);
}

export function subscribeToJoys(
  onData: (joys: Joy[]) => void,
  onError: (message: string) => void,
  language?: string,
) {
  let alive = true;
  void preferredLanguage(language);
  void onError;
  const load = () => alive && onData(localJoys());
  load();
  const refresh = () => load();
  window.addEventListener("joywalk:joys-changed", refresh);
  window.addEventListener("storage", refresh);
  return () => {
    alive = false;
    window.removeEventListener("joywalk:joys-changed", refresh);
    window.removeEventListener("storage", refresh);
  };
}

export async function createJoy({
  uid,
  text,
  emoji,
  lat,
  lng,
  photo,
  author,
  visibility = "public",
  durationHours = 24,
  song,
}: {
  uid: string;
  text: string;
  emoji: string;
  lat: number;
  lng: number;
  photo?: File;
  author?: string | null;
  visibility?: "public" | "friends";
  durationHours?: 1 | 6 | 12 | 24 | 168;
  song?: Song;
}) {
  const id = `local-${crypto.randomUUID()}`;
  const imageUrl = photo ? URL.createObjectURL(photo) : `https://picsum.photos/seed/${encodeURIComponent(id)}/600/400`;
  const joy: Joy & { expiresAt: number } = {
    id,
    authorId: uid,
    author: author?.trim() || `guest-${uid.slice(0, 6)}`,
    title: text.length > 34 ? `${text.slice(0, 34)}…` : text,
    description: text,
    emoji,
    imageUrl,
    lat,
    lng,
    visibility,
    category: "other",
    tags: ["hidden gem"],
    sharedAt: "just now",
    sourceLanguage: preferredLanguage(),
    song,
    expiresAt: Date.now() + durationHours * 60 * 60 * 1000,
  };
  const saved = localJoys().filter((item) => item.id.startsWith("local-")).slice(0, 19);
  localStorage.setItem(LOCAL_JOYS_KEY, JSON.stringify([joy, ...saved]));
  window.dispatchEvent(new Event("joywalk:joys-changed"));
  return { id };
}
