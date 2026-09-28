/**
 * L'en-tête et les lignes du tableau de suivi doivent décrire les mêmes
 * colonnes.
 *
 * Le 28/09/2026, j'ai élargi la colonne de présence en réduisant celle des
 * quiz — mais seulement dans l'en-tête. Les lignes totalisaient 13 sur une
 * grille de 12 : la dernière cellule passait à la ligne suivante et
 * s'affichait sous le nom de l'élève, décalée de son intitulé.
 *
 * Rien ne le signale : pas d'erreur, pas d'avertissement, la page se charge.
 * Il faut le voir. D'où ce test, qui lit la source et compte.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const SRC = readFileSync("src/pages/admin/training/AdminStudentTracking.tsx", "utf-8");

function spans(bloc: string): number[] {
  return [...bloc.matchAll(/col-span-(\d+)/g)].map((m) => Number(m[1]));
}

const debutEntete = SRC.indexOf("md:grid-cols-12 gap-3 px-4 py-3");
const debutLignes = SRC.indexOf("{/* Rows */}");
// La borne de fin se cherche À PARTIR du début du bloc : </CardContent>
// apparaît plus haut dans le fichier, et un indexOf global renvoyait une
// tranche vide — le test passait alors pour une mauvaise raison.
const finLignes = SRC.indexOf("</CardContent>", debutLignes);

const entete = SRC.slice(debutEntete, debutLignes);
const lignes = SRC.slice(debutLignes, finLignes);

describe("le tableau de suivi", () => {
  it("a un en-tête qui remplit exactement la grille de 12", () => {
    expect(spans(entete).reduce((a, b) => a + b, 0)).toBe(12);
  });

  it("a des lignes qui remplissent exactement la grille de 12", () => {
    // Au-delà de 12, la dernière cellule passe à la ligne et se retrouve
    // sous le nom de l'élève, loin de son intitulé.
    expect(spans(lignes).reduce((a, b) => a + b, 0)).toBe(12);
  });

  it("aligne chaque cellule sur la colonne annoncée", () => {
    expect(spans(lignes)).toEqual(spans(entete));
  });
});
