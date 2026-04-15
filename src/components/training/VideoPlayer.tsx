import { useEffect, useRef, useCallback, useState } from "react";
import { PlayCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoPlayerProps {
  video: {
    id: string;
    titre: string;
    url: string | null;
    vimeo_id: string | null;
    duree_secondes: number | null;
  };
  onNearEnd: () => void;
  initialWatchedSeconds?: number;
}

type VideoSource = "vimeo" | "youtube" | "html5" | "iframe" | "none";

// ── Helpers ────────────────────────────────────────────────────

function extractVimeoId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

function extractVimeoHash(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(?:video\/)?\d+\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function extractYoutubeId(url: string | null): string | null {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function isDirectVideoUrl(url: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

function detectSource(video: VideoPlayerProps["video"]): { source: VideoSource; id: string | null; hash: string | null } {
  if (video.vimeo_id) {
    const hash = extractVimeoHash(video.url);
    return { source: "vimeo", id: video.vimeo_id, hash };
  }
  const vimeoId = extractVimeoId(video.url);
  if (vimeoId) return { source: "vimeo", id: vimeoId, hash: extractVimeoHash(video.url) };
  const ytId = extractYoutubeId(video.url);
  if (ytId) return { source: "youtube", id: ytId, hash: null };
  if (isDirectVideoUrl(video.url)) return { source: "html5", id: video.url, hash: null };
  if (video.url) return { source: "iframe", id: video.url, hash: null };
  return { source: "none", id: null, hash: null };
}

// ── Main component ─────────────────────────────────────────────

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden border-2 border-[#D4AF37]/40 shadow-[0_0_40px_-8px_rgba(212,175,55,0.35)] bg-black">
      {children}
    </div>
  );
}

export function VideoPlayer({ video, onNearEnd, initialWatchedSeconds = 0 }: VideoPlayerProps) {
  const { source, id, hash } = detectSource(video);

  if (source === "none" || !id) {
    return (
      <Frame>
        <div className="aspect-video bg-black flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <PlayCircle className="h-12 w-12 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Vidéo non disponible</p>
          </div>
        </div>
      </Frame>
    );
  }

  switch (source) {
    case "vimeo":
      return <Frame><VimeoEmbed vimeoId={id} vimeoHash={hash} onNearEnd={onNearEnd ?? (() => {})} initialWatchedSeconds={initialWatchedSeconds} /></Frame>;
    case "youtube":
      return <Frame><YoutubeEmbed youtubeId={id} onNearEnd={onNearEnd} /></Frame>;
    case "html5":
      return <Frame><Html5Player url={id} onNearEnd={onNearEnd} initialWatchedSeconds={initialWatchedSeconds} /></Frame>;
    case "iframe":
      return <Frame><GenericIframe url={id} onNearEnd={onNearEnd} /></Frame>;
  }
}

// ── Vimeo ──────────────────────────────────────────────────────

function VimeoEmbed({
  vimeoId,
  vimeoHash,
  onNearEnd,
  initialWatchedSeconds,
}: {
  vimeoId: string;
  vimeoHash?: string | null;
  onNearEnd: () => void;
  initialWatchedSeconds: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const fired95Ref = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    const init = async () => {
      const { default: Player } = await import("@vimeo/player");
      if (destroyed || !containerRef.current) return;

      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
      }
      // vider le container des anciens iframes au cas où
      containerRef.current.innerHTML = "";
      fired95Ref.current = false;

      // Construction manuelle de l'URL embed avec TOUS les flags (le SDK ne
      // supporte pas sidedock / badge / pip qui cachent Like/Share/Vimeo logo).
      const params = new URLSearchParams({
        title: "0",
        byline: "0",
        portrait: "0",
        badge: "0",     // cache le watermark Vimeo (plan Plus+ requis pour vraiment partir)
        sidedock: "0",  // cache Like + Share + Watch Later (top-right)
        pip: "0",       // cache picture-in-picture
        color: "D4AF37",
        dnt: "1",
        playsinline: "1",
      });
      const src = vimeoHash
        ? `https://player.vimeo.com/video/${vimeoId}?h=${vimeoHash}&${params.toString()}`
        : `https://player.vimeo.com/video/${vimeoId}?${params.toString()}`;

      const iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;border:0;";
      iframe.setAttribute("allow", "autoplay; fullscreen; picture-in-picture; clipboard-write");
      iframe.setAttribute("allowfullscreen", "");
      iframe.setAttribute("frameborder", "0");
      containerRef.current.appendChild(iframe);

      const player = new Player(iframe);
      playerRef.current = player;

      if (initialWatchedSeconds > 0) {
        player.ready().then(() => {
          player.setCurrentTime(initialWatchedSeconds).catch(() => {});
        });
      }

      player.on("timeupdate", (data: { seconds: number; duration: number; percent: number }) => {
        if (!fired95Ref.current && data.percent >= 0.95) {
          fired95Ref.current = true;
          onNearEnd();
        }
      });
    };

    init();
    return () => {
      destroyed = true;
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vimeoId]);

  return (
    <div className="aspect-video bg-black overflow-hidden relative">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

// ── YouTube ────────────────────────────────────────────────────

function YoutubeEmbed({
  youtubeId,
  onNearEnd,
}: {
  youtubeId: string;
  onNearEnd: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fired95Ref = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    fired95Ref.current = false;

    // Ensure YouTube IFrame API is loaded
    const loadApi = () =>
      new Promise<void>((resolve) => {
        if ((window as any).YT?.Player) {
          resolve();
          return;
        }
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
        (window as any).onYouTubeIframeAPIReady = () => resolve();
      });

    loadApi().then(() => {
      if (!containerRef.current) return;

      // Create a child div for the player (YT replaces the element)
      const el = document.createElement("div");
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(el);

      playerRef.current = new (window as any).YT.Player(el, {
        videoId: youtubeId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e: any) => {
            // 1 = playing
            if (e.data === 1 && !intervalRef.current) {
              intervalRef.current = setInterval(() => {
                const player = playerRef.current;
                if (!player?.getCurrentTime || !player?.getDuration) return;
                const current = player.getCurrentTime();
                const duration = player.getDuration();
                if (duration > 0 && current / duration >= 0.95 && !fired95Ref.current) {
                  fired95Ref.current = true;
                  onNearEnd();
                  if (intervalRef.current) clearInterval(intervalRef.current);
                }
              }, 1000);
            }
            // 0 = ended, 2 = paused
            if (e.data === 0 || e.data === 2) {
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            }
          },
        },
      });
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeId]);

  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

// ── HTML5 (mp4, webm, etc.) ────────────────────────────────────

function Html5Player({
  url,
  onNearEnd,
  initialWatchedSeconds,
}: {
  url: string;
  onNearEnd: () => void;
  initialWatchedSeconds: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fired95Ref = useRef(false);

  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el || fired95Ref.current) return;
    if (el.duration > 0 && el.currentTime / el.duration >= 0.95) {
      fired95Ref.current = true;
      onNearEnd();
    }
  }, [onNearEnd]);

  useEffect(() => {
    const el = videoRef.current;
    if (el && initialWatchedSeconds > 0) {
      el.currentTime = initialWatchedSeconds;
    }
  }, [initialWatchedSeconds]);

  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        src={url}
        controls
        onTimeUpdate={handleTimeUpdate}
        className="w-full h-full"
      />
    </div>
  );
}

// ── Generic iframe (Loom, Wistia, etc.) ────────────────────────

function GenericIframe({
  url,
  onNearEnd,
}: {
  url: string;
  onNearEnd: () => void;
}) {
  const [manuallyCompleted, setManuallyCompleted] = useState(false);

  const handleMarkComplete = () => {
    setManuallyCompleted(true);
    onNearEnd();
  };

  return (
    <div className="space-y-3">
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={url}
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
      {!manuallyCompleted ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkComplete}
          className="gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Marquer comme vue
        </Button>
      ) : (
        <p className="text-xs text-primary flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Vidéo marquée comme vue
        </p>
      )}
    </div>
  );
}
