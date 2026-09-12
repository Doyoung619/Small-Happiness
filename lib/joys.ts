import { normalizeLanguage } from "./languages";
import { MOCK_PINS, Pin, SEUNGYEON_PINS } from "./mockPins";
import { Song } from "./music";

export type Joy = Pin & {
  authorId: string;
  visibility: "public" | "friends";
  sourceLanguage?: string;
};

const LOCAL_JOYS_KEY = "joywalk-demo-joys";
const GROK_SPOTS_KEY = "joywalk-grok-spots-v2";
const GROK_CACHE_MS = 6 * 60 * 60 * 1000;

function asPublicJoys(pins: Pin[], prefix: string): Joy[] {
  return pins.map((pin, index) => ({
    ...pin,
    authorId: `${prefix}-${index + 1}`,
    visibility: "public",
    category: pin.category || "other",
    tags: pin.tags?.length ? pin.tags : ["hidden gem"],
    sourceLanguage: "en",
  }));
}

function seededJoys(): Joy[] {
  return [
    ...asPublicJoys(SEUNGYEON_PINS, "seungyeon"),
    ...asPublicJoys(MOCK_PINS, "demo"),
  ];
}

function cachedGrokJoys(): Joy[] {
  if (typeof window === "undefined") return [];
  try {
    const cached = JSON.parse(localStorage.getItem(GROK_SPOTS_KEY) || "null") as { expiresAt?: number; spots?: Pin[] } | null;
    if (!cached?.expiresAt || cached.expiresAt < Date.now() || !Array.isArray(cached.spots)) return [];
    return asPublicJoys(cached.spots, "grok-x");
  } catch {
    return [];
  }
}

function localJoys(): Joy[] {
  if (typeof window === "undefined") return seededJoys();
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_JOYS_KEY) || "[]") as Array<Joy & { expiresAt?: number }>;
    const now = Date.now();
    return [...saved.filter((joy) => !joy.expiresAt || joy.expiresAt > now), ...cachedGrokJoys(), ...seededJoys()];
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
  void fetch("/api/x-spots")
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("X Search request failed")))
    .then((payload: { spots?: Pin[] }) => {
      if (!Array.isArray(payload.spots) || payload.spots.length === 0) return;
      localStorage.setItem(GROK_SPOTS_KEY, JSON.stringify({
        spots: payload.spots,
        expiresAt: Date.now() + GROK_CACHE_MS,
      }));
      load();
    })
    .catch(() => {
      // The seeded community map remains fully usable while Grok refreshes.
    });
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
