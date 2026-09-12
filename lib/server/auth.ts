import { NextRequest } from "next/server";

export async function requireUser(request: NextRequest) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new Error("Missing auth token");

  const apiKeyVariable = "NEXT_PUBLIC_FIREBASE_API_KEY";
  const apiKey = process.env[apiKeyVariable];
  if (!apiKey) throw new Error("Firebase API key is missing");
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken: token }),
    cache: "no-store",
  });
  const data = await response.json();
  const user = data.users?.[0];
  if (!response.ok || !user?.localId) throw new Error("Invalid auth token");
  return { uid: user.localId as string, name: user.displayName as string | undefined };
}
