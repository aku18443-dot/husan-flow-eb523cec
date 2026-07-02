import { create } from "zustand";
import { Track, getRelated, searchTracks } from "@/lib/api";
import { recordPlay, getTopArtists, getRecent } from "@/lib/history";
import { backgroundPlaybackStart, backgroundPlaybackStop, installBackgroundKeepAlive } from "@/lib/background";

type PlayerState = {
  audio: HTMLAudioElement | null;
  current: Track | null;
  queue: Track[];
  index: number;
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  expanded: boolean;
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

const PROJECT_URL = import.meta.env.VITE_SUPABASE_URL;

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<any> | null = null;
let ytPlayerPromise: Promise<any> | null = null;
let ytPlayer: any = null;
let progressTimer: number | null = null;
let suppressEndedUntil = 0;
let ytPlayConfirmTimer: number | null = null;

const isRealYouTubePlayer = (player: any) =>
  !!player &&
  typeof player.loadVideoById === "function" &&
  typeof player.playVideo === "function" &&
  typeof player.getPlayerState === "function";

function stopProgressTimer() {
  if (progressTimer !== null) {
    window.clearInterval(progressTimer);
    progressTimer = null;
  }
}

function stopPlayConfirmTimer() {
  if (ytPlayConfirmTimer !== null) {
    window.clearInterval(ytPlayConfirmTimer);
    ytPlayConfirmTimer = null;
  }
}

function loadYouTubeApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };

    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () => reject(new Error("youtube api failed"));
      document.head.appendChild(tag);
    } else {
      const poll = window.setInterval(() => {
        if (window.YT?.Player) {
          window.clearInterval(poll);
          resolve(window.YT);
        }
      }, 50);
    }
  });

  return ytApiPromise;
}

