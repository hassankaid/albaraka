/**
 * Répartition des témoignages entre les colonnes du mur.
 *
 * C'est la correction d'un défaut visible : les colonnes CSS laissaient la 3e
 * s'arrêter 722 px avant les autres — mesuré sur le build de production, un
 * grand vide en bas à droite. Les hauteurs étant connues d'avance, la
 * répartition est calculable, et donc vérifiable ici.
 */

import { describe, it, expect } from "vitest";
import { hauteurRelative, repartirEnColonnes, type Testimonial } from "./testimonials";
import { TEMOIGNAGES } from "../temoignages/content";

const v = (id: string, ratio?: string): Testimonial => ({ kind: "vimeo", id, hash: "abcdef12", ratio, title: `Vidéo ${id}` });

/** Hauteur d'une colonne, dans la même unité que `hauteurRelative`. */
const hauteur = (col: Testimonial[]) => col.reduce((s, t) => s + hauteurRelative(t), 0);

describe("hauteurRelative", () => {
  it("déduit la hauteur des proportions déclarées", () => {
    // « 9 / 16 » = deux fois moins large que haut : ~1,78 × la largeur.
    expect(hauteurRelative(v("1", "9 / 16"))).toBeCloseTo(16 / 9 + 0.22, 5);
    expect(hauteurRelative(v("2", "4 / 3"))).toBeCloseTo(3 / 4 + 0.22, 5);
  });

  it("retombe sur 16/9 quand rien n'est déclaré ou que la valeur est aberrante", () => {
    const defaut = 9 / 16 + 0.22;
    expect(hauteurRelative(v("3"))).toBeCloseTo(defaut, 5);
    expect(hauteurRelative(v("4", "0 / 0"))).toBeCloseTo(defaut, 5);
    expect(hauteurRelative(v("5", "n'importe quoi"))).toBeCloseTo(defaut, 5);
  });

  it("compte la légende, sinon les tuiles courtes seraient sous-estimées", () => {
    expect(hauteurRelative(v("6", "1 / 1"))).toBeGreaterThan(1);
  });
});

describe("repartirEnColonnes", () => {
  it("ne perd ni ne duplique aucune tuile", () => {
    const items = [v("a", "9 / 16"), v("b", "4 / 3"), v("c", "1 / 1"), v("d", "9 / 16"), v("e", "4 / 3")];
    const cols = repartirEnColonnes(items, 3);

    expect(cols).toHaveLength(3);
    const plat = cols.flat();
    expect(plat).toHaveLength(items.length);
    expect(new Set(plat.map((t) => (t.kind === "vimeo" ? t.id : t.src))).size).toBe(items.length);
  });

  it("rend l'ordre inchangé sur une seule colonne", () => {
    const items = [v("a"), v("b"), v("c")];
    expect(repartirEnColonnes(items, 1)).toEqual([items]);
  });

  it("se protège d'un nombre de colonnes absurde", () => {
    const items = [v("a"), v("b")];
    expect(repartirEnColonnes(items, 0)).toHaveLength(1);
    expect(repartirEnColonnes(items, -3)).toHaveLength(1);
    expect(repartirEnColonnes(items, 2.7).length).toBe(2);
  });

  it("place la tuile suivante dans la colonne la plus courte", () => {
    // Une très haute puis deux courtes : les courtes doivent aller ailleurs.
    const haute = v("haute", "9 / 16");
    const courte1 = v("c1", "4 / 3");
    const courte2 = v("c2", "4 / 3");
    const [a, b] = repartirEnColonnes([haute, courte1, courte2], 2);

    expect(a.map((t) => (t as { id: string }).id)).toEqual(["haute"]);
    expect(b.map((t) => (t as { id: string }).id)).toEqual(["c1", "c2"]);
  });

  it("équilibre le contenu réellement publié — c'est le défaut corrigé", () => {
    for (const n of [2, 3]) {
      const cols = repartirEnColonnes(TEMOIGNAGES, n);
      const hauteurs = cols.map(hauteur);
      const ecart = Math.max(...hauteurs) - Math.min(...hauteurs);
      // L'écart doit rester sous la hauteur de la PLUS PETITE tuile : au-delà,
      // c'est qu'une tuile aurait pu être déplacée pour combler le vide.
      const plusPetite = Math.min(...TEMOIGNAGES.map(hauteurRelative));
      expect(ecart, `${n} colonnes : écart de ${ecart.toFixed(2)} largeur(s)`).toBeLessThan(plusPetite);
    }
  });
});
