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
    for (const regie of ["tiktok_ads", "snap_ads"]) expect(FONCTION).toContain(`"${tunnel}_${regie}"`);
  });
});
