import { create } from "zustand";
import { Track, getRelated, searchTracks } from "@/lib/api";
import { recordPlay, getTopArtists, getRecent } from "@/lib/history";

type PlayerState = {
  audio: HTMLAudioElement | null;
  preloader: HTMLAudioElement | null;
  current: Track | null;
  queue: Track[];
  index: number;
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  expanded: boolean;
  // Internal request token to ignore stale stream resolutions
  _reqToken: number;
  init: () => void;
  playQueue: (tracks: Track[], startIndex?: number) => Promise<void>;
  playTrack: (track: Track) => Promise<void>;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (s: number) => void;
  setExpanded: (v: boolean) => void;
};

async function buildAutoQueue(seed: Track): Promise<Track[]> {
  const seen = new Set<string>([seed.videoId]);
  const out: Track[] = [];
  for (const t of getRecent().slice(0, 20)) seen.add(t.videoId);

  try {
    const related = await getRelated(seed.videoId);
    for (const t of related) if (!seen.has(t.videoId)) { seen.add(t.videoId); out.push(t); }
  } catch {/* ignore */}

  if (out.length < 8) {
    try {
      const more = await searchTracks(`${seed.artist} songs`);
      for (const t of more) if (!seen.has(t.videoId)) { seen.add(t.videoId); out.push(t); }
    } catch {/* ignore */}
  }

  if (out.length < 8) {
    const topArtists = getTopArtists(2);
    for (const a of topArtists) {
      try {
        const more = await searchTracks(`${a} hit songs`);
        for (const t of more) if (!seen.has(t.videoId)) { seen.add(t.videoId); out.push(t); }
      } catch {/* ignore */}
      if (out.length >= 10) break;
    }
  }

  return out.slice(0, 10);
}

export const usePlayer = create<PlayerState>((set, get) => ({
  audio: null,
  preloader: null,
  current: null,
  queue: [],
  index: -1,
  isPlaying: false,
  isLoading: false,
  position: 0,
  duration: 0,
  expanded: false,
  _reqToken: 0,

  init: () => {
    if (get().audio) return;
    const audio = new Audio();
    audio.preload = "auto";

    audio.addEventListener("timeupdate", () => {
      set({ position: audio.currentTime, duration: audio.duration || 0 });
    });

    audio.addEventListener("ended", () => set({ isLoading: false, isPlaying: false }));
    audio.addEventListener("play", () => set({ isPlaying: true }));
    audio.addEventListener("pause", () => set({ isPlaying: false }));
    audio.addEventListener("waiting", () => set({ isLoading: true }));
    audio.addEventListener("playing", () => set({ isLoading: false, isPlaying: true }));
    audio.addEventListener("error", () => {
      console.warn("audio element error", audio.error);
      set({ isLoading: false, isPlaying: false });
    });
    audio.addEventListener("stalled", () => set({ isLoading: true }));

    set({ audio });
  },

  playQueue: async (tracks, startIndex = 0) => {
    if (!tracks.length) return;
    const safeIdx = Math.max(0, Math.min(startIndex, tracks.length - 1));
    set({ queue: tracks, index: safeIdx });
    await get().playTrack(tracks[safeIdx]);
    // Extend queue with related (Spotify-like). Only after the user-clicked track is set.
    const seed = tracks[safeIdx];
    if (seed) {
      buildAutoQueue(seed).then((extra) => {
        const { queue, current } = get();
        if (current?.videoId !== seed.videoId) return; // user changed track meanwhile
        const ids = new Set(queue.map((t) => t.videoId));
        const filtered = extra.filter((t) => !ids.has(t.videoId));
        if (filtered.length) set({ queue: [...queue, ...filtered] });
      });
    }
  },

  playTrack: async (track) => {
    console.log("CLICKED", track.videoId, track.title);
    const { audio } = get();
    if (!audio) return;

    // Invalidate any in-flight stream resolution / metadata fetch
    const token = get()._reqToken + 1;
    set({
      _reqToken: token,
      current: track,
      isLoading: true,
      isPlaying: false,
      position: 0,
      duration: 0,
    });

    // SINGLE INSTANCE: hard-stop previous playback completely
    try {
      if (!audio.paused) audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
    } catch {/* ignore */}

    // INSTANT PATH: skip the slow /streams resolver entirely.
    // The /audio proxy resolves + streams bytes server-side in one round-trip.
    // Browser starts playing as soon as first bytes arrive (~300-800ms).
    const PROJECT_URL = "https://fsncpitxcehpttrrcgni.supabase.co";
    const streamUrl = `${PROJECT_URL}/functions/v1/ytm?action=audio&id=${encodeURIComponent(track.videoId)}`;

    recordPlay(track);

    // Lightweight playing-event log (non-blocking)
    const onPlaying = () => {
      if (get()._reqToken !== token) return;
      console.log("PLAYING EVENT", track.videoId);
      audio.removeEventListener("playing", onPlaying);
    };
    audio.addEventListener("playing", onPlaying);

    audio.src = streamUrl;
    audio.preload = "auto";
    console.log("PLAY CALLED", track.videoId, streamUrl);
    audio.play().catch((err) => {
      if (err?.name !== "AbortError") console.warn("audio.play() rejected", err);
    });

    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        artwork: [{ src: track.thumbnail, sizes: "480x360", type: "image/jpeg" }],
      });
      navigator.mediaSession.setActionHandler("play", () => audio.play());
      navigator.mediaSession.setActionHandler("pause", () => audio.pause());
      navigator.mediaSession.setActionHandler("nexttrack", () => get().next());
      navigator.mediaSession.setActionHandler("previoustrack", () => get().prev());
    }
  },

  toggle: () => {
    const { audio, current } = get();
    if (!audio || !current) return;
    if (audio.paused) audio.play().catch(() => {/* ignore */});
    else audio.pause();
  },

  next: () => {
    const { queue, index } = get();
    if (index + 1 < queue.length) {
      set({ index: index + 1 });
      get().playTrack(queue[index + 1]);
    }
  },

  prev: () => {
    const { queue, index, audio } = get();
    if (audio && audio.currentTime > 4) { audio.currentTime = 0; return; }
    if (index > 0) {
      set({ index: index - 1 });
      get().playTrack(queue[index - 1]);
    }
  },

  seek: (s) => {
    const { audio } = get();
    if (!audio) return;
    console.log("SEEK EVENT", s);
    try { audio.currentTime = s; } catch {/* ignore */}
  },
  setExpanded: (v) => set({ expanded: v }),
}));
