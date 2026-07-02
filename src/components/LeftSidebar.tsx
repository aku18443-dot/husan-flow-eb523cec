import { Link, useLocation, useNavigate } from "react-router-dom";
import { Library, Plus, Search, Heart, Home } from "lucide-react";
import { getRecent, getLiked, getPinnedArtists, subscribeLibrary } from "@/lib/history";
import { ALL_INDIAN_ARTISTS } from "@/lib/artists";
import { ArtistAvatar } from "./ArtistAvatar";
import { useEffect, useState } from "react";
import { Track } from "@/lib/api";
import { usePlayer } from "@/store/player";

export const LeftSidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const playQueue = usePlayer((s) => s.playQueue);
  const [recent, setRecent] = useState<Track[]>([]);
  const [liked, setLiked] = useState<Track[]>([]);
  const [pinned, setPinned] = useState<string[]>([]);

  const refresh = () => {
    setRecent(getRecent().slice(0, 12));
    setLiked(getLiked());
    setPinned(getPinnedArtists());
  };

  useEffect(() => { refresh(); }, [pathname]);
  useEffect(() => subscribeLibrary(refresh), []);

  const pinnedArtists = pinned.length
    ? pinned
    : ALL_INDIAN_ARTISTS.slice(0, 8).map((a) => a.name);

  return (
    <aside className="hidden md:flex h-full w-[300px] shrink-0 flex-col gap-2 p-2">
      {/* Top nav block */}
      <div className="rounded-lg bg-card/80 p-3">
        <Link
          to="/"
          className={`flex items-center gap-4 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
            pathname === "/" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Home className="h-6 w-6" /> Home
        </Link>
        <Link
          to="/search"
          className={`flex items-center gap-4 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
            pathname.startsWith("/search") ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Search className="h-6 w-6" /> Search
        </Link>
      </div>

      {/* Library block */}
      <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-card/80">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <Link
            to="/library"
            className={`flex items-center gap-3 text-sm font-bold transition-colors ${
              pathname.startsWith("/library") ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Library className="h-5 w-5" /> Your Library
          </Link>
          <button
            onClick={() => navigate("/library?tab=playlists")}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            aria-label="Create"
            title="Create playlist"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Pills */}
        <div className="flex gap-2 overflow-x-auto px-3 pb-2 scrollbar-hide">
          {[
            { label: "Playlists", tab: "playlists" },
            { label: "Artists", tab: "artists" },
            { label: "Albums", tab: "albums" },
          ].map((p) => (
            <button
              key={p.tab}
              onClick={() => navigate(`/library?tab=${p.tab}`)}
              className="shrink-0 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-foreground hover:bg-white/10"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Items list */}
        <div className="scrollbar-hide flex-1 overflow-y-auto px-2 pb-2">
          {/* Liked Songs */}
          <Link
            to="/library?tab=liked"
            className="flex items-center gap-3 rounded-md p-2 hover:bg-white/[0.06]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-fuchsia-400">
              <Heart className="h-5 w-5 text-white" fill="currentColor" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Liked Songs</p>
              <p className="truncate text-xs text-muted-foreground">Playlist • {liked.length} songs</p>
            </div>
          </Link>

          {/* Recently played — clickable to play */}
          {recent.map((t, i) => (
            <button
              key={t.videoId}
              onClick={() => playQueue(recent, i)}
              className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-white/[0.06]"
              title={t.title}
            >
              <img
                src={t.thumbnail}
                alt=""
                className="h-12 w-12 shrink-0 rounded-md object-cover"
                loading="lazy"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{t.title}</p>
                <p className="truncate text-xs text-muted-foreground">Song • {t.artist}</p>
              </div>
            </button>
          ))}

          {/* Pinned / suggested artists */}
          {pinnedArtists.map((name) => (
            <Link
              key={name}
              to={`/artists/${encodeURIComponent(name)}`}
              className="flex items-center gap-3 rounded-md p-2 hover:bg-white/[0.06]"
            >
              <ArtistAvatar name={name} size={48} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-xs text-muted-foreground">Artist</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
};
