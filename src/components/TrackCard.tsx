import { Track } from "@/lib/api";
import { usePlayer } from "@/store/player";
import { Play } from "lucide-react";

export const TrackCard = ({ track, queue }: { track: Track; queue: Track[] }) => {
  const playQueue = usePlayer((s) => s.playQueue);
  const current = usePlayer((s) => s.current);
  const isCurrent = current?.videoId === track.videoId;
  const startIdx = queue.findIndex((t) => t.videoId === track.videoId);

  return (
    <button
      onClick={() => playQueue(queue, Math.max(0, startIdx))}
      className="group relative w-40 shrink-0 text-left animate-float-up"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl shadow-card">
        <img
          src={track.thumbnail}
          alt={track.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${track.videoId}/mqdefault.jpg`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="absolute bottom-2 right-2 flex h-11 w-11 translate-y-3 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-glow transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Play className="h-5 w-5 fill-current" />
        </div>
        {isCurrent && (
          <div className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            PLAYING
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-1 text-sm font-semibold">{track.title}</p>
      <p className="line-clamp-1 text-xs text-muted-foreground">{track.artist}</p>
    </button>
  );
};

export const TrackRow = ({ track, queue, index }: { track: Track; queue: Track[]; index: number }) => {
  const playQueue = usePlayer((s) => s.playQueue);
  const current = usePlayer((s) => s.current);
  const isCurrent = current?.videoId === track.videoId;
  return (
    <button
      onClick={() => playQueue(queue, index)}
      className="group flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-secondary"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md">
        <img src={track.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="h-4 w-4 fill-current" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`line-clamp-1 text-sm font-medium ${isCurrent ? "text-primary" : ""}`}>
          {track.title}
        </p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{track.artist}</p>
      </div>
    </button>
  );
};
