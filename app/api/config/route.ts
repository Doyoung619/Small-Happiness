import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const publicKeys = [
  "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export function GET() {
  const values = Object.fromEntries(publicKeys.map((key) => [key, process.env[key] || ""]));
  const missing = publicKeys.filter((key) => !values[key]);
  if (missing.length) {
    return NextResponse.json({ error: "JoyWalk configuration is incomplete." }, { status: 503 });
  }

  return NextResponse.json({
    googleMapsApiKey: values.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    firebase: {
      apiKey: values.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: values.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: values.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: values.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: values.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: values.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
  });
}
