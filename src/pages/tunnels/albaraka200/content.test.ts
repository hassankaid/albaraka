// Invariants du mur de témoignages du tunnel 200 €/mois.
//
// Mêmes pièges que sur /temoignages, et ils ne se voient qu'en production :
// une vidéo sans hash ne démarre pas, et un cadre aux mauvaises proportions
// ajoute des bandes noires. Autant les attraper ici.
import { describe, it, expect } from "vitest";
import { testimonialKey } from "../lib/testimonials";
import { vimeoEmbedUrl } from "../variants";
import { TEMOIGNAGES_200, CALENDLY_URL, VSL } from "./content";

describe("témoignages du tunnel 200 €/mois", () => {
  it("sont bien les neuf demandés", () => {
    expect(TEMOIGNAGES_200).toHaveLength(9);
  });

  it("portent toutes leur hash Vimeo — sans lui le lecteur refuse de démarrer", () => {
    for (const v of TEMOIGNAGES_200) {
      expect(v.hash, `la vidéo ${v.id} (« ${v.title} ») n'a pas de hash`).toBeTruthy();
      expect(v.hash).toMatch(/^[a-f0-9]{8,}$/);
    }
  });

  it("déclarent des proportions exploitables", () => {
    for (const v of TEMOIGNAGES_200) {
      expect(v.ratio, `« ${v.title} » n'a pas de ratio`).toBeTruthy();
      expect(v.ratio).toMatch(/^\d+(\.\d+)? \/ \d+(\.\d+)?$/);
    }
  });

  it("portent une légende", () => {
    for (const v of TEMOIGNAGES_200) expect(v.title.trim().length).toBeGreaterThan(2);
  });

  it("ne montrent jamais deux fois la même vidéo", () => {
    const cles = TEMOIGNAGES_200.map(testimonialKey);
    expect(new Set(cles).size).toBe(cles.length);
  });
});

describe("agenda du tunnel 200 €/mois", () => {
  it("est un événement distinct de ceux des autres tunnels", () => {
    // Un lien partagé avec un autre tunnel rendrait les rendez-vous
    // indiscernables dans `calls.event_type`.
    expect(CALENDLY_URL).toBe("https://calendly.com/d/d3n4-p7g-trn/al-baraka-200-mois");
  });
});

describe("VSL du tunnel 200 €/mois", () => {
  it("est la vidéo fournie par Hassan le 23/09/2026", () => {
    expect(VSL.vimeoId).toBe("1229186690");
  });

  it("porte son hash — la vidéo est masquée de Vimeo, sans lui rien ne démarre", () => {
    expect(VSL.vimeoHash).toBe("074395f36e");
  });

  it("construit une URL de lecteur qui transporte bien le hash", () => {
    const url = new URL(vimeoEmbedUrl(VSL));
    expect(url.origin + url.pathname).toBe("https://player.vimeo.com/video/1229186690");
    expect(url.searchParams.get("h")).toBe("074395f36e");
  });
});
