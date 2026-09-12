import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { apiFetch } from "./api";
import { storage } from "./firebase";
import { normalizeLanguage } from "./languages";
import { Pin } from "./mockPins";
import { Song } from "./music";

export type Joy = Pin & {
  authorId: string;
  visibility: "public" | "friends";
  sourceLanguage?: string;
};

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
  const load = () => apiFetch<{ joys: Joy[] }>(`/api/joys?language=${preferredLanguage(language)}`)
    .then((data) => alive && onData(data.joys))
    .catch((error) => alive && onError(error.message));
  void load();
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
    const imageRef = ref(storage, `joys/${uid}/${crypto.randomUUID()}`);
    await uploadBytes(imageRef, photo, { contentType: photo.type });
    imageUrl = await getDownloadURL(imageRef);
  }

  return apiFetch<{ id: string }>("/api/joys", {
    method: "POST",
    body: JSON.stringify({
    authorId: uid,
    author: author?.trim() || `guest-${uid.slice(0, 6)}`,
    text,
    emoji,
    imageUrl,
    lat,
    lng,
    visibility,
    durationHours,
    song,
    }),
  });
}
