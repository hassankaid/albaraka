// Données du dashboard Sales, lot 2 (18/11/2026) : ventes et entonnoir par source.
// Les deux fonctions SQL sont ouvertes au CEO et à l'agence, et ne renvoient ni
// nom de client ni commission.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ConferenceFilter } from "@/lib/marketing/conferenceFilter";
import type { EntonnoirSource, VenteSource } from "@/lib/sales/sources";
import { bornesFiltre } from "@/hooks/useSalesDashboard";

const n = (v: unknown) => Number(v ?? 0);

async function charger(from: string | null, to: string | null) {
  const rpc = (nom: string) => (supabase as any).rpc(nom, { p_from: from, p_to: to });
  const [ventes, entonnoir] = await Promise.all([rpc("sales_sources_ventes"), rpc("sales_sources_entonnoir")]);
  for (const r of [ventes, entonnoir]) if (r.error) throw r.error;
  return {
    ventes: ((ventes.data ?? []) as any[]).map((v) => ({
      ...v,
      montant_ht: n(v.montant_ht),
      encaisse: n(v.encaisse),
      nb_echeances: n(v.nb_echeances),
    })) as VenteSource[],
    entonnoir: ((entonnoir.data ?? []) as any[]).map((e) => ({
      ...e,
      leads: n(e.leads),
      inscrits: n(e.inscrits),
      rdv: n(e.rdv),
      rdv_tenus: n(e.rdv_tenus),
      depense_campagne: n(e.depense_campagne),
      depense_pub: n(e.depense_pub),
    })) as EntonnoirSource[],
  };
}

export function useSalesSources(filtre: ConferenceFilter | null) {
  const { from, to } = bornesFiltre(filtre);
  return useQuery({
    queryKey: ["sales-sources", from, to],
    enabled: !!filtre,
    staleTime: 60_000,
    queryFn: () => charger(from, to),
  });
}
