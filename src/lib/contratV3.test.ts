/**
 * Contrats v3 (13/11/2026) : textes du contrat, des cases et de l'attestation
 * (supabase/functions/_shared/contrat_v3.ts), partagés par la page de paiement
 * et le serveur qui produit le PDF.
 */
import { describe, expect, it } from "vitest";
import {
  casesV3,
  construireAttestationV3,
  contratDepuisCommande,
  echeancesDe,
  construireContratV3,
  dateHeureParis,
  estCompactV3,
  euros,
  lireCompact,
  nomModule,
  numeroContratV3,
  objetEmailV3,
  texteCase,
  type DonneesContratV3,
} from "../../supabase/functions/_shared/contrat_v3";

const base: DonneesContratV3 = {
  offre: "pass",
  numero: "ALB-PASS-CTR-2026-11-0012",
  client: { nom: "Prénom Nom", adresse: "1 rue de la Paix, 75001 Paris, France", email: "client@example.com", telephone: "+33600000000" },
  prixTotal: 2000,
  tarif: "Tarif conférence",
  reduction: 1000,
  nbEcheances: 3,
  montantEcheance: 666.66,
  montantDerniere: 666.68,
  datePremierPaiement: "2026-11-13",
};

const texteComplet = (d: DonneesContratV3) => {
  const c = construireContratV3(d);
  return [c.titre, c.numeroLigne, ...c.articles.flatMap((a) => [a.titre, ...a.blocs.map((b) => b.texte)]), ...c.confirmation.lignes, ...c.confirmation.cases.map((x) => x.texte)].join("\n");
};

describe("cases à cocher v3", () => {
  it("Pass : les 6 cases du cahier des charges, la 1re portant aussi le contrat", () => {
    const t = casesV3("pass").map(texteCase);
    expect(t).toEqual([
      "J'ai lu et j'accepte le contrat et les Conditions générales de vente.",
      "Je demande l'accès immédiat aux contenus numériques du programme Pass AL BARAKA et je reconnais perdre mon droit de rétractation dès l'activation de cet accès, conformément à l'article L. 221-28, 13° du Code de la consommation.",
      "J'ai pris connaissance du contenu du programme et de sa durée d'accès garantie de douze (12) mois.",
      "J'ai compris que l'accompagnement et la communauté me sont offerts à titre gracieux et ne sont pas inclus dans le prix.",
      "Je m'engage à régler l'intégralité du prix selon la modalité convenue.",
      "Je m'engage à respecter la confidentialité des contenus du programme.",
    ]);
  });
  it("À la carte : 5 cases, sans accompagnement, au nom du module", () => {
    const c = casesV3("carte", "Formation CLOSING");
    expect(c.map((x) => x.id)).not.toContain("accompagnement_offert");
    expect(texteCase(c[1])).toContain("du module « CLOSING »");
  });
  it("reconnaît une commande v3 par sa case 1, et lit les heures ISO sans les couper", () => {
    const compact = "contrat_cgv:2026-11-13T10:00:01.000Z|acces_immediat:2026-11-13T10:00:02.000Z";
    expect(estCompactV3(compact)).toBe(true);
    expect(estCompactV3("accepte_cgv:2026-11-01T10:00:00Z")).toBe(false);
    expect(lireCompact(compact).acces_immediat).toBe("2026-11-13T10:00:02.000Z");
  });
});

describe("contrat v3", () => {
  it("n'emploie jamais le mot « formation », pour aucune offre", () => {
    for (const offre of ["pass", "liberty", "carte"] as const) {
      expect(texteComplet({ ...base, offre, module: "Formation CLOSING" })).not.toMatch(/formation/i);
    }
  });
  it("Pass : 7 articles, accompagnement offert en article 3, accès au paiement", () => {
    const c = construireContratV3(base);
    expect(c.articles.map((a) => a.titre)).toEqual([
      "Article 1 – Parties et objet",
      "Article 2 – Contenu du programme et durée d'accès",
      "Article 3 – Accompagnement offert",
      "Article 4 – Prix et paiement",
      "Article 5 – Accès immédiat et droit de rétractation",
      "Article 6 – Engagements et conditions générales",
      "Article 7 – Conformité de la vente",
    ]);
    const t = texteComplet(base);
    expect(t).toContain("CONTRAT DE VENTE — ACCÈS AU PROGRAMME PASS AL BARAKA");
    expect(t).toContain("vendu au prix de 2 000,00 € TTC (Tarif conférence, après réduction de 1 000,00 €)");
    expect(t).toContain("3 × 666,66 € (dernière échéance : 666,68 €). Premier paiement le 13/11/2026");
    expect(t).toContain("redevable de la totalité du prix dès la validation de sa commande");
    expect(t).toContain("L'accès est activé dès la validation du premier paiement.");
    expect(t).not.toMatch(/garantie de (chiffre|3 000|25 000)|à vie/);
  });
  it("À la carte : 6 articles, pas d'accompagnement ni de communauté", () => {
    const d = { ...base, offre: "carte" as const, module: "Formation CLOSING", nbEcheances: 1, montantEcheance: 500, prixTotal: 500, tarif: null, reduction: 0 };
    const c = construireContratV3(d);
    expect(c.articles).toHaveLength(6);
    const t = texteComplet(d);
    expect(t).toContain("ACCÈS AU MODULE « CLOSING »");
    expect(t).toContain("Paiement comptant de 500,00 €, le 13/11/2026.");
    expect(t).not.toMatch(/AL BARAKA Family|accompagnement/i);
  });
  it("Liberty : accompagnement premium offert", () => {
    expect(texteComplet({ ...base, offre: "liberty" })).toContain("sessions d'accompagnement premium");
  });
  it("une fois accepté : chaque case horodatée, heure de Paris et fuseau", () => {
    const c = construireContratV3({
      ...base,
      acceptation: {
        accepteLe: "2026-11-13T10:00:01.000Z",
        ip: "1.2.3.4",
        cases: casesV3("pass").map((x, i) => ({ id: x.id, texte: texteCase(x), coche_le: `2026-11-13T10:00:0${i}.000Z` })),
      },
    });
    expect(c.confirmation.cases.every((x) => x.coche_le.includes("heure de Paris, UTC+1"))).toBe(true);
    expect(c.confirmation.lignes[0]).toContain("le 13/11/2026 à 11:00:01 (heure de Paris, UTC+1)");
    expect(c.confirmation.lignes[0]).toContain("adresse IP 1.2.3.4");
  });
});

