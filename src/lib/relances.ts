// Système de relances (demande de Hassan, 15/10/2026).
//
// « À relancer » lance un process en 3 étapes : Relance 1 → 2 → 3, puis
// recyclage. Les étapes ne sont pas des statuts : c'est le compteur
// leads.relance_etape, qui n'avance que par la RPC marquer_relance_faite
// (migration 20261015090000_leads_relances.sql). Pas de délai imposé entre deux
// relances : on affiche seulement la date de la dernière.
import { supabase } from "@/integrations/supabase/client";

export const STATUT_RELANCE = "a_relancer";
export const RELANCES_MAX = 3;

export interface LeadRelance {
  id?: string | null;
  status?: string | null;
  relance_etape?: number | null;
  relance_derniere_le?: string | null;
}

/** Étape en cours (1 à 3) d'un lead « À relancer », sinon null. */
export function etapeRelance(lead: LeadRelance | null | undefined): number | null {
  if (!lead || lead.status !== STATUT_RELANCE) return null;
  const e = Number(lead.relance_etape ?? 1);
  return Math.min(RELANCES_MAX, Math.max(1, Number.isFinite(e) ? e : 1));
}

/** « faite aujourd'hui », « faite hier », « faite il y a 3 j » ; null si aucune relance faite. */
export function derniereRelance(date: string | null | undefined, maintenant = new Date()): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const jour = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const jours = Math.round((jour(maintenant) - jour(d)) / 86_400_000);
  if (jours <= 0) return "faite aujourd'hui";
  if (jours === 1) return "faite hier";
  return `faite il y a ${jours} j`;
}

/** Libellé du bouton pour l'étape en cours. */
export const libelleBouton = (etape: number) => `Relance ${etape} faite`;

/** La dernière étape recycle le lead : on demande confirmation. */
export const etapeFinale = (etape: number) => etape >= RELANCES_MAX;

export interface ResultatRelance {
  ok: boolean;
  changed: boolean;
  etape: number | null;
  recycle?: boolean;
}

/** Valide la relance de l'étape affichée (sans effet si la fiche a déjà avancé). */
export async function marquerRelanceFaite(leadId: string, etape: number, note?: string): Promise<ResultatRelance> {
  // RPC absente des types générés (migration 20261015090000)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("marquer_relance_faite", {
    p_lead_id: leadId,
    p_etape: etape,
    p_note: note?.trim() || null,
  });
  if (error) throw new Error(error.message || "Relance impossible");
  return data as ResultatRelance;
}

/** Message de confirmation après une relance. */
export function messageRelance(r: ResultatRelance, etapeFaite: number): string {
  if (!r.changed) return "Cette relance était déjà validée.";
  if (r.recycle) return `Relance ${etapeFaite} faite : le lead part dans « À recycler ».`;
  return `Relance ${etapeFaite} faite : prochaine étape, Relance ${r.etape}.`;
}
