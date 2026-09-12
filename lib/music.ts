import { apiFetch } from "./api";

export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  url: string;
};

export function searchSongs(query: string) {
  return apiFetch<{ songs: Song[] }>(`/api/music?q=${encodeURIComponent(query.trim())}`);
}
