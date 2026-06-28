import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, X, Loader2, Clock, TrendingUp, Trash2 } from "lucide-react";
import { Track, searchTracks } from "@/lib/api";
import { usePlayer } from "@/store/player";
import { Shimmer } from "@/components/Shimmer";

const HISTORY_KEY = "husan_history_v1";
const TRENDING_QUERIES = [
  "Arijit Singh", "Bollywood 2025", "Shreya Ghoshal", "Punjabi hits",
  "Atif Aslam", "Romantic Hindi", "Diljit Dosanjh", "AR Rahman",
];

const fmtDur = (s: number) => {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
};

const SearchPage = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const playQueue = usePlayer((s) => s.playQueue);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); } catch { return []; }
  });
  const debounceRef = useRef<number | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Live suggestions while typing (debounced 300ms)
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setLoading(false); setSubmitted(false); return; }
    setLoading(true);
    const myId = ++reqIdRef.current;
    debounceRef.current = window.setTimeout(async () => {
      try {
        const r = await searchTracks(q);
        if (reqIdRef.current === myId) setResults(r);
      } catch {
        if (reqIdRef.current === myId) setResults([]);
      } finally {
        if (reqIdRef.current === myId) setLoading(false);
      }
    }, 300);
  }, [q]);

  const persist = (next: string[]) => {
    setHistory(next);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {/* quota */}
  };

  const commit = (term: string) => {
    if (!term.trim()) return;
    const next = [term, ...history.filter((h) => h !== term)].slice(0, 10);
    persist(next);
  };

  const removeHistory = (term: string) => {
    persist(history.filter((h) => h !== term));
  };

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    commit(q.trim());
    setSubmitted(true);
    inputRef.current?.blur();
  };

  const playTrack = (track: Track, _list: Track[]) => {
    commit(q.trim());
    // Play just this track — store will auto-build a related/random queue
    // so "Next" gives variety instead of cycling search results.
    playQueue([track], 0);
  };

  return (
    <div className="min-h-screen bg-gradient-hero pb-32 animate-float-up">
      {/* Sticky search header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl">
        <form onSubmit={onSubmit} className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90 hover:bg-secondary"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="glass flex flex-1 items-center gap-2 rounded-full px-4 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Songs, artists, albums..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoComplete="off"
              enterKeyHint="search"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            {q && !loading && (
              <button
                type="button"
                onClick={() => { setQ(""); setResults([]); inputRef.current?.focus(); }}
                className="rounded-full p-1 text-muted-foreground transition-transform active:scale-90 hover:text-foreground"
                aria-label="Clear"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
      </header>

      <main className="mx-auto max-w-3xl px-3 py-2">
        {/* Empty state: history + trending */}
        {!q && (
          <div className="space-y-6 px-1 pt-2">
            {history.length > 0 && (
              <section>
                <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Recent Searches
                </h2>
                <ul className="space-y-1">
                  {history.map((h) => (
                    <li
                      key={h}
                      className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-secondary/60"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <button
                        onClick={() => setQ(h)}
                        className="flex-1 text-left text-sm"
                      >
                        {h}
                      </button>
                      <button
                        onClick={() => removeHistory(h)}
                        className="rounded-full p-1.5 text-muted-foreground opacity-0 transition-all active:scale-90 hover:text-destructive group-hover:opacity-100"
                        aria-label={`Remove ${h}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" /> Trending Searches
              </h2>
              <div className="flex flex-wrap gap-2">
                {TRENDING_QUERIES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setQ(t)}
                    className="glass rounded-full px-3.5 py-1.5 text-xs font-medium transition-transform active:scale-95 hover:text-primary"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Loading shimmer */}
        {q && loading && results.length === 0 && (
          <ul className="space-y-2 pt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 p-2">
                <Shimmer className="h-12 w-12 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Shimmer className="h-3 w-3/4" />
                  <Shimmer className="h-2.5 w-1/2" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Results */}
        {q && results.length > 0 && (
          <ul className="space-y-1 pt-1 animate-float-up">
            {results.map((t) => (
              <li key={t.videoId}>
                <button
                  onClick={() => playTrack(t, results)}
                  className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-all active:scale-[0.98] hover:bg-secondary/70"
                >
                  <img
                    src={t.thumbnail}
                    alt=""
                    loading="lazy"
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        `https://img.youtube.com/vi/${t.videoId}/mqdefault.jpg`;
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold">{t.title}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {t.artist}{t.duration ? ` • ${fmtDur(t.duration)}` : ""}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* No results */}
        {q && submitted && !loading && results.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Search className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No songs found for "{q}"</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchPage;
