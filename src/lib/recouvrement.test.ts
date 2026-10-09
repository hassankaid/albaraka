import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ENTETE_CABINET,
  zipCabinet,
  dateCabinet,
  feuilleCabinet,
  ligneCabinet,
  montantCabinet,
  nomFichierFacture,
  peutPartirEnRecouvrement,
  referenceCabinet,
  type FactureRecouvrement,
} from "./recouvrement";

const facture = (p: Partial<FactureRecouvrement> = {}): FactureRecouvrement => ({
  numero: "REC0000022",
  montant: "166.42",
  date_facture: "2026-05-06",
  payment_number: 6,
  total_payments: 12,
  produit_vente: "BUSINESS DEVELOPPER",
  client_nom: "Jean Exemple",
  client_email: "jean@example.com",
  client_telephone: "+33600000000",
  client_adresse: "1 rue de l'exemple",
  client_code_postal: "75001",
  client_ville: "Paris",
  ...p,
});

describe("le modèle du cabinet", () => {
  it("garde ses 96 colonnes, avec les en-têtes aux bonnes places", () => {
    expect(ENTETE_CABINET).toHaveLength(96);
    expect(ENTETE_CABINET[0]).toBe("NOM DU DEBITEUR (30 CARACTERES MAXIMUM)");
    expect(ENTETE_CABINET[22]).toBe("MONTANT DE LA CREANCE (12 CARACTERES MAXIMUM)");
    expect(ENTETE_CABINET[25]).toBe("NUMERO DE FACTURE (10 CARACTERES MAXIMUM)");
    expect(ENTETE_CABINET[95]).toBe("EMAIL ");
  });

  it("formate comme le fichier déjà transmis", () => {
    expect(dateCabinet("2026-05-06")).toBe("06052026");
    expect(montantCabinet(166.4)).toBe("166.40");
    expect(montantCabinet("500")).toBe("500.00");
    expect(referenceCabinet("BUSINESS DEVELOPPER", 6, 12)).toBe("BUSINESS DEVELOP E6/12");
    expect(referenceCabinet("PASS AL BARAKA", 4, 8)).toBe("PASS AL BARAKA E4/8");
    expect(referenceCabinet("BUSINESS DEVELOPPER", 12, 16).length).toBeLessThanOrEqual(25);
  });

  it("place chaque donnée dans sa colonne, en majuscules et aux longueurs imposées", () => {
    const l = ligneCabinet(facture({ client_adresse: "2 rue du colonel de l'esperance de la ville" }));
    expect(l).toHaveLength(96);
    expect(l[0]).toBe("JEAN EXEMPLE");
    expect(l[3]).toBe("2 RUE DU COLONEL DE L'ESPERANC");
    expect(l[3].length).toBe(30);
    expect(l[6]).toBe("75001");
    expect(l[7]).toBe("PARIS");
    expect(l[8]).toBe("+33600000000");
    expect(l[22]).toBe("166.42");
    expect(l[23]).toBe("06052026");
    expect(l[24]).toBe("BUSINESS DEVELOP E6/12");
    expect(l[25]).toBe("REC0000022");
    expect(l[25].length).toBeLessThanOrEqual(10);
    expect(l[26]).toBe("06052026");
    expect(l[95]).toBe("jean@example.com");
    // Les colonnes « INUTILISE » restent vides.
    expect(l[1]).toBe("");
    expect(l[21]).toBe("");
  });

  it("trie les factures par numéro sous l'en-tête", () => {
    const f = feuilleCabinet([facture({ numero: "REC0000023" }), facture({ numero: "REC0000001" })]);
    expect(f[0]).toBe(ENTETE_CABINET);
    expect(f.slice(1).map((l) => l[25])).toEqual(["REC0000001", "REC0000023"]);
  });

  it("produit un vrai .xlsx, une feuille, des cellules texte", async () => {
    const octets = await (await zipCabinet([facture({ client_nom: "A & B <test>" })])).generateAsync({ type: "uint8array" });
    const zip = await JSZip.loadAsync(octets);
    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining(["[Content_Types].xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml"]),
    );
    const feuille = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    expect(feuille).toContain('r="A1"');
    expect(feuille).toContain("NOM DU DEBITEUR (30 CARACTERES MAXIMUM)");
    expect(feuille).toContain('<c r="CR1" t="inlineStr"><is><t xml:space="preserve">EMAIL </t>');
    expect(feuille).toContain('<c r="Z2" t="inlineStr"><is><t xml:space="preserve">REC0000022</t>');
    expect(feuille).toContain("A &amp; B &lt;TEST&gt;");
  });
});

describe("règles de l'interface", () => {
  it("n'envoie en recouvrement qu'une échéance impayée et échue", () => {
    const auj = new Date("2026-10-09T12:00:00Z");
    expect(peutPartirEnRecouvrement({ status: "lost", due_date: "2027-01-01" }, auj)).toBe(true);
    expect(peutPartirEnRecouvrement({ status: "late", due_date: "2026-10-01" }, auj)).toBe(true);
    expect(peutPartirEnRecouvrement({ status: "pending", due_date: "2026-10-08" }, auj)).toBe(true);
    expect(peutPartirEnRecouvrement({ status: "pending", due_date: "2026-11-08" }, auj)).toBe(false);
    expect(peutPartirEnRecouvrement({ status: "paid", due_date: "2026-01-01" }, auj)).toBe(false);
    expect(peutPartirEnRecouvrement({ status: "cancelled", due_date: "2026-01-01" }, auj)).toBe(false);
  });

  it("nomme les PDF par numéro puis client", () => {
    expect(nomFichierFacture({ numero: "REC0000001", client_nom: "Abdes Samad  Héraibi" })).toBe("REC0000001-ABDES SAMAD HRAIBI.pdf");
  });
});

describe("la base", () => {
  const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/20261009150000_factures_recouvrement.sql"), "utf-8");

  it("numérote REC + 7 chiffres, sans doublon, à partir du plus grand numéro existant", () => {
    expect(sql).toContain("check (numero ~ '^REC[0-9]{7}$')");
    expect(sql).toContain("payment_id uuid not null unique");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("max(substring(numero from 4)::integer), 0) + 1");
  });

  it("refuse une échéance déjà payée, et ne laisse créer que par la fonction serveur", () => {
    expect(sql).toContain("if v_payment.status = 'paid' then");
    expect(sql).toContain("grant execute on function public.creer_facture_recouvrement(uuid, jsonb, text, uuid) to service_role");
    expect(sql).toContain("revoke insert, update, delete on public.factures_recouvrement from anon, authenticated");
  });

  it("ne contient aucune donnée client (repo public)", () => {
    expect(sql).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
    expect(sql).not.toMatch(/insert into public\.factures_recouvrement \([^)]*\)\s*values\s*\('REC/i);
  });
});
