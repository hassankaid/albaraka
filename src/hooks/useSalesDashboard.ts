// Données du dashboard Sales (lot 1, 18/11/2026). Les trois fonctions SQL
// vérifient elles-mêmes que l'utilisateur est CEO.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ConferenceFilter } from "@/lib/marketing/conferenceFilter";
import type { CallDashboard, SetterActivite, VenteDashboard } from "@/lib/sales/dashboard";

/** Bornes de conférences d'un filtre ; null = sans borne. */
export function bornesFiltre(f: ConferenceFilter | null): { from: string | null; to: string | null } {
  if (!f || f.mode === "all") return { from: null, to: null };
  if (f.mode === "single") return { from: f.date, to: f.date };
  return { from: f.from, to: f.to };
}

const n = (v: unknown) => Number(v ?? 0);

async function charger(from: string | null, to: string | null) {
  const rpc = (nom: string, args: Record<string, unknown>) => (supabase as any).rpc(nom, args);
  const [ventes, calls, setters] = await Promise.all([
    rpc("sales_dashboard_ventes", { p_from: from, p_to: to }),
    rpc("sales_dashboard_calls", { p_from: from, p_to: to }),
    rpc("equipe_qualification_plage", { p_conf_from: from, p_conf_to: to }),
  ]);
  for (const r of [ventes, calls, setters]) if (r.error) throw r.error;
  return {
    ventes: ((ventes.data ?? []) as any[]).map((v) => ({
      ...v,
      montant_ht: n(v.montant_ht),
      nb_echeances: n(v.nb_echeances),
      encaisse: n(v.encaisse),
      en_retard: n(v.en_retard),
      reste_a_encaisser: n(v.reste_a_encaisser),
      intervenants: ((v.intervenants ?? []) as any[]).map((i) => ({
        ...i,
        montant: i.montant === null ? null : n(i.montant),
        verse: i.verse === null ? null : n(i.verse),
      })),
    })) as VenteDashboard[],
    calls: (calls.data ?? []) as CallDashboard[],
    setters: ((setters.data ?? []) as any[]).map((s) => ({
      user_id: s.user_id,
      full_name: s.full_name,
      nb_appeles: n(s.nb_appeles),
      nb_inscrits: n(s.nb_inscrits),
      nb_calls: n(s.nb_calls),
    })) as SetterActivite[],
  };
}

export function useSalesDashboard(filtre: ConferenceFilter | null) {
  const { from, to } = bornesFiltre(filtre);
  return useQuery({
    queryKey: ["sales-dashboard", from, to],
    enabled: !!filtre,
    staleTime: 60_000,
    queryFn: () => charger(from, to),
  });
}