describe("attestation, e-mail, numéros", () => {
  it("l'attestation reprend mot pour mot la case 2, avec heure, IP et activation", () => {
    const a = construireAttestationV3({
      offre: "pass", numero: "ALB-PASS-CTR-2026-11-0012", client: { nom: "Prénom Nom", email: "client@example.com" },
      caseCocheeLe: "2026-11-13T10:00:02.000Z", ip: "1.2.3.4", accesActiveLe: "2026-11-13T10:00:30.000Z", envoyeLe: null,
    });
    const t = a.lignes.map((l) => l.texte).join("\n");
    expect(t).toContain(texteCase(casesV3("pass")[1]));
    expect(t).toContain("13/11/2026 à 11:00:30 (heure de Paris, UTC+1)");
  });
  it("numéros et objet de l'e-mail", () => {
    expect(numeroContratV3("pass", "CTR-2026-11-0012")).toBe("ALB-PASS-CTR-2026-11-0012");
    expect(numeroContratV3("liberty", "CTR-2026-11-0012")).toBe("ALB-LIB-CTR-2026-11-0012");
    expect(numeroContratV3("carte", "CTR-2026-11-0012")).toBe("ALB-ALC-CTR-2026-11-0012");
    expect(objetEmailV3("pass", "ALB-PASS-CTR-2026-11-0012")).toBe("Ton contrat Pass AL BARAKA – N° ALB-PASS-CTR-2026-11-0012");
    expect(nomModule("Formation SETTING")).toBe("SETTING");
  });
  it("mise en forme : euros et heure d'été", () => {
    expect(euros(2000)).toBe("2 000,00 €");
    expect(dateHeureParis("2026-07-01T10:00:00Z")).toContain("12:00:00 (heure de Paris, UTC+2)");
  });
});

describe("du paiement au contrat (stripe-webhook)", () => {
  const commande = {
    offre: "pass" as const,
    numero: "ALB-PASS-CTR-2026-11-0030",
    couponCode: "AB1000",
    amountTotal: 2000,
    discountAmount: 1000,
    echeances: [666.66, 666.66, 666.68],
    firstPaymentDate: "2026-11-13",
    customer: { first_name: "Prénom", last_name: "Test", email: "client@example.com", phone: "+33600000000", address: "1 rue de l'Exemple", postal_code: "75001", city: "Paris", country: "France" },
    agreementsCompact: casesV3("pass").map((c, i) => `${c.id}:2026-11-13T15:02:0${i}.000Z`).join("|"),
    ip: "203.0.113.42",
    maintenant: "2026-11-13T15:03:00.000Z",
  };
  it("reprend chaque case avec son heure, et l'heure de la case 1 comme acceptation", () => {
    const r = contratDepuisCommande(commande);
    expect(r.cases).toHaveLength(6);
    expect(r.cases.every((c) => c.checked && c.checked_at)).toBe(true);
    expect(r.accepteLe).toBe("2026-11-13T15:02:00.000Z");
    expect(r.donnees.acceptation?.ip).toBe("203.0.113.42");
  });
  it("décrit l'échéancier réellement prélevé (la dernière absorbe les centimes)", () => {
    const d = contratDepuisCommande(commande).donnees;
    expect(d.nbEcheances).toBe(3);
    expect(d.montantEcheance).toBe(666.66);
    expect(d.montantDerniere).toBe(666.68);
    expect(d.montantPremiere).toBeNull();
    expect(d.client.adresse).toBe("1 rue de l'Exemple, 75001 Paris, France");
    expect(d.tarif).toBe("code AB1000");
  });
  it("paiement comptant : une seule échéance, pas d'écart", () => {
    const d = contratDepuisCommande({ ...commande, echeances: [2000] }).donnees;
    expect(d.nbEcheances).toBe(1);
    expect(d.montantEcheance).toBe(2000);
    expect(d.montantDerniere).toBeNull();
  });
  it("le même échéancier que celui affiché sur la page de paiement", () => {
    expect(echeancesDe(2000, 3)).toEqual({ base: 666.66, derniere: 666.68 });
  });
});
