import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import SearchPage from "./pages/Search.tsx";
import ArtistsPage from "./pages/Artists.tsx";
import { FullPlayer } from "./components/FullPlayer";
import { LeftSidebar } from "./components/LeftSidebar";
import { BottomPlayerBar } from "./components/BottomPlayerBar";
import { MiniPlayer } from "./components/MiniPlayer";
import { usePlayer } from "./store/player";

const queryClient = new QueryClient();

const Shell = () => {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-black text-foreground">
      <div className="flex min-h-0 flex-1 gap-0 p-2 pb-0">
        <LeftSidebar />
        <main className="relative min-w-0 flex-1 overflow-hidden rounded-lg bg-gradient-hero">
          <div className="scrollbar-hide h-full overflow-y-auto">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/artists" element={<ArtistsPage />} />
              <Route path="/artists/:name" element={<ArtistsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </main>
      </div>
      {/* Desktop: full-width Spotify-style bottom bar */}
      <div className="hidden md:block">
        <BottomPlayerBar />
      </div>
      {/* Mobile: floating mini player */}
      <div className="md:hidden">
        <MiniPlayer />
      </div>
      <FullPlayer />
    </div>
  );
};

const App = () => {
  const init = usePlayer((s) => s.init);
  useEffect(() => { init(); }, [init]);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
