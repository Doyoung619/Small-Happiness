/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { normalizeLanguage } from "@/lib/languages";
import { requireUser } from "@/lib/server/auth";
import { mongoDb } from "@/lib/server/mongo";

export const runtime = "nodejs";

function clean(profile: Record<string, any>) {
  return {
    uid: profile.uid,
    displayName: profile.displayName,
    nameLower: profile.nameLower,
    language: normalizeLanguage(profile.language),
    friendIds: profile.friendIds || [],
    friendNames: profile.friendNames || {},
  };
}

function safeName(name?: string | null, uid?: string) {
  const value = name?.trim() || `guest-${uid?.slice(0, 6) || "user"}`;
  if (value.length < 2) throw new Error("Name must be at least 2 characters.");
  if (value.length > 24) throw new Error("Name must be 24 characters or less.");
  return value;
}

async function ensureProfile(uid: string, displayName?: string | null, language?: string | null) {
  const db = await mongoDb();
  const profiles = db.collection<any>("profiles");
  const existing = await profiles.findOne({ _id: uid });
  if (existing) return clean(existing);

  const wantedName = safeName(displayName, uid);
  const wantedNameLower = wantedName.toLowerCase();
  const taken = await db.collection<any>("usernames").findOne({ _id: wantedNameLower });
  const name = taken && taken.uid !== uid ? `guest-${uid.slice(0, 6)}` : wantedName;
  const profile = {
    _id: uid,
    uid,
    displayName: name,
    nameLower: name.toLowerCase(),
    language: normalizeLanguage(language),
    friendIds: [],
    friendNames: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await profiles.insertOne(profile);
  await db.collection<any>("usernames").updateOne(
    { _id: profile.nameLower },
    { $setOnInsert: { uid, displayName: name, createdAt: new Date() }, $set: { updatedAt: new Date() } },
    { upsert: true },
  );
  return clean(profile);
}

function error(error: unknown, status = 400) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    return NextResponse.json(await ensureProfile(user.uid, user.name));
  } catch (caught) {
    return error(caught, 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(await ensureProfile(user.uid, body.displayName || user.name, body.language));
  } catch (caught) {
    return error(caught);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const db = await mongoDb();
    const profiles = db.collection<any>("profiles");
    const usernames = db.collection<any>("usernames");
    const profile = await profiles.findOne({ _id: user.uid }) || await ensureProfile(user.uid, user.name);
    const set: Record<string, unknown> = { updatedAt: new Date() };

    if (body.displayName !== undefined) {
      const displayName = safeName(body.displayName, user.uid);
      const nameLower = displayName.toLowerCase();
      const taken = await usernames.findOne({ _id: nameLower });
      if (taken && taken.uid !== user.uid) throw new Error("That name is already taken.");
      if (profile.nameLower && profile.nameLower !== nameLower) {
        await usernames.deleteOne({ _id: profile.nameLower, uid: user.uid });
      }
      await usernames.updateOne({ _id: nameLower }, { $set: { uid: user.uid, displayName, updatedAt: new Date() } }, { upsert: true });
      set.displayName = displayName;
      set.nameLower = nameLower;
    }

    if (body.language !== undefined) {
      set.language = normalizeLanguage(body.language);
    }

    await profiles.updateOne({ _id: user.uid }, { $set: set }, { upsert: true });
    return NextResponse.json(clean(await profiles.findOne({ _id: user.uid }) || { uid: user.uid, ...set }));
  } catch (caught) {
    return error(caught);
  }
}
