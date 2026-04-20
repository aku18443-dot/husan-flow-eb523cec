import { useState } from "react";
import { Loader2, Shuffle, Play } from "lucide-react";
import { PLAYLISTS, PlaylistMeta, Track, getPlaylistSongs } from "@/lib/api";
import { TrackRow } from "@/components/TrackCard";
import { usePlayer } from "@/store/player";

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const PlaylistsSection = () => {
  const playQueue = usePlayer((s) => s.playQueue);
  const [active, setActive] = useState<PlaylistMeta | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  const open = async (p: PlaylistMeta) => {
    setActive(p);
    setLoading(true);
    setTracks([]);
    try {
      const songs = await getPlaylistSongs(p.id);
      setTracks(songs);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold tracking-tight">🎶 Playlists</h2>
      <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {PLAYLISTS.map((p) => (
          <button
            key={p.id}
            onClick={() => open(p)}
            className={`group relative flex h-36 w-36 shrink-0 flex-col justify-end rounded-2xl bg-gradient-to-br ${p.gradient} p-3 text-left shadow-lg transition-transform hover:scale-[1.03] active:scale-100`}
          >
            <span className="absolute right-3 top-3 text-3xl drop-shadow">{p.emoji}</span>
            <span className="font-display text-base font-black leading-tight text-white drop-shadow">
              {p.title}
            </span>
            <span className="text-[10px] font-medium text-white/80">50+ songs · Non-stop</span>
          </button>
        ))}
      </div>

      {active && (
        <div className="glass space-y-2 rounded-2xl p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-base font-bold">
              {active.emoji} {active.title}
            </h3>
            <div className="flex gap-2">
              {tracks.length > 0 && (
                <>
                  <button
                    onClick={() => playQueue(shuffleArray(tracks), 0)}
                    className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground"
                  >
                    <Shuffle className="h-3 w-3" /> Shuffle
                  </button>
                  <button
                    onClick={() => playQueue(tracks, 0)}
                    className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"
                  >
                    <Play className="h-3 w-3 fill-current" /> Play All
                  </button>
                </>
              )}
            </div>
          </div>
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <p className="px-1 text-xs text-muted-foreground">
                {tracks.length} songs · plays continuously
              </p>
              <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
                {tracks.map((t, i) => (
                  <TrackRow key={t.videoId} track={t} queue={tracks} index={i} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
};
