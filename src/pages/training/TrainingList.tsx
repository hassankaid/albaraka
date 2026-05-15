import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FormationCard } from "@/components/training/FormationCard";
import { LockedFormationCard, type LockReason } from "@/components/training/LockedFormationCard";
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
import { useAppSetting } from "@/hooks/useAppSettings";
import { Rocket } from "lucide-react";

export default function TrainingList() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const userId = profile?.id;
  const isCeo = profile?.role === "ceo";

  const { hasAnyPass, hasLiberty, passLevel } = useUserPass();
  const { data: comingSoonEnabled } = useAppSetting<boolean>("training_coming_soon_enabled");
  const showComingSoon = !!profile?.early_access && !isCeo && comingSoonEnabled === true;
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

  const [lockedModal, setLockedModal] = useState<{
    titre: string;
    reason: LockReason;
    phaseLabel?: string;
  } | null>(null);

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
        .select("id, slug, titre, description, couleur, cover_url, status, ordre, access_mode")
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

  // L'ordre du catalogue user est celui défini par le CEO en admin
  // (colonne formations.ordre, pilotée par drag-and-drop). Le tri est déjà
  // appliqué côté fetch. formationUnlockMap ne sert qu'à identifier les
  // formations du parcours et leur phase de déblocage (cadenas + label).
  const sortedFormations = formations ?? [];

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

      {/* Bandeau "Formations bientôt" pour les early access */}
      {showComingSoon && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 sm:p-10">
          {/* Halo décoratif */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-amber-500/5 blur-3xl" />

          <div className="relative flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-5 sm:gap-6">
            {/* Fusée : grosse et centrée sur mobile, à gauche sur desktop */}
            <div className="p-4 sm:p-3 rounded-2xl bg-gradient-to-br from-amber-500/25 to-amber-500/10 border border-amber-500/20 shrink-0">
              <Rocket className="h-8 w-8 sm:h-6 sm:w-6 text-amber-500" />
            </div>

            <div className="flex-1 min-w-0 space-y-5 sm:space-y-4 w-full">
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-heading font-bold text-foreground leading-tight">
                  Bienvenue ! 🚀
                </h3>
                <p className="text-base text-foreground/80 font-medium">
                  Ton accès est ouvert.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto sm:mx-0">
                  Les formations seront disponibles très bientôt —<br className="sm:hidden" />{" "}
                  <strong className="text-foreground">cette semaine ou la semaine prochaine</strong>.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <p className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">
                  En attendant, explore :
                </p>
                <div className="grid gap-2.5 sm:gap-2 text-left max-w-md mx-auto sm:mx-0 sm:max-w-none">
                  <div className="flex items-center gap-3 rounded-lg border border-amber-500/15 bg-background/40 px-3.5 py-2.5">
                    <span className="text-amber-500 text-lg leading-none">→</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">Espace Working</p>
                      <p className="text-xs text-muted-foreground">Mon organisation, Mon activité, Agent IA</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-amber-500/15 bg-background/40 px-3.5 py-2.5">
                    <span className="text-amber-500 text-lg leading-none">→</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">Espace Coaching</p>
                      <p className="text-xs text-muted-foreground">Coachings hebdomadaires en live</p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground/80 pt-3 border-t border-amber-500/15">
                ✨ Tu seras notifié·e dès que les formations seront en ligne.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bandeau Pass */}
      {!showComingSoon && <ParcoursBanner />}

      {/* Catalogue formations — masqué tant que les early access sont en "coming soon" */}
      {!showComingSoon && (
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
              // Détermine si la formation est accessible et, sinon, pourquoi :
              //   1. CEO → toujours accessible
              //   2. access_mode 'free' → toujours accessible (auto-enroll trigger)
              //   3. access_mode 'liberty_only' + pas de pass Liberty → verrouillée (Liberty only)
              //   4. enrollment manquant → verrouillée (déblocage via le parcours)
              const isLibertyLocked = f.access_mode === "liberty_only" && !hasLiberty;
              const hasAccess = isCeo
                || f.access_mode === "free"
                || (!isLibertyLocked && enrollments.has(f.id));

              if (!hasAccess) {
                const reason: LockReason = isLibertyLocked ? "liberty_only" : "parcours";
                const unlockInfo = formationUnlockMap.get(f.id);
                const phaseLabel = reason === "parcours" && unlockInfo
                  ? `Phase ${unlockInfo.phaseNum} · ${unlockInfo.phaseTitre}`
                  : undefined;
                return (
                  <LockedFormationCard
                    key={f.id}
                    titre={f.titre}
                    cover_url={f.cover_url}
                    lockReason={reason}
                    unlockPhaseLabel={phaseLabel}
                    onClickLocked={() =>
                      setLockedModal({ titre: f.titre, reason, phaseLabel })
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
      )}

      <Dialog open={!!lockedModal} onOpenChange={(v) => !v && setLockedModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Formation verrouillée
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              {lockedModal?.reason === "liberty_only" ? (
                <>
                  <span className="block">
                    <span className="font-medium text-foreground">{lockedModal.titre}</span>{" "}
                    fait partie du <strong className="text-amber-500">parcours Liberty</strong>.
                  </span>
                  <span className="block">
                    Elle est accessible uniquement aux membres détenteurs du
                    <strong> pass Liberty</strong>. Si tu souhaites évoluer vers cette
                    formule, contacte ton référent AL BARAKA.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">
                    <span className="font-medium text-foreground">{lockedModal?.titre}</span> se
                    débloque {lockedModal?.phaseLabel ? <>à la <strong>{lockedModal.phaseLabel}</strong></> : "plus loin"} de ton parcours.
                  </span>
                  <span className="block">
                    Termine les étapes et formations précédentes du parcours
                    pour y accéder.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setLockedModal(null)}>Fermer</Button>
            {lockedModal?.reason === "parcours" && (
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
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
