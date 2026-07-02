// Best-effort helpers to keep audio playing when the app is backgrounded
// or the screen is off. Real reliable background playback on mobile
// requires a native shell (Capacitor + music-controls plugin); this file
// squeezes as much as possible out of the plain web/PWA environment.

let wakeLock: any = null;
let silentAudio: HTMLAudioElement | null = null;
let installed = false;

// 1 second of near-silent audio loop (WAV, ~10KB) served as data URL.
// Playing an <audio> element keeps mobile browsers from freezing the tab
// and lets the YouTube iframe keep its audio context alive on some
// platforms.
const SILENT_WAV_DATAURL =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator && !wakeLock) {
      // @ts-expect-error - wakeLock is not fully typed
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener?.("release", () => { wakeLock = null; });
    }
  } catch { /* ignore */ }
}

function releaseWakeLock() {
  try { wakeLock?.release?.(); } catch { /* ignore */ }
  wakeLock = null;
}

function ensureSilentAudio() {
  if (silentAudio) return silentAudio;
  const a = new Audio(SILENT_WAV_DATAURL);
  a.loop = true;
  a.volume = 0.001;
  a.preload = "auto";
  a.setAttribute("playsinline", "true");
  silentAudio = a;
  return a;
}

export function backgroundPlaybackStart() {
  void requestWakeLock();
  const a = ensureSilentAudio();
  a.play().catch(() => { /* user gesture required first time */ });
}

export function backgroundPlaybackStop() {
  releaseWakeLock();
  try { silentAudio?.pause(); } catch { /* ignore */ }
}

export function installBackgroundKeepAlive(
  onVisible: () => void,
) {
  if (installed) return;
  installed = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      // Re-acquire wake lock (browsers drop it on hide)
      void requestWakeLock();
      onVisible();
    }
  });
}
