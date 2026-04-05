import { useEffect, useRef } from "react";
import { PlayCircle } from "lucide-react";

interface VimeoPlayerProps {
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

// Helper : extraire l'ID Vimeo d'une URL
function extractVimeoId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

export function VimeoPlayer({ video, onNearEnd, initialWatchedSeconds = 0 }: VimeoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const fired95Ref = useRef(false);

  const vimeoId = video.vimeo_id || extractVimeoId(video.url);

  useEffect(() => {
    if (!containerRef.current || !vimeoId) return;

    let destroyed = false;

    const init = async () => {
      // Dynamic import to avoid SSR issues
      const { default: Player } = await import("@vimeo/player");

      if (destroyed || !containerRef.current) return;

      // Clean up previous player
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
      }

      fired95Ref.current = false;

      const player = new Player(containerRef.current!, {
        id: parseInt(vimeoId, 10),
        responsive: true,
        dnt: true,
      });
      playerRef.current = player;

      // Resume where student left off
      if (initialWatchedSeconds > 0) {
        player.ready().then(() => {
          player.setCurrentTime(initialWatchedSeconds).catch(() => {});
        });
      }

      // Detect 95% completion
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

  if (!vimeoId) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <PlayCircle className="h-12 w-12 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Vidéo invalide</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
