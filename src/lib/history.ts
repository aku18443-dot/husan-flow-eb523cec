import { Track } from "@/lib/api";

const RECENT_KEY = "husan_recent_v2";
const COUNTS_KEY = "husan_counts_v2";
const ARTISTS_KEY = "husan_artists_v2";
const LIKED_KEY = "husan_liked_v2";
const PINNED_ARTISTS_KEY = "husan_pinned_artists_v1";
const MAX_RECENT = 20;

type Counts = Record<string, number>;

// Simple pub/sub so components re-render on likes / pins changes
type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribeLibrary(fn: Listener) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
function emit() { listeners.forEach((l) => { try { l(); } catch { /* ignore */ } }); }

function read<T>(k: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(k) ?? "null") ?? fallback; } catch { return fallback; }
}
function write(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {/* quota */} }

export function recordPlay(track: Track) {
  const recent: Track[] = read(RECENT_KEY, []);
  const next = [track, ...recent.filter((t) => t.videoId !== track.videoId)].slice(0, MAX_RECENT);
  write(RECENT_KEY, next);

  const counts: Counts = read(COUNTS_KEY, {});
  counts[track.videoId] = (counts[track.videoId] ?? 0) + 1;
  write(COUNTS_KEY, counts);

  const artists: Counts = read(ARTISTS_KEY, {});
  const a = (track.artist || "").trim();
  if (a) artists[a] = (artists[a] ?? 0) + 1;
  write(ARTISTS_KEY, artists);
  emit();
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

/* ---------- Liked songs ---------- */

export function getLiked(): Track[] { return read(LIKED_KEY, []); }

export function isLiked(videoId: string): boolean {
  return getLiked().some((t) => t.videoId === videoId);
}

export function toggleLike(track: Track): boolean {
  const liked = getLiked();
  const exists = liked.some((t) => t.videoId === track.videoId);
  const next = exists
    ? liked.filter((t) => t.videoId !== track.videoId)
    : [track, ...liked];
  write(LIKED_KEY, next);
  emit();
  return !exists;
}

/* ---------- Pinned artists (user-created "playlists" per artist) ---------- */

export function getPinnedArtists(): string[] { return read(PINNED_ARTISTS_KEY, []); }

export function togglePinnedArtist(name: string): boolean {
  const pinned = getPinnedArtists();
  const exists = pinned.includes(name);
  const next = exists ? pinned.filter((n) => n !== name) : [name, ...pinned];
  write(PINNED_ARTISTS_KEY, next);
  emit();
  return !exists;
}
