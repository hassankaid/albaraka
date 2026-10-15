// Système de relances (demande de Hassan, 15/10/2026).
//
// « À relancer » lance un process en 3 étapes : Relance 1 → 2 → 3, puis
// recyclage. Un lead qui a déjà fait ce 1er passage sans réponse (redistribué
// depuis « À recycler ») fait un 2e passage : Relance 4 → 5 → 6, puis « Perdu »
// (demande de Sabrina, migration 20261015150000). Les étapes ne sont pas des statuts : c'est le compteur
// leads.relance_etape, qui n'avance que par la RPC marquer_relance_faite
// (migration 20261015090000_leads_relances.sql). Pas de délai imposé entre deux
// relances : on affiche seulement la date de la dernière.
import { supabase } from "@/integrations/supabase/client";

export const STATUT_RELANCE = "a_relancer";
/** Relances par passage. */
export const RELANCES_PAR_PASSAGE = 3;
/** Relances au total (2 passages). */
export const RELANCES_MAX = 6;

export interface LeadRelance {
  id?: string | null;
  status?: string | null;
  relance_etape?: number | null;
  relance_derniere_le?: string | null;
}

/** Étape en cours (1 à 6) d'un lead « À relancer », sinon null. */
export function etapeRelance(lead: LeadRelance | null | undefined): number | null {
  if (!lead || lead.status !== STATUT_RELANCE) return null;
  const e = Number(lead.relance_etape ?? 1);
  return Math.min(RELANCES_MAX, Math.max(1, Number.isFinite(e) ? e : 1));
}

/** Heure au format « 14h05 » dans le fuseau donné. */
function heure(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "";
  const m = parts.find((p) => p.type === "minute")?.value ?? "";
  return `${h}h${m}`;
}

/** Jour « AAAA-MM-JJ » dans le fuseau donné (pour compter les jours sans décalage). */
function jourDans(d: Date, tz: string): number {
  const cle = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return Date.parse(`${cle}T00:00:00Z`);
}

/**
 * « faite aujourd'hui à 14h05 », « faite hier à 18h30 », « faite le 11 oct. à 9h12 » ;
 * null si aucune relance faite. L'heure est demandée par les setters (Sabrina, 15/10/2026).
 */
export function derniereRelance(
  date: string | null | undefined,
  maintenant = new Date(),
  tz = "Europe/Paris",
): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const jours = Math.round((jourDans(maintenant, tz) - jourDans(d, tz)) / 86_400_000);
  const h = heure(d, tz);
  if (jours <= 0) return `faite aujourd'hui à ${h}`;
  if (jours === 1) return `faite hier à ${h}`;
  const jour = d.toLocaleDateString("fr-FR", { timeZone: tz, day: "numeric", month: "short" });
  return `faite le ${jour} à ${h}`;
}

/** 1er passage (Relances 1 à 3) ou 2e passage (Relances 4 à 6). */
export const passageRelance = (etape: number) => (etape > RELANCES_PAR_PASSAGE ? 2 : 1);

/** Nombre de relances affiché sur le compteur : 3 au 1er passage, 6 au 2e. */
export const totalRelances = (etape: number) => passageRelance(etape) * RELANCES_PAR_PASSAGE;

/** « Relance 2/3 », ou « Relance 4/6 · 2ᵉ passage ». */
export function libelleEtape(etape: number): string {
  const base = `Relance ${etape}/${totalRelances(etape)}`;
  return passageRelance(etape) === 2 ? `${base} · 2ᵉ passage` : base;
}

/** Libellé du bouton pour l'étape en cours. */
export const libelleBouton = (etape: number) => `Relance ${etape} faite`;

/** La dernière étape d'un passage recycle (Relance 3) ou classe en « Perdu » (Relance 6) : on demande confirmation. */
export const etapeFinale = (etape: number) => etape % RELANCES_PAR_PASSAGE === 0;

/** La Relance 6 classe le lead en « Perdu » au lieu de le recycler. */
export const finitEnPerdu = (etape: number) => etape >= RELANCES_MAX;

export interface ResultatRelance {
  ok: boolean;
  changed: boolean;
  etape: number | null;
  recycle?: boolean;
  perdu?: boolean;
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

/** La fiche telle qu'elle est après la relance, pour l'afficher tout de suite (sans attendre le rechargement). */
export function apresRelance<L extends LeadRelance & { assigned_to?: string | null; recycled_at?: string | null }>(
  lead: L,
  r: ResultatRelance,
  maintenant = new Date().toISOString(),
): L {
  if (!r.changed) return lead;
  if (r.perdu) {
    return { ...lead, status: "perdu", relance_etape: null, relance_derniere_le: null };
  }
  if (r.recycle) {
    return { ...lead, status: "pas_de_reponse", assigned_to: null, recycled_at: maintenant, relance_etape: null, relance_derniere_le: null };
  }
  return { ...lead, relance_etape: r.etape, relance_derniere_le: maintenant };
}

/** Message de confirmation après une relance. */
export function messageRelance(r: ResultatRelance, etapeFaite: number): string {
  if (!r.changed) return "Cette relance était déjà validée.";
  if (r.perdu) return `Relance ${etapeFaite} faite : 6 relances sans réponse, le lead passe en « Perdu ».`;
  if (r.recycle) return `Relance ${etapeFaite} faite : le lead part dans « À recycler ».`;
  return `Relance ${etapeFaite} faite : prochaine étape, Relance ${r.etape}.`;
}
