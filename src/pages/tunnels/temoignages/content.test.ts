/**
 * Intégrité du contenu RÉELLEMENT publié.
 *
 * Les tests de rendu montent la page avec du contenu simulé : ils vérifient la
 * mécanique, pas ce qui part en ligne. Ce fichier-ci lit les vraies listes.
 *
 * Il garde des fautes qui ne se voient qu'en production, et tard :
 *  - un hash Vimeo oublié → le lecteur refuse de démarrer, les vidéos du
 *    compte étant réglées « masquée de Vimeo » ;
 *  - une capture référencée mais absente de `public/` → cadre vide ;
 *  - un montant écrit avec une espace ordinaire → coupure en fin de ligne.
 */

import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { TEMOIGNAGES, testimonialKey } from "./content";
import { COMPILATION } from "../lib/testimonials";
import { LANDING_TESTIMONIALS } from "../components/TunnelLanding";

const tous = [...TEMOIGNAGES, ...LANDING_TESTIMONIALS];
const captures = TEMOIGNAGES.filter((t) => t.kind === "capture");
const videos = [...tous.filter((t) => t.kind !== "capture"), COMPILATION];

describe("captures publiées", () => {
  it("pointent toutes vers un fichier réellement présent dans public/", () => {
    expect(captures.length).toBeGreaterThan(0);
    for (const c of captures) {
      expect(c.src.startsWith("/")).toBe(true);
      const onDisk = resolve(__dirname, "../../../../public", c.src.slice(1));
      expect(existsSync(onDisk), `${c.src} est introuvable dans public/`).toBe(true);
    }
  });
});

describe("vidéos publiées", () => {
  it("ont toutes leur hash Vimeo — sans lui le lecteur refuse de démarrer", () => {
    for (const v of videos) {
      if (v.kind !== "vimeo") continue;
      expect(v.hash, `la vidéo ${v.id} (« ${v.title} ») n'a pas de hash`).toBeTruthy();
      expect(v.hash).toMatch(/^[a-f0-9]{8,}$/);
    }
  });

  it("déclarent des proportions exploitables", () => {
    for (const v of videos) {
      expect(v.ratio, `« ${v.title} » n'a pas de ratio`).toBeTruthy();
      expect(v.ratio).toMatch(/^\d+(\.\d+)? \/ \d+(\.\d+)?$/);
    }
  });
});

describe("le mur", () => {
  it("porte une légende sur chaque tuile", () => {
    for (const t of tous) expect(t.title.trim().length).toBeGreaterThan(5);
  });

  it("écrit les montants à la française — insécable avant l'euro", () => {
    // Deux raisons : la règle typographique, et surtout qu'un montant ne se
    // coupe pas en fin de ligne (« 6.656 » d'un côté, « € » de l'autre).
    // Ce test vérifie aussi que la séquence `\u00A0` du fichier source est
    // bien interprétée : une insécable écrite en clair se perd au premier
    // copier-coller, et rien ne le signalerait autrement.
    for (const t of tous) {
      for (const m of t.title.matchAll(/(.)€/g)) {
        expect(m[1], `« ${t.title} » : caractère ${JSON.stringify(m[1])} avant l'euro`).toBe("\u00A0");
      }
    }
  });

  it("ne montre jamais deux fois le même témoignage", () => {
    for (const liste of [TEMOIGNAGES, LANDING_TESTIMONIALS]) {
      const cles = liste.map(testimonialKey);
      expect(new Set(cles).size).toBe(cles.length);
    }
  });

  it("alterne les supports plutôt que de grouper les captures", () => {
    // Une enfilade de vidéos suivie des captures reproduirait, dans l'ordre
    // de lecture, la séparation par support qu'on vient justement de retirer.
    const positions = TEMOIGNAGES.map((t, i) => (t.kind === "capture" ? i : -1)).filter((i) => i >= 0);
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i] - positions[i - 1], "deux captures se suivent").toBeGreaterThan(1);
    }
  });
});

describe("la compilation", () => {
  it("n'apparaît pas AUSSI dans le mur — elle serait montrée deux fois", () => {
    const cle = testimonialKey(COMPILATION);
    expect(TEMOIGNAGES.map(testimonialKey)).not.toContain(cle);
    expect(LANDING_TESTIMONIALS.map(testimonialKey)).not.toContain(cle);
  });
});

describe("landing et page témoignages", () => {
  it("réutilisent les mêmes vidéos, avec les mêmes proportions", () => {
    // Les six vidéos de la landing sont, fichier pour fichier, six de celles
    // de la page témoignages — seule la légende diffère. Si l'une des deux
    // listes dérive, c'est que quelqu'un a remplacé une vidéo d'un seul côté.
    const parRatio = new Map(
      TEMOIGNAGES.filter((t) => t.kind === "vimeo").map((t) => [(t as { id: string }).id, t.ratio]),
    );
    for (const v of LANDING_TESTIMONIALS) {
      if (v.kind !== "vimeo") continue;
      expect(parRatio.has(v.id), `la vidéo ${v.id} de la landing est absente de la page témoignages`).toBe(true);
      expect(v.ratio).toBe(parRatio.get(v.id));
    }
  });
});
