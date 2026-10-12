// Voix off, sur la vidéo finie : la frise des plans utilisés (cahier, section 3). En
// cliquant sur un plan, l'élève voit 3 plans de remplacement proposés par l'IA et peut
// en choisir un ; il peut en changer plusieurs, puis relance une seule fois (seul le rendu
// est refait : la voix et les sous-titres ne bougent pas).
import { useEffect, useMemo, useState } from "react";
import { Loader2, Repeat, Undo2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { lienStudio } from "@/hooks/useStudio";
import { liensBanque } from "@/hooks/useBanque";
import { minutage } from "@/lib/studio/coupes";
import type { Montage } from "@/lib/studio/reglages";

interface PlanChoisi {
  id: string;
  description: string | null;
  source?: "banque" | "secours" | "eleve";
}

interface Moment {
  debut: number;
  fin: number;
  texte: string;
  plan: PlanChoisi;
  propositions: PlanChoisi[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function Vignette({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  return (
    <div className={`aspect-[9/16] overflow-hidden rounded-lg bg-black ${className ?? ""}`}>
      {src ? <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" /> : null}
    </div>
  );
}

export function PlansVoixOff({
  montage,
  onAppliquer,
  envoi,
}: {
  montage: Pick<Montage, "id" | "user_id" | "version">;
  /** index du moment → plan choisi ; relance le rendu une seule fois */
  onAppliquer: (choix: Record<string, string>) => void;
  envoi: boolean;
}) {
  const [moments, setMoments] = useState<Moment[] | null>(null);
  const [images, setImages] = useState<Record<string, string>>({});
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [choix, setChoix] = useState<Record<number, PlanChoisi>>({});
  const nbChoix = Object.keys(choix).length;
  const affiche = (i: number) => choix[i] ?? moments?.[i]?.plan;

  useEffect(() => {
    let actif = true;
    (async () => {
      try {
        const u = await lienStudio(`${montage.user_id}/${montage.id}/travail/travail.json`);
        const tr = await (await fetch(u)).json();
        if (!actif) return;
        const ms: Moment[] = tr.moments ?? [];
        setMoments(ms);
        setChoix({});
        const ids = [...new Set(ms.flatMap((m) => [m.plan.id, ...m.propositions.map((p) => p.id)]))];
        const { data } = await db.from("studio_banque_plans").select("id, images").in("id", ids);
        const parPlan: Record<string, string> = {};
        for (const p of data ?? []) parPlan[p.id] = p.images?.[1] ?? p.images?.[0];
        const liens = await liensBanque(Object.values(parPlan).filter(Boolean));
        if (actif) setImages(Object.fromEntries(Object.entries(parPlan).map(([id, c]) => [id, liens[c]])));
      } catch {
        if (actif) setMoments([]);
      }
    })();
    return () => {
      actif = false;
    };
  }, [montage.id, montage.user_id, montage.version]);

  const m = ouvert !== null ? moments?.[ouvert] : null;
  const nb = useMemo(() => moments?.length ?? 0, [moments]);

  if (moments === null) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (!nb) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Les plans de ta vidéo</h2>
        <p className="text-sm text-muted-foreground">Clique sur un plan pour en choisir un autre : seule l'image change.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2" data-testid="plans-voix-off">
        {moments.map((x, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOuvert(i)}
            className="w-24 shrink-0 space-y-1 text-left transition-opacity hover:opacity-80"
          >
            <Vignette
              src={images[affiche(i)!.id]}
              alt={affiche(i)!.description ?? ""}
              className={choix[i] ? "ring-2 ring-primary" : "border border-border"}
            />
            <p className="font-mono text-[10px] text-muted-foreground">{minutage(x.debut)}</p>
            <p className="line-clamp-2 text-[10px] text-foreground">{x.texte}</p>
            {choix[i] ? (
              <p className="text-[10px] font-semibold text-primary">Nouveau plan</p>
            ) : (
              <>
                {x.plan.source === "secours" && <p className="text-[10px] text-amber-300">Plan de secours</p>}
                {x.plan.source === "eleve" && <p className="text-[10px] text-primary">Choisi par toi</p>}
              </>
            )}
          </button>
        ))}
      </div>

      {nbChoix > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3" data-testid="plans-a-appliquer">
          <p className="flex-1 text-sm text-foreground">
            {nbChoix} plan{nbChoix > 1 ? "s" : ""} changé{nbChoix > 1 ? "s" : ""}. Tu peux en changer d'autres, puis refaire la vidéo une
            seule fois.
          </p>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setChoix({})} disabled={envoi}>
            <Undo2 className="h-3.5 w-3.5" /> Annuler
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            disabled={envoi}
            onClick={() => onAppliquer(Object.fromEntries(Object.entries(choix).map(([i, p]) => [i, p.id])))}
          >
            {envoi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Refaire la vidéo
          </Button>
        </div>
      )}

      <Dialog open={ouvert !== null} onOpenChange={(o) => !o && setOuvert(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Changer ce plan</DialogTitle>
            <DialogDescription>
              {m ? `« ${m.texte} » · ${minutage(m.debut)} → ${minutage(m.fin)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {m && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Vignette src={images[m.plan.id]} alt={m.plan.description ?? ""} className={choix[ouvert!] ? "border border-border" : "ring-2 ring-primary"} />
                <p className="text-[11px] font-semibold text-primary">Plan actuel</p>
                <p className="line-clamp-3 text-[11px] text-muted-foreground">{m.plan.description}</p>
                {choix[ouvert!] && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-full text-xs"
                    onClick={() => {
                      setChoix(({ [ouvert!]: _, ...reste }) => reste);
                      setOuvert(null);
                    }}
                  >
                    Garder celui-ci
                  </Button>
                )}
              </div>
              {m.propositions.map((p) => (
                <div key={p.id} className="space-y-1">
                  <Vignette src={images[p.id]} alt={p.description ?? ""} className={choix[ouvert!]?.id === p.id ? "ring-2 ring-primary" : "border border-border"} />
                  <p className="line-clamp-3 text-[11px] text-muted-foreground">{p.description}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-full gap-1 text-xs"
                    disabled={envoi}
                    onClick={() => {
                      setChoix((c) => ({ ...c, [ouvert!]: p }));
                      setOuvert(null);
                    }}
                  >
                    <Repeat className="h-3 w-3" /> Prendre celui-ci
                  </Button>
                </div>
              ))}
              {m.propositions.length === 0 && (
                <p className="col-span-3 text-sm text-muted-foreground">Pas d'autre plan proposé pour ce moment.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
