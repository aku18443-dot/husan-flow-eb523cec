import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Play, Shuffle } from "lucide-react";
import { ALL_INDIAN_ARTISTS } from "@/lib/artists";
import { Track, getArtistSongs } from "@/lib/api";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { TrackRow } from "@/components/TrackCard";
import { usePlayer } from "@/store/player";

const PAGE_SIZE = 18;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ArtistGrid = () => {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible((v) => Math.min(v + PAGE_SIZE, ALL_INDIAN_ARTISTS.length));
        }
      },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const shown = ALL_INDIAN_ARTISTS.slice(0, visible);
  const allLoaded = visible >= ALL_INDIAN_ARTISTS.length;

  return (
    <>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
        {shown.map((a) => (
          <Link
            key={a.name}
            to={`/artists/${encodeURIComponent(a.name)}`}
            className="group flex flex-col items-center gap-2"
          >
            <div className="transition-transform group-hover:scale-105">
              <ArtistAvatar name={a.name} size={96} />
            </div>
            <span className="line-clamp-2 text-center text-xs font-medium">{a.name}</span>
          </Link>
        ))}
      </div>
      <div ref={sentinelRef} className="flex h-16 items-center justify-center">
        {!allLoaded ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <span className="text-xs text-muted-foreground">All artists loaded ✨</span>
        )}
      </div>
    </>
  );
};

const ArtistDetail = ({ name }: { name: string }) => {
  const playQueue = usePlayer((s) => s.playQueue);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTracks([]);
    getArtistSongs(name)
      .then((s) => {
        if (!cancelled) setTracks(s);
      })
      .catch(() => {/* ignore */})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 pt-2">
        <ArtistAvatar name={name} size={140} />
        <h2 className="font-display text-2xl font-black">{name}</h2>
        <p className="text-xs text-muted-foreground">
          {loading ? "Loading songs…" : `${tracks.length} songs`}
        </p>
        {tracks.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => playQueue(shuffleArray(tracks), 0)}
              className="flex items-center gap-1 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground"
            >
              <Shuffle className="h-3.5 w-3.5" /> Shuffle
            </button>
            <button
              onClick={() => playQueue(tracks, 0)}
              className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Play All
            </button>
          </div>
        )}
      </div>
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-1">
          {tracks.map((t, i) => (
            <TrackRow key={t.videoId} track={t} queue={tracks} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

const ArtistsPage = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const decoded = name ? decodeURIComponent(name) : null;

  useEffect(() => {
    document.title = decoded
      ? `${decoded} — Husan Music`
      : "All India Artists — Husan Music";
  }, [decoded]);

  return (
    <div className="min-h-screen bg-gradient-hero pb-32">
      <header className="sticky top-0 z-20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <button
            onClick={() => (decoded ? navigate("/artists") : navigate("/"))}
            className="glass rounded-full p-2"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="font-display text-xl font-black tracking-tight">
            {decoded ? decoded : "🎤 All India Artists"}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">
        {decoded ? <ArtistDetail name={decoded} /> : <ArtistGrid />}
      </main>
    </div>
  );
};

export default ArtistsPage;
