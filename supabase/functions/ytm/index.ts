import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.reallyaweso.me",
  "https://api.piped.private.coffee",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.drgns.space",
  "https://piapi.ggtyler.dev",
  "https://pipedapi.smnz.de",
  "https://pipedapi.ducks.party",
  "https://pipedapi.nosebs.ru",
  "https://pipedapi.r4fo.com",
  "https://pipedapi.orangenet.cc",
];

const INVIDIOUS_INSTANCES = [
  "https://invidious.nerdvpn.de",
  "https://inv.nadeko.net",
  "https://invidious.jing.rocks",
  "https://yewtu.be",
  "https://invidious.privacyredirect.com",
  "https://iv.melmac.space",
  "https://invidious.f5.si",
];

const health = new Map<string, { latency: number; fails: number; lastFail: number }>();
PIPED_INSTANCES.forEach((u) => health.set(u, { latency: 1000, fails: 0, lastFail: 0 }));

const BANNED = /\b(shorts?|#shorts|status|reel|reels|whatsapp\s*status|meme|funny\s*clip|short\s*clip|tiktok|ringtone|trailer|teaser|interview|making|behind\s*the\s*scenes|bts|review|reaction)\b/i;

function rankedInstances(): string[] {
  const now = Date.now();
  return [...PIPED_INSTANCES].sort((a, b) => {
    const ha = health.get(a)!;
    const hb = health.get(b)!;
    const pa = ha.latency + (now - ha.lastFail < 60_000 ? ha.fails * 5000 : 0);
    const pb = hb.latency + (now - hb.lastFail < 60_000 ? hb.fails * 5000 : 0);
    return pa - pb;
  });
}

// Fast race-based fetch: hit the top N instances in parallel and use whichever responds first.
async function raceFetch(path: string, timeoutMs = 3500, parallel = 4): Promise<any> {
  const order = rankedInstances().slice(0, parallel);
  const attempts = order.map((base) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const start = Date.now();
    return fetch(`${base}${path}`, {
      signal: ctrl.signal,
      headers: { "User-Agent": "HusanMusic/1.0" },
    })
      .then(async (res) => {
        clearTimeout(t);
        if (!res.ok) {
          const h = health.get(base)!;
          h.fails += 1;
          h.lastFail = Date.now();
          throw new Error(`${base} -> ${res.status}`);
        }
        const json = await res.json();
        const latency = Date.now() - start;
        const h = health.get(base)!;
        h.latency = h.latency * 0.5 + latency * 0.5;
        h.fails = Math.max(0, h.fails - 1);
        return json;
      })
      .catch((e) => {
        clearTimeout(t);
        const h = health.get(base)!;
        h.fails += 1;
        h.lastFail = Date.now();
        throw e;
      });
  });
  // Promise.any → first fulfilled wins
  // @ts-ignore - Deno supports Promise.any
  return Promise.any(attempts);
}

