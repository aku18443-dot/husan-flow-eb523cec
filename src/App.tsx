import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import SearchPage from "./pages/Search.tsx";
import ArtistsPage from "./pages/Artists.tsx";
import { DynamicBackground } from "./components/DynamicBackground";
import { MiniPlayer } from "./components/MiniPlayer";
import { FullPlayer } from "./components/FullPlayer";
import { usePlayer } from "./store/player";

const queryClient = new QueryClient();

const App = () => {
  const init = usePlayer((s) => s.init);
  useEffect(() => { init(); }, [init]);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DynamicBackground />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/artists" element={<ArtistsPage />} />
            <Route path="/artists/:name" element={<ArtistsPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MiniPlayer />
          <FullPlayer />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
