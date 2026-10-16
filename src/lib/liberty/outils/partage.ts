/**
 * Les informations que les outils Liberty se transmettent (tableau « Reprise
 * automatique » du cahier des charges), calculées à partir du profil partagé.
 * Chaque outil s'en sert pour pré-remplir ses phrases.
 */
import { assembler, enMinuscule, lignes, ligneRemplie, texte, type Profil } from "./modele";

/** Le délai de la promesse en jours (pour la règle des 90 jours). */
export function delaiEnJours(p: Profil): number | null {
  const n = Number(texte(p, "promesse.delaiNombre").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  const unite = texte(p, "promesse.delaiUnite");
  return Math.round(n * (unite === "mois" ? 30 : unite === "semaines" ? 7 : 1));
}

/** « 90 jours », « 12 semaines »… ou "" si rien n'est saisi. */
export function delai(p: Profil): string {
  const n = texte(p, "promesse.delaiNombre");
  return n ? `${n} ${texte(p, "promesse.delaiUnite") || "jours"}` : "";
}

/** La sous-niche telle qu'elle s'insère dans une phrase. */
export const cible = (p: Profil) => texte(p, "promesse.cible") || enMinuscule(texte(p, "sousNiche.phrase"));
export const resultat = (p: Profil) => texte(p, "promesse.resultat");
export const nomMethode = (p: Profil) => texte(p, "methode.nom");
export const nomOffre = (p: Profil) => texte(p, "nom.offre");
export const grandeIdee = (p: Profil) => texte(p, "mecanisme.grandeIdee");
export const prenomAvatar = (p: Profil) => texte(p, "avatar.prenom");

/** « J'aide [sous-niche] à [résultat] en [délai] grâce à [méthode]. » assemblée en direct. */
export function promesseAssemblee(p: Profil): string {
  return assembler([
    "J'aide ", { valeur: cible(p), vide: "votre sous-niche" },
    " à ", { valeur: resultat(p), vide: "résultat concret et chiffré" },
    " en ", { valeur: delai(p), vide: "délai" },
    " grâce à la méthode ", { valeur: nomMethode(p), vide: "nom de votre méthode" }, ".",
  ]);
}

/** La promesse spécifique : retouchée par l'élève si besoin, sinon assemblée. */
export function promesseSpecifique(p: Profil): string {
  return texte(p, "promesse.specifiqueTexte") || (resultat(p) ? promesseAssemblee(p) : "");
}

/** « La raison pour laquelle nos clients atteignent [résultat], c'est une seule chose : [grande idée]. » */
export function phraseMecanisme(p: Profil): string {
  return assembler([
    "La raison pour laquelle nos clients atteignent ", { valeur: resultat(p), vide: "résultat" },
    ", c'est une seule chose : ", { valeur: grandeIdee(p), vide: "grande idée" }, ".",
  ]);
}

/** Les solutions de l'écran « Problèmes → solutions » (outil 2). */
export function solutions(p: Profil): string[] {
  return lignes(p, "solutions.liste").map((l) => (l.solution ?? "").trim()).filter(Boolean);
}

/** Les grandes étapes de la méthode (outil 2), dans l'ordre. */
export function etapesMethode(p: Profil): { nom: string; micro: string; solutions: string }[] {
  return lignes(p, "methode.etapes").filter(ligneRemplie)
    .map((l) => ({ nom: (l.nom ?? "").trim(), micro: (l.micro ?? "").trim(), solutions: (l.solutions ?? "").trim() }));
}

/** Les 3 problèmes principaux de l'avatar (outil 1). */
export function problemesAvatar(p: Profil): string[] {
  const v = p["avatar.problemes"];
  return Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean) : [];
}
