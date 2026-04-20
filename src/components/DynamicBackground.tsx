import { useEffect, useState } from "react";

// Premium palette — cycled every 2 minutes with smooth transition.
const PALETTE = [
  { name: "pink",   from: "#ff4da6", to: "#7a1f5a" },
  { name: "purple", from: "#7a5cff", to: "#2a1a55" },
  { name: "blue",   from: "#3b82f6", to: "#0f1f4d" },
  { name: "green",  from: "#1DB954", to: "#0e3a1f" },
];

export const DynamicBackground = () => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => {
        const next = (i + 1) % PALETTE.length;
        console.log("UI COLOR CHANGED", PALETTE[next].name);
        return next;
      });
    }, 120_000); // every 2 minutes
    return () => clearInterval(id);
  }, []);

  const c = PALETTE[idx];

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        background: `radial-gradient(120% 80% at 20% 0%, ${c.from}55 0%, transparent 60%), radial-gradient(120% 80% at 100% 100%, ${c.to}55 0%, transparent 55%), hsl(var(--background))`,
        transition: "background 1.6s ease",
      }}
    />
  );
};
