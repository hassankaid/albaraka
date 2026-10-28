import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { cleDepuisLibelle, estAds, libelleCanal, sourcesProches, type Canal } from "./leadSources";
import { leadSourceConfig } from "./leadConfig";

const canal = (cle: string, libelle: string, groupe: Canal["groupe"]): Canal => ({ cle, libelle, groupe, couleur: "gray", actif: true, ordre: 1, systeme: false, desactive_le: null });
const canaux = [canal("meta_ads", "Meta Ads", "ads"), canal("apporteur", "Apporteur", "apporteur"), canal("sidali", "Organique Sidali", "organique")];

describe("sources des leads", () => {
  it("affiche le canal et sa précision", () => {
    expect(libelleCanal({ canal: "meta_ads", canal_precision: "Instagram" }, canaux)).toBe("Meta Ads · Instagram");
    expect(libelleCanal({ canal: "apporteur", canal_precision: "TikTok" }, canaux)).toBe("Apporteur · TikTok");
    expect(libelleCanal({ canal: "inconnu" }, canaux)).toBe("inconnu");
  });

  it("range les canaux Ads à part", () => {
    expect(estAds({ canal: "meta_ads" }, canaux)).toBe(true);
    expect(estAds({ canal: "sidali" }, canaux)).toBe(false);
    expect(estAds({ canal: null }, canaux)).toBe(false);
  });

  it("fabrique la clé d'une nouvelle source comme la base", () => {
    expect(cleDepuisLibelle("LinkedIn Ads")).toBe("linkedin_ads");
    expect(cleDepuisLibelle(" Partenariat Mosquée Évry ")).toBe("partenariat_mosquee_evry");
  });

  it("repère les sources au nom proche", () => {
    expect(sourcesProches("Meta Ads 2", canaux).map((c) => c.cle)).toEqual(["meta_ads"]);
    expect(sourcesProches("Snap", canaux)).toEqual([]);
  });

  it("chaque ancienne clé de source a sa correspondance en base", () => {
    const sql = readFileSync("supabase/migrations/20261028120000_lead_canaux_tunnels.sql", "utf-8");
    const bloc = sql.match(/insert into public\.lead_sources_map[\s\S]*?on conflict/)![0];
    for (const cle of Object.keys(leadSourceConfig)) expect(bloc, cle).toContain(`('${cle}',`);
  });
});
