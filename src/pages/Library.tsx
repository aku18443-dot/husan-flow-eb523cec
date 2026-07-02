import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Heart, Play, Shuffle, Pin } from "lucide-react";
import { getLiked, getRecent, getTopArtists, getPinnedArtists, subscribeLibrary, togglePinnedArtist } from "@/lib/history";
import { ALL_INDIAN_ARTISTS } from "@/lib/artists";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { TrackRow } from "@/components/TrackCard";
import { usePlayer } from "@/store/player";
import { Track } from "@/lib/api";

type Tab = "playlists" | "artists" | "albums" | "liked";

const TABS: { id: Tab; label: string }[] = [
  { id: "playlists", label: "Playlists" },
  { id: "artists", label: "Artists" },
  { id: "albums", label: "Albums" },
  { id: "liked", label: "Liked" },
];

const LibraryPage = () => {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "playlists";
  const [, force] = useState(0);
  const playQueue = usePlayer((s) => s.playQueue);

  useEffect(() => subscribeLibrary(() => force((n) => n + 1)), []);
  useEffect(() => { document.title = "Your Library — Husan Music"; }, []);

  const liked = getLiked();
  const recent = getRecent();
  const pinned = getPinnedArtists();
  const topArtists = getTopArtists(8);

  const suggestedArtists = useMemo(() => {
    const merged = Array.from(new Set([...pinned, ...topArtists]));
    const rest = ALL_INDIAN_ARTISTS.map((a) => a.name).filter((n) => !merged.includes(n));
    return [...merged, ...rest].slice(0, 24);
  }, [pinned.join(","), topArtists.join(",")]);

  return (
    <div className="min-h-full px-6 py-6 pb-32">
      <h1 className="font-display text-3xl font-black tracking-tight mb-4">Your Library</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setParams({ tab: t.id })}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-neon"
                : "bg-white/[0.06] text-foreground hover:bg-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "liked" && <LikedView tracks={liked} onPlay={(i) => playQueue(liked, i)} />}
      {tab === "playlists" && (
        <PlaylistsView
          liked={liked}
          recent={recent}
          onPlayLiked={() => liked.length && playQueue(liked, 0)}
          onPlayRecent={() => recent.length && playQueue(recent, 0)}
        />
      )}
      {tab === "artists" && <ArtistsView pinned={pinned} suggested={suggestedArtists} />}
      {tab === "albums" && <AlbumsView topArtists={topArtists} />}
    </div>
  );
};

const LikedView = ({ tracks, onPlay }: { tracks: Track[]; onPlay: (i: number) => void }) => {
  if (!tracks.length) {
    return <EmptyState icon={<Heart className="h-8 w-8" />} title="No liked songs yet" hint="Tap the ♡ on any song to save it here." />;
  }
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-400 shadow-neon">
          <Heart className="h-12 w-12 text-white" fill="currentColor" />
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Playlist</p>
          <h2 className="font-display text-3xl font-black">Liked Songs</h2>
          <p className="text-xs text-muted-foreground mt-1">{tracks.length} songs</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => onPlay(0)} className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
              <Play className="h-3.5 w-3.5 fill-current" /> Play
            </button>
            <button
              onClick={() => onPlay(Math.floor(Math.random() * tracks.length))}
              className="flex items-center gap-1 rounded-full bg-secondary px-4 py-2 text-xs font-bold"
            >
              <Shuffle className="h-3.5 w-3.5" /> Shuffle
            </button>
          </div>
        </div>
      </div>
      <div className="space-y-1">
        {tracks.map((t, i) => (
          <TrackRow key={t.videoId} track={t} queue={tracks} index={i} />
        ))}
      </div>
    </div>
  );
};

const PlaylistsView = ({
  liked, recent, onPlayLiked, onPlayRecent,
}: { liked: Track[]; recent: Track[]; onPlayLiked: () => void; onPlayRecent: () => void }) => {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <PlaylistCard title="Liked Songs" subtitle={`${liked.length} songs`} onClick={onPlayLiked} to="/library?tab=liked" gradient="from-indigo-500 to-fuchsia-400" icon={<Heart className="h-10 w-10 text-white" fill="currentColor" />} />
      <PlaylistCard title="Recently Played" subtitle={`${recent.length} songs`} onClick={onPlayRecent} gradient="from-fuchsia-500 to-pink-500" icon={<Play className="h-10 w-10 text-white fill-current" />} />
    </div>
  );
};

