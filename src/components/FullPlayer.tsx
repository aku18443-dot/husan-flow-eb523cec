import { usePlayer } from "@/store/player";
import { Pause, Play, SkipBack, SkipForward, ChevronDown, Loader2, Send } from "lucide-react";

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
};

export const FullPlayer = () => {
  const {
    current,
    isPlaying,
    isLoading,
    toggle,
    next,
    prev,
    position,
    duration,
    seek,
    expanded,
    setExpanded,
  } = usePlayer();

  if (!current || !expanded) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col p-6 animate-float-up"
      style={{
        background: `linear-gradient(180deg, hsl(141 50% 18%) 0%, hsl(0 0% 7%) 60%)`,
      }}
    >
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(false)}
          className="rounded-full p-2 hover:bg-white/10"
          aria-label="Close player"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Now Playing</p>
        <a
          href="https://t.me/HusanMusic"
          target="_blank"
          rel="noreferrer"
          className="rounded-full p-2 hover:bg-white/10"
          aria-label="Telegram"
        >
          <Send className="h-5 w-5" />
        </a>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <div
          className={`relative aspect-square w-full max-w-sm overflow-hidden rounded-3xl shadow-glow ${
            isPlaying ? "animate-pulse-glow" : ""
          }`}
        >
          <img src={current.thumbnail} alt={current.title} className="h-full w-full object-cover" />
        </div>

        <div className="w-full max-w-sm text-center">
          <h2 className="line-clamp-2 font-display text-2xl font-bold">{current.title}</h2>
          <p className="mt-1 text-muted-foreground">{current.artist}</p>
        </div>

        <div className="w-full max-w-sm">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={position}
            step={0.1}
            onChange={(e) => seek(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{fmt(position)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button onClick={prev} className="rounded-full p-3 hover:bg-white/10">
            <SkipBack className="h-7 w-7" />
          </button>
          <button
            onClick={toggle}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow"
          >
            {isLoading ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-8 w-8 fill-current" />
            ) : (
              <Play className="h-8 w-8 fill-current" />
            )}
          </button>
          <button onClick={next} className="rounded-full p-3 hover:bg-white/10">
            <SkipForward className="h-7 w-7" />
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Made By <span className="font-bold text-gradient">Akshay</span>
      </p>
    </div>
  );
};
