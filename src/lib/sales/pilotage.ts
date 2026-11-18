// ─────────────────────────────────────────────────────────────────────────
// Dashboard Sales, lot 3 (18/11/2026) : recommandations par créa, objectifs
// par semaine, entonnoir.
//
// RECOMMANDATIONS. Elles se lisent sur une fenêtre glissante (les N dernières
// conférences, réglage de Sidali), pas sur la période affichée : une seule
// conférence donne 0 à 3 ventes par créa, trop peu pour couper ou pousser.
// La cible est le coût par vente visé ; sans réglage, le coût par vente moyen
// de la fenêtre. Règles, dans l'ordre :
//   1. couper    : ≥ N × cible dépensés sans vente, ou coût par vente ≥ N × cible ;
//   2. pousser   : ≥ V ventes et coût par vente ≤ R × cible ;
//   3. surveiller: coût par vente ≥ 1,25 × cible, ou dépense ≥ cible sans vente
//                  ni rendez-vous ;
//   4. trop tôt  : moins que la cible dépensée, sans vente ;
//   5. garder    : le reste.
// La dernière conférence n'a pas encore toutes ses ventes (on achète en
// moyenne 5 jours après l'inscription) : l'écran le rappelle.
// ─────────────────────────────────────────────────────────────────────────
import { dimanchePlus } from "@/lib/marketing/conferenceFilter";
import type { Derives, Mesures, NoeudSource } from "./sources";

export interface Reglages {
  cpa_cible: number | null;
  couper_multiple: number;
  pousser_ratio: number;
  ventes_min: number;
  fenetre_conferences: number;
}

export const REGLAGES_DEFAUT: Reglages = {
  cpa_cible: null, couper_multiple: 2, pousser_ratio: 0.7, ventes_min: 3, fenetre_conferences: 4,
};

export type Verdict = "couper" | "pousser" | "surveiller" | "attendre" | "garder";

export const LIBELLE_VERDICT: Record<Verdict, string> = {
  couper: "À couper",
  pousser: "À pousser",
  surveiller: "À surveiller",
  attendre: "Trop tôt pour juger",
  garder: "À garder",
};

export interface Recommandation {
  verdict: Verdict;
  raison: string;
  noeud: NoeudSource;
  /** A dépensé pendant la dernière conférence. */
  active: boolean;
}