const PlaylistCard = ({
  title, subtitle, onClick, to, gradient, icon,
}: { title: string; subtitle: string; onClick?: () => void; to?: string; gradient: string; icon: React.ReactNode }) => {
  const inner = (
    <div className="group rounded-xl bg-white/[0.04] p-3 transition hover:bg-white/[0.08]">
      <div className={`aspect-square rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-card`}>
        {icon}
      </div>
      <p className="mt-3 truncate text-sm font-bold">{title}</p>
      <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      {onClick && (
        <button
          onClick={(e) => { e.preventDefault(); onClick(); }}
          className="mt-2 w-full rounded-full bg-primary/90 px-3 py-1 text-[11px] font-bold text-primary-foreground opacity-0 group-hover:opacity-100 transition"
        >
          Play
        </button>
      )}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : <div className="cursor-pointer" onClick={onClick}>{inner}</div>;
};

const ArtistsView = ({ pinned, suggested }: { pinned: string[]; suggested: string[] }) => {
  return (
    <div>
      {pinned.length > 0 && (
        <>
          <h3 className="mb-3 font-display text-sm font-bold text-muted-foreground">Pinned</h3>
          <ArtistGrid names={pinned} pinned={pinned} />
          <div className="my-6 h-px bg-white/10" />
        </>
      )}
      <h3 className="mb-3 font-display text-sm font-bold text-muted-foreground">Browse</h3>
      <ArtistGrid names={suggested} pinned={pinned} />
    </div>
  );
};

const ArtistGrid = ({ names, pinned }: { names: string[]; pinned: string[] }) => (
  <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
    {names.map((name) => (
      <div key={name} className="group relative flex flex-col items-center gap-2">
        <Link to={`/artists/${encodeURIComponent(name)}`} className="transition-transform group-hover:scale-105">
          <ArtistAvatar name={name} size={96} />
        </Link>
        <span className="line-clamp-2 text-center text-xs font-medium">{name}</span>
        <button
          onClick={() => togglePinnedArtist(name)}
          className={`absolute right-0 top-0 rounded-full p-1.5 ${pinned.includes(name) ? "bg-primary text-primary-foreground" : "bg-black/60 text-white opacity-0 group-hover:opacity-100"}`}
          aria-label="Pin artist"
          title={pinned.includes(name) ? "Unpin" : "Pin to library"}
        >
          <Pin className="h-3 w-3" fill={pinned.includes(name) ? "currentColor" : "none"} />
        </button>
      </div>
    ))}
  </div>
);

const AlbumsView = ({ topArtists }: { topArtists: string[] }) => {
  const artists = topArtists.length ? topArtists : ALL_INDIAN_ARTISTS.slice(0, 8).map((a) => a.name);
  if (!artists.length) {
    return <EmptyState icon={<Play className="h-8 w-8" />} title="No albums yet" hint="Play some songs — albums from your favourite artists will show here." />;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {artists.map((name) => (
        <Link
          key={name}
          to={`/artists/${encodeURIComponent(name)}`}
          className="group rounded-xl bg-white/[0.04] p-3 transition hover:bg-white/[0.08]"
        >
          <div className="aspect-square overflow-hidden rounded-lg shadow-card">
            <ArtistAvatar name={name} size={220} />
          </div>
          <p className="mt-3 truncate text-sm font-bold">Best of {name}</p>
          <p className="truncate text-xs text-muted-foreground">Album • {name}</p>
        </Link>
      ))}
    </div>
  );
};

const EmptyState = ({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl bg-white/[0.03] py-16 text-center">
    <div className="mb-3 text-muted-foreground">{icon}</div>
    <p className="font-display text-lg font-bold">{title}</p>
    <p className="mt-1 max-w-xs text-xs text-muted-foreground">{hint}</p>
  </div>
);

export default LibraryPage;
