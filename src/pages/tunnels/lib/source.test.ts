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
import { captureAttribution, getAttribution, lireAttribution, oublierAttributions, estMarquee } from "./source";
import { clicsPub } from "./api";
import { WA_TUNNEL, VSL_TUNNEL, LIBERTY_TUNNEL } from "../config";

const FONCTION = readFileSync(resolve(process.cwd(), "supabase/functions/tunnel-lead-submit/index.ts"), "utf-8");

function sourcePour(cfg: typeof WA_TUNNEL, recherche: string): string {
  window.history.pushState({}, "", `/x${recherche}`);
  return captureAttribution(cfg).source;
}

beforeEach(() => {
  sessionStorage.clear();
  oublierAttributions();
});

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

describe("identifiants de clic des régies (03/11/2026)", () => {
  // Gardés sur le lead pour renvoyer plus tard la vente à Meta et à Snap.
  it("capte le ScCid de Snap et le fbclid de Meta", () => {
    window.history.pushState({}, "", "/x?src=snap_ads&ScCid=abc-123");
    expect(captureAttribution(WA_TUNNEL).sccid).toBe("abc-123");
    sessionStorage.clear();
    window.history.pushState({}, "", "/x?src=ads&fbclid=IwAR0");
    const a = captureAttribution(WA_TUNNEL);
    expect(a.fbclid).toBe("IwAR0");
    expect(a.sccid).toBeNull();
  });

  it("reconstruit le fbc au format Meta quand le cookie _fbc manque", () => {
    window.history.pushState({}, "", "/x?src=ads&fbclid=IwAR0");
    const a = captureAttribution(WA_TUNNEL);
    const clic = clicsPub(a);
    expect(clic.fbc).toBe(`fb.1.${Date.parse(a.landedAt)}.IwAR0`);
    expect(clicsPub(null)).toEqual({ fbclid: null, fbc: null, fbp: null, sccid: null, scid: null, gclid: null });
  });

  it("tunnel-lead-submit enregistre clic_pub et app_origine", () => {
    expect(FONCTION).toContain("clic_pub,");
    expect(FONCTION).toContain("app_origine,");
  });
});

// 10/11/2026 : sur iPhone, dans les navigateurs de Snapchat/Instagram/Facebook, des
// clics de pub arrivaient « sans source » ; seul sessionStorage gardait l'attribution.
describe("attribution gardée hors sessionStorage", () => {
  it("se relit depuis le cookie quand sessionStorage et la mémoire sont vides", () => {
    window.history.pushState({}, "", "/webinaire?src=snap_ads&utm_source=snapchat&utm_content=pub42&ScCid=abc");
    captureAttribution(WA_TUNNEL);
    sessionStorage.clear();
    // la mémoire de la page vit encore : on la vide pour simuler une page rechargée
    const c = document.cookie;
    oublierAttributions();
    document.cookie = c.split("; ").find((x) => x.startsWith("alb_attr_"))! + "; path=/";
    const { a, origine } = lireAttribution(WA_TUNNEL);
    expect(origine).toBe("cookie");
    expect(a?.source).toBe("webi_wa_snap_ads");
    expect(a?.utm_content).toBe("pub42");
    expect(a?.sccid).toBe("abc");
  });

  it("se relit depuis la mémoire quand sessionStorage est vidé", () => {
    window.history.pushState({}, "", "/webinaire?src=ads&utm_source=ig&fbclid=xyz");
    captureAttribution(WA_TUNNEL);
    sessionStorage.clear();
    expect(lireAttribution(WA_TUNNEL).origine).toBe("memoire");
    expect(getAttribution(WA_TUNNEL)?.fbclid).toBe("xyz");
  });

  it("garde le clic de pub quand la personne revient par le lien nu", () => {
    window.history.pushState({}, "", "/webinaire?src=snap_ads&utm_source=snapchat");
    captureAttribution(WA_TUNNEL);
    window.history.pushState({}, "", "/webinaire");
    expect(captureAttribution(WA_TUNNEL).source).toBe("webi_wa_snap_ads");
  });

  it("note les noms des paramètres vus à l'arrivée", () => {
    window.history.pushState({}, "", "/webinaire?src=ads&utm_source=fb");
    expect(captureAttribution(WA_TUNNEL).paramsVus).toEqual(["src", "utm_source"]);
  });

  it("estMarquee : lien nu non marqué, clic de régie marqué", () => {
    window.history.pushState({}, "", "/webinaire");
    expect(estMarquee(captureAttribution(WA_TUNNEL))).toBe(false);
    oublierAttributions();
    sessionStorage.clear();
    window.history.pushState({}, "", "/webinaire?fbclid=abc");
    expect(estMarquee(captureAttribution(WA_TUNNEL))).toBe(true);
  });
});
