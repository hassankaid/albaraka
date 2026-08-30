// ─────────────────────────────────────────────────────────────────────────
// Accès aux données du tableau de bord Marketing V2.
//
// Un seul appel réseau par période : `marketing_perf` renvoie une ligne par
// couple canal × tunnel, et les trois vues du tableau de bord se composent à
// partir de ce même résultat. Deux vues ne peuvent donc pas afficher des
// totaux différents.
//
// La fonction SQL vérifie elle-même le rôle (CEO ou agence) : inutile de le
// redoubler ici, et un contrôle côté client ne protégerait rien de toute façon.
// ─────────────────────────────────────────────────────────────────────────
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PerfBrute } from "@/lib/marketing/perf";

export type ModePerf = "conference" | "calendrier";

export interface PeriodePerf {
  mode: ModePerf;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

async function chargerPerf(p: PeriodePerf): Promise<PerfBrute[]> {
  const { data, error } = await (supabase as any).rpc("marketing_perf", {
    p_mode: p.mode,
    p_from: p.from,
    p_to: p.to,
  });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    canal: r.canal,
    tunnel: r.tunnel,
    leads: Number(r.leads ?? 0),
    ventes: Number(r.ventes ?? 0),
    ca: Number(r.ca ?? 0),
    depense: Number(r.depense ?? 0),
  }));
}

export function useMarketingPerf(p: PeriodePerf | null) {
  return useQuery({
    queryKey: ["marketing-perf", p?.mode, p?.from, p?.to],
    enabled: !!p,
    staleTime: 60_000,
    queryFn: () => chargerPerf(p!),
  });
}

/** Deux périodes en un seul hook — utilisé par la vue mensuelle pour le mois et son M-1. */
export function useMarketingPerfComparee(courant: PeriodePerf | null, precedent: PeriodePerf | null) {
  const a = useMarketingPerf(courant);
  const b = useMarketingPerf(precedent);
  return {
    courant: a.data ?? [],
    precedent: b.data ?? [],
    isLoading: a.isLoading || b.isLoading,
    error: a.error ?? b.error,
    refetch: () => { a.refetch(); b.refetch(); },
  };
}

// ── Rendez-vous par agenda d'origine ───────────────────────────────────────
//
// Un RDV pris sur l'événement de la conférence, un autre sous la vidéo du
// tunnel VSL et un troisième depuis la page témoignages n'ont pas la même
// valeur : le premier vient d'assister à la conférence, le deuxième ne l'a pas
// vue, le troisième revient de lui-même. Les additionner masque exactement la
// différence qu'on cherche à piloter.

export interface RdvParOrigine {
  origine: "conference" | "vsl" | "retargeting" | "autre";
  rdv: number;
  annules: number;
  no_show: number;
  honores: number;
}

export function useMarketingRdv(p: PeriodePerf | null) {
  return useQuery({
    queryKey: ["marketing-rdv", p?.mode, p?.from, p?.to],
    enabled: !!p,
    staleTime: 60_000,
    queryFn: async (): Promise<RdvParOrigine[]> => {
      const { data, error } = await (supabase as any).rpc("marketing_rdv", {
        p_mode: p!.mode, p_from: p!.from, p_to: p!.to,
      });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        origine: r.origine,
        rdv: Number(r.rdv ?? 0),
        annules: Number(r.annules ?? 0),
        no_show: Number(r.no_show ?? 0),
        honores: Number(r.honores ?? 0),
      }));
    },
  });
}

// ── Objectifs mensuels ─────────────────────────────────────────────────────

export type KpiObjectif = "leads" | "cpl" | "ventes" | "ca" | "cout_par_vente" | "budget" | "roi";

export interface Objectif {
  kpi: KpiObjectif;
  valeur: number;
}

/** `mois` = 1er du mois, YYYY-MM-01. */
export function useObjectifs(mois: string | null) {
  return useQuery({
    queryKey: ["marketing-objectifs", mois],
    enabled: !!mois,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await (supabase as any)
        .from("marketing_objectifs")
        .select("kpi, valeur")
        .eq("mois", mois);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r: any) => [r.kpi, Number(r.valeur)]));
    },
  });
}

export function useEnregistrerObjectif(mois: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpi, valeur }: { kpi: KpiObjectif; valeur: number | null }) => {
      if (valeur === null) {
        // Champ vidé : on retire l'objectif au lieu d'enregistrer un zéro, qui
        // se lirait comme « objectif : 0 » et fausserait l'écart.
        const { error } = await (supabase as any)
          .from("marketing_objectifs")
          .delete()
          .eq("mois", mois)
          .eq("kpi", kpi);
        if (error) throw error;
        return;
      }
      const { error } = await (supabase as any)
        .from("marketing_objectifs")
        .upsert({ mois, kpi, valeur }, { onConflict: "mois,kpi" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketing-objectifs", mois] }),
  });
}
