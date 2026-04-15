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
import { VideoPlayer } from "@/components/training/VideoPlayer";
import { ChapterCompletionModal } from "@/components/training/ChapterCompletionModal";
import { FormationCompletionModal } from "@/components/training/FormationCompletionModal";
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
import { isFormationCompleteForUser } from "@/lib/certificateEligibility";
import { autoCompleteParcoursFormationChapter } from "@/lib/parcoursAutoComplete";

interface ChapitreVideo {
  id: string;
  titre: string;
  url: string | null;
  vimeo_id: string | null;
  ordre: number;
  duree_secondes: number | null;
  notes: string | null;
}

interface ChapitreRessource {
  id: string;
  titre: string;
  type: string;
  url: string;
  ordre: number;
  video_id: string | null;
}

export default function ChapterViewer() {
  const { slug, chapitreId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const userId = profile?.id;
  const isCeo = profile?.role === "ceo";
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [formationCompletionOpen, setFormationCompletionOpen] = useState(false);

  // ── Load chapitre + videos + ressources ─────────────────────
  const { data: chapterData, isLoading: loadingChapter } = useQuery({
    queryKey: ["training", "chapter", chapitreId, userId],
    enabled: !!chapitreId && !!userId,
    queryFn: async () => {
      const { data: chapitre, error } = await (supabase as any)
        .from("formation_chapitres")
        .select(
          `id, titre, description, ordre, status, duree_estimee_minutes, notes_formateur,
          formation_modules!inner(id, titre, formation_id,
            formations!inner(id, slug, titre)
          ),
          chapitre_videos(id, titre, url, vimeo_id, ordre, duree_secondes, notes),
          chapitre_ressources(id, titre, type, url, ordre, video_id)`
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

  // ── Mutation : set chapitre completion (used internally) ─────
  const setChapterCompletion = useMutation({
    mutationFn: async (completed: boolean) => {
      const { error } = await (supabase as any).rpc("set_chapter_completion", {
        p_chapitre_id: chapitreId!,
        p_completed: completed,
      });
      if (error) throw error;
      return completed;
    },
    onSuccess: async (completed) => {
      if (completed) {
        await handleChapterCompleted();
      }
      refetchCompletion();
      queryClient.invalidateQueries({ queryKey: ["training"] });
    },
    onError: () => {
      toast.error("Impossible de mettre à jour la progression.");
    },
  });

  // ── Toggle manual pour chapitres SANS vidéos ───────────────
  const toggleChapterManual = useMutation({
    mutationFn: async (completed: boolean) => {
      const { error } = await (supabase as any).rpc("set_chapter_completion", {
        p_chapitre_id: chapitreId!,
        p_completed: completed,
      });
      if (error) throw error;
      return completed;
    },
    onSuccess: async (completed) => {
      if (completed) {
        await handleChapterCompleted();
      } else {
        toast("Marqué comme non terminé");
      }
      refetchCompletion();
      queryClient.invalidateQueries({ queryKey: ["training"] });
    },
    onError: () => {
      toast.error("Impossible de mettre à jour la progression.");
    },
  });

  // ── Handler : après complétion d'un chapitre, choisir le bon modal ──
  const handleChapterCompleted = async () => {
    const formationId = chapterData?.formation?.id;
    if (!formationId || !userId || isCeo) {
      setCompletionModalOpen(true);
      return;
    }
    try {
      const eligible = await isFormationCompleteForUser(userId, formationId);
      if (eligible) {
        // Formation 100% — débloquer le chapitre parcours puis modal célébration
        try {
          const res = await autoCompleteParcoursFormationChapter(userId, formationId);
          if (res.completed > 0) {
            queryClient.invalidateQueries({ queryKey: ["parcours-progress"] });
          }
        } catch {
          // silencieux
        }
        setFormationCompletionOpen(true);
      } else {
        setCompletionModalOpen(true);
      }
    } catch {
      setCompletionModalOpen(true);
    }
  };

  // ── Recalcul état chapitre basé sur les vidéos ─────────────
  const recheckChapterFromVideos = async () => {
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
      setChapterCompletion.mutate(true);
    } else if (!allCompleted && isCompleted) {
      // Une vidéo a été décochée → chapitre repasse en non terminé
      await (supabase as any).rpc("set_chapter_completion", {
        p_chapitre_id: chapitreId!,
        p_completed: false,
      });
      refetchCompletion();
      queryClient.invalidateQueries({ queryKey: ["training"] });
    }
  };

  // ── Callback : une vidéo atteint 95% (auto) ────────────────
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

    toast.success("Vidéo terminée ✓");
    queryClient.invalidateQueries({ queryKey: ["training", "video-progress"] });
    await recheckChapterFromVideos();
  };

  // ── Toggle manuel d'une vidéo (vue / non vue) ──────────────
  const handleToggleVideo = async (videoId: string, markCompleted: boolean) => {
    await (supabase as any).from("video_progress").upsert(
      {
        user_id: userId!,
        video_id: videoId,
        watched_seconds: 0,
        completed: markCompleted,
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: "user_id,video_id" }
    );

    toast.success(markCompleted ? "Vidéo marquée comme vue" : "Vidéo marquée comme non vue");
    queryClient.invalidateQueries({ queryKey: ["training", "video-progress"] });
    await recheckChapterFromVideos();
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
  const hasVideos = videos.length > 0;
  const videosCompleted = videoProgressMap
    ? videos.filter((v) => videoProgressMap.get(v.id)?.completed).length
    : 0;
  const chapterRessources = ressources.filter((r) => !r.video_id);
  const getVideoRessources = (videoId: string) =>
    ressources.filter((r) => r.video_id === videoId);

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
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {chapitre.titre}
              </h1>
              {chapitre.description && (
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                  {chapitre.description}
                </p>
              )}
              {hasVideos && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    Ce chapitre contient{" "}
                    <span className="font-medium text-foreground">
                      {videos.length} vidéo{videos.length > 1 ? "s" : ""}
                    </span>{" "}
                    ·{" "}
                    <span className={videosCompleted === videos.length ? "font-medium text-primary" : "font-medium text-foreground"}>
                      {videosCompleted}/{videos.length} vue{videos.length > 1 ? "s" : ""}
                    </span>
                  </p>
                  <div className="h-1.5 w-full max-w-xs rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{
                        width: `${videos.length > 0 ? (videosCompleted / videos.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
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
                <>
                  <VideoPlayer
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
                  <div className="flex items-center justify-between gap-3 flex-wrap rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span>💡</span>
                      <span>La vidéo se marque automatiquement comme vue à la fin.</span>
                    </p>
                    <button
                      onClick={() => handleToggleVideo(videos[0].id, !videoProgressMap?.get(videos[0].id)?.completed)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                        videoProgressMap?.get(videos[0].id)?.completed
                          ? "bg-primary/10 text-primary hover:bg-primary/15"
                          : "bg-background border border-border text-foreground hover:bg-secondary"
                      }`}
                    >
                      {videoProgressMap?.get(videos[0].id)?.completed ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Vidéo vue
                        </>
                      ) : (
                        <>
                          <Circle className="h-3.5 w-3.5" />
                          Marquer comme vue
                        </>
                      )}
                    </button>
                  </div>
                  <VideoExtras
                    notes={videos[0].notes}
                    ressources={getVideoRessources(videos[0].id)}
                  />
                </>
              ) : (
                <MultiVideoPlayer
                  videos={videos}
                  videoProgressMap={videoProgressMap}
                  onNearEnd={handleVideoNearEnd}
                  onToggleVideo={handleToggleVideo}
                  getVideoRessources={getVideoRessources}
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

            {hasVideos ? (
              <div />
            ) : (
              <Button
                variant={isCompleted ? "default" : "outline"}
                size="sm"
                onClick={() => toggleChapterManual.mutate(!isCompleted)}
                disabled={toggleChapterManual.isPending}
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
            )}

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

          {/* Notes formateur (synthèse chapitre) */}
          {chapitre.notes_formateur && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  À retenir
                </h3>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-foreground whitespace-pre-line">
                    {chapitre.notes_formateur}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Ressources du chapitre (non liées à une vidéo) */}
          {chapterRessources.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Ressources ({chapterRessources.length})
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {chapterRessources.map((r) => (
                    <RessourceLink key={r.id} ressource={r} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de félicitations */}
      <ChapterCompletionModal
        open={completionModalOpen}
        onOpenChange={setCompletionModalOpen}
        chapterTitle={chapitre.titre}
        hasNextChapter={!!navData?.next_chapitre_id}
        onGoToNext={() => {
          setCompletionModalOpen(false);
          if (navData?.next_chapitre_id) {
            navigate(`/training/${formation.slug}/chapitre/${navData.next_chapitre_id}`);
          }
        }}
        onGoToFormation={() => {
          setCompletionModalOpen(false);
          navigate(`/training/${formation.slug}`);
        }}
      />

      {/* Modal de fin de formation (100%) — prend le relais quand c'est le dernier chapitre */}
      {userId && formation?.id && (
        <FormationCompletionModal
          open={formationCompletionOpen}
          onOpenChange={(v) => {
            setFormationCompletionOpen(v);
            if (!v) {
              // Quand on ferme, rediriger vers la page formation pour un bon retour à l'espace
              navigate(`/training/${formation.slug}`);
            }
          }}
          userId={userId}
          formationId={formation.id}
          formationTitle={formation.titre ?? ""}
          firstName={(profile?.full_name ?? "").split(" ")[0] ?? ""}
        />
      )}
    </div>
  );
}

// ─── Multi-video player ────────────────────────────────────────
function MultiVideoPlayer({
  videos,
  videoProgressMap,
  onNearEnd,
  onToggleVideo,
  getVideoRessources,
}: {
  videos: ChapitreVideo[];
  videoProgressMap?: Map<string, { watched_seconds: number; completed: boolean }>;
  onNearEnd: (videoId: string, watchedSeconds: number) => void;
  onToggleVideo: (videoId: string, completed: boolean) => void;
  getVideoRessources: (videoId: string) => ChapitreRessource[];
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = videos[activeIdx];
  const activeDone = !!videoProgressMap?.get(active.id)?.completed;
  const activeNum = String(activeIdx + 1).padStart(2, "0");
  const total = videos.length;
  const hasNext = activeIdx < videos.length - 1;

  function switchTo(i: number) {
    if (i === activeIdx) return;
    setActiveIdx(i);
    const num = String(i + 1).padStart(2, "0");
    toast(`▶ Vidéo ${num} · ${videos[i].titre}`);
  }

  return (
    <div className="space-y-4">
      {/* Header vidéo active */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono font-semibold text-primary">{activeNum}</span>
        <span>/</span>
        <span className="font-mono">{String(total).padStart(2, "0")}</span>
        <span className="mx-1">·</span>
        <span className="font-medium text-foreground line-clamp-1">{active.titre}</span>
      </div>

      <VideoPlayer
        key={active.id}
        video={active}
        onNearEnd={() =>
          onNearEnd(active.id, (active.duree_secondes ?? 0) * 0.95)
        }
        initialWatchedSeconds={
          videoProgressMap?.get(active.id)?.watched_seconds ?? 0
        }
      />

      {/* Barre d'actions sous le player */}
      <div className="flex items-center justify-between gap-3 flex-wrap rounded-lg border border-border bg-muted/30 px-3 py-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span>💡</span>
          <span>La vidéo se marque automatiquement comme vue à la fin.</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleVideo(active.id, !activeDone)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              activeDone
                ? "bg-primary/10 text-primary hover:bg-primary/15"
                : "bg-background border border-border text-foreground hover:bg-secondary"
            }`}
          >
            {activeDone ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Vidéo vue
              </>
            ) : (
              <>
                <Circle className="h-3.5 w-3.5" />
                Marquer comme vue
              </>
            )}
          </button>
          {activeDone && hasNext && (
            <Button
              size="sm"
              onClick={() => switchTo(activeIdx + 1)}
              className="gap-1.5 h-8"
            >
              Vidéo suivante
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <VideoExtras
        notes={active.notes}
        ressources={getVideoRessources(active.id)}
      />

      {/* Playlist du chapitre */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Vidéos du chapitre
          </p>
          <p className="text-xs text-muted-foreground">
            Clique sur une vidéo pour la lire
          </p>
        </div>
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
          {videos.map((v, i) => {
            const done = !!videoProgressMap?.get(v.id)?.completed;
            const isActive = i === activeIdx;
            const num = String(i + 1).padStart(2, "0");
            return (
              <div
                key={v.id}
                className={`group flex items-stretch transition-colors ${
                  isActive
                    ? "bg-primary/5"
                    : "bg-card hover:bg-secondary/50"
                }`}
              >
                {/* Zone principale : cliquer pour lire */}
                <button
                  onClick={() => switchTo(i)}
                  className="flex-1 flex items-center gap-3 p-3 text-left min-w-0"
                  title="Lire cette vidéo"
                >
                  <span
                    className={`font-mono text-xs shrink-0 w-6 ${
                      isActive ? "text-primary font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {num}
                  </span>
                  <span className="flex items-center justify-center h-7 w-7 rounded-full shrink-0 bg-background border border-border group-hover:border-primary/40 transition-colors">
                    {isActive ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    ) : (
                      <PlayCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </span>
                  <span
                    className={`text-sm truncate ${
                      isActive ? "text-primary font-medium" : "text-foreground"
                    }`}
                  >
                    {v.titre}
                  </span>
                  {isActive && (
                    <Badge variant="outline" className="border-primary/40 text-primary text-[10px] h-5 shrink-0">
                      En lecture
                    </Badge>
                  )}
                </button>

                {/* Zone toggle statut — séparée visuellement */}
                <div className="border-l border-border flex items-stretch">
                  <button
                    onClick={() => onToggleVideo(v.id, !done)}
                    className={`px-3 flex items-center gap-1.5 text-xs transition-colors ${
                      done
                        ? "text-primary hover:bg-primary/10"
                        : "text-muted-foreground hover:bg-secondary"
                    }`}
                    title={done ? "Marquer comme non vue" : "Marquer comme vue"}
                  >
                    {done ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Vue</span>
                      </>
                    ) : (
                      <>
                        <Circle className="h-4 w-4" />
                        <span className="hidden sm:inline">À voir</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Video toggle (vue / non vue) ─────────────────────────────
function VideoToggle({
  completed,
  onToggle,
}: {
  completed: boolean;
  onToggle: (val: boolean) => void;
}) {
  return (
    <button
      onClick={() => onToggle(!completed)}
      className={`flex items-center gap-2 text-sm transition-colors ${
        completed
          ? "text-primary hover:text-primary/80"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {completed ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <Circle className="h-4 w-4" />
      )}
      {completed ? "Vidéo vue" : "Marquer comme vue"}
    </button>
  );
}

// ─── Video extras (notes + ressources) ────────────────────────
function VideoExtras({
  notes,
  ressources,
}: {
  notes: string | null;
  ressources: ChapitreRessource[];
}) {
  if (!notes && ressources.length === 0) return null;
  return (
    <div className="space-y-3">
      {notes && (
        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <p className="text-sm text-foreground whitespace-pre-line">{notes}</p>
        </div>
      )}
      {ressources.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {ressources.map((r) => (
            <RessourceLink key={r.id} ressource={r} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Ressource link ───────────────────────────────────────────
function RessourceLink({ ressource: r }: { ressource: ChapitreRessource }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const Icon =
    r.type === "pdf" ? FileText : r.type === "image" ? ImageIcon : LinkIcon;

  // PDF and images get an inline preview toggle
  const isInlinePreview = r.type === "pdf" || r.type === "image";

  if (!isInlinePreview) {
    return (
      <a
        href={r.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
      >
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm text-foreground flex-1 line-clamp-1">
          {r.titre}
        </span>
        <span className="text-xs text-muted-foreground uppercase">{r.type}</span>
      </a>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setPreviewOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3 hover:bg-secondary transition-colors text-left"
      >
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm text-foreground flex-1 line-clamp-1">{r.titre}</span>
        <span className="text-xs text-muted-foreground uppercase">{r.type}</span>
        <span className="text-xs text-primary">{previewOpen ? "Fermer" : "Aperçu"}</span>
      </button>
      {previewOpen && (
        <div className="border-t border-border bg-muted/30">
          {r.type === "pdf" ? (
            <iframe
              src={r.url}
              className="w-full h-[600px]"
              title={r.titre}
            />
          ) : (
            <img
              src={r.url}
              alt={r.titre}
              className="w-full max-h-[600px] object-contain bg-black/5"
            />
          )}
          <div className="p-2 text-right">
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Ouvrir dans un nouvel onglet ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