function ensureYouTubePlayer(get: () => PlayerState, set: (partial: Partial<PlayerState>) => void): Promise<any> {
  if (isRealYouTubePlayer(ytPlayer)) return Promise.resolve(ytPlayer);
  ytPlayer = null;
  if (ytPlayerPromise) return ytPlayerPromise;

  ytPlayerPromise = loadYouTubeApi().then((YT) => new Promise((resolve, reject) => {
    let host = document.getElementById("husan-youtube-audio-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "husan-youtube-audio-host";
      host.style.position = "fixed";
      host.style.left = "-260px";
      host.style.top = "-260px";
      host.style.width = "220px";
      host.style.height = "220px";
      host.style.opacity = "0.01";
      host.style.pointerEvents = "none";
      host.style.zIndex = "-1";
      document.body.appendChild(host);
    }

    const readyTimeout = window.setTimeout(() => {
      ytPlayerPromise = null;
      reject(new Error("youtube player ready timeout"));
    }, 6000);

    const playerInstance = new YT.Player("husan-youtube-audio-host", {
      width: 220,
      height: 220,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        enablejsapi: 1,
        playsinline: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          window.clearTimeout(readyTimeout);
          const iframe = document.getElementById("husan-youtube-audio-host") as HTMLIFrameElement | null;
          iframe?.setAttribute("allow", "autoplay; encrypted-media");
          ytPlayer = playerInstance;
          resolve(playerInstance);
        },
        onStateChange: (event: any) => {
          const player = isRealYouTubePlayer(event.target) ? event.target : ytPlayer;
          const current = get().current;
          if (event.data === 1) {
            stopPlayConfirmTimer();
            console.log("PLAYING EVENT", current?.videoId ?? "youtube");
            console.log("PLAYING CONFIRMED");
            set({ isPlaying: true, isLoading: false, duration: player.getDuration?.() || get().duration });
            stopProgressTimer();
            progressTimer = window.setInterval(() => {
              const active = get().current;
              if (!active || !ytPlayer || ytPlayer.getPlayerState?.() !== 1) return;
              set({
                position: ytPlayer.getCurrentTime?.() || 0,
                duration: ytPlayer.getDuration?.() || get().duration,
              });
            }, 350);
          } else if (event.data === 2) {
            stopProgressTimer();
            set({ isPlaying: false, isLoading: false });
          } else if (event.data === 3) {
            set({ isLoading: true });
          } else if (event.data === 0) {
            stopProgressTimer();
            if (Date.now() < suppressEndedUntil) return;
            console.log("NEXT SONG TRIGGERED");
            set({ isPlaying: false, isLoading: false, position: 0 });
            get().next();
          }
        },
        onError: (event: any) => {
          console.warn("youtube player error", event.data);
          stopPlayConfirmTimer();
          stopProgressTimer();
          set({ isPlaying: false, isLoading: false });
          get().next();
        },
      },
    });
    ytPlayer = playerInstance;
  }));

  return ytPlayerPromise;
}

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
    void ensureYouTubePlayer(get, set);

    audio.addEventListener("timeupdate", () => {
      set({ position: audio.currentTime, duration: audio.duration || 0 });
    });

    audio.addEventListener("play", () => set({ isPlaying: true }));
    audio.addEventListener("pause", () => set({ isPlaying: false }));
    audio.addEventListener("waiting", () => set({ isLoading: true }));
    audio.addEventListener("playing", () => set({ isLoading: false, isPlaying: true }));
    audio.addEventListener("stalled", () => set({ isLoading: true }));
    audio.addEventListener("ended", () => {
      console.log("NEXT SONG TRIGGERED");
      set({ isPlaying: false, position: 0 });
      // Auto-advance — keep current track visible until next loads
      get().next();
    });
    audio.addEventListener("error", () => {
      // Ignore errors caused by intentional src reset (empty src)
      if (!audio.src || audio.src === window.location.href) return;
      console.warn("audio element error", audio.error);
      // Do NOT clear current track — keep mini player visible.
      // Just mark as not playing so user can retry / skip.
      set({ isLoading: false, isPlaying: false });
    });

    set({ audio });

    // Keep audio alive when app is backgrounded / screen off (best-effort).
    installBackgroundKeepAlive(() => {
      if (get().isPlaying && ytPlayer?.playVideo) {
        try { ytPlayer.playVideo(); } catch { /* ignore */ }
      }
    });
  },

  playQueue: async (tracks, startIndex = 0) => {
    if (!tracks.length) return;
    const safeIdx = Math.max(0, Math.min(startIndex, tracks.length - 1));
    set({ queue: tracks, index: safeIdx });
    await get().playTrack(tracks[safeIdx]);

    const seed = tracks[safeIdx];
    if (seed) {
      buildAutoQueue(seed).then((extra) => {
        const { queue, current } = get();
        if (current?.videoId !== seed.videoId) return;
        const ids = new Set(queue.map((t) => t.videoId));
        const filtered = extra.filter((t) => !ids.has(t.videoId));
        if (filtered.length) set({ queue: [...queue, ...filtered] });
      });
    }
  },

  playTrack: async (track) => {
    const { audio } = get();
    if (!audio) return;

    const token = get()._reqToken + 1;
    const streamUrl = `${PROJECT_URL}/functions/v1/ytm?action=audio&id=${encodeURIComponent(track.videoId)}`;

    console.log("CLICKED", track.videoId, track.title);
    console.log("STOP OLD SONG", get().current?.videoId ?? "none");

    set({
      _reqToken: token,
      current: track,
      isLoading: true,
      isPlaying: false,
      position: 0,
      duration: 0,
    });
    console.log("MINI PLAYER UPDATED", track.videoId, track.title);

    try {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch {/* ignore */}
    try {
      suppressEndedUntil = Date.now() + 1500;
      ytPlayer?.stopVideo?.();
    } catch {/* ignore */}
    stopProgressTimer();
    stopPlayConfirmTimer();

    console.log("PLAY NEW SONG", track.videoId, track.title);
    console.log("PLAY START", track.videoId, streamUrl);

    recordPlay(track);

    try {
      const player = await ensureYouTubePlayer(get, set);
      if (get()._reqToken !== token) return;
      if (!isRealYouTubePlayer(player)) throw new Error("youtube player api unavailable");
      player.loadVideoById({ videoId: track.videoId, startSeconds: 0 });
      player.playVideo?.();
      console.log("PLAY CALLED", track.videoId);

      const startedAt = Date.now();
      ytPlayConfirmTimer = window.setInterval(() => {
        if (get()._reqToken !== token) return;
        const state = player.getPlayerState?.();
        if (state === 1) {
          stopPlayConfirmTimer();
          console.log("PLAYING EVENT", track.videoId);
          console.log("PLAYING CONFIRMED");
          set({ isPlaying: true, isLoading: false, duration: player.getDuration?.() || get().duration });
          return;
        }
        if (Date.now() - startedAt > 900) {
          player.playVideo?.();
          set({ isLoading: state === 3 || state === -1 || state === 5 });
        }
        if (Date.now() - startedAt > 8000) {
          stopPlayConfirmTimer();
          set({ isLoading: false, isPlaying: false });
        }
      }, 300);
    } catch (err) {
      console.warn("youtube fallback failed", err);
      set({ isLoading: false, isPlaying: false });
    }

    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        artwork: [{ src: track.thumbnail, sizes: "480x360", type: "image/jpeg" }],
      });
      navigator.mediaSession.setActionHandler("play", () => {
        if (ytPlayer) ytPlayer.playVideo?.();
        else void audio.play();
        set({ isPlaying: true, isLoading: false });
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        if (ytPlayer) ytPlayer.pauseVideo?.();
        else audio.pause();
        set({ isPlaying: false, isLoading: false });
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => get().next());
      navigator.mediaSession.setActionHandler("previoustrack", () => get().prev());
    }
  },

  toggle: () => {
    const { audio, current } = get();
    if (!current) return;
    if (ytPlayer) {
      const state = ytPlayer.getPlayerState?.();
      if (state === 1) { ytPlayer.pauseVideo?.(); set({ isPlaying: false }); backgroundPlaybackStop(); }
      else { ytPlayer.playVideo?.(); set({ isPlaying: true }); backgroundPlaybackStart(); }
      return;
    }
    if (!audio) return;
    if (audio.paused) { audio.play().catch(() => {/* ignore */}); set({ isPlaying: true }); backgroundPlaybackStart(); }
    else { audio.pause(); set({ isPlaying: false }); backgroundPlaybackStop(); }
  },

  next: () => {
    const { queue, index, current } = get();
    if (index + 1 < queue.length) {
      set({ index: index + 1 });
      void get().playTrack(queue[index + 1]);
      return;
    }
    // Queue ended — fetch more for infinite playback
    if (current) {
      buildAutoQueue(current).then((extra) => {
        if (!extra.length) return;
        const { queue: q } = get();
        const ids = new Set(q.map((t) => t.videoId));
        const filtered = extra.filter((t) => !ids.has(t.videoId));
        if (!filtered.length) return;
        set({ queue: [...q, ...filtered], index: q.length });
        void get().playTrack(filtered[0]);
      });
    }
  },

  prev: () => {
    const { queue, index, audio } = get();
    if (ytPlayer && (ytPlayer.getCurrentTime?.() || 0) > 4) {
      ytPlayer.seekTo?.(0, true);
      set({ position: 0 });
      return;
    }
    if (audio && audio.currentTime > 4) {
      audio.currentTime = 0;
      return;
    }
    if (index > 0) {
      set({ index: index - 1 });
      void get().playTrack(queue[index - 1]);
    }
  },

  seek: (s) => {
    const { audio } = get();
    if (!audio || !isFinite(s)) return;
    try {
      if (ytPlayer) ytPlayer.seekTo?.(s, true);
      else audio.currentTime = s;
      set({ position: s, isLoading: false });
      console.log("SEEK APPLIED", s);
    } catch (e) {
      console.warn("seek failed", e);
    }
  },

  setExpanded: (v) => set({ expanded: v }),
}));
