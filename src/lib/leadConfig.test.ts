/**
 * Contrat entre ce qui est ÉCRIT en base et ce que le CRM sait afficher.
 *
 * Le 24/08/2026, des leads publicitaires du tunnel VSL apparaissaient sous
 * l'onglet « Organique » avec, pour libellé, leur clé brute `webi_vsl_ads`.
 * Ni bug d'affichage isolé ni donnée fausse : les 8 sources des tunnels
 * avaient été déclarées côté base (`leads_source_check`) et côté edge fn
 * (`tunnel-lead-submit`) sans l'être ici. Or `isAdsSource()` range dans
 * « Organique » TOUT ce qu'il ne reconnaît pas — un lead payant se retrouvait
 * donc dans la mauvaise file d'affectation, en silence.
 *
 * D'où ce test : la liste des sources qu'un tunnel peut écrire est lue dans
 * l'edge fn elle-même, pas recopiée. Ajouter un tunnel sans l'apprendre au CRM
 * fera échouer la suite au lieu de se voir en production trois semaines plus tard.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { leadSourceConfig, SOURCE_GROUPS, isAdsSource, getSourceLabel } from "./leadConfig";

/** Les sources que l'edge fn accepte d'écrire dans `leads.source`. */
function sourcesEcritesParLesTunnels(): string[] {
  const src = readFileSync("supabase/functions/tunnel-lead-submit/index.ts", "utf-8");
  const bloc = src.match(/const ALLOWED_SOURCES = new Set\(\[([\s\S]*?)\]\)/);
  if (!bloc) throw new Error("ALLOWED_SOURCES introuvable dans tunnel-lead-submit");
  return [...bloc[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

const toutesLesSourcesDesGroupes = SOURCE_GROUPS.flatMap((g) => [...g.sources]);

describe("sources des tunnels natifs", () => {
  const sources = sourcesEcritesParLesTunnels();

  it("l'edge fn en déclare bien 8 — sinon ce test ne prouverait rien", () => {
    expect(sources).toHaveLength(8);
  });

  it.each(sources)("« %s » a un libellé lisible dans le CRM", (source) => {
    expect(leadSourceConfig[source], `aucun libellé pour ${source}`).toBeTruthy();
    // Sans entrée, `getSourceLabel` renvoie la clé brute : c'est ce que Hassan
    // voyait s'afficher comme un tag technique dans la liste des leads.
    expect(getSourceLabel(source)).not.toBe(source);
  });

  it.each(sources)("« %s » appartient à exactement un groupe", (source) => {
    const groupes = SOURCE_GROUPS.filter((g) => (g.sources as readonly string[]).includes(source));
    expect(groupes.map((g) => g.label)).toHaveLength(1);
  });

  it("classe en Ads ce qui vient des ads, et seulement cela", () => {
    for (const source of sources) {
      // Le suffixe `_ads` est posé par tunnels/lib/source.ts quand le lien
      // porte `?src=ads` — c'est la seule provenance payante.
      expect(isAdsSource(source), `${source} mal classé`).toBe(source.endsWith("_ads"));
    }
  });

  it("laisse le trafic « direct » hors des Ads", () => {
    // Arrivée sans `?src=` : origine inconnue. La créditer aux ads gonflerait
    // leur performance et enverrait le lead dans la mauvaise file.
    expect(isAdsSource("webi_vsl_direct")).toBe(false);
    expect(isAdsSource("webi_wa_direct")).toBe(false);
  });
});

describe("cohérence interne du référentiel de sources", () => {
  it("chaque source libellée est rangée dans un groupe, et réciproquement", () => {
    // Les deux moitiés du bug : un libellé sans groupe se range en Organique
    // par défaut ; un groupe sans libellé affiche la clé brute.
    expect([...toutesLesSourcesDesGroupes].sort()).toEqual(Object.keys(leadSourceConfig).sort());
  });

  it("ne range aucune source dans deux groupes à la fois", () => {
    expect(new Set(toutesLesSourcesDesGroupes).size).toBe(toutesLesSourcesDesGroupes.length);
  });
});
