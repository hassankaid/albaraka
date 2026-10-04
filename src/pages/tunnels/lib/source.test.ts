/**
 * Lien d'entrée → source CRM.
 *
 * Le libellé du lead vient UNIQUEMENT du `?src=` du lien cliqué. Une valeur
 * inconnue est rétrogradée en « direct » par tunnel-lead-submit, sans erreur :
 * l'origine du lead serait perdue en silence. Surtout pour les régies payantes
 * ajoutées le 30/09/2026 (TikTok Ads, Snap Ads), qu'il ne faut confondre ni
 * avec Meta (`ads`) ni avec le TikTok gratuit (`tiktok`).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { captureAttribution } from "./source";
import { WA_TUNNEL, VSL_TUNNEL, LIBERTY_TUNNEL } from "../config";

const FONCTION = readFileSync(resolve(process.cwd(), "supabase/functions/tunnel-lead-submit/index.ts"), "utf-8");

function sourcePour(cfg: typeof WA_TUNNEL, recherche: string): string {
  window.history.pushState({}, "", `/x${recherche}`);
  return captureAttribution(cfg).source;
}

beforeEach(() => sessionStorage.clear());

describe("liens d'entrée des régies publicitaires", () => {
  it.each([
    ["?src=ads", "webi_wa_ads"],
    ["?src=tiktok_ads", "webi_wa_tiktok_ads"],
    ["?src=snap_ads", "webi_wa_snap_ads"],
    ["?src=snapchat_ads", "webi_wa_snap_ads"],
    ["?src=tiktok", "webi_wa_tiktok_organic"],
    ["", "webi_wa_direct"],
  ])("tunnel WhatsApp %s → %s", (recherche, attendu) => {
    expect(sourcePour(WA_TUNNEL, recherche)).toBe(attendu);
  });

  it("vaut aussi pour les tunnels VSL et Liberty", () => {
    expect(sourcePour(VSL_TUNNEL, "?src=tiktok_ads")).toBe("webi_vsl_tiktok_ads");
    expect(sourcePour(LIBERTY_TUNNEL, "?src=snap_ads")).toBe("liberty_snap_ads");
  });

  it.each(["webi_wa", "webi_vsl", "liberty"])("tunnel-lead-submit accepte les sources payantes de %s", (tunnel) => {
    // Sinon le filet silencieux de la fonction les rangerait en « direct ».
    for (const regie of ["tiktok_ads", "snap_ads", "google_ads"]) expect(FONCTION).toContain(`"${tunnel}_${regie}"`);
  });
});

describe("filet de sécurité : le lien Meta collé dans une pub Snap ou TikTok", () => {
  // Constaté le 02/10/2026 : 7 leads Snap avec ?src=ads&utm_source=snapchat,
  // comptés comme du Meta. utm_source désigne la vraie régie : elle l'emporte.
  it.each([
    ["?src=ads&utm_source=snapchat&utm_medium=paid", "webi_wa_snap_ads"],
    ["?src=ads&utm_source=Snap", "webi_wa_snap_ads"],
    ["?src=ads&utm_source=tiktok", "webi_wa_tiktok_ads"],
    ["?src=ads&utm_source=facebook", "webi_wa_ads"],
    ["?src=ads&utm_source=instagram", "webi_wa_ads"],
    ["?src=ads", "webi_wa_ads"],
  ])("%s → %s", (recherche, attendu) => {
    expect(sourcePour(WA_TUNNEL, recherche)).toBe(attendu);
  });

  it("ne touche pas au trafic gratuit : ?src=tiktok reste organique, même avec utm_source=tiktok", () => {
    expect(sourcePour(WA_TUNNEL, "?src=tiktok&utm_source=tiktok")).toBe("webi_wa_tiktok_organic");
    expect(sourcePour(VSL_TUNNEL, "?src=ads&utm_source=snapchat")).toBe("webi_vsl_snap_ads");
  });
});

describe("Google Ads (04/10/2026)", () => {
  it.each([
    ["?src=google_ads", "webi_wa_google_ads"],
    ["?src=gads", "webi_wa_google_ads"],
    // Taggage automatique : Google ajoute gclid (gbraid/wbraid sur iOS) à
    // chaque clic. C'est la preuve d'une pub Google, même avec le lien Meta
    // ou sans aucun ?src=.
    ["?gclid=abc", "webi_wa_google_ads"],
    ["?src=ads&gclid=abc", "webi_wa_google_ads"],
    ["?src=ads&gbraid=abc", "webi_wa_google_ads"],
    ["?wbraid=abc", "webi_wa_google_ads"],
    ["?src=ads&utm_source=google", "webi_wa_google_ads"],
    // Un ?src= explicite d'une autre origine garde la main.
    ["?src=tiktok_ads&gclid=abc", "webi_wa_tiktok_ads"],
    ["?src=youtube&gclid=abc", "webi_wa_youtube_organic"],
  ])("%s → %s", (recherche, attendu) => {
    expect(sourcePour(WA_TUNNEL, recherche)).toBe(attendu);
  });

  it("vaut pour les trois tunnels", () => {
    expect(sourcePour(VSL_TUNNEL, "?src=google_ads")).toBe("webi_vsl_google_ads");
    expect(sourcePour(LIBERTY_TUNNEL, "?gclid=abc")).toBe("liberty_google_ads");
  });

  it("garde le clic Google sur l'attribution, et la fonction l'inscrit dans les notes du lead", () => {
    window.history.pushState({}, "", "/x?src=google_ads&gclid=Cj0KCQ");
    expect(captureAttribution(WA_TUNNEL).gclid).toBe("Cj0KCQ");
    expect(FONCTION).toContain("noteParts.push(`gclid=${gclid}`)");
  });

  it("une visite sans paramètre ne remplace pas une arrivée par clic Google", () => {
    sourcePour(WA_TUNNEL, "?gclid=abc");
    expect(sourcePour(WA_TUNNEL, "")).toBe("webi_wa_google_ads");
  });
});
