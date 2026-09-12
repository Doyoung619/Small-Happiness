import type { User } from "firebase/auth";
import { updateProfile } from "firebase/auth";
import { apiFetch } from "./api";
import { normalizeLanguage } from "./languages";

export type UserProfile = {
  uid: string;
  displayName: string;
  nameLower: string;
  language: string;
  friendIds: string[];
  friendNames?: Record<string, string>;
};

export type FriendRequest = {
  id: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  status: "pending" | "accepted";
};

export function fallbackName(user: Pick<User, "uid" | "displayName">) {
  return user.displayName?.trim() || `guest-${user.uid.slice(0, 6)}`;
}

function preferredLanguage() {
  if (typeof window === "undefined") return "en";
  return normalizeLanguage(localStorage.getItem("joywalk-language") || navigator.language);
}

export async function ensureUserProfile(user: User) {
  const profile = await apiFetch<UserProfile>("/api/me", {
    method: "POST",
    body: JSON.stringify({ displayName: fallbackName(user), language: preferredLanguage() }),
  });
  localStorage.setItem("joywalk-language", profile.language);
  return profile;
}

export function subscribeToProfile(_uid: string, onData: (profile: UserProfile | null) => void, onError: (message: string) => void) {
  let alive = true;
  void apiFetch<UserProfile>("/api/me").then((profile) => {
    if (!alive) return;
    localStorage.setItem("joywalk-language", profile.language);
    onData(profile);
  }).catch((error) => alive && onError(error.message));
  return () => {
    alive = false;
  };
}

export function subscribeToFriendRequests(_uid: string, onData: (requests: FriendRequest[]) => void, onError: (message: string) => void) {
  let alive = true;
  const load = () => apiFetch<{ requests: FriendRequest[] }>("/api/friends").then(({ requests }) => alive && onData(requests)).catch((error) => alive && onError(error.message));
  void load();
  const timer = window.setInterval(load, 8000);
  return () => {
    alive = false;
    window.clearInterval(timer);
  };
}

export async function saveUserName(user: User, name: string) {
  const profile = await apiFetch<UserProfile>("/api/me", { method: "PATCH", body: JSON.stringify({ displayName: name.trim() }) });
  await updateProfile(user, { displayName: profile.displayName });
  return profile;
}

export async function saveUserLanguage(language: string) {
  const profile = await apiFetch<UserProfile>("/api/me", { method: "PATCH", body: JSON.stringify({ language: normalizeLanguage(language) }) });
  localStorage.setItem("joywalk-language", profile.language);
  return profile;
}

export function sendFriendRequest(_user: User, targetName: string) {
  return apiFetch<{ ok: true }>("/api/friends", { method: "POST", body: JSON.stringify({ targetName }) });
}

export function acceptFriendRequest(request: FriendRequest) {
  return apiFetch<{ ok: true }>("/api/friends", { method: "PATCH", body: JSON.stringify({ id: request.id, action: "accept" }) });
}

export function declineFriendRequest(id: string) {
  return apiFetch<{ ok: true }>("/api/friends", { method: "PATCH", body: JSON.stringify({ id, action: "decline" }) });
}