const eur = (v: number) => `${Math.round(v).toLocaleString("fr-FR")} €`;
const fois = (v: number) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ×`;

export function cibleEffective(reglages: Reglages, reference: Mesures & Derives): number | null {
  return reglages.cpa_cible && reglages.cpa_cible > 0 ? reglages.cpa_cible : reference.cpa;
}

export function recommander(
  creas: NoeudSource[],
  actives: Set<string>,
  reglages: Reglages,
  reference: Mesures & Derives,
): Recommandation[] {
  const cible = cibleEffective(reglages, reference);
  if (!cible) return [];
  const N = reglages.couper_multiple;
  return creas
    .filter((c) => c.depense > 0)
    .map((c) => {
      const nettes = c.ventes - c.perdues;
      const active = actives.has(c.cle);
      let verdict: Verdict;
      let raison: string;
      if (nettes === 0 && c.depense >= N * cible) {
        verdict = "couper";
        raison = `${eur(c.depense)} dépensés sans vente (seuil : ${fois(N)} la cible de ${eur(cible)}).`;
      } else if (nettes > 0 && c.cpa !== null && c.cpa >= N * cible) {
        verdict = "couper";
        raison = `${eur(c.cpa)} par vente, plus de ${fois(N)} la cible de ${eur(cible)}.`;
      } else if (nettes >= reglages.ventes_min && c.cpa !== null && c.cpa <= reglages.pousser_ratio * cible) {
        verdict = "pousser";
        raison = `${nettes} ventes à ${eur(c.cpa)}, sous ${Math.round(reglages.pousser_ratio * 100)} % de la cible (${eur(cible)}).`;
      } else if (nettes > 0 && c.cpa !== null && c.cpa >= 1.25 * cible) {
        verdict = "surveiller";
        raison = `${eur(c.cpa)} par vente, au-dessus de la cible (${eur(cible)}).`;
      } else if (nettes === 0 && c.depense >= cible && c.rdv === 0) {
        verdict = "surveiller";
        raison = `${eur(c.depense)} dépensés, ni vente ni rendez-vous.`;
      } else if (nettes === 0) {
        verdict = "attendre";
        raison = c.rdv > 0
          ? `${eur(c.depense)} dépensés, ${c.rdv} rendez-vous, pas encore de vente.`
          : `${eur(c.depense)} dépensés, moins que la cible : trop tôt.`;
      } else {
        verdict = "garder";
        raison = nettes < reglages.ventes_min
          ? `${nettes} vente${nettes > 1 ? "s" : ""} à ${eur(c.cpa ?? 0)} : dans la cible, encore peu de volume.`
          : `${nettes} ventes à ${eur(c.cpa ?? 0)}, dans la cible.`;
      }
      return { verdict, raison, noeud: c, active };
    })
    .sort((a, b) => ORDRE[a.verdict] - ORDRE[b.verdict] || Number(b.active) - Number(a.active) || b.noeud.depense - a.noeud.depense);
}

const ORDRE: Record<Verdict, number> = { couper: 0, pousser: 1, surveiller: 2, attendre: 3, garder: 4 };

/** Bornes de la fenêtre glissante : les N conférences jusqu'à `derniere` comprise. */
export function fenetre(derniere: string, n: number): { from: string; to: string } {
  return { from: dimanchePlus(derniere, -(Math.max(1, n) - 1)), to: derniere };
}

// ── Objectifs par semaine ──────────────────────────────────────────────────

export interface ObjectifSemaine {
  conference_date: string | null;
  ventes: number | null;
  ca: number | null;
  rdv: number | null;
  budget: number | null;
}

export type CleObjectif = "ventes" | "ca" | "rdv" | "budget";

/** Les dimanches de conférence de `from` à `to` compris. */
export function conferencesEntre(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 120; d = dimanchePlus(d, 1)) out.push(d);
  return out;
}

/**
 * Objectif d'une période : somme, conférence par conférence, de l'objectif
 * propre à la semaine ou à défaut de l'objectif par défaut. null si aucune
 * semaine n'a d'objectif pour cette mesure.
 */
export function objectifPeriode(conferences: string[], objectifs: ObjectifSemaine[], cle: CleObjectif): number | null {
  const defaut = objectifs.find((o) => o.conference_date === null);
  let somme = 0;
  let trouve = false;
  for (const c of conferences) {
    const propre = objectifs.find((o) => o.conference_date === c);
    const v = propre?.[cle] ?? defaut?.[cle] ?? null;
    if (v !== null && v !== undefined) {
      somme += Number(v);
      trouve = true;
    }
  }
  return trouve ? somme : null;
}

// ── Entonnoir ──────────────────────────────────────────────────────────────

export interface Etape {
  cle: string;
  libelle: string;
  valeur: number;
  /** Passage depuis l'étape précédente. */
  taux: number | null;
}

export function entonnoir(t: Mesures): Etape[] {
  const etapes: [string, string, number][] = [
    ["leads", "Leads", t.leads],
    ["inscrits", "Inscrits", t.inscrits],
    ["rdv", "RDV pris", t.rdv],
    ["tenus", "RDV tenus", t.rdvTenus],
    ["ventes", "Ventes", t.ventes],
  ];
  return etapes.map(([cle, libelle, valeur], i) => ({
    cle, libelle, valeur,
    taux: i === 0 ? null : etapes[i - 1][2] > 0 ? valeur / etapes[i - 1][2] : null,
  }));
}
