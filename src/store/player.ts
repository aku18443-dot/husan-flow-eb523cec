import { create } from "zustand";
import { Track, getStream, getRelated, searchTracks } from "@/lib/api";
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
      // Preload next at 80% played
      if (audio.duration > 30 && audio.currentTime / audio.duration > 0.8) {
        const { queue, index, preloader } = get();
        const nextTrack = queue[index + 1];
        if (nextTrack && preloader && preloader.dataset.id !== nextTrack.videoId) {
          getStream(nextTrack.videoId).then((s) => {
            if (s.streamUrl && get().queue[get().index + 1]?.videoId === nextTrack.videoId) {
              preloader.src = s.streamUrl;
              preloader.dataset.id = nextTrack.videoId;
            }
          }).catch(() => {/* ignore */});
        }
      }
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

    const preloader = new Audio();
    preloader.preload = "auto";
    set({ audio, preloader });
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
    const { audio, preloader } = get();
    if (!audio) return;

    // Bump request token to invalidate any in-flight stream resolution
    const token = get()._reqToken + 1;
    set({
      _reqToken: token,
      current: track,
      isLoading: true,
      isPlaying: false,
      position: 0,
      duration: 0,
    });

    // STRICT: stop and clear previous source before anything else
    try {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch {/* ignore */}

    // CRITICAL: prime the audio element SYNCHRONOUSLY inside the user-gesture stack.
    // Browsers (especially mobile Safari/Chrome) require play() to be called from
    // a user gesture. Calling play() AFTER an await getStream() loses that context
    // and the browser silently blocks playback (NotAllowedError).
    // Trick: call play() on an empty audio first to "unlock" it, then set src later.
    try {
      // muted + play() is always allowed and unlocks the element for future src changes
      audio.muted = true;
      const unlockPromise = audio.play();
      if (unlockPromise && typeof unlockPromise.catch === "function") {
        unlockPromise.catch(() => {/* ok, no src yet */});
      }
      audio.pause();
      audio.muted = false;
    } catch {/* ignore */}

    const confirmPlayback = (expectedToken: number) =>
      new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          audio.removeEventListener("playing", onPlaying);
          audio.removeEventListener("canplay", onCanPlay);
          audio.removeEventListener("error", onError);
        };

        const onPlaying = () => {
          if (get()._reqToken !== expectedToken) return;
          console.log("PLAYING CONFIRMED", track.videoId, audio.currentSrc);
          cleanup();
          set({ isLoading: false, isPlaying: true });
          resolve();
        };

        const onCanPlay = () => {
          if (get()._reqToken !== expectedToken) return;
          console.log("CAN PLAY", track.videoId, audio.currentSrc);
          set({ isLoading: true });
        };

        const onError = () => {
          if (get()._reqToken !== expectedToken) return;
          console.log("PLAY ERROR", track.videoId, audio.error);
          cleanup();
          set({ isLoading: false, isPlaying: false });
          reject(audio.error ?? new Error("audio error"));
        };

        audio.addEventListener("playing", onPlaying);
        audio.addEventListener("canplay", onCanPlay);
        audio.addEventListener("error", onError);
      });

    // Record only after we commit to playing this exact track
    recordPlay(track);

    try {
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (get()._reqToken !== token) return;
        try {
          let streamUrl: string | null = null;
          const usePreloaded = attempt === 0 && preloader && preloader.dataset.id === track.videoId && preloader.src;

          if (usePreloaded) {
            streamUrl = preloader!.src;
            preloader!.removeAttribute("src");
            delete preloader!.dataset.id;
          } else {
            const stream = await getStream(track.videoId, { fresh: attempt > 0 });
            if (get()._reqToken !== token) return;
            console.log("STREAM URL", track.videoId, stream.streamUrl);
            if (!stream.streamUrl) throw new Error("no stream");
            streamUrl = stream.streamUrl;
          }

          if (!streamUrl) throw new Error("empty stream url");
          if (get()._reqToken !== token) return;

          audio.src = streamUrl;
          audio.preload = "auto";
          audio.load();

          const playbackConfirmed = confirmPlayback(token);

          try {
            await audio.play();
          } catch (err: any) {
            console.error("play failed", err);
            throw err;
          }

          await Promise.race([
            playbackConfirmed,
            new Promise((_, reject) => setTimeout(() => reject(new Error("playback confirmation timeout")), 10_000)),
          ]);

          lastError = null;
          break;
        } catch (err) {
          lastError = err;
          console.warn(`play attempt ${attempt + 1} failed`, err);
          try {
            audio.pause();
            audio.removeAttribute("src");
            audio.load();
          } catch {/* ignore */}
          set({ isLoading: attempt < 2, isPlaying: false });
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 350));
          }
        }
      }

      if (lastError) throw lastError;

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
    } catch (e) {
      // Do NOT auto-skip. Surface the failure quietly; user controls navigation.
      console.warn("play failed", e);
      if (get()._reqToken === token) set({ isLoading: false, isPlaying: false });
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

  seek: (s) => { const { audio } = get(); if (audio) audio.currentTime = s; },
  setExpanded: (v) => set({ expanded: v }),
}));
