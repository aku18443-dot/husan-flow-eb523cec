import { useState } from "react";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { searchTracks } from "@/lib/api";
import { usePlayer } from "@/store/player";
import { supabase } from "@/integrations/supabase/client";

const PRESETS = [
  "sad rainy night",
  "morning energy boost",
  "late night drive",
  "romantic candlelight",
  "party gym pump",
  "monsoon coffee vibes",
];

export const AIMoodDJ = () => {
  const [mood, setMood] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playQueue = usePlayer((s) => s.playQueue);

  const run = async (m: string) => {
    if (!m.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Ask backend to convert mood -> optimized search query via Lovable AI.
      const { data, error: fnErr } = await supabase.functions.invoke("ytm", {
        body: { action: "mood", mood: m },
      });
      // Fallback: use raw mood if AI unavailable.
      const query =
        (data as { query?: string } | null)?.query?.trim() ||
        `${m} bollywood hindi songs`;
      const tracks = await searchTracks(query);
      if (!tracks.length) {
        setError("No tracks found. Try a different mood.");
        setBusy(false);
        return;
      }
      // Shuffle for surprise, then play.
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      await playQueue(shuffled, 0);
    } catch (e) {
      setError("Mood DJ error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="neon-card relative overflow-hidden rounded-3xl p-5 md:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-accent/30 blur-3xl" />

      <div className="relative flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-neon-cyan">
        <Sparkles className="h-3.5 w-3.5" /> AI Mood DJ
      </div>
      <h2 className="relative mt-2 font-display text-2xl md:text-3xl font-black leading-tight">
        Type a <span className="text-gradient">vibe</span> — get an instant queue.
      </h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(mood);
        }}
        className="relative mt-4 flex items-center gap-2 rounded-full bg-black/40 p-1.5 ring-1 ring-primary/30 focus-within:ring-primary/70"
      >
        <input
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          placeholder="'sad rainy night', 'gym pump', 'first date'..."
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={busy || !mood.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-accent px-4 py-2 text-sm font-bold text-primary-foreground shadow-neon transition-transform hover:scale-105 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {busy ? "Mixing..." : "Play"}
        </button>
      </form>

      <div className="relative mt-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => {
              setMood(p);
              run(p);
            }}
            disabled={busy}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-foreground/80 hover:border-primary/50 hover:text-foreground"
          >
            {p}
          </button>
        ))}
      </div>

      {error && <p className="relative mt-3 text-xs text-destructive">{error}</p>}
    </div>
  );
};
