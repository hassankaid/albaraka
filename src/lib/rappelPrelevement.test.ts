/**
 * L'email de rappel avant prélèvement (supabase/functions/rappel-prelevement).
 *
 * Texte validé par Hassan le 28/09/2026, à la lettre. Ce qui ne doit jamais
 * dériver :
 *  • la date du prélèvement ET la veille, calculées juste — y compris le 1er
 *    du mois et un changement de mois ;
 *  • aucune promesse d'heure, ni « dans 3 jours » (l'heure de débit varie) ;
 *  • « Envoie-nous un message », sans canal ni « réponds à cet email » ;
 *  • aucune phrase de pied de mail (retirée à la demande de Hassan).
 */
import { describe, it, expect } from "vitest";
import { construireEmail, dateLongue, decaler, jourParis, libelleOffre, prenomDe } from "../../supabase/functions/rappel-prelevement/email";

const base = {
  prenom: "Yasmine",
  email: "client@example.com",
  montant: 200,
  jour: "2026-10-01",
  offre: "Pass AL BARAKA",
  numero: 3,
  total: 12,
  carte: "4242",
};

describe("dates du rappel", () => {
  it("écrit « 1er » le premier du mois, et calcule la veille à travers le changement de mois", () => {
    expect(dateLongue("2026-10-01")).toBe("jeudi 1er octobre 2026");
    expect(dateLongue(decaler("2026-10-01", -1), false)).toBe("mercredi 30 septembre");
    expect(dateLongue("2026-10-15", false)).toBe("jeudi 15 octobre");
  });

  it("vise J+3 à l'heure de Paris, même tard le soir en UTC", () => {
    // 28/09 à 23 h 30 UTC = 29/09 à 1 h 30 à Paris.
    expect(jourParis(new Date("2026-09-28T23:30:00Z"))).toBe("2026-09-29");
    expect(decaler("2026-09-28", 3)).toBe("2026-10-01");
    expect(decaler("2026-12-30", 3)).toBe("2027-01-02");
  });
});

describe("contenu de l'email", () => {
  const { sujet, texte, html } = construireEmail(base);

  it("reprend le texte validé", () => {
    expect(sujet).toBe("Ton prélèvement AL BARAKA du jeudi 1er octobre");
    expect(texte).toContain("As salam alaykoum Yasmine,");
    expect(texte).toContain("ta prochaine échéance AL BARAKA sera prélevée le jeudi 1er octobre.");
    expect(texte).toContain("Montant : 200,00 €");
    expect(texte).toContain("Date du prélèvement : jeudi 1er octobre 2026");
    expect(texte).toContain("Offre : Pass AL BARAKA — mensualité 3 sur 12");
    expect(texte).toContain("Moyen de paiement : carte bancaire se terminant par 4242");
    expect(texte).toContain("assure-toi que ton compte est suffisamment approvisionné dès la veille, le mercredi 30 septembre.");
    expect(texte).toContain("Envoie-nous un message : on est là pour trouver une solution avec toi, avant la date du prélèvement.");
    expect(texte).toContain("Qu'Allah facilite ton activité et y mette la baraka.");
    expect(texte.trim().endsWith("L'équipe AL BARAKA")).toBe(true);
  });

  it("ne promet ni heure ni délai, ne renvoie vers aucun canal, n'a pas de pied de mail", () => {
    for (const version of [texte, html]) {
      expect(version).not.toMatch(/dans 3 jours|dans la nuit|72 ?h/i);
      expect(version).not.toMatch(/réponds|répondre à cet email/i);
      expect(version).not.toMatch(/Tu reçois cet email|WhatsApp|contact@/i);
    }
  });

  it("reste juste sans carte connue, sans prénom, sans numéro d'échéance", () => {
    const { texte: t } = construireEmail({ ...base, carte: null, prenom: "", numero: null, total: null });
    expect(t).toContain("Moyen de paiement : carte bancaire enregistrée");
    expect(t.startsWith("As salam alaykoum,")).toBe(true);
    expect(t).toContain("Offre : Pass AL BARAKA\n");
  });

  it("échappe ce qui vient de la base dans la version HTML", () => {
    const { html: h } = construireEmail({ ...base, prenom: "<b>x</b>" });
    expect(h).not.toContain("<b>x</b>");
    expect(h).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});

describe("libellés", () => {
  it("présente l'offre comme le client la connaît", () => {
    expect(libelleOffre("BUSINESS DEVELOPPER 3.0")).toBe("Business Developer");
    expect(libelleOffre("Business Developer")).toBe("Business Developer");
    expect(libelleOffre("PASS AL BARAKA")).toBe("Pass AL BARAKA");
    expect(libelleOffre("PASS LIBERTY")).toBe("Pass Liberty");
  });
  it("tire un prénom propre d'un nom en majuscules", () => {
    expect(prenomDe("YASMINE BENALI")).toBe("Yasmine");
    expect(prenomDe(null)).toBe("");
  });
});