// Sequential fallback (only used if race fails) — tries the rest of the instances
async function tryFetch(path: string, timeoutMs = 3500): Promise<any> {
  try {
    return await raceFetch(path, timeoutMs, 4);
  } catch {
    // fall through to remaining instances sequentially
  }
  const order = rankedInstances().slice(4);
  let lastErr: unknown = null;
  for (const base of order) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${base}${path}`, {
        signal: ctrl.signal,
        headers: { "User-Agent": "HusanMusic/1.0" },
      });
      clearTimeout(t);
      if (!res.ok) { lastErr = new Error(`${base} -> ${res.status}`); continue; }
      return await res.json();
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
    }
  }
  throw new Error(`All instances failed: ${String(lastErr)}`);
}

function isRealSong(it: { title?: string; duration?: number; uploaderName?: string }): boolean {
  if (!it) return false;
  const dur = it.duration ?? 0;
  if (dur < 75 || dur > 60 * 30) return false;
  if (BANNED.test(it.title ?? "")) return false;
  if (BANNED.test(it.uploaderName ?? "")) return false;
  return true;
}

function mapItem(it: any) {
  const id = (it.url ?? "").replace("/watch?v=", "") || it.videoId;
  if (!id) return null;
  return {
    videoId: id,
    title: (it.title ?? "").trim(),
    artist: (it.uploaderName ?? it.uploader ?? "Unknown").replace(/ - Topic$/, ""),
    duration: it.duration ?? 0,
    thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    uploaderUrl: it.uploaderUrl ?? null,
    uploaderAvatar: it.uploaderAvatar ?? null,
  };
}

function dedupe<T extends { videoId: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    if (!seen.has(it.videoId)) {
      seen.add(it.videoId);
      out.push(it);
    }
  }
  return out;
}

type Candidate = {
  url: string;
  mimeType: string;
  bitrate: number;
};

type ResolvedStream = {
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  uploaderAvatar: string | null;
  related: any[];
  candidates: Candidate[];
};

function baseMime(mime: string | null | undefined): string {
  return (mime ?? "audio/mp4").split(";")[0].trim().toLowerCase();
}

function mimeRank(mime: string): number {
  const value = baseMime(mime);
  if (value === "audio/mp4") return 400;
  if (value === "audio/mpeg") return 350;
  if (value === "audio/mp3") return 325;
  if (value === "audio/webm") return 250;
  if (value.startsWith("audio/")) return 100;
  return -1;
}

function sortCandidates(items: Candidate[]): Candidate[] {
  return [...items]
    .filter((item) => !!item.url && mimeRank(item.mimeType) >= 0)
    .sort((a, b) => {
      const rankDiff = mimeRank(b.mimeType) - mimeRank(a.mimeType);
      if (rankDiff !== 0) return rankDiff;
      return (b.bitrate || 0) - (a.bitrate || 0);
    });
}

async function fetchUpstreamAudio(candidate: Candidate, req: Request): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const headers = new Headers({
      "User-Agent": "HusanMusic/1.0",
      Referer: "https://www.youtube.com/",
      Origin: "https://www.youtube.com",
      Accept: "audio/*,*/*;q=0.9",
    });
    const range = req.headers.get("range");
    if (range) headers.set("Range", range);

    const upstream = await fetch(candidate.url, {
      method: req.method === "HEAD" ? "HEAD" : "GET",
      headers,
      signal: ctrl.signal,
    });

    if (!upstream.ok && upstream.status !== 206) return null;
    const contentType = baseMime(upstream.headers.get("content-type") || candidate.mimeType);
    if (!contentType.startsWith("audio/")) return null;

    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set("Content-Type", contentType);
    responseHeaders.set("Cache-Control", "no-store");
    responseHeaders.set("Accept-Ranges", upstream.headers.get("accept-ranges") ?? "bytes");
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) responseHeaders.set("Content-Length", contentLength);
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);

    return new Response(req.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function resolvePipedStream(id: string): Promise<ResolvedStream | null> {
  let raw: any = null;
  try {
    raw = await tryFetch(`/streams/${id}`, 3500);
  } catch {
    return null;
  }
  if (!raw) return null;

  const candidates = sortCandidates(
    (raw.audioStreams ?? []).map((stream: any) => ({
      url: stream?.url ?? "",
      mimeType: baseMime(stream?.mimeType),
      bitrate: Number(stream?.bitrate ?? 0),
    })),
  );

  return {
    title: raw.title ?? "",
    artist: (raw.uploader ?? "").replace(/ - Topic$/, ""),
    duration: raw.duration ?? 0,
    thumbnail: raw.thumbnailUrl ?? `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    uploaderAvatar: raw.uploaderAvatar ?? null,
    related: dedupe(
      (raw.relatedStreams ?? [])
        .filter((it: any) => it.url || it.videoId)
        .filter(isRealSong)
        .map(mapItem)
        .filter(Boolean) as any[],
    ).slice(0, 15),
    candidates,
  };
}

