import { useEffect, useState } from "react";
import { getArtistImage } from "@/lib/api";
import { User } from "lucide-react";

export const ArtistAvatar = ({ name, size = 96 }: { name: string; size?: number }) => {
  const [img, setImg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getArtistImage(name).then((src) => { if (alive) setImg(src); });
    return () => { alive = false; };
  }, [name]);

  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-gradient-accent shadow-glow"
      style={{ width: size, height: size }}
    >
      {img && !failed ? (
        <img
          src={img}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-display text-2xl font-black text-primary-foreground">
          {initials || <User className="h-8 w-8" />}
        </div>
      )}
    </div>
  );
};
