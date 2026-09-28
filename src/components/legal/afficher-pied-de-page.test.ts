/**
 * Où le pied de page légal doit apparaître, et surtout où il ne doit PAS
 * disparaître.
 *
 * Le 28/09/2026, Hassan a demandé de le retirer de la plateforme. La demande
 * était juste — un back-office n'en a pas besoin — mais l'appliquer par
 * DOMAINE l'aurait aussi retiré de /checkout, /pay, /rdv et /quiz, qui sont
 * servis par le même hôte et qui sont précisément les pages que les
 * publicités désignent.
 *
 * Ce test existe pour que personne ne refasse ce raccourci.
 */
import { describe, it, expect } from "vitest";
import { afficherPiedDePage } from "./afficher-pied-de-page";

describe("les pages qui DOIVENT porter le pied de page", () => {
  // Chacune est soit une page de paiement, soit une page de capture visée par
  // une publicité, soit une page légale.
  const publiques = [
    "/checkout", "/checkout/8", "/checkout/al-baraka-200/12",
    "/checkout/formation/setting/3",
    "/liberty", "/liberty/4", "/pay/abc123", "/acompte/500",
    "/rebill/tok", "/update-card/tok", "/merci", "/merci-liberty", "/merci-acompte", "/verify/AB-2026-001",
    "/rdv", "/rdv/coordonnees", "/rdv-rediffusion/questions",
    "/quiz/decouvretonbusiness", "/questionnaire", "/questionnaire/jeton",
    "/mentions-legales", "/politique-de-confidentialite",
    "/conditions-generales-de-vente",
    "/webinaire", "/vsl", "/al-baraka-200", "/temoignages", "/video-1",
    "/desabonnement",
  ];
  for (const chemin of publiques) {
    it(`${chemin}`, () => expect(afficherPiedDePage(chemin)).toBe(true));
  }
});

describe("les pages internes ne l'ont pas", () => {
  const internes = [
    "/dashboard", "/leads", "/calls", "/contacts", "/sales", "/payments",
    "/my-commissions", "/admin/payment-links", "/admin/conferences",
    "/working/activity", "/working/lien-de-paiement", "/training",
    "/my-space", "/my-space/leads", "/parcours/al-baraka", "/studio",
    "/profile", "/login",
  ];
  for (const chemin of internes) {
    it(`${chemin}`, () => expect(afficherPiedDePage(chemin)).toBe(false));
  }
});

describe("les cas limites", () => {
  it("ignore la chaîne de requête et l'ancre", () => {
    expect(afficherPiedDePage("/checkout/8?start=2026-10-01")).toBe(true);
    expect(afficherPiedDePage("/mentions-legales#article-3")).toBe(true);
  });

  it("ne confond pas un préfixe avec un mot plus long", () => {
    // « /payments » ne doit pas passer pour « /pay ».
    expect(afficherPiedDePage("/payments")).toBe(false);
    expect(afficherPiedDePage("/pay/abc")).toBe(true);
  });

  it("n'affiche rien sur le domaine d'impersonation, même sur une page publique", () => {
    expect(afficherPiedDePage("/checkout/8", true)).toBe(false);
  });

  it("tolère une entrée vide", () => {
    expect(afficherPiedDePage("")).toBe(false);
  });
});
