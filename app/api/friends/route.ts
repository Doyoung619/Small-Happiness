/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { mongoDb } from "@/lib/server/mongo";

export const runtime = "nodejs";

function error(error: unknown, status = 400) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const db = await mongoDb();
    const requests = await db.collection<any>("friendRequests")
      .find({ toUid: user.uid, status: "pending" })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    return NextResponse.json({ requests: requests.map(({ _id, ...request }) => ({ id: String(_id), ...request })) });
  } catch (caught) {
    return error(caught, 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { targetName } = await request.json();
    const nameLower = String(targetName || "").trim().toLowerCase();
    if (!nameLower) throw new Error("Enter a friend name.");

    const db = await mongoDb();
    const profiles = db.collection<any>("profiles");
    const current = await profiles.findOne({ _id: user.uid });
    const targetUsername = await db.collection<any>("usernames").findOne({ _id: nameLower });
    if (!targetUsername) throw new Error("No user found with that name.");
    if (targetUsername.uid === user.uid) throw new Error("You cannot add yourself.");
    if ((current?.friendIds || []).includes(targetUsername.uid)) throw new Error("Already friends.");

    const target = await profiles.findOne({ _id: targetUsername.uid });
    const id = `${user.uid}_${targetUsername.uid}`;
    await db.collection<any>("friendRequests").updateOne(
      { _id: id },
      {
        $setOnInsert: {
          fromUid: user.uid,
          fromName: current?.displayName || user.name || `guest-${user.uid.slice(0, 6)}`,
          toUid: targetUsername.uid,
          toName: target?.displayName || targetUsername.displayName,
          status: "pending",
          createdAt: new Date(),
        },
        $set: { updatedAt: new Date() },
      },
      { upsert: true },
    );
    return NextResponse.json({ ok: true });
  } catch (caught) {
    return error(caught);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { id, action } = await request.json();
    const db = await mongoDb();
    const requests = db.collection<any>("friendRequests");
    const friendRequest = await requests.findOne({ _id: String(id), toUid: user.uid, status: "pending" });
    if (!friendRequest) throw new Error("Friend request not found.");

    if (action === "decline") {
      await requests.deleteOne({ _id: String(id) });
      return NextResponse.json({ ok: true });
    }
    if (action !== "accept") throw new Error("Unknown action.");

    const profiles = db.collection<any>("profiles");
    await profiles.updateOne(
      { _id: friendRequest.toUid },
      { $addToSet: { friendIds: friendRequest.fromUid }, $set: { [`friendNames.${friendRequest.fromUid}`]: friendRequest.fromName, updatedAt: new Date() } },
    );
    await profiles.updateOne(
      { _id: friendRequest.fromUid },
      { $addToSet: { friendIds: friendRequest.toUid }, $set: { [`friendNames.${friendRequest.toUid}`]: friendRequest.toName, updatedAt: new Date() } },
    );
    await requests.updateOne({ _id: String(id) }, { $set: { status: "accepted", updatedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (caught) {
    return error(caught);
  }
}
