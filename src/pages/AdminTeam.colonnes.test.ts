/**
 * Le colSpan des lignes vides doit suivre le nombre réel de colonnes.
 *
 * En ajoutant la colonne « Présence » le 28/09/2026, le colSpan des états
 * « aucun membre » et « chargement » est resté à l'ancienne valeur : le
 * message se serait affiché sur 6 colonnes au lieu de 7, laissant une cellule
 * vide au bout du tableau.
 *
 * Personne ne le voit tant que la liste n'est pas vide — c'est-à-dire jamais
 * en usage normal, et systématiquement au premier filtre qui ne renvoie rien.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const SRC = readFileSync("src/pages/AdminTeam.tsx", "utf-8");

const entete = SRC.slice(SRC.indexOf("<TableHeader>"), SRC.indexOf("</TableHeader>"));
/** Colonnes toujours présentes + celle qui n'apparaît que pour les collaborateurs. */
const colonnes = (entete.match(/<TableHead[ >]/g) ?? []).length;
const conditionnelles = (entete.match(/tab === "collaborateurs" && <TableHead/g) ?? []).length;

describe("le tableau de l'équipe", () => {
  it("déclare bien une colonne conditionnelle (Niveau)", () => {
    expect(conditionnelles).toBe(1);
  });

  it("aligne le colSpan sur le nombre de colonnes des deux onglets", () => {
    const collaborateurs = colonnes;              // toutes, Niveau comprise
    const apporteurs = colonnes - conditionnelles; // sans Niveau
    const attendu = `colSpan={tab === "collaborateurs" ? ${collaborateurs} : ${apporteurs}}`;
    expect(SRC).toContain(attendu);
  });

  it("applique le même colSpan à tous les états vides", () => {
    const trouves = [...SRC.matchAll(/colSpan=\{tab === "collaborateurs" \? (\d+) : (\d+)\}/g)];
    expect(trouves.length).toBeGreaterThanOrEqual(2);
    const distincts = new Set(trouves.map((m) => `${m[1]}/${m[2]}`));
    expect(distincts.size, "des colSpan divergents entre les états vides").toBe(1);
  });
});
