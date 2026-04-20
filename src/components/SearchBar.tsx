import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const SearchBar = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/search")}
      className="glass flex w-full items-center gap-2 rounded-full px-4 py-2.5 text-left transition-all active:scale-[0.98] hover:bg-secondary/40"
      aria-label="Open search"
    >
      <Search className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Search songs, artists, albums...</span>
    </button>
  );
};
