import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Track, searchTracks, BOLLYWOOD_SEEDS } from "@/lib/api";
import { TrackRow } from "@/components/TrackCard";

// Extra rotating queries appended after BOLLYWOOD_SEEDS for endless scroll
const EXTRA_FEED_QUERIES = [
  "bollywood top hits",
  "hindi songs latest",
  "punjabi hits 2025",
  "bollywood dance songs",
  "bollywood romantic hits",
  "indian pop songs",
  "bollywood retro hits",
  "bollywood 2024 songs",
  "bollywood 2023 songs",
  "bollywood 2022 songs",
  "bollywood old gold",
  "bollywood item songs",
  "bollywood club mix",
  "bollywood sufi songs",
  "bollywood unplugged",
  "indie hindi songs",
  "bollywood acoustic",
  "bollywood chill songs",
  "bollywood workout songs",
  "bollywood travel songs",
];

const ALL_QUERIES = [...BOLLYWOOD_SEEDS, ...EXTRA_FEED_QUERIES];

export const InfiniteFeed = () => {
  const [items, setItems] = useState<Track[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadNext = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const q = ALL_QUERIES[page % ALL_QUERIES.length];
      const fetched = await searchTracks(q);
      const fresh = fetched.filter((t) => {
        if (seenRef.current.has(t.videoId)) return false;
        seenRef.current.add(t.videoId);
        return true;
      });
      setItems((prev) => [...prev, ...fresh]);
      setPage((p) => p + 1);
      // Stop only after exhausting all queries with no new items in last full cycle
      if (page > ALL_QUERIES.length * 2 && fresh.length === 0) setDone(true);
    } catch {
      /* swallow — infinite scroll never errors out */
    } finally {
      setLoading(false);
    }
  }, [loading, done, page]);

  // Initial load
  useEffect(() => {
    if (items.length === 0) loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intersection observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadNext();
      },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadNext]);

  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold tracking-tight">♾️ More For You</h2>
      <div className="space-y-1">
        {items.map((t, i) => (
          <TrackRow key={t.videoId} track={t} queue={items} index={i} />
        ))}
      </div>
      <div ref={sentinelRef} className="flex h-16 items-center justify-center">
        {loading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        {done && !loading && (
          <span className="text-xs text-muted-foreground">You've reached the end ✨</span>
        )}
      </div>
    </section>
  );
};
