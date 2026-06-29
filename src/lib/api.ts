import { supabase } from "@/integrations/supabase/client";

export type Track = {
  videoId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  uploaderAvatar?: string | null;
};

export type StreamData = Track & {
  streamUrl: string | null;
  mimeType: string;
  related: Track[];
};

const PROJECT_URL = import.meta.env.VITE_SUPABASE_URL;
const FN = `${PROJECT_URL}/functions/v1/ytm`;

// In-memory cache for current session
const cache = new Map<string, { data: any; ts: number }>();
const TTL_SHORT = 5 * 60_000; // 5min
const TTL_LONG = 6 * 60 * 60_000; // 6h

type CallOptions = {
  ttl?: number;
  timeoutMs?: number;
  bypassCache?: boolean;
};

async function call<T>(params: Record<string, string>, options: CallOptions = {}): Promise<T> {
  const { ttl = TTL_SHORT, timeoutMs = 12_000, bypassCache = false } = options;
  const key = JSON.stringify(params);
  const now = Date.now();
  const hit = cache.get(key);
  if (!bypassCache && hit && now - hit.ts < ttl) return hit.data as T;

  // localStorage cache for trending/curated lists
  if (!bypassCache && ttl >= TTL_LONG) {
    try {
      const raw = localStorage.getItem(`ytm_${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (now - parsed.ts < ttl) {
          cache.set(key, parsed);
          return parsed.data as T;
        }
      }
    } catch {/* ignore */}
  }

  const qs = new URLSearchParams(params).toString();
  const url = `${FN}?${qs}`;
  const headers = {
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  };
  // Retry transient network failures (Failed to fetch / 5xx) up to 3 times with backoff
  let lastErr: unknown = null;
  let data: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(url, { headers, signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`http ${res.status}`);
      data = await res.json();
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  if (lastErr && !data) throw lastErr;
  cache.set(key, { data, ts: now });
  if (ttl >= TTL_LONG) {
    try { localStorage.setItem(`ytm_${key}`, JSON.stringify({ data, ts: now })); } catch {/* quota */}
  }
  return data as T;
}

export async function searchTracks(q: string): Promise<Track[]> {
  if (!q.trim()) return [];
  // Search BOTH music_songs (curated) AND videos (broader YouTube) in parallel, then merge.
  const [music, videos] = await Promise.allSettled([
    call<{ items: Track[] }>({ action: "search", q, filter: "music_songs" }),
    call<{ items: Track[] }>({ action: "search", q, filter: "videos" }),
  ]);
  const merged: Track[] = [];
  const seen = new Set<string>();
  const push = (items: Track[] = []) => {
    for (const t of items) {
      if (!t?.videoId || seen.has(t.videoId)) continue;
      seen.add(t.videoId);
      merged.push(t);
    }
  };
  if (music.status === "fulfilled") push(music.value.items);
  if (videos.status === "fulfilled") push(videos.value.items);
  return merged;
}

export async function getStream(id: string, options: { fresh?: boolean } = {}): Promise<StreamData> {
  return call<StreamData>({ action: "streams", id }, { timeoutMs: 30_000, bypassCache: options.fresh });
}

export async function getRelated(id: string): Promise<Track[]> {
  const data = await call<{ items: Track[] }>({ action: "related", id });
  return data.items ?? [];
}

// Aggressive multi-query artist fetch: merges several queries to get 50+ unique songs
export async function getArtistSongs(name: string): Promise<Track[]> {
  const queries = [
    `${name} songs`,
    `${name} hit songs`,
    `${name} best of`,
    `${name} top songs`,
    `${name} new songs`,
    `${name} bollywood`,
  ];
  const results = await Promise.allSettled(queries.map((q) => searchTracks(q)));
  const merged: Track[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const t of r.value) {
        if (seen.has(t.videoId)) continue;
        seen.add(t.videoId);
        merged.push(t);
      }
    }
  }
  return merged;
}

export async function getArtistImage(name: string): Promise<string | null> {
  const cacheKey = `artist_img_${name}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached === "null" ? null : cached;
  } catch {/* ignore */}
  try {
    const data = await call<{ image: string | null }>({ action: "channel", q: name }, { ttl: TTL_LONG });
    const img = data.image ?? null;
    try { localStorage.setItem(cacheKey, img ?? "null"); } catch {/* quota */}
    return img;
  } catch {
    return null;
  }
}

export const BOLLYWOOD_SEEDS = [
  "bollywood hits 2025 official",
  "arijit singh latest official",
  "shreya ghoshal best official",
  "bollywood romantic songs official",
  "bollywood new release official",
];

export const BOLLYWOOD_ARTISTS = [
  { name: "Arijit Singh", query: "arijit singh top songs" },
  { name: "Shreya Ghoshal", query: "shreya ghoshal best songs" },
  { name: "Atif Aslam", query: "atif aslam best songs" },
  { name: "Neha Kakkar", query: "neha kakkar hit songs" },
  { name: "Pritam", query: "pritam hits bollywood" },
  { name: "A.R. Rahman", query: "ar rahman hindi songs" },
  { name: "Honey Singh", query: "honey singh hits" },
  { name: "Diljit Dosanjh", query: "diljit dosanjh songs" },
];

export type PlaylistMeta = {
  id: string;
  title: string;
  emoji: string;
  gradient: string;
  queries: string[];
};

export const PLAYLISTS: PlaylistMeta[] = [
  {
    id: "bollywood-hits",
    title: "Bollywood Hits",
    emoji: "🔥",
    gradient: "from-orange-500 via-pink-500 to-rose-600",
    queries: [
      "bollywood hits 2025 official",
      "bollywood top songs official",
      "bollywood blockbuster songs",
      "arijit singh hits bollywood",
      "shreya ghoshal hits bollywood",
      "bollywood dance hits",
      "bollywood chartbusters",
    ],
  },
  {
    id: "sad-songs",
    title: "Sad Songs",
    emoji: "💔",
    gradient: "from-slate-700 via-blue-700 to-indigo-900",
    queries: [
      "bollywood sad songs",
      "hindi sad songs heart broken",
      "arijit singh sad songs",
      "atif aslam sad songs",
      "jubin nautiyal sad songs",
      "bollywood breakup songs",
      "hindi emotional songs",
    ],
  },
  {
    id: "party-songs",
    title: "Party Songs",
    emoji: "🎉",
    gradient: "from-fuchsia-500 via-purple-600 to-indigo-600",
    queries: [
      "bollywood party songs",
      "bollywood dance songs hit",
      "honey singh party songs",
      "badshah party songs",
      "punjabi party songs",
      "bollywood club songs",
      "bollywood dj songs",
    ],
  },
  {
    id: "romantic-songs",
    title: "Romantic Songs",
    emoji: "❤️",
    gradient: "from-rose-500 via-red-500 to-pink-700",
    queries: [
      "bollywood romantic songs",
      "arijit singh romantic songs",
      "atif aslam romantic songs",
      "hindi love songs",
      "bollywood pyaar songs",
      "shreya ghoshal romantic",
      "jubin nautiyal love songs",
    ],
  },
];

export async function getPlaylistSongs(playlistId: string): Promise<Track[]> {
  const meta = PLAYLISTS.find((p) => p.id === playlistId);
  if (!meta) return [];
  const results = await Promise.allSettled(meta.queries.map((q) => searchTracks(q)));
  const merged: Track[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const t of r.value) {
        if (seen.has(t.videoId)) continue;
        seen.add(t.videoId);
        merged.push(t);
      }
    }
  }
  return merged;
}
