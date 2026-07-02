import { usePlayer } from "@/store/player";
import { Pause, Play, SkipBack, SkipForward, Shuffle, Repeat, Volume2, Loader2, Maximize2, Heart, Mic2, ListMusic, Volume1, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { SleepTimer } from "./SleepTimer";
import { isLiked, toggleLike, subscribeLibrary } from "@/lib/history";

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
};

export const BottomPlayerBar = () => {
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const isLoading = usePlayer((s) => s.isLoading);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const seek = usePlayer((s) => s.seek);
  const setExpanded = usePlayer((s) => s.setExpanded);

  const [volume, setVolume] = useState(0.8);

  useEffect(() => {
    const audio = (window as unknown as { __husanAudio?: HTMLAudioElement }).__husanAudio;
    if (audio) audio.volume = volume;
  }, [volume]);

  if (!current) {
    return (
      <div className="mx-2 my-2 h-[72px] shrink-0 rounded-2xl neon-card flex items-center justify-center text-xs text-muted-foreground">
        <Play className="h-3.5 w-3.5 mr-2 text-neon-pink" /> Pick a song to start the vibe
      </div>
    );
  }

  const VolIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="mx-2 my-2 h-[84px] shrink-0 rounded-2xl neon-card px-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4 shadow-neon">
      {/* Left: Track info */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={() => setExpanded(true)}
          className={`relative shrink-0 overflow-hidden rounded-lg ring-1 ring-primary/40 ${isPlaying ? "shadow-neon" : ""}`}
          aria-label="Open full player"
        >
          <img src={current.thumbnail} alt="" className="h-14 w-14 object-cover" />
          {isPlaying && (
            <div className="absolute inset-0 flex items-end justify-center gap-0.5 bg-black/30 pb-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block h-3 w-0.5 origin-bottom rounded-full bg-neon-cyan"
                  style={{ backgroundColor: "hsl(var(--accent))", animation: "bar-eq 0.9s ease-in-out infinite", animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold hover:underline cursor-pointer">{current.title}</p>
          <p className="truncate text-xs text-muted-foreground hover:underline cursor-pointer">{current.artist}</p>
        </div>
        <button className="ml-2 text-muted-foreground hover:text-primary" aria-label="Like">
          <Heart className="h-4 w-4" />
        </button>
      </div>

      {/* Center: Controls + Progress */}
      <div className="flex w-[min(720px,55vw)] flex-col items-center gap-1.5">
        <div className="flex items-center gap-4">
          <button className="text-muted-foreground hover:text-neon-cyan" aria-label="Shuffle">
            <Shuffle className="h-4 w-4" />
          </button>
          <button onClick={prev} className="text-foreground/80 hover:text-foreground" aria-label="Previous">
            <SkipBack className="h-5 w-5 fill-current" />
          </button>
          <button
            onClick={toggle}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-accent text-primary-foreground shadow-neon transition-transform hover:scale-110"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current translate-x-[1px]" />
            )}
          </button>
          <button onClick={next} className="text-foreground/80 hover:text-foreground" aria-label="Next">
            <SkipForward className="h-5 w-5 fill-current" />
          </button>
          <button className="text-muted-foreground hover:text-neon-cyan" aria-label="Repeat">
            <Repeat className="h-4 w-4" />
          </button>
        </div>
        <div className="flex w-full items-center gap-2">
          <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground font-mono">{fmt(position)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={position}
            step={0.1}
            onChange={(e) => seek(Number(e.target.value))}
            className="player-progress flex-1"
            style={{
              backgroundSize: `${duration > 0 ? (position / duration) * 100 : 0}% 100%`,
            }}
          />
          <span className="w-10 text-[11px] tabular-nums text-muted-foreground font-mono">{fmt(duration)}</span>
        </div>
      </div>

      {/* Right: extras */}
      <div className="flex items-center justify-end gap-3">
        <SleepTimer />
        <button className="hidden lg:block text-muted-foreground hover:text-foreground" aria-label="Lyrics">
          <Mic2 className="h-4 w-4" />
        </button>
        <button className="hidden lg:block text-muted-foreground hover:text-foreground" aria-label="Queue">
          <ListMusic className="h-4 w-4" />
        </button>
        <VolIcon className="h-4 w-4 text-muted-foreground" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="player-progress w-24"
          style={{ backgroundSize: `${volume * 100}% 100%` }}
        />
        <button
          onClick={() => setExpanded(true)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Full screen"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
