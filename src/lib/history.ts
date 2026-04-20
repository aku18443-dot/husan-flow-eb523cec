import { Track } from "@/lib/api";

const RECENT_KEY = "husan_recent_v2";
const COUNTS_KEY = "husan_counts_v2";
const ARTISTS_KEY = "husan_artists_v2";
const MAX_RECENT = 20;

type Counts = Record<string, number>;

function read<T>(k: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(k) ?? "null") ?? fallback; } catch { return fallback; }
}
function write(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {/* quota */} }

export function recordPlay(track: Track) {
  // Recently played (dedupe by videoId, push to front)
  const recent: Track[] = read(RECENT_KEY, []);
  const next = [track, ...recent.filter((t) => t.videoId !== track.videoId)].slice(0, MAX_RECENT);
  write(RECENT_KEY, next);

  // Play counts per video
  const counts: Counts = read(COUNTS_KEY, {});
  counts[track.videoId] = (counts[track.videoId] ?? 0) + 1;
  write(COUNTS_KEY, counts);

  // Artist preference scores
  const artists: Counts = read(ARTISTS_KEY, {});
  const a = (track.artist || "").trim();
  if (a) artists[a] = (artists[a] ?? 0) + 1;
  write(ARTISTS_KEY, artists);
}

export function getRecent(): Track[] { return read(RECENT_KEY, []); }

export function getMostPlayed(limit = 20): Track[] {
  const counts: Counts = read(COUNTS_KEY, {});
  const recent: Track[] = read(RECENT_KEY, []);
  return [...recent]
    .sort((a, b) => (counts[b.videoId] ?? 0) - (counts[a.videoId] ?? 0))
    .filter((t) => (counts[t.videoId] ?? 0) > 1)
    .slice(0, limit);
}

export function getTopArtists(limit = 5): string[] {
  const artists: Counts = read(ARTISTS_KEY, {});
  return Object.entries(artists).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([n]) => n);
}