async function resolveInvidiousStream(id: string): Promise<ResolvedStream | null> {
  // Race Invidious instances in parallel
  const attempts = INVIDIOUS_INSTANCES.map((base) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    return fetch(`${base}/api/v1/videos/${id}?fields=title,author,lengthSeconds,videoThumbnails,adaptiveFormats,authorThumbnails`, {
      signal: ctrl.signal,
      headers: { "User-Agent": "HusanMusic/1.0" },
    })
      .then(async (res) => {
        clearTimeout(t);
        if (!res.ok) throw new Error(`${base} -> ${res.status}`);
        const v = await res.json();
        const candidates = sortCandidates(
          (v.adaptiveFormats ?? []).map((stream: any) => ({
            url: stream?.url ?? "",
            mimeType: baseMime(stream?.type),
            bitrate: Number(stream?.bitrate ?? 0),
          })),
        );
        if (!candidates.length) throw new Error("no candidates");
        const thumbs = v.videoThumbnails ?? [];
        const avatars = v.authorThumbnails ?? [];
        return {
          title: v.title ?? "",
          artist: (v.author ?? "").replace(/ - Topic$/, ""),
          duration: Number(v.lengthSeconds || 0),
          thumbnail: thumbs[0]?.url ?? `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
          uploaderAvatar: avatars[avatars.length - 1]?.url ?? null,
          related: [] as any[],
          candidates,
        } as ResolvedStream;
      })
      .catch((e) => { clearTimeout(t); throw e; });
  });
  try {
    // @ts-ignore
    return await Promise.any(attempts);
  } catch {
    return null;
  }
}

// Resolve in parallel — return whichever provider responds first with candidates.
// SKIP probing: the browser will fetch the audio URL via our /audio proxy directly,
// and we no longer pre-validate (which added 1-8s of dead time).
async function resolveStreamFast(id: string): Promise<ResolvedStream | null> {
  const piped = resolvePipedStream(id).catch(() => null);
  const invid = resolveInvidiousStream(id).catch(() => null);
  // Race for first non-null with candidates
  try {
    // @ts-ignore Promise.any
    const winner = await Promise.any([
      piped.then((s) => (s && s.candidates.length ? s : Promise.reject(new Error("empty")))),
      invid.then((s) => (s && s.candidates.length ? s : Promise.reject(new Error("empty")))),
    ]);
    return winner as ResolvedStream;
  } catch {
    // Last-ditch: await both (one may resolve a moment later)
    const [p, i] = await Promise.all([piped, invid]);
    return (p && p.candidates.length ? p : null) ?? (i && i.candidates.length ? i : null);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "search";
    const supaUrl = Deno.env.get("SUPABASE_URL") ?? "https://fsncpitxcehpttrrcgni.supabase.co";
    const publicBase = `${supaUrl.replace(/\/$/, "")}/functions/v1/ytm`;
    let data: any;

    if (action === "search") {
      const q = url.searchParams.get("q") ?? "";
      const filter = url.searchParams.get("filter") ?? "music_songs";
      if (!q.trim()) {
        return new Response(JSON.stringify({ items: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const raw = await tryFetch(`/search?q=${encodeURIComponent(q)}&filter=${encodeURIComponent(filter)}`);
      const items = dedupe(
        (raw.items ?? [])
          .filter((it: any) => it.url || it.videoId)
          .filter(isRealSong)
          .map(mapItem)
          .filter(Boolean) as any[],
      );
      data = { items };
    } else if (action === "streams") {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ error: "missing id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resolved = await resolveStreamFast(id);
      if (!resolved || !resolved.candidates.length) {
        return new Response(JSON.stringify({
          error: "no compatible stream available",
          videoId: id,
          title: "",
          artist: "",
          duration: 0,
          thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
          streamUrl: null,
          mimeType: "audio/mp4",
          related: [],
          uploaderAvatar: null,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      data = {
        videoId: id,
        title: resolved.title,
        artist: resolved.artist,
        duration: resolved.duration,
        thumbnail: resolved.thumbnail,
        // Always proxy via our /audio endpoint (CORS + range support)
        streamUrl: `${publicBase}?action=audio&id=${encodeURIComponent(id)}`,
        mimeType: baseMime(resolved.candidates[0].mimeType),
        related: resolved.related,
        uploaderAvatar: resolved.uploaderAvatar,
      };
    } else if (action === "audio") {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ error: "missing id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fast resolve in parallel, then race candidates: try top 2 in parallel,
      // first one that returns audio bytes wins. This eliminates serial waiting.
      const resolved = await resolveStreamFast(id);
      if (!resolved || !resolved.candidates.length) {
        return new Response(JSON.stringify({ error: "no candidates" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      }

      // Try top candidate first (fast path). If null, try next sequentially.
      // Keep it simple — racing audio fetches wastes upstream bandwidth.
      for (const candidate of resolved.candidates.slice(0, 4)) {
        const proxied = await fetchUpstreamAudio(candidate, req);
        if (proxied) return proxied;
      }

      return new Response(JSON.stringify({ error: "audio proxy failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    } else if (action === "channel") {
      const q = url.searchParams.get("q") ?? "";
      if (!q.trim()) {
        return new Response(JSON.stringify({ image: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const raw = await tryFetch(`/search?q=${encodeURIComponent(q + " topic")}&filter=channels`);
      const ch = (raw.items ?? [])[0];
      data = {
        name: ch?.name ?? q,
        channelId: (ch?.url ?? "").replace("/channel/", ""),
        image: ch?.thumbnail ?? null,
      };
    } else if (action === "related") {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ items: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const resolved = await resolvePipedStream(id);
      data = { items: resolved?.related ?? [] };
    } else {
      return new Response(JSON.stringify({ error: "unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    console.error("ytm error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown", items: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
