import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 80);
    if (!query) return NextResponse.json({ songs: [] });
    const url = new URL("https://itunes.apple.com/search");
    url.search = new URLSearchParams({ term: query, country: "US", media: "music", entity: "song", limit: "8", explicit: "No" }).toString();
    const response = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error("Music search failed.");
    const data = await response.json();
    const songs = data.results.map((song: Record<string, unknown>) => ({
      id: String(song.trackId),
      title: String(song.trackName || ""),
      artist: String(song.artistName || ""),
      album: String(song.collectionName || ""),
      artworkUrl: String(song.artworkUrl100 || "").replace("100x100bb", "300x300bb"),
      url: String(song.trackViewUrl || ""),
    })).filter((song: { id: string; title: string; artist: string }) => song.id && song.title && song.artist);
    return NextResponse.json({ songs });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Music search failed." }, { status: 400 });
  }
}
