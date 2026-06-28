import { useEffect, useState } from "react";
import {
  BOLLYWOOD_ARTISTS,
  BOLLYWOOD_SEEDS,
  Track,
  searchTracks,
  getArtistSongs,
} from "@/lib/api";
import { TrackCard, TrackRow } from "@/components/TrackCard";
import { SearchBar } from "@/components/SearchBar";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { CardShimmerRow } from "@/components/Shimmer";
import { PlaylistsSection } from "@/components/PlaylistsSection";
import { InfiniteFeed } from "@/components/InfiniteFeed";
import { usePlayer } from "@/store/player";
import { getRecent, getMostPlayed, getTopArtists } from "@/lib/history";
import { Music, Send, Loader2 } from "lucide-react";
import husanLogo from "@/assets/husan-logo.png";

const Section = ({
  title,
  tracks,
  loading,
}: {
  title: string;
  tracks: Track[];
  loading?: boolean;
}) => (
  <section className="space-y-3">
    <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
    {loading && tracks.length === 0 ? (
      <CardShimmerRow />
    ) : tracks.length === 0 ? null : (
      <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {tracks.map((t) => (
          <TrackCard key={t.videoId} track={t} queue={tracks} />
        ))}
      </div>
    )}
  </section>
);

const Index = () => {
  const init = usePlayer((s) => s.init);
  const playQueue = usePlayer((s) => s.playQueue);
  const current = usePlayer((s) => s.current);

  const [discover, setDiscover] = useState<Track[]>([]);
  const [newRel, setNewRel] = useState<Track[]>([]);
  const [recommended, setRecommended] = useState<Track[]>([]);
  const [recent, setRecent] = useState<Track[]>([]);
  const [mostPlayed, setMostPlayed] = useState<Track[]>([]);
  const [loadingDiscover, setLoadingDiscover] = useState(true);
  const [loadingNew, setLoadingNew] = useState(true);

  const [artistTracks, setArtistTracks] = useState<Track[]>([]);
  const [activeArtist, setActiveArtist] = useState<string | null>(null);
  const [loadingArtist, setLoadingArtist] = useState(false);

  useEffect(() => {
    init();
    document.title = "Husan Music — Unlimited Bollywood Streaming";
  }, [init]);

  // Load history-driven sections immediately (no random)
  useEffect(() => {
    setRecent(getRecent().slice(0, 20));
    setMostPlayed(getMostPlayed());
  }, [current]);

  // Build recommended from top artists
  useEffect(() => {
    const top = getTopArtists(2);
    if (top.length === 0) return;
    Promise.all(top.map((a) => searchTracks(`${a} hit songs`)))
      .then((lists) => {
        const flat = lists.flat();
        const seen = new Set<string>();
        const dedup = flat.filter((t) => {
          if (seen.has(t.videoId)) return false;
          seen.add(t.videoId);
          return true;
        });
        setRecommended(dedup.slice(0, 30));
      })
      .catch(() => {/* ignore */});
  }, [recent.length]);

  useEffect(() => {
    // Discover: deterministic Bollywood seed (not random) - first seed = "bollywood hits 2025 official"
    searchTracks(BOLLYWOOD_SEEDS[0])
      .then(setDiscover)
      .catch(() => setDiscover([]))
      .finally(() => setLoadingDiscover(false));
    searchTracks("new bollywood songs 2025 official")
      .then(setNewRel)
      .catch(() => setNewRel([]))
      .finally(() => setLoadingNew(false));
  }, []);

  const openArtist = async (name: string, _query: string) => {
    setActiveArtist(name);
    setLoadingArtist(true);
    setArtistTracks([]);
    try {
      // Aggressive multi-query fetch (50+ unique songs)
      const songs = await getArtistSongs(name);
      setArtistTracks(songs);
    } finally {
      setLoadingArtist(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero pb-32">
      <header className="sticky top-0 z-20 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl space-y-3 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={husanLogo}
                alt="Husan Music logo"
                className="h-10 w-10 rounded-xl object-cover shadow-glow"
              />
              <h1 className="font-display text-xl font-black tracking-tight">
                Husan <span className="text-gradient">Music</span>
              </h1>
            </div>
            <a
              href="https://t.me/HusanMusic"
              target="_blank"
              rel="noreferrer"
              className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium hover:text-primary"
            >
              <Send className="h-3.5 w-3.5" /> Telegram
            </a>
          </div>
          <SearchBar />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-6">
        {recent.length > 0 && <Section title="⏱ Recently Played" tracks={recent} />}
        {mostPlayed.length > 0 && <Section title="💚 Most Played" tracks={mostPlayed} />}
        {recommended.length > 0 && <Section title="🧠 Recommended For You" tracks={recommended} />}

        <Section title="✨ Discover Bollywood" tracks={discover} loading={loadingDiscover} />
        <Section title="🆕 New Releases" tracks={newRel} loading={loadingNew} />

        <PlaylistsSection />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold tracking-tight">🎤 Top Artists</h2>
            <a href="/artists" className="text-xs font-semibold text-primary hover:underline">
              See all →
            </a>
          </div>
          <div className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
            {BOLLYWOOD_ARTISTS.map((a) => (
              <button
                key={a.name}
                onClick={() => openArtist(a.name, a.query)}
                className="group flex w-24 shrink-0 flex-col items-center gap-2"
              >
                <div className="transition-transform group-hover:scale-105">
                  <ArtistAvatar name={a.name} size={96} />
                </div>
                <span className="text-center text-xs font-medium">{a.name}</span>
              </button>
            ))}
          </div>
          {activeArtist && (
            <div className="glass space-y-2 rounded-2xl p-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold">{activeArtist}</h3>
                {artistTracks.length > 0 && (
                  <button
                    onClick={() => playQueue(artistTracks, 0)}
                    className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"
                  >
                    Play All
                  </button>
                )}
              </div>
              {loadingArtist ? (
                <div className="flex h-24 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <p className="px-1 text-xs text-muted-foreground">
                    {artistTracks.length} songs
                  </p>
                  <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
                    {artistTracks.map((t, i) => (
                      <TrackRow key={t.videoId} track={t} queue={artistTracks} index={i} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        <InfiniteFeed />

        <section className="glass rounded-2xl p-5 text-center">
          <p className="font-display text-sm text-muted-foreground">Stay Connected</p>
          <a
            href="https://t.me/HusanMusic"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 font-display text-lg font-bold text-gradient"
          >
            <Send className="h-5 w-5 text-primary" /> @HusanMusic
          </a>
          <p className="mt-3 text-xs text-muted-foreground">
            Made By <span className="font-display font-bold text-gradient animate-pulse">Akshay</span>
          </p>
        </section>
      </main>
    </div>
  );
};

export default Index;
