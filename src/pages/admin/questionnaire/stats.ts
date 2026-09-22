// ─────────────────────────────────────────────────────────────────────────
// Questionnaire clients — calculs du tableau de bord.
//
// Tout est ici, séparé de l'affichage : ce sont ces chiffres que Sidali va
// lire pour décider, et une moyenne fausse ne se voit pas à l'œil nu sur un
// graphique. Fonctions pures, donc vérifiables.
//
// Les 322 réponses tiennent largement en mémoire : on charge tout une fois et
// on filtre côté navigateur. Les filtres se combinent donc instantanément,
// sans aller-retour serveur.
// ─────────────────────────────────────────────────────────────────────────

export interface Reponse {
  invitation_id: string;
  prenom: string | null;
  formation_fichier: string;
  soumis_le: string;
  q1: string | null;  q2: string | null;  q3: string | null;  q4: string | null;
  q5: string | null;  q6: string | null;  q7: string | null;  q8: string | null;
  q9: string | null;  q10: string | null; q11: string | null; q12: string | null;
  q13: string | null; q14: string | null; q15: string | null; q16: string | null;
  q17: number | null; q18: string | null; q19: string | null; q20: string | null;
  q21: string | null; q22: string | null; q23: string | null;
  q24: number | null; q25: number | null; q26: number | null;
  q27: string[] | null;
  q28: string | null; q29: string | null;
}

export interface Filtres {
  formation: string;   // "tous" | "PASS AL-BARAKA" | "LIBERTY" | "Les deux"
  anciennete: string;  // "tous" | valeur de q11
  termine: string;     // "tous" | "Oui" | "Non"
  age: string;         // "tous" | valeur de q1
  pays: string;        // "tous" | valeur de q2
  du: string;          // "" ou AAAA-MM-JJ
  au: string;          // "" ou AAAA-MM-JJ
}

export const FILTRES_VIDES: Filtres = {
  formation: "tous", anciennete: "tous", termine: "tous",
  age: "tous", pays: "tous", du: "", au: "",
};

export function filtrer(reponses: Reponse[], f: Filtres): Reponse[] {
  return reponses.filter((r) => {
    if (f.formation !== "tous" && r.q10 !== f.formation) return false;
    if (f.anciennete !== "tous" && r.q11 !== f.anciennete) return false;
    if (f.termine !== "tous" && r.q21 !== f.termine) return false;
    if (f.age !== "tous" && r.q1 !== f.age) return false;
    // Le pays est saisi à la main : on compare sans casse ni espaces.
    if (f.pays !== "tous" && normaliserPays(r.q2) !== f.pays) return false;
    if (f.du && r.soumis_le.slice(0, 10) < f.du) return false;
    if (f.au && r.soumis_le.slice(0, 10) > f.au) return false;
    return true;
  });
}

