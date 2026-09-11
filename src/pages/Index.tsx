import { useEffect, useState } from "react";
import {
  BOLLYWOOD_ARTISTS,
  BOLLYWOOD_SEEDS,
  Track,
  searchTracks,
  getArtistSongs,
} from "@/lib/api";
import { TrackCard, TrackRow } from "@/components/TrackCard";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { CardShimmerRow } from "@/components/Shimmer";
import { PlaylistsSection } from "@/components/PlaylistsSection";
import { InfiniteFeed } from "@/components/InfiniteFeed";
import { usePlayer } from "@/store/player";
import { getRecent, getMostPlayed, getTopArtists } from "@/lib/history";
import { Loader2, Play, Send, Radio, Flame, Sparkles } from "lucide-react";
import husanLogo from "@/assets/husan-logo.png";

const Row = ({ title, tracks, loading }: { title: React.ReactNode; tracks: Track[]; loading?: boolean }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-bold tracking-tight">{title}</h2>
    {loading && tracks.length === 0 ? (
      <CardShimmerRow />
    ) : tracks.length === 0 ? null : (
      <div className="scrollbar-hide -mx-2 flex gap-3 overflow-x-auto px-2 pb-2">
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
    document.title = "Husan Music — Bollywood Streaming";
  }, [init]);

  useEffect(() => {
    setRecent(getRecent().slice(0, 20));
    setMostPlayed(getMostPlayed());
  }, [current]);

  useEffect(() => {
    const top = getTopArtists(2);
    if (top.length === 0) return;
    Promise.all(top.map((a) => searchTracks(`${a} hit songs`)))
      .then((lists) => {
        const flat = lists.flat();
        const seen = new Set<string>();
        const dedup = flat.filter((t) => (seen.has(t.videoId) ? false : (seen.add(t.videoId), true)));
        setRecommended(dedup.slice(0, 30));
      })
      .catch(() => {});
  }, [recent.length]);

  useEffect(() => {
    searchTracks(BOLLYWOOD_SEEDS[0])
      .then(setDiscover)
      .catch(() => setDiscover([]))
      .finally(() => setLoadingDiscover(false));
    searchTracks("new bollywood songs 2025 official")
      .then(setNewRel)
      .catch(() => setNewRel([]))
      .finally(() => setLoadingNew(false));
  }, []);

  const openArtist = async (name: string) => {
    setActiveArtist(name);
    setLoadingArtist(true);
    setArtistTracks([]);
    try {
      const songs = await getArtistSongs(name);
      setArtistTracks(songs);
    } finally {
      setLoadingArtist(false);
    }
  };

  const hero = discover[0];

  return (
    <div className="min-h-full pb-8">
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-8">
        {/* HERO */}
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img src={husanLogo} alt="Husan Music" className="h-16 w-16 rounded-xl shadow-glow" />
            <div>
              <h1 className="text-3xl font-black leading-none md:text-4xl">
                Husan Music
              </h1>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Unlimited Bollywood streaming. Search, play, enjoy.
              </p>
            </div>
          </div>
          {hero && (
            <button
              onClick={() => playQueue(discover, 0)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-105"
            >
              <Play className="h-4 w-4 fill-current" /> Play Trending
              <span className="text-[10px] font-medium opacity-80">
                {discover.length} songs
              </span>
            </button>
          )}
        </section>

        {recent.length > 0 && <Row title="⏱ Recently Played" tracks={recent} />}
        {mostPlayed.length > 0 && (
          <Row
            title={<span className="inline-flex items-center gap-2"><Flame className="h-5 w-5 text-primary" /> Most Played</span>}
            tracks={mostPlayed}
          />
        )}
        {recommended.length > 0 && (
          <Row
            title={<span className="inline-flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Recommended For You</span>}
            tracks={recommended}
          />
        )}


        <Row title="✨ Discover Bollywood" tracks={discover} loading={loadingDiscover} />
        <Row title="🆕 New Releases" tracks={newRel} loading={loadingNew} />

        <PlaylistsSection />

        {/* Artists */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight inline-flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" /> Top Artists
            </h2>
            <a href="/artists" className="text-xs font-semibold text-primary hover:underline">
              See all →
            </a>
          </div>
          <div className="scrollbar-hide -mx-2 flex gap-4 overflow-x-auto px-2 pb-2">
            {BOLLYWOOD_ARTISTS.map((a) => (
              <button
                key={a.name}
                onClick={() => openArtist(a.name)}
                className="group flex w-24 shrink-0 flex-col items-center gap-2"
              >
                <div className="rounded-full ring-2 ring-transparent transition-all group-hover:ring-primary/70">
                  <ArtistAvatar name={a.name} size={96} />
                </div>
                <span className="text-center text-xs font-medium">{a.name}</span>
              </button>
            ))}
          </div>
          {activeArtist && (
            <div className="neon-card space-y-2 rounded-2xl p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold">{activeArtist}</h3>
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
                  <p className="px-1 text-xs text-muted-foreground">{artistTracks.length} songs</p>
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

        <section className="neon-card rounded-2xl p-5 text-center">
          <p className="text-sm text-muted-foreground">Stay Connected</p>
          <a
            href="https://t.me/HusanMusic"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 text-lg font-bold text-primary"
          >
            <Send className="h-5 w-5" /> @HusanMusic
          </a>
          <p className="mt-3 text-xs text-muted-foreground">
            Made By <span className="font-bold text-primary">Akshay</span>
          </p>
        </section>
      </main>
    </div>
  );
};

export default Index;
