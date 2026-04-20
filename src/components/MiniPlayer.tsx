import { useEffect, useRef, useState } from "react";
import { usePlayer } from "@/store/player";
import { Pause, Play, SkipForward, Loader2 } from "lucide-react";

export const MiniPlayer = () => {
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const isLoading = usePlayer((s) => s.isLoading);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const expanded = usePlayer((s) => s.expanded);
  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const setExpanded = usePlayer((s) => s.setExpanded);

  const titleRef = useRef<HTMLParagraphElement>(null);
  const [needsMarquee, setNeedsMarquee] = useState(false);
  const dragRef = useRef<{ y0: number; dy: number } | null>(null);
  const [translate, setTranslate] = useState(0);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    // Defer to next frame so DOM has measured
    const id = requestAnimationFrame(() => {
      setNeedsMarquee(el.scrollWidth > el.clientWidth + 2);
    });
    return () => cancelAnimationFrame(id);
  }, [current?.videoId]);

  if (!current || expanded) return null;

  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  // Touch swipe-up to open full player
  const onTouchStart = (e: React.TouchEvent) => {
    dragRef.current = { y0: e.touches[0].clientY, dy: 0 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current) return;
    const dy = e.touches[0].clientY - dragRef.current.y0;
    dragRef.current.dy = dy;
    setTranslate(Math.min(0, dy));
  };
  const onTouchEnd = () => {
    const dy = dragRef.current?.dy ?? 0;
    dragRef.current = null;
    setTranslate(0);
    if (dy < -50) setExpanded(true);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 px-2 pb-2 animate-float-up"
      style={{ pointerEvents: "auto" }}
    >
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="mx-auto max-w-3xl"
        style={{
          transform: `translateY(${translate}px)`,
          transition: translate === 0 ? "transform 0.3s cubic-bezier(0.22,1,0.36,1)" : "none",
        }}
      >
        <div
          className="relative overflow-hidden rounded-2xl border border-white/10 shadow-card"
          style={{
            background: `linear-gradient(135deg, hsl(var(--card) / 0.92), hsl(var(--background) / 0.85))`,
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            minHeight: 72,
          }}
        >
          {/* Album art ambient backdrop */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-40"
            style={{
              backgroundImage: `url(${current.thumbnail})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(40px) saturate(160%)",
              transform: "scale(1.4)",
            }}
          />

          <div className="flex items-center gap-3 p-2.5">
            {/* Tap area: thumb + info opens full player */}
            <button
              onClick={() => setExpanded(true)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left transition-transform active:scale-[0.98]"
              aria-label="Open full player"
            >
              <div className="relative shrink-0">
                <img
                  key={current.videoId}
                  src={current.thumbnail}
                  alt=""
                  className="h-[50px] w-[50px] rounded-xl object-cover shadow-lg"
                  style={{ animation: "float-up 0.45s cubic-bezier(0.22,1,0.36,1)" }}
                />
                {isPlaying && (
                  <span
                    aria-hidden
                    className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary shadow-glow"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="overflow-hidden">
                  <p
                    ref={titleRef}
                    className={`whitespace-nowrap text-sm font-semibold ${needsMarquee ? "animate-marquee" : "truncate"}`}
                  >
                    {current.title}
                  </p>
                </div>
                <p className="truncate text-xs text-muted-foreground">{current.artist}</p>
              </div>
            </button>

            {/* Controls */}
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggle(); }}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-all active:scale-90"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition-all active:scale-90 hover:bg-white/10"
                aria-label="Next"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="relative h-[3px] w-full bg-white/10">
            <div
              className="h-full bg-primary transition-[width] duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
