// L'offre « Al Baraka 200 €/mois » se vend sur deux chemins qui se ressemblent
// dangereusement :
//   - event.albarakaecosysteme.com/al-baraka-200 → le tunnel de vente
//   - plateforme.albarakaecosysteme.com/checkout/al-baraka-200/<N> → le paiement
//
// vercel.json renvoie vers introuvable.html TOUT ce qui commence par
// `/al-baraka-200` sur les domaines de l'app. Poser la page de paiement sous
// ce préfixe — le réflexe naturel — la remplacerait par une page d'erreur,
// en silence : le build passe, les tests passent, et le lien envoyé au client
// affiche « page introuvable » au moment de payer.
//
// Ce test verrouille le chemin réel, celui que l'admin met dans le presse-papier.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildOfferPath } from "@/pages/admin/payment-links/CatalogueTab";
import type { Offer } from "@/hooks/useOffers";

interface Rewrite {
  source: string;
  destination: string;
  has?: Array<{ type: string; value: string }>;
}

const config = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf-8")) as {
  rewrites: Rewrite[];
};

const pourHote = (r: Rewrite) => r.has?.find((h) => h.type === "host")?.value ?? "";

const offre = (category: Offer["category"], slug = "al-baraka-200"): Offer =>
  ({ category, slug }) as Offer;

describe("chemin de paiement de l'offre 200 €/mois", () => {
  it("passe par /checkout/, pas par /al-baraka-200/", () => {
    const chemin = buildOfferPath(offre("al_baraka_200"), 12);
    expect(chemin).toBe("/checkout/al-baraka-200/12");
    expect(chemin.startsWith("/al-baraka-200")).toBe(false);
  });

  it("survit aux règles vercel qui masquent les tunnels sur le domaine de l'app", () => {
    const chemin = buildOfferPath(offre("al_baraka_200"), 12);
    for (const r of config.rewrites) {
      if (r.destination !== "/introuvable.html") continue;
      if (!pourHote(r).includes("plateforme")) continue;
      const regle = new RegExp(`^${r.source}$`);
      expect(
        regle.test(chemin),
        `la règle « ${r.source} » renverrait ${chemin} vers introuvable.html`,
      ).toBe(false);
    }
  });

  it("laisse les autres offres sur leurs chemins existants", () => {
    expect(buildOfferPath(offre("al_baraka", "al-baraka"), 8)).toBe("/checkout/8");
    expect(buildOfferPath(offre("liberty", "liberty"), 10)).toBe("/liberty/10");
    expect(buildOfferPath(offre("a_la_carte", "closing"), 3)).toBe("/checkout/formation/closing/3");
  });
});
