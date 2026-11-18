import { describe, expect, it } from "vitest";
import {
  aCorriger, classementClosers, classementSetters, mediane, synthese,
  type CallDashboard, type VenteDashboard,
} from "./dashboard";

function vente(p: Partial<VenteDashboard>): VenteDashboard {
  return {
    vente_id: "v", vendu_le: "2026-11-15T15:00:00Z", conference_date: "2026-11-15",
    client: "Client", email: null, telephone: null, produit: "PASS AL BARAKA",
    montant_ht: 2000, statut_paiement: "in_progress", nb_echeances: 4,
    encaisse: 500, en_retard: 0, reste_a_encaisser: 1500, intervenants: [],
    lead_id: "l", lead_cree_le: "2026-11-10T15:00:00Z", canal: "snap_ads", canal_libelle: "Snap Ads",
    tunnel: null, pub_plateforme: "snap", pub_id: "p", pub_nom: "Vidéo 20", groupe_nom: null,
    campagne_nom: null, quiz_priorite: null, ...p,
  };
}

const closer = (id: string, montant = 200, verse = 0) => ({ role: "closer", user_id: id, nom: id, montant, verse });
const setter = (id: string, montant = 100, verse = 0) => ({ role: "setter", user_id: id, nom: id, montant, verse });

function call(p: Partial<CallDashboard>): CallDashboard {
  return {
    call_id: "c", closer_id: "hedi", closer: "hedi", statut: "close",
    prevu_le: "2026-11-15T14:00:00Z", client: "x", conference_date: "2026-11-15", achete: false, ...p,
  };
}

const maintenant = new Date("2026-11-18T12:00:00Z");

describe("synthese", () => {
  it("compte les ventes perdues dans le signé, à part dans le net et le reste à encaisser", () => {
    const s = synthese([
      vente({ intervenants: [closer("hedi", 200, 50)] }),
      vente({ statut_paiement: "lost", encaisse: 250, reste_a_encaisser: 0, nb_echeances: 8 }),
      vente({ nb_echeances: 1, encaisse: 2000, reste_a_encaisser: 0, statut_paiement: "paid" }),
    ]);
    expect(s.ventes).toBe(3);
    expect(s.perdues).toBe(1);
    expect(s.caSigne).toBe(6000);
    expect(s.caNet).toBe(4000);
    expect(s.encaisse).toBe(2750);
    expect(s.resteAEncaisser).toBe(1500);
    expect(s.partComptant).toBe(0.5);
    expect(s.delaiMedianJours).toBe(5);
    expect(s.commissions).toBe(200);
    expect(s.commissionsVersees).toBe(50);
  });

  it("médiane paire et vide", () => {
    expect(mediane([])).toBeNull();
    expect(mediane([1, 3, 2, 10])).toBe(2.5);
  });
});

describe("classementClosers", () => {
  it("croise les ventes saisies et les calls, closing = calls tenus suivis d'un achat", () => {
    const l = classementClosers(
      [vente({ intervenants: [closer("hedi")] }), vente({ intervenants: [closer("sabrina")] })],
      [
        call({}), call({ statut: "follow_up" }), call({ statut: "no_show" }),
        call({ statut: "planifie", prevu_le: "2026-11-01T10:00:00Z" }),
        call({ statut: "planifie", prevu_le: "2026-11-30T10:00:00Z" }),
        call({ statut: "annule" }),
      ],
      maintenant,
    );
    const hedi = l.find((x) => x.cle === "hedi")!;
    expect(hedi.callsPris).toBe(5);
    expect(hedi.tenus).toBe(2);
    expect(hedi.noShow).toBe(1);
    expect(hedi.aRenseigner).toBe(1);
    expect(hedi.aVenir).toBe(1);
    expect(hedi.tenusAchetes).toBe(1);
    expect(hedi.tauxClosing).toBe(0.5);
    expect(hedi.ventesSansCall).toBe(0);
    const sabrina = l.find((x) => x.cle === "sabrina")!;
    expect(sabrina.ventes).toBe(1);
    expect(sabrina.callsPris).toBe(0);
    expect(sabrina.tauxClosing).toBeNull();
    expect(sabrina.ventesSansCall).toBe(1);
  });
});

describe("classementSetters", () => {
  it("ajoute l'activité d'appel et le taux appelé → vente", () => {
    const l = classementSetters(
      [vente({ intervenants: [setter("mehdi")] }), vente({ intervenants: [setter("mehdi")] })],
      [
        { user_id: "mehdi", full_name: "Mehdi", nb_appeles: 72, nb_inscrits: 29, nb_calls: 3 },
        { user_id: "melanie", full_name: "Mélanie", nb_appeles: 199, nb_inscrits: 10, nb_calls: 0 },
      ],
    );
    expect(l[0].cle).toBe("mehdi");
    expect(l[0].ventes).toBe(2);
    expect(l[0].tauxVente).toBeCloseTo(2 / 72);
    expect(l[1].nom).toBe("Mélanie");
    expect(l[1].ventes).toBe(0);
  });
});

describe("aCorriger", () => {
  it("ne signale pas une vente d'apporteur sans setter", () => {
    const r = aCorriger(
      [
        vente({ intervenants: [closer("hedi")] }),
        vente({ intervenants: [closer("hedi")], canal: "apporteur" }),
        vente({ intervenants: [setter("mehdi")], canal: "sans_source" }),
      ],
      [call({ statut: "planifie", prevu_le: "2026-11-01T10:00:00Z" })],
      maintenant,
    );
    expect(r.ventesSansSetter).toHaveLength(1);
    expect(r.ventesSansCloser).toHaveLength(1);
    expect(r.ventesSansSource).toHaveLength(1);
    expect(r.callsARenseigner).toHaveLength(1);
  });
});
