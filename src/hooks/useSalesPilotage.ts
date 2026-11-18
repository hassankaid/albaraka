// Dashboard Sales, lot 3 (18/11/2026) : seuils des recommandations et objectifs
// par semaine. Lecture CEO + agence, écriture CEO (RLS).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { REGLAGES_DEFAUT, type ObjectifSemaine, type Reglages } from "@/lib/sales/pilotage";

const db = supabase as any;
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export function useReglagesPilotage() {
  return useQuery({
    queryKey: ["sales-pilotage-reglages"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Reglages> => {
      const { data, error } = await db.from("sales_pilotage_reglages").select("*").maybeSingle();
      if (error) throw error;
      if (!data) return REGLAGES_DEFAUT;
      return {
        cpa_cible: num(data.cpa_cible),
        couper_multiple: Number(data.couper_multiple),
        pousser_ratio: Number(data.pousser_ratio),
        ventes_min: Number(data.ventes_min),
        fenetre_conferences: Number(data.fenetre_conferences),
      };
    },
  });
}

export function useEnregistrerReglages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: Reglages) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await db.from("sales_pilotage_reglages")
        .update({ ...r, updated_by: u.user?.id ?? null, updated_at: new Date().toISOString() })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-pilotage-reglages"] }),
  });
}

export function useObjectifsSemaine() {
  return useQuery({
    queryKey: ["sales-objectifs"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ObjectifSemaine[]> => {
      const { data, error } = await db.from("sales_objectifs").select("conference_date, ventes, ca, rdv, budget");
      if (error) throw error;
      return ((data ?? []) as any[]).map((o) => ({
        conference_date: o.conference_date,
        ventes: num(o.ventes),
        ca: num(o.ca),
        rdv: num(o.rdv),
        budget: num(o.budget),
      }));
    },
  });
}

/** Enregistre l'objectif d'une semaine (ou par défaut si conference_date est null). Tout vide : supprime. */
export function useEnregistrerObjectif() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (o: ObjectifSemaine) => {
      const vide = o.ventes === null && o.ca === null && o.rdv === null && o.budget === null;
      let q = db.from("sales_objectifs").select("id");
      q = o.conference_date === null ? q.is("conference_date", null) : q.eq("conference_date", o.conference_date);
      const { data: existant, error: e1 } = await q.maybeSingle();
      if (e1) throw e1;
      if (vide) {
        if (existant) {
          const { error } = await db.from("sales_objectifs").delete().eq("id", existant.id);
          if (error) throw error;
        }
        return;
      }
      const { data: u } = await supabase.auth.getUser();
      const ligne = { ...o, updated_by: u.user?.id ?? null, updated_at: new Date().toISOString() };
      const { error } = existant
        ? await db.from("sales_objectifs").update(ligne).eq("id", existant.id)
        : await db.from("sales_objectifs").insert(ligne);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-objectifs"] }),
  });
}
