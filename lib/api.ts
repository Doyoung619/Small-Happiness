import { auth } from "./firebase";

export async function apiFetch<T>(path: string, init: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || response.statusText);
  }
  return response.json() as Promise<T>;
}
