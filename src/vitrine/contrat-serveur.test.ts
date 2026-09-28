/**
 * Le formulaire du site vitrine et `tunnel-lead-submit` doivent parler la
 * même langue.
 *
 * Deux dérives possibles, et aucune ne se voit :
 *  • la source `site_vitrine` absente d'un des trois endroits — la fonction
 *    la rangerait en silence en `webi_wa_direct`, un inscrit à la conférence ;
 *  • une réponse « Où en êtes-vous ? » retouchée d'un côté seulement — la
 *    fonction l'ignorerait, et le setter perdrait l'information.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { FORMULAIRE } from "./contenu";
import { SOURCE_SITE_VITRINE } from "./api";
import { leadSourceConfig, isAdsSource } from "@/lib/leadConfig";
import { lireLienVimeo } from "./temoignages";

const racine = process.cwd();
const FONCTION = readFileSync(resolve(racine, "supabase/functions/tunnel-lead-submit/index.ts"), "utf-8");

describe("contrat site vitrine ↔ tunnel-lead-submit", () => {
  it("la fonction accepte la source du site", () => {
    const bloc = FONCTION.slice(FONCTION.indexOf("const ALLOWED_SOURCES"), FONCTION.indexOf("]);", FONCTION.indexOf("const ALLOWED_SOURCES")));
    expect(bloc).toContain(`"${SOURCE_SITE_VITRINE}"`);
  });

  it("la contrainte leads_source_check et le classement marketing la connaissent", () => {
    const dossier = resolve(racine, "supabase/migrations");
    const migration = readdirSync(dossier)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readFileSync(resolve(dossier, f), "utf-8"))
      .find((t) => t.includes("'site_vitrine'") && t.includes("leads_source_check"));
    expect(migration, "aucune migration n'ajoute site_vitrine à leads_source_check").toBeDefined();
    expect(migration).toMatch(/when p_source = 'site_vitrine'\s+then 'site_vitrine_organic'/);
  });

  it("les trois réponses de la liste sont identiques des deux côtés", () => {
    const bloc = FONCTION.slice(FONCTION.indexOf("const SITUATIONS_VITRINE"), FONCTION.indexOf("]);", FONCTION.indexOf("const SITUATIONS_VITRINE")));
    const cote_serveur = [...bloc.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(cote_serveur).toEqual([...FORMULAIRE.situations]);
  });

  it("le CRM affiche « Site vitrine » et le range en organique", () => {
    expect(leadSourceConfig[SOURCE_SITE_VITRINE]?.label).toBe("Site vitrine");
    expect(isAdsSource(SOURCE_SITE_VITRINE)).toBe(false);
  });
});

describe("lien Vimeo collé dans l'administration", () => {
  it("lit l'identifiant et le hash sous toutes les formes courantes", () => {
    expect(lireLienVimeo("https://vimeo.com/123456789/abcdef1234")).toEqual({ vimeoId: "123456789", hash: "abcdef1234" });
    expect(lireLienVimeo("https://player.vimeo.com/video/123456789?h=abcdef1234&badge=0")).toEqual({ vimeoId: "123456789", hash: "abcdef1234" });
    expect(lireLienVimeo("https://vimeo.com/123456789?share=copy")).toEqual({ vimeoId: "123456789", hash: null });
    expect(lireLienVimeo(" 123456789 ")).toEqual({ vimeoId: "123456789", hash: null });
  });
  it("refuse ce qui n'est pas un lien Vimeo", () => {
    expect(lireLienVimeo("https://youtube.com/watch?v=123456789")).toBeNull();
    expect(lireLienVimeo("https://vimeo.com.attaquant.fr/123456789")).toBeNull();
    expect(lireLienVimeo("bonjour")).toBeNull();
  });
});
