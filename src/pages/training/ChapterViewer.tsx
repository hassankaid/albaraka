import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ChapterSidebar } from "@/components/training/ChapterSidebar";
import { VimeoPlayer } from "@/components/training/VimeoPlayer";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  PlayCircle,
  Menu,
  X,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

interface ChapitreVideo {
  id: string;
  titre: string;
  url: string | null;
  vimeo_id: string | null;
  ordre: number;
  duree_secondes: number | null;
}

interface ChapitreRessource {
  id: string;
  titre: string;
  type: string;
  url: string;
  ordre: number;
}

export default function ChapterViewer() {
  const { slug, chapitreId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const userId = profile?.id;
  const isCeo = profile?.role === "ceo";
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);

  // ── Load chapitre + videos + ressources ─────────────────────
  const { data: chapterData, isLoading: loadingChapter } = useQuery({
    queryKey: ["training", "chapter", chapitreId, userId],
    enabled: !!chapitreId && !!userId,
    queryFn: async () => {
      const { data: chapitre, error } = await (supabase as any)
        .from("formation_chapitres")
        .select(
          `id, titre, description, ordre, status, duree_estimee_minutes,
          formation_modules!inner(id, titre, formation_id,
            formations!inner(id, slug, titre)
          ),
          chapitre_videos(id, titre, url, vimeo_id, ordre, duree_secondes),
          chapitre_ressources(id, titre, type, url, ordre)`
        )
        .eq("id", chapitreId!)
        .maybeSingle();

      if (error) throw error;
      if (!chapitre) return null;

      const videos: ChapitreVideo[] = [...(chapitre.chapitre_videos ?? [])].sort(
        (a: any, b: any) => a.ordre - b.ordre
      );
      const ressources: ChapitreRessource[] = [
        ...(chapitre.chapitre_ressources ?? []),
      ].sort((a: any, b: any) => a.ordre - b.ordre);

      return {
        chapitre,
        videos,
        ressources,
        module: chapitre.formation_modules,
        formation: (chapitre.formation_modules as any).formations,
      };
    },
  });

  // ── Load navigation prev/next via RPC ───────────────────────
  const { data: navData } = useQuery({
    queryKey: ["training", "chapter-nav", chapitreId],
    enabled: !!chapitreId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_chapter_navigation", {
        p_chapitre_id: chapitreId!,
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  // ── Load chapitre_progress ──────────────────────────────────
  const { data: isCompleted, refetch: refetchCompletion } = useQuery({
    queryKey: ["training", "chapter-completion", chapitreId, userId],
    enabled: !!chapitreId && !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("chapitre_progress")
        .select("id")
        .eq("user_id", userId!)
        .eq("chapitre_id", chapitreId!)
        .maybeSingle();
      return !!data;
    },
  });

  // ── Video IDs for progress tracking ─────────────────────────
  const videoIds = useMemo(
    () => chapterData?.videos.map((v) => v.id) ?? [],
    [chapterData]
  );

  const { data: videoProgressMap } = useQuery({
    queryKey: ["training", "video-progress", userId, videoIds.join(",")],
    enabled: !!userId && videoIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("video_progress")
        .select("video_id, watched_seconds, completed")
        .eq("user_id", userId!)
        .in("video_id", videoIds);
      const map = new Map<string, { watched_seconds: number; completed: boolean }>();
      (data ?? []).forEach((p: any) =>
        map.set(p.video_id, { watched_seconds: p.watched_seconds, completed: p.completed })
      );
      return map;
    },
  });

  // ── Mutation : toggle chapitre completion ───────────────────
  const toggleCompletionMutation = useMutation({
    mutationFn: async (completed: boolean) => {
      const { error } = await (supabase as any).rpc("set_chapter_completion", {
        p_chapitre_id: chapitreId!,
        p_completed: completed,
      });
      if (error) throw error;
      return completed;
    },
    onSuccess: (completed) => {
      toast(completed ? "Chapitre terminé !" : "Marqué comme non terminé");
      refetchCompletion();
      queryClient.invalidateQueries({ queryKey: ["training"] });
    },
    onError: () => {
      toast.error("Impossible de mettre à jour la progression.");
    },
  });

  // ── Callback : une vidéo atteint 95% ────────────────────────
  const handleVideoNearEnd = async (videoId: string, watchedSeconds: number) => {
    await (supabase as any).from("video_progress").upsert(
      {
        user_id: userId!,
        video_id: videoId,
        watched_seconds: Math.round(watchedSeconds),
        completed: true,
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: "user_id,video_id" }
    );

    // Check if all videos are now completed
    const { data: allProgress } = await supabase
      .from("video_progress")
      .select("video_id, completed")
      .eq("user_id", userId!)
      .in("video_id", videoIds);

    const allCompleted =
      videoIds.length > 0 &&
      videoIds.every((vid) =>
        (allProgress ?? []).some((p: any) => p.video_id === vid && p.completed)
      );

    if (allCompleted && !isCompleted) {
      toggleCompletionMutation.mutate(true);
    } else {
      queryClient.invalidateQueries({ queryKey: ["training", "video-progress"] });
    }
  };

  // ── Loading state ───────────────────────────────────────────
  if (loadingChapter) {
    return (
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="hidden lg:block w-72 border-r border-border p-4 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-10 w-48" />
        </div>
      </div>
    );
  }

  // ── Not found ───────────────────────────────────────────────
  if (!chapterData || !chapterData.chapitre) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <PlayCircle className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold text-foreground">
          Chapitre introuvable
        </h2>
        <p className="text-sm text-muted-foreground">
          Ce chapitre n'existe pas ou tu n'y as pas accès.
        </p>
        <Button variant="outline" onClick={() => navigate(`/training/${slug}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la formation
        </Button>
      </div>
    );
  }

  const { chapitre, videos, ressources, formation, module: chapModule } = chapterData;
  const hasPlayableVideo = videos.some((v) => v.vimeo_id || v.url);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Mobile: toggle sidebar button */}
      <div className="lg:hidden fixed top-16 left-4 z-30">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpenMobile(!sidebarOpenMobile)}
          className="gap-2 bg-background shadow-md"
        >
          {sidebarOpenMobile ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          Plan
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpenMobile ? "fixed inset-0 z-20 bg-background" : "hidden"
        } lg:relative lg:block w-full lg:w-72 shrink-0 border-r border-border overflow-y-auto pt-12 lg:pt-0`}
      >
        <ChapterSidebar
          formationSlug={formation.slug}
          formationId={formation.id}
          currentChapitreId={chapitre.id}
          isCeo={!!isCeo}
          onNavigate={() => setSidebarOpenMobile(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            <Link to="/training" className="hover:text-foreground transition-colors">
              Formations
            </Link>
            <span>/</span>
            <Link
              to={`/training/${formation.slug}`}
              className="hover:text-foreground transition-colors"
            >
              {formation.titre}
            </Link>
            <span>/</span>
            <span className="text-foreground">{chapModule.titre}</span>
          </nav>

          {/* Title */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {chapitre.titre}
              </h1>
              {chapitre.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {chapitre.description}
                </p>
              )}
            </div>
            {chapitre.status === "draft" && isCeo && (
              <Badge variant="secondary" className="gap-1 shrink-0">
                <EyeOff className="h-3 w-3" />
                Brouillon
              </Badge>
            )}
          </div>

          {/* Video player or placeholder */}
          {hasPlayableVideo ? (
            <div className="space-y-4">
              {videos.length === 1 ? (
                <VimeoPlayer
                  video={videos[0]}
                  onNearEnd={() =>
                    handleVideoNearEnd(
                      videos[0].id,
                      (videos[0].duree_secondes ?? 0) * 0.95
                    )
                  }
                  initialWatchedSeconds={
                    videoProgressMap?.get(videos[0].id)?.watched_seconds ?? 0
                  }
                />
              ) : (
                <MultiVideoPlayer
                  videos={videos}
                  videoProgressMap={videoProgressMap}
                  onNearEnd={handleVideoNearEnd}
                />
              )}
            </div>
          ) : (
            <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-3">
              <PlayCircle className="h-16 w-16 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">
                Vidéo à venir
              </p>
              <p className="text-xs text-muted-foreground/70 max-w-sm text-center">
                Cette leçon sera bientôt disponible. Tu peux la marquer
                manuellement comme terminée en attendant.
              </p>
            </div>
          )}

          {/* Actions: prev / completion / next */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={!navData?.prev_chapitre_id}
              onClick={() =>
                navData?.prev_chapitre_id &&
                navigate(
                  `/training/${formation.slug}/chapitre/${navData.prev_chapitre_id}`
                )
              }
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Précédent
            </Button>

            <Button
              variant={isCompleted ? "default" : "outline"}
              size="sm"
              onClick={() => toggleCompletionMutation.mutate(!isCompleted)}
              disabled={toggleCompletionMutation.isPending}
              className="gap-2"
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Terminé
                </>
              ) : (
                <>
                  <Circle className="h-4 w-4" />
                  Marquer comme terminé
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!navData?.next_chapitre_id}
              onClick={() =>
                navData?.next_chapitre_id &&
                navigate(
                  `/training/${formation.slug}/chapitre/${navData.next_chapitre_id}`
                )
              }
              className="gap-2"
            >
              Suivant
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Ressources */}
          {ressources.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Ressources ({ressources.length})
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ressources.map((r) => {
                    const Icon =
                      r.type === "pdf"
                        ? FileText
                        : r.type === "image"
                        ? ImageIcon
                        : LinkIcon;
                    return (
                      <a
                        key={r.id}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
                      >
                        <Icon className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm text-foreground flex-1 line-clamp-1">
                          {r.titre}
                        </span>
                        <span className="text-xs text-muted-foreground uppercase">
                          {r.type}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Multi-video player ────────────────────────────────────────
function MultiVideoPlayer({
  videos,
  videoProgressMap,
  onNearEnd,
}: {
  videos: ChapitreVideo[];
  videoProgressMap?: Map<string, { watched_seconds: number; completed: boolean }>;
  onNearEnd: (videoId: string, watchedSeconds: number) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = videos[activeIdx];

  return (
    <div className="space-y-3">
      <VimeoPlayer
        key={active.id}
        video={active}
        onNearEnd={() =>
          onNearEnd(active.id, (active.duree_secondes ?? 0) * 0.95)
        }
        initialWatchedSeconds={
          videoProgressMap?.get(active.id)?.watched_seconds ?? 0
        }
      />
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          Vidéos du chapitre ({videos.length})
        </p>
        {videos.map((v, i) => {
          const done = videoProgressMap?.get(v.id)?.completed;
          const isActive = i === activeIdx;
          return (
            <button
              key={v.id}
              onClick={() => setActiveIdx(i)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left text-sm transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-secondary text-foreground"
              }`}
            >
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="flex-1">{v.titre}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
