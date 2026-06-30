import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, Bell, Users } from "lucide-react";
import { useState } from "react";

export const TopBar = ({ onSearch }: { onSearch?: (q: string) => void }) => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-4 rounded-t-lg bg-card/40 px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-foreground/80 hover:text-foreground"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => navigate(1)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-foreground/40 hover:text-foreground"
          aria-label="Forward"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (onSearch) onSearch(q);
          else navigate(`/search`);
        }}
        className="flex max-w-xl flex-1 items-center gap-2 rounded-full bg-white/[0.07] px-4 py-2 ring-1 ring-transparent transition-all focus-within:bg-white/[0.1] focus-within:ring-white/20"
      >
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => navigate("/search")}
          placeholder="What do you want to play?"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </form>

      <div className="flex items-center gap-2">
        <button
          className="hidden md:flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          className="hidden md:flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-muted-foreground hover:text-foreground"
          aria-label="Friends"
        >
          <Users className="h-4 w-4" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-accent font-display text-sm font-black text-primary-foreground">
          A
        </div>
      </div>
    </div>
  );
};