/** « france », « FRANCE  », « France » → « France ». */
export function normaliserPays(v: string | null): string {
  const t = (v ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "—";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** Moyenne d'une échelle, sur les seules réponses renseignées. */
export function moyenne(reponses: Reponse[], champ: "q17" | "q24" | "q25" | "q26"): number | null {
  const v = reponses.map((r) => r[champ]).filter((x): x is number => typeof x === "number");
  if (v.length === 0) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

/**
 * Le NPS : pourcentage de promoteurs (9-10) moins pourcentage de
 * détracteurs (0-6). Les notes 7 et 8 ne comptent pas — c'est la définition,
 * et c'est ce qui rend l'indicateur sévère.
 *
 * Renvoie un entier entre -100 et +100, ou null sans aucune réponse.
 */
export function nps(reponses: Reponse[]): number | null {
  const v = reponses.map((r) => r.q26).filter((x): x is number => typeof x === "number");
  if (v.length === 0) return null;
  const promoteurs = v.filter((n) => n >= 9).length;
  const detracteurs = v.filter((n) => n <= 6).length;
  return Math.round(((promoteurs - detracteurs) / v.length) * 100);
}

/** Part, en pourcentage, des réponses qui vérifient une condition. */
export function part(reponses: Reponse[], predicat: (r: Reponse) => boolean): number | null {
  if (reponses.length === 0) return null;
  return Math.round((reponses.filter(predicat).length / reponses.length) * 100);
}

export interface Tranche { valeur: string; n: number; pct: number }

/**
 * Répartition d'une question à choix unique, dans l'ordre des options
 * quand il est fourni — « Moins de 18 ans » avant « 45 ans et plus » se lit,
 * un tri par effectif ne se lit pas.
 */
export function repartition(
  reponses: Reponse[],
  champ: keyof Reponse,
  ordre?: string[],
): Tranche[] {
  const compte = new Map<string, number>();
  for (const r of reponses) {
    const v = r[champ];
    const cle = champ === "q2" ? normaliserPays(v as string) : (v == null || v === "" ? "—" : String(v));
    compte.set(cle, (compte.get(cle) ?? 0) + 1);
  }
  const total = reponses.length || 1;
  const lignes = [...compte.entries()].map(([valeur, n]) => ({
    valeur, n, pct: Math.round((n / total) * 100),
  }));
  if (ordre) {
    lignes.sort((a, b) => {
      const ia = ordre.indexOf(a.valeur), ib = ordre.indexOf(b.valeur);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
  } else {
    lignes.sort((a, b) => b.n - a.n);
  }
  return lignes;
}

/** Répartition d'un choix multiple : une réponse peut compter plusieurs fois. */
export function repartitionMultiple(reponses: Reponse[], ordre?: string[]): Tranche[] {
  const compte = new Map<string, number>();
  for (const r of reponses) {
    for (const o of r.q27 ?? []) compte.set(o, (compte.get(o) ?? 0) + 1);
  }
  const total = reponses.length || 1;
  const lignes = [...compte.entries()].map(([valeur, n]) => ({
    valeur, n, pct: Math.round((n / total) * 100),
  }));
  if (ordre) {
    lignes.sort((a, b) => {
      const ia = ordre.indexOf(a.valeur), ib = ordre.indexOf(b.valeur);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
  } else {
    lignes.sort((a, b) => b.n - a.n);
  }
  return lignes;
}

export interface LigneCroisement {
  valeur: string;
  n: number;
  satisfaction: number | null;
  contenu: number | null;
  termine: number | null;
  abandon: number | null;
  nps: number | null;
}

/**
 * Le croisement demandé au §7.4, en une seule table.
 *
 * Quatre croisements sont réclamés — profil × blocages, profil × réussite,
 * canal × réussite, formation × satisfaction. Ce sont quatre lectures de la
 * même chose : pour chaque valeur d'une dimension, comment vont ces gens.
 * Une table par dimension répond aux quatre, et se compare d'un coup d'œil ;
 * quatre graphiques séparés auraient obligé à faire le rapprochement de tête.
 */
export function croiser(reponses: Reponse[], dimension: keyof Reponse): LigneCroisement[] {
  const groupes = new Map<string, Reponse[]>();
  for (const r of reponses) {
    const v = r[dimension];
    const cle = dimension === "q2" ? normaliserPays(v as string) : (v == null || v === "" ? "—" : String(v));
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle)!.push(r);
  }
  return [...groupes.entries()]
    .map(([valeur, g]) => ({
      valeur,
      n: g.length,
      satisfaction: moyenne(g, "q17"),
      contenu: moyenne(g, "q24"),
      termine: part(g, (r) => r.q21 === "Oui"),
      abandon: part(g, (r) => r.q19 != null && r.q19 !== "Jamais"),
      nps: nps(g),
    }))
    .sort((a, b) => b.n - a.n);
}

/** Les questions ouvertes, dans l'ordre du questionnaire. */
export const LIBRES: { champ: keyof Reponse; numero: number; titre: string; enAvant?: boolean }[] = [
  { champ: "q18", numero: 18, titre: "Ce qui empêche d'avancer", enAvant: true },
  { champ: "q20", numero: 20, titre: "La partie la plus difficile", enAvant: true },
  { champ: "q29", numero: 29, titre: "Ce qui manque ou pourrait être amélioré", enAvant: true },
  { champ: "q6",  numero: 6,  titre: "Domaine d'activité" },
  { champ: "q15", numero: 15, titre: "Ce qui a décidé à passer à l'action" },
  { champ: "q16", numero: 16, titre: "Où en est la formation" },
  { champ: "q22", numero: 22, titre: "Résultats obtenus" },
  { champ: "q23", numero: 23, titre: "Objectif des 6 prochains mois" },
  { champ: "q28", numero: 28, titre: "Ce qui est le plus apprécié" },
];

/** Colonnes de l'export CSV, dans l'ordre du questionnaire. */
export const COLONNES_CSV: (keyof Reponse)[] = [
  "prenom", "formation_fichier", "soumis_le",
  "q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","q11","q12","q13","q14","q15",
  "q16","q17","q18","q19","q20","q21","q22","q23","q24","q25","q26","q27","q28","q29",
];

/**
 * Le CSV.
 *
 * Séparateur point-virgule et BOM en tête : sans ça, Excel en français ouvre
 * tout dans une seule colonne et casse les accents. C'est le tableur qui
 * servira, pas un outil de développeur.
 */
export function versCSV(reponses: Reponse[]): string {
  const echapper = (v: unknown): string => {
    if (v == null) return "";
    const t = Array.isArray(v) ? v.join(" | ") : String(v);
    return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const lignes = [COLONNES_CSV.join(";")];
  for (const r of reponses) {
    lignes.push(COLONNES_CSV.map((c) => echapper(r[c])).join(";"));
  }
  return "﻿" + lignes.join("\r\n");
}
