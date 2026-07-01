import { useEffect, useRef, useState } from "react";
import { Moon } from "lucide-react";
import { usePlayer } from "@/store/player";

const OPTIONS = [5, 10, 15, 30, 45, 60];

export const SleepTimer = () => {
  const [open, setOpen] = useState(false);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const toggle = usePlayer((s) => s.toggle);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt) {
        window.clearInterval(id);
        if (isPlaying) toggle();
        setEndsAt(null);
      }
    }, 1000);
    timerRef.current = id;
    return () => window.clearInterval(id);
  }, [endsAt, isPlaying, toggle]);

  const remaining = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 60000)) : 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 text-xs ${
          endsAt ? "text-neon-cyan" : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Sleep timer"
        title="Sleep timer"
      >
        <Moon className="h-4 w-4" />
        {endsAt ? <span className="font-mono">{remaining}m</span> : null}
      </button>
      {open && (
        <div className="absolute bottom-8 right-0 z-40 w-40 rounded-xl neon-card p-2 text-sm">
          <p className="mb-1 px-2 text-[10px] uppercase tracking-widest text-muted-foreground">Sleep in</p>
          {OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => {
                setEndsAt(Date.now() + m * 60000);
                setOpen(false);
              }}
              className="block w-full rounded-md px-2 py-1 text-left hover:bg-primary/20"
            >
              {m} minutes
            </button>
          ))}
          {endsAt && (
            <button
              onClick={() => {
                setEndsAt(null);
                setOpen(false);
              }}
              className="mt-1 block w-full rounded-md px-2 py-1 text-left text-destructive hover:bg-destructive/20"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
};
