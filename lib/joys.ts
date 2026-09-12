import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { apiFetch } from "./api";
import { firebaseStorage } from "./firebase";
import { normalizeLanguage } from "./languages";
import { Pin } from "./mockPins";
import { Song } from "./music";

export type Joy = Pin & {
  authorId: string;
  visibility: "public" | "friends";
  sourceLanguage?: string;
};

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
  let communityJoys: Joy[] = [];
  let grokJoys = cachedGrokJoys();
  const emit = () => alive && onData([...communityJoys, ...grokJoys]);
  emit();
  void apiFetch<{ joys: Joy[] }>(`/api/joys?language=${preferredLanguage(language)}`)
    .then(({ joys }) => {
      communityJoys = joys.map((joy) => ({ ...joy, sourceType: joy.sourceType || "community" }));
      emit();
    })
    .catch((error) => alive && onError(error.message));
  void fetch("/api/x-spots")
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("X Search request failed")))
    .then((payload: { spots?: Pin[] }) => {
      if (!Array.isArray(payload.spots) || payload.spots.length === 0) return;
      localStorage.setItem(GROK_SPOTS_KEY, JSON.stringify({
        spots: payload.spots,
        expiresAt: Date.now() + GROK_CACHE_MS,
      }));
      grokJoys = asPublicJoys(payload.spots, "grok-x");
      emit();
    })
    .catch(() => {
      // The seeded community map remains fully usable while Grok refreshes.
    });
  return () => {
    alive = false;
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
  let imageUrl = "";
  if (photo) {
    const imageRef = ref(firebaseStorage(), `joys/${uid}/${crypto.randomUUID()}`);
    await uploadBytes(imageRef, photo, { contentType: photo.type });
    imageUrl = await getDownloadURL(imageRef);
  }

  return apiFetch<{ id: string }>("/api/joys", {
    method: "POST",
    body: JSON.stringify({ author: author?.trim() || `guest-${uid.slice(0, 6)}`, text, emoji, imageUrl, lat, lng, visibility, durationHours, song }),
  });
}
