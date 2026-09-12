/* eslint-disable @typescript-eslint/no-explicit-any */
import { ObjectId } from "mongodb";
import { after, NextRequest, NextResponse } from "next/server";
import { normalizeLanguage } from "@/lib/languages";
import { requireUser } from "@/lib/server/auth";
import { joyTextCollection, mongoDb } from "@/lib/server/mongo";
import { analyzeJoy } from "@/lib/server/gemini";
import { translateText } from "@/lib/server/translate";
import { CATEGORY_TAG, tagLabel } from "@/lib/tags";

export const runtime = "nodejs";
export const maxDuration = 60;

const DURATIONS = [1, 6, 12, 24, 168];

function error(error: unknown, status = 400) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status });
}

function title(text: string) {
  return text.length > 30 ? `${text.slice(0, 30)}…` : text;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const db = await mongoDb();
    const profile = await db.collection<any>("profiles").findOne({ _id: user.uid });
    const language = normalizeLanguage(request.nextUrl.searchParams.get("language") || profile?.language);
    const friendIds = profile?.friendIds || [];
    const joys = await db.collection<any>("joys")
      .find({ $and: [
        { $or: [{ visibility: "public" }, { visibility: "friends", authorId: { $in: [user.uid, ...friendIds] } }] },
        { $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }] },
      ] })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    const translated = await Promise.all(joys.map(async (joy) => {
      const sourceLanguage = normalizeLanguage(joy.sourceLanguage);
      const sourceCollection = db.collection<any>(joyTextCollection(sourceLanguage));
      const targetCollection = db.collection<any>(joyTextCollection(language));
      let textDoc = await targetCollection.findOne({ joyId: joy.joyId });

      if (!textDoc && joy.processing) {
        textDoc = { title: title(joy.description || ""), description: joy.description || "" };
      }

      if (!textDoc) {
        const source = await sourceCollection.findOne({ joyId: joy.joyId });
        const description = await translateText(source?.description || joy.description || "", sourceLanguage, language);
        textDoc = { joyId: joy.joyId, language, title: title(description), description };
        await targetCollection.updateOne({ joyId: joy.joyId }, { $set: { ...textDoc, updatedAt: new Date() } }, { upsert: true });
      }

      const tags = joy.tags?.length ? joy.tags : [CATEGORY_TAG[joy.category as keyof typeof CATEGORY_TAG] || "hidden gem"];
      return {
        id: joy.joyId,
        authorId: joy.authorId,
        author: joy.author,
        title: textDoc.title,
        label: textDoc.title,
        description: textDoc.description,
        emoji: joy.emoji,
        imageUrl: joy.imageUrl || "",
        lat: joy.lat,
        lng: joy.lng,
        visibility: joy.visibility,
        category: joy.category || "other",
        tags,
        tagLabels: Object.fromEntries(tags.map((tag: string) => [tag, tagLabel(tag, language)])),
        sharedAt: joy.sharedAt || "just now",
        sourceLanguage,
        song: joy.song,
      };
    }));

    return NextResponse.json({ joys: translated });
  } catch (caught) {
    return error(caught, 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const text = String(body.text || "").trim();
    if (!text) throw new Error("Text is required.");
    const durationHours = Number(body.durationHours);
    if (!DURATIONS.includes(durationHours)) throw new Error("Invalid visibility duration.");
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error("Invalid location.");
    const joyId = new ObjectId();
    const db = await mongoDb();
    const profile = await db.collection<any>("profiles").findOne({ _id: user.uid });
    const now = new Date();
    const songUrl = (() => {
      try {
        const url = new URL(String(body.song?.url || ""));
        return url.hostname === "music.apple.com" || url.hostname === "itunes.apple.com" || url.hostname.endsWith(".itunes.apple.com") ? url.toString() : "";
      } catch {
        return "";
      }
    })();
    const song = body.song && {
      id: String(body.song.id || "").slice(0, 30),
      title: String(body.song.title || "").slice(0, 120),
      artist: String(body.song.artist || "").slice(0, 120),
      album: String(body.song.album || "").slice(0, 120),
      artworkUrl: String(body.song.artworkUrl || "").slice(0, 500),
      url: songUrl,
    };

    await db.collection<any>("joys").insertOne({
      _id: joyId,
      joyId: joyId.toString(),
      authorId: user.uid,
      author: profile?.displayName || body.author || user.name || `guest-${user.uid.slice(0, 6)}`,
      emoji: String(body.emoji || "✨").slice(0, 8),
      imageUrl: body.imageUrl || "",
      lat,
      lng,
      visibility: body.visibility === "friends" ? "friends" : "public",
      sourceLanguage: normalizeLanguage(profile?.language),
      category: "other",
      description: text,
      processing: true,
      sharedAt: "just now",
      createdAt: now,
      expiresAt: new Date(now.getTime() + durationHours * 60 * 60 * 1000),
      ...(song?.id && song.title && song.artist ? { song } : {}),
    });

    after(async () => {
      try {
        const backgroundDb = await mongoDb();
        const analysis = await analyzeJoy(text, body.imageUrl, body.emoji);
        await Promise.all(Object.entries(analysis.translations).map(([language, translated]) =>
          backgroundDb.collection<any>(joyTextCollection(language)).updateOne(
            { joyId: joyId.toString() },
            { $set: { joyId: joyId.toString(), language, ...translated, updatedAt: new Date() }, $setOnInsert: { createdAt: now } },
            { upsert: true },
          ),
        ));
        await backgroundDb.collection<any>("joys").updateOne(
          { _id: joyId },
          { $set: { emoji: analysis.emoji, sourceLanguage: analysis.sourceLanguage, category: analysis.category, tags: analysis.tags }, $unset: { processing: "" } },
        );
      } catch (caught) {
        console.error("Joy analysis failed", caught);
      }
    });

    return NextResponse.json({ id: joyId.toString() });
  } catch (caught) {
    return error(caught);
  }
}
