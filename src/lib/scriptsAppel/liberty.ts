/**
 * Version Liberty : pré-remplissage à partir de ce que l'élève a déjà saisi
 * dans les modules Liberty (table liberty_user_profile, colonne data) et de son
 * profil. Cahier des charges, section 9 : « quand aucune donnée ne correspond,
 * le champ reste vide ». Rien n'est inventé ni reformulé ; le prix et la
 * garantie sont repris exactement.
 *
 * Correspondances (établies d'après les modules, 13/10/2026) :
 *   client idéal : avatar.psycho.objectifs / .probleme (repli : sous_niche_2.douleur),
 *                  m5.handoff_to_m6.ht_point_a (situation actuelle) / ht_point_b (souhaitée)
 *   offre        : m3.promesse, m5.handoff_to_m6.structure_phases[] (piliers),
 *                  .structure_promise_days (durée), m3.bonus[0].nom,
 *                  m6.handoff_to_m7.prix_ht (prix), m7.handoff_to_m8.tnc_text (garantie)
 *   nom de l'offre : m8.handoff_to_m9.nom_offre, sinon m4.ladder.high.name
 * Restent vides faute de donnée : formules de cadre, de rejet, d'acceptation,
 * questions de niche, contenu détaillé des piliers, accompagnement (horaires,
 * canaux), témoignages réels et résultat moyen, remise.
 */
import type { Reponses } from "./modele";

type Json = Record<string, unknown>;

function chemin(data: unknown, ...cles: (string | number)[]): unknown {
  let cur: unknown = data;
  for (const k of cles) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Json)[k as string];
  }
  return cur;
}

function texte(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

export function preremplirLiberty(data: unknown, profil: { full_name?: string | null; city?: string | null } | null): Reponses {
  const ht = chemin(data, "m5", "handoff_to_m6");
  const phases = chemin(ht, "structure_phases");
  const pilier = (i: number) => (Array.isArray(phases) ? texte(chemin(phases[i], "name")) : undefined);
  const promesse = texte(chemin(data, "m3", "promesse"));
  const objectif = texte(chemin(data, "avatar", "psycho", "objectifs"));
  const probleme = texte(chemin(data, "avatar", "psycho", "probleme")) ?? texte(chemin(data, "sous_niche_2", "douleur"));
  const pointA = texte(chemin(ht, "ht_point_a"));
  const pointB = texte(chemin(ht, "ht_point_b"));
  const bonus = chemin(data, "m3", "bonus");

  const r: Reponses = {
    D01: texte(profil?.full_name?.split(/\s+/)[0]),
    D02: texte(profil?.city),
    D08: objectif,
    D11: pointA,
    D12: pointB,
    D13: probleme,
    D14: promesse,
    T01: promesse,
    T02: probleme,
    T03: objectif,
    T04: pointA,
    T08: Array.isArray(phases) && phases.length ? String(phases.length) : undefined,
    T09: promesse,
    T09_jours: texte(chemin(ht, "structure_promise_days")),
    T10_nom: pilier(0),
    T11_nom: pilier(1),
    T13_bonus: Array.isArray(bonus) ? texte(chemin(bonus[0], "nom")) : undefined,
    T16: promesse,
    T17: texte(chemin(data, "m6", "handoff_to_m7", "prix_ht")),
    T19: texte(chemin(data, "m7", "handoff_to_m8", "tnc_text")),
    T20: pilier(0),
  };
  for (const k of Object.keys(r)) if (r[k] === undefined) delete r[k];
  return r;
}

export function nomOffreLiberty(data: unknown): string | undefined {
  return texte(chemin(data, "m8", "handoff_to_m9", "nom_offre")) ?? texte(chemin(data, "m4", "ladder", "high", "name"));
}
