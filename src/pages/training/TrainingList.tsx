import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FormationCard } from "@/components/training/FormationCard";
import { LockedFormationCard } from "@/components/training/LockedFormationCard";
import { ParcoursBanner } from "@/components/training/ParcoursBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { GraduationCap, Lock, Award, ArrowRight } from "lucide-react";
import { useMyCertificates } from "@/hooks/useCertificates";
import { useFormationEnrollments } from "@/hooks/useFormationEnrollments";
import { useParcours } from "@/hooks/useParcours";
import { useUserPass } from "@/hooks/useUserPass";

export default function TrainingList() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const userId = profile?.id;
  const isCeo = profile?.role === "ceo";

  const { hasAnyPass, passLevel } = useUserPass();
  // CEO : AL BARAKA par défaut pour voir la structure ; sinon selon pass
  const parcoursSlug = hasAnyPass
    ? (passLevel === "liberty" ? "liberty" : "al-baraka")
    : isCeo
      ? "al-baraka"
      : null;
  const { parcours } = useParcours(parcoursSlug);
  const enrollments = useFormationEnrollments();

  const { data: certificates } = useMyCertificates();
  const certifiedFormationIds = new Set((certificates ?? []).map((c) => c.formation_id));

  const [lockedModal, setLockedModal] = useState<{ titre: string; phaseLabel?: string } | null>(null);

  // Construit un map formation_id → { phase_numero, phase_titre } depuis le parcours
  const formationUnlockMap = useMemo(() => {
    const m = new Map<string, { phaseNum: number; phaseTitre: string }>();
    if (!parcours) return m;
    for (const phase of parcours.phases) {
      for (const ch of phase.chapitres) {
        if (ch.type === "redirect_formation" && ch.formation_id) {
          m.set(ch.formation_id, { phaseNum: phase.numero, phaseTitre: phase.titre });
        }
      }
    }
    return m;
  }, [parcours]);

  const { data: formations, isLoading } = useQuery({
    queryKey: ["training", "formations", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formations")
        .select("id, slug, titre, description, couleur, cover_url, status, ordre")
        .order("ordre", { ascending: true });
      if (error) throw error;
      if (!data) return [];
      return Promise.all(
        data.map(async (f) => {
          const [{ data: progress }, { data: chapters }] = await Promise.all([
            supabase.rpc("get_formation_progress", {
              p_user_id: userId!,
              p_formation_id: f.id,
            }),
            supabase
              .from("formation_chapitres")
              .select("id, status, formation_modules!inner(formation_id, status)")
              .eq("formation_modules.formation_id", f.id),
          ]);
          const published = (chapters ?? []).filter(
            (c: any) =>
              c.status === "published" && c.formation_modules?.status === "published"
          );
          const total = published.length;
          const { count: done } = await supabase
            .from("chapitre_progress")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId!)
            .in("chapitre_id", published.map((c: any) => c.id));
          return {
            ...f,
            progress: Number(progress ?? 0),
            nbChapitresDone: done ?? 0,
            nbChapitresTotal: total,
          };
        })
      );
    },
  });

  // Tri : d'abord les formations du parcours dans l'ordre du parcours,
  // puis les autres (bonus : ESTIMACTION, COPYWRITING, etc.) par ordre naturel.
  const sortedFormations = useMemo(() => {
    if (!formations) return [];
    if (formationUnlockMap.size === 0) return formations;
    const parcoursOrder: string[] = [];
    if (parcours) {
      for (const phase of parcours.phases) {
        for (const ch of phase.chapitres) {
          if (ch.type === "redirect_formation" && ch.formation_id) {
            parcoursOrder.push(ch.formation_id);
          }
        }
      }
    }
    const orderIndex = new Map(parcoursOrder.map((id, i) => [id, i]));
    return [...formations].sort((a, b) => {
      const ai = orderIndex.has(a.id) ? orderIndex.get(a.id)! : 999;
      const bi = orderIndex.has(b.id) ? orderIndex.get(b.id)! : 999;
      if (ai !== bi) return ai - bi;
      return (a.ordre ?? 0) - (b.ordre ?? 0);
    });
  }, [formations, formationUnlockMap, parcours]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Formation</h2>
            <p className="text-sm text-muted-foreground">
              Ton parcours et tes formations
            </p>
          </div>
        </div>
        {(certificates?.length ?? 0) > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
            onClick={() => navigate("/training/certificats")}
          >
            <Award className="h-4 w-4" />
            Mes certificats ({certificates!.length})
          </Button>
        )}
      </div>

      {/* Bandeau Pass */}
      <ParcoursBanner />

      {/* Catalogue formations */}
      <div>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
          Mes formations
        </h3>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border bg-card overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && sortedFormations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Aucune formation disponible
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Contacte l'équipe pour obtenir un accès.
            </p>
          </div>
        )}

        {!isLoading && sortedFormations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedFormations.map((f) => {
              const isEnrolled = isCeo || enrollments.has(f.id);
              const unlockInfo = formationUnlockMap.get(f.id);
              if (!isEnrolled) {
                const phaseLabel = unlockInfo
                  ? `Phase ${unlockInfo.phaseNum} · ${unlockInfo.phaseTitre}`
                  : undefined;
                return (
                  <LockedFormationCard
                    key={f.id}
                    titre={f.titre}
                    cover_url={f.cover_url}
                    unlockPhaseLabel={phaseLabel}
                    onClickLocked={() =>
                      setLockedModal({ titre: f.titre, phaseLabel })
                    }
                  />
                );
              }
              return (
                <FormationCard
                  key={f.id}
                  formation={f}
                  progress={f.progress}
                  nbChapitresDone={f.nbChapitresDone}
                  nbChapitresTotal={f.nbChapitresTotal}
                  isCeoView={isCeo}
                  hasCertificate={certifiedFormationIds.has(f.id)}
                  onOpen={() => navigate(`/training/${f.slug}`)}
                />
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!lockedModal} onOpenChange={(v) => !v && setLockedModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Formation verrouillée
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <span className="block">
                <span className="font-medium text-foreground">{lockedModal?.titre}</span> se
                débloque depuis ton parcours{lockedModal?.phaseLabel ? ` (${lockedModal.phaseLabel})` : ""}.
              </span>
              <span className="block">
                Continue ton parcours pour y accéder au bon moment.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setLockedModal(null)}>Fermer</Button>
            <Button
              className="gap-2"
              onClick={() => {
                setLockedModal(null);
                navigate(parcoursSlug ? `/parcours/${parcoursSlug}` : "/training");
              }}
            >
              Ouvrir mon parcours
              <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
