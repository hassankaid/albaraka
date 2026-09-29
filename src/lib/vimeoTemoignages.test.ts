/**
 * Préparation Vimeo des témoignages du site vitrine
 * (supabase/functions/vimeo-preparer-temoignages).
 *
 * Le 29/09/2026, les 19 témoignages affichaient « changez les paramètres de
 * confidentialité » : aucune vidéo n'autorisait le domaine du site, et aucun
 * lien collé ne portait le hash. Ce qui ne doit pas régresser :
 */
import { describe, it, expect } from "vitest";
import {
  DOMAINES_SITE,
  choisirMiniature,
  domainesManquants,
  doublons,
  extraireHash,
} from "../../supabase/functions/vimeo-preparer-temoignages/vimeo";

describe("préparation Vimeo des témoignages", () => {
  it("autorise le domaine du site, qui couvre aussi www. chez Vimeo", () => {
    expect(DOMAINES_SITE).toContain("albarakaecosysteme.com");
  });

  it("n'ajoute que les domaines manquants, sans tenir compte de la casse ni du www.", () => {
    // Une vidéo fraîchement versée : plateforme. et view. seulement.
    expect(domainesManquants(["plateforme.albarakaecosysteme.com", "view.albarakaecosysteme.com"])).toEqual([
      "albarakaecosysteme.com",
    ]);
    // Ce que Vimeo renvoie après l'ajout de www. : le domaine nu. Rien ne manque.
    expect(domainesManquants(["plateforme.albarakaecosysteme.com", "albarakaecosysteme.com"])).toEqual([]);
    expect(domainesManquants(["WWW.ALBARAKAECOSYSTEME.COM", "Plateforme.albarakaecosysteme.com"])).toEqual([]);
  });

  it("lit le hash dans player_embed_url, pas ailleurs", () => {
    expect(extraireHash("https://player.vimeo.com/video/1218417484?h=ed0ba4f77e&app_id=58479")).toBe("ed0ba4f77e");
    expect(extraireHash("https://player.vimeo.com/video/1218417484?app_id=58479")).toBeNull();
    expect(extraireHash(null)).toBeNull();
  });

  it("prend la miniature la plus proche de 640 px, et seulement sur le CDN Vimeo", () => {
    expect(
      choisirMiniature([
        { width: 295, link: "https://i.vimeocdn.com/video/1-d_295x166" },
        { width: 640, link: "https://i.vimeocdn.com/video/1-d_640x360" },
        { width: 1280, link: "https://i.vimeocdn.com/video/1-d_1280x720" },
      ]),
    ).toBe("https://i.vimeocdn.com/video/1-d_640x360");
    expect(choisirMiniature([{ width: 640, link: "https://ailleurs.example/x.jpg" }])).toBeNull();
    expect(choisirMiniature(undefined)).toBeNull();
  });

  it("repère deux témoignages collés sur la même vidéo", () => {
    expect(
      doublons([
        { vimeo_id: "1", prenom: "Aicha" },
        { vimeo_id: "1", prenom: "Fatou" },
        { vimeo_id: "2", prenom: "Saba" },
      ]),
    ).toEqual({ "1": ["Aicha", "Fatou"] });
  });
});
