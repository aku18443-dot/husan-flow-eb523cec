import { usePlayer } from "@/store/player";

/**
 * NeonBackground — animated blobs that pulse harder while a track is playing.
 * Pure CSS (no WebAudio) so it works with the YouTube IFrame player.
 */
export const NeonBackground = () => {
  const isPlaying = usePlayer((s) => s.isPlaying);
  const speed = isPlaying ? "10s" : "22s";
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -top-40 -left-40 h-[55vw] w-[55vw] rounded-full opacity-70 blur-3xl animate-blob"
        style={{ background: "radial-gradient(circle, hsl(328 100% 55% / 0.9), transparent 70%)", animationDuration: speed }}
      />
      <div
        className="absolute top-1/3 -right-40 h-[50vw] w-[50vw] rounded-full opacity-60 blur-3xl animate-blob"
        style={{ background: "radial-gradient(circle, hsl(190 100% 55% / 0.75), transparent 70%)", animationDuration: speed, animationDelay: "-6s" }}
      />
      <div
        className="absolute -bottom-40 left-1/3 h-[45vw] w-[45vw] rounded-full opacity-60 blur-3xl animate-blob"
        style={{ background: "radial-gradient(circle, hsl(275 90% 60% / 0.85), transparent 70%)", animationDuration: speed, animationDelay: "-12s" }}
      />
      {/* subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(328 100% 70%) 1px, transparent 1px), linear-gradient(90deg, hsl(190 100% 70%) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
};
