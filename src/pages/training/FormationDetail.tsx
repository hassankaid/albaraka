import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  GraduationCap,
  CheckCircle2,
  Circle,
  PlayCircle,
  EyeOff,
  Lock,
} from "lucide-react";

interface Chapitre {
  id: string;
  titre: string;
  ordre: number;
  status: string;
  duree_estimee_minutes: number | null;
}

interface Module {
  id: string;
  titre: string;
  description: string | null;
  ordre: number;
  status: string;
  chapitres: Chapitre[];
}

export default function FormationDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const userId = profile?.id;
  const isCeo = profile?.role === "ceo";

  const { data, isLoading } = useQuery({
    queryKey: ["training", "formation-detail", slug, userId],
    enabled: !!slug && !!userId,
    queryFn: async () => {
      const { data: formation, error: fErr } = await supabase
        .from("formations")
        .select("id, slug, titre, description, couleur, cover_url, status")
        .eq("slug", slug!)
        .maybeSingle();
      if (fErr) throw fErr;
      if (!formation) return null;

      const { data: modules, error: mErr } = await supabase
        .from("formation_modules")
        .select(
          "id, titre, description, ordre, status, formation_chapitres(id, titre, ordre, status, duree_estimee_minutes)"
        )
        .eq("formation_id", formation.id)
        .order("ordre", { ascending: true });
      if (mErr) throw mErr;

      const sortedModules: Module[] = (modules ?? []).map((m: any) => ({
        ...m,
        chapitres: [...(m.formation_chapitres ?? [])].sort(
          (a: Chapitre, b: Chapitre) => a.ordre - b.ordre
        ),
      }));

      const allChapitreIds = sortedModules.flatMap((m) =>
        m.chapitres.map((c) => c.id)
      );
      const { data: progress } = await supabase
        .from("chapitre_progress")
        .select("chapitre_id, completed_at")
        .eq("user_id", userId!)
        .in(
          "chapitre_id",
          allChapitreIds.length > 0
            ? allChapitreIds
            : ["00000000-0000-0000-0000-000000000000"]
        );

      const completedSet = new Set(
        (progress ?? []).map((p: any) => p.chapitre_id)
      );

      const publishedChapitres = sortedModules.flatMap((m) =>
        m.status === "published" || isCeo
          ? m.chapitres.filter((c) => c.status === "published" || isCeo)
          : []
      );
      const totalPublished = publishedChapitres.filter(
        (c) => c.status === "published"
      ).length;
      const totalDone = publishedChapitres.filter(
        (c) => c.status === "published" && completedSet.has(c.id)
      ).length;
      const progressPct =
        totalPublished === 0
          ? 0
          : Math.round((totalDone / totalPublished) * 100);

      return {
        formation,
        modules: sortedModules,
        completedSet,
        totalPublished,
        totalDone,
        progressPct,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!data || !data.formation) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Formation introuvable
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Cette formation n'existe pas ou tu n'y as pas accès.
        </p>
        <Button variant="outline" onClick={() => navigate("/training")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux formations
        </Button>
      </div>
    );
  }

  const {
    formation,
    modules,
    completedSet,
    totalDone,
    totalPublished,
    progressPct,
  } = data;
  const isDraft = formation.status === "draft";
  const firstIncompleteModule = modules.find((m) => {
    const visibleChapitres = m.chapitres.filter(c => c.status === "published" || isCeo);
    return visibleChapitres.some(c => !completedSet.has(c.id));
  });
  const defaultOpen = firstIncompleteModule
    ? [firstIncompleteModule.id]
    : modules.length > 0
    ? [modules[modules.length - 1].id]
    : [];

  return (
    <div className="space-y-6">
      {/* Bouton retour */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/training")}
        className="gap-2 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux formations
      </Button>

      {/* Header formation */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10 shrink-0">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">
                {formation.titre}
              </h2>
              {isDraft && isCeo && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <EyeOff className="h-3 w-3" />
                  Brouillon
                </Badge>
              )}
            </div>
            {formation.description && (
              <p className="text-sm text-muted-foreground">
                {formation.description}
              </p>
            )}
            <div className="space-y-1">
              <Progress value={progressPct} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {totalDone}/{totalPublished} chapitres terminés
                </span>
                <span>{progressPct}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste modules + chapitres */}
      {modules.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-muted-foreground">
            Cette formation ne contient aucun module pour le moment.
          </p>
        </div>
      ) : (
          <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-4">
            {modules.map((module, idx) => {
              const modDraft = module.status === "draft";
              const modChapitresVisible = module.chapitres.filter(
                (c) => c.status === "published" || isCeo
              );
              const modChapitresDone = modChapitresVisible.filter((c) =>
                completedSet.has(c.id)
              ).length;
              const modTotal = modChapitresVisible.filter(
                (c) => c.status === "published"
              ).length;

              return (
                <AccordionItem
                  key={module.id}
                  value={module.id}
                  className="border border-border rounded-lg bg-card px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-left">
                      <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground">
                            {module.titre}
                          </span>
                          {modDraft && isCeo && (
                            <Badge
                              variant="secondary"
                              className="gap-1 text-xs"
                            >
                              <EyeOff className="h-3 w-3" />
                              Brouillon
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {modChapitresDone}/{modTotal} chapitres
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {modChapitresVisible.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2 pl-10">
                        Aucun chapitre dans ce module.
                      </p>
                    ) : (
                      <div className="space-y-1 pb-2">
                        {modChapitresVisible.map((chap) => {
                          const done = completedSet.has(chap.id);
                          const chapDraft = chap.status === "draft";
                          return (
                            <div key={chap.id}>
                              <button
                                onClick={() =>
                                  navigate(
                                    `/training/${formation.slug}/chapitre/${chap.id}`
                                  )
                                }
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm hover:bg-secondary transition-colors group"
                              >
                                {done ? (
                                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                                <span className="flex-1 text-foreground">
                                  {chap.titre}
                                </span>
                                {chapDraft && isCeo && (
                                  <Badge
                                    variant="secondary"
                                    className="gap-1 text-xs"
                                  >
                                    <EyeOff className="h-3 w-3" />
                                    Brouillon
                                  </Badge>
                                )}
                                {chap.duree_estimee_minutes && (
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {chap.duree_estimee_minutes} min
                                  </span>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}
    </div>
  );
}
