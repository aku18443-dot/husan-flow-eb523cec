export const Shimmer = ({ className = "" }: { className?: string }) => (
  <div
    className={`relative overflow-hidden rounded-xl bg-secondary ${className}`}
    style={{
      backgroundImage:
        "linear-gradient(90deg, hsl(var(--secondary)) 0%, hsl(var(--muted)) 50%, hsl(var(--secondary)) 100%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.6s linear infinite",
    }}
  />
);

export const CardShimmerRow = () => (
  <div className="-mx-4 flex gap-3 overflow-hidden px-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="w-40 shrink-0 space-y-2">
        <Shimmer className="aspect-square" />
        <Shimmer className="h-3 w-3/4" />
        <Shimmer className="h-2.5 w-1/2" />
      </div>
    ))}
  </div>
);
