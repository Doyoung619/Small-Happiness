import type { User } from "firebase/auth";
import { updateProfile } from "firebase/auth";
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

function profileKey(uid: string) {
  return `joywalk-profile-${uid}`;
}

function localProfile(uid: string, displayName?: string | null): UserProfile {
  const name = displayName?.trim() || `guest-${uid.slice(0, 6)}`;
  const fallback: UserProfile = {
    uid,
    displayName: name,
    nameLower: name.toLowerCase(),
    language: preferredLanguage(),
    friendIds: [],
    friendNames: {},
  };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(profileKey(uid)) || "{}") };
  } catch {
    return fallback;
  }
}

function storeProfile(profile: UserProfile) {
  localStorage.setItem(profileKey(profile.uid), JSON.stringify(profile));
  localStorage.setItem("joywalk-language", profile.language);
  window.dispatchEvent(new Event("joywalk:profile-changed"));
  return profile;
}

export async function ensureUserProfile(user: User) {
  return storeProfile(localProfile(user.uid, fallbackName(user)));
}

export function subscribeToProfile(uid: string, onData: (profile: UserProfile | null) => void, onError: (message: string) => void) {
  let alive = true;
  void onError;
  const load = () => alive && onData(localProfile(uid));
  load();
  window.addEventListener("joywalk:profile-changed", load);
  window.addEventListener("storage", load);
  return () => {
    alive = false;
    window.removeEventListener("joywalk:profile-changed", load);
    window.removeEventListener("storage", load);
  };
}

export function subscribeToFriendRequests(_uid: string, onData: (requests: FriendRequest[]) => void, onError: (message: string) => void) {
  void onError;
  onData([]);
  return () => {};
}

export async function saveUserName(user: User, name: string) {
  const displayName = name.trim().slice(0, 24);
  if (displayName.length < 2) throw new Error("Name must be at least 2 characters.");
  const profile = storeProfile({ ...localProfile(user.uid, user.displayName), displayName, nameLower: displayName.toLowerCase() });
  await updateProfile(user, { displayName });
  return profile;
}

export async function saveUserLanguage(language: string) {
  const normalized = normalizeLanguage(language);
  localStorage.setItem("joywalk-language", normalized);
  return { uid: "local", displayName: "Guest Walker", nameLower: "guest walker", language: normalized, friendIds: [], friendNames: {} };
}

export async function sendFriendRequest(_user: User, _targetName: string) {
  void _user;
  void _targetName;
  return { ok: true as const };
}

export async function acceptFriendRequest(_request: FriendRequest) {
  void _request;
  return { ok: true as const };
}

export async function declineFriendRequest(_id: string) {
  void _id;
  return { ok: true as const };
}
