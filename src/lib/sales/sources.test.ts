import { describe, expect, it } from "vitest";
import {
  arborescence, parCrea, profilDelai, profilPriorite, signaux, tendance, totalNoeuds,
  type EntonnoirSource, type VenteSource,
} from "./sources";

function vente(p: Partial<VenteSource>): VenteSource {
  return {
    vente_id: "v", vendu_le: "2026-11-15T15:00:00Z", conference_date: "2026-11-15", montant_ht: 2000, encaisse: 500,
    perdue: false, nb_echeances: 4, lead_cree_le: "2026-11-13T15:00:00Z",
    canal: "snap_ads", canal_libelle: "Snap Ads", tunnel: "whatsapp", plateforme: "snap",
    campagne_id: "camp1", campagne_nom: "Webinaire froid", groupe_id: "g1", groupe_nom: "Groupe 1",
    pub_id: "p1", pub_nom: "Vidéo 20", quiz_priorite: "A", reinscrit: false, signal_jeu_ven: false, ...p,
  };
}

function ligne(p: Partial<EntonnoirSource>): EntonnoirSource {
  return {
    canal: "snap_ads", canal_libelle: "Snap Ads", plateforme: "snap", campagne_id: "camp1", campagne_nom: "Webinaire froid",
    groupe_id: "g1", groupe_nom: "Groupe 1", pub_id: "p1", pub_nom: "Vidéo 20", quiz_priorite: "A",
    leads: 0, inscrits: 0, rdv: 0, rdv_tenus: 0, depense_campagne: 0, depense_pub: 0, ...p,
  };
}

const entonnoir: EntonnoirSource[] = [
  // dépense par campagne (référence des totaux)
  ligne({ groupe_id: null, groupe_nom: null, pub_id: null, pub_nom: null, quiz_priorite: null, depense_campagne: 1000 }),
  // dépense par pub : deux pubs « Vidéo 20 » dans deux groupes, une « Vidéo 4 »
  ligne({ quiz_priorite: null, depense_pub: 300 }),
  ligne({ groupe_id: "g2", groupe_nom: "Groupe 2", pub_id: "p2", quiz_priorite: null, depense_pub: 200 }),
  ligne({ pub_id: "p3", pub_nom: "Vidéo 4", quiz_priorite: null, depense_pub: 400 }),
  // leads
  ligne({ leads: 40, inscrits: 10, rdv: 4, rdv_tenus: 3 }),
  ligne({ groupe_id: "g2", groupe_nom: "Groupe 2", pub_id: "p2", quiz_priorite: "B", leads: 20, inscrits: 5, rdv: 1, rdv_tenus: 1 }),
  ligne({ pub_id: "p3", pub_nom: "Vidéo 4", quiz_priorite: "C", leads: 30, inscrits: 3, rdv: 0, rdv_tenus: 0 }),
  // un canal sans dépense
  ligne({ canal: "instagram", canal_libelle: "Instagram", plateforme: null, campagne_id: null, campagne_nom: null,
    groupe_id: null, groupe_nom: null, pub_id: null, pub_nom: null, quiz_priorite: null, leads: 5, inscrits: 2 }),
];

const ventes: VenteSource[] = [
  vente({ vente_id: "a" }),
  vente({ vente_id: "b", groupe_id: "g2", groupe_nom: "Groupe 2", pub_id: "p2", quiz_priorite: "B", nb_echeances: 1, encaisse: 2000 }),
  vente({ vente_id: "c", perdue: true, encaisse: 250 }),
  vente({ vente_id: "d", canal: "instagram", canal_libelle: "Instagram", plateforme: null, campagne_id: null, campagne_nom: null,
    groupe_id: null, groupe_nom: null, pub_id: null, pub_nom: null, quiz_priorite: null, reinscrit: true, lead_cree_le: null }),
];

describe("arborescence", () => {
  const arbre = arborescence(ventes, entonnoir);
  const snap = arbre.find((n) => n.cle === "snap_ads")!;

  it("range les ventes et les leads du canal à la créa, dépense par campagne en haut", () => {
    expect(arbre[0].cle).toBe("snap_ads"); // le plus de ventes en tête
    expect(snap.ventes).toBe(3);
    expect(snap.perdues).toBe(1);
    expect(snap.caNet).toBe(4000);
    expect(snap.depense).toBe(1000);
    expect(snap.leads).toBe(90);
    expect(snap.cpa).toBe(500); // 1000 € ÷ 2 ventes hors perdue
    expect(snap.roas).toBe(4);
    const camp = snap.enfants[0];
    expect(camp.niveau).toBe("campagne");
    expect(camp.depense).toBe(1000);
  });

  it("met la dépense non expliquée par les pubs sous « Pub non identifiée »", () => {
    const camp = snap.enfants[0];
    const groupes = Object.fromEntries(camp.enfants.map((g) => [g.nom, g]));
    expect(groupes["Groupe 1"].depense).toBe(700);
    expect(groupes["Groupe 2"].depense).toBe(200);
    expect(groupes["Pub non identifiée"].depense).toBe(100);
    expect(groupes["Groupe 1"].enfants.map((c) => c.nom).sort()).toEqual(["Vidéo 20", "Vidéo 4"]);
  });

  it("garde les canaux sans dépense, sans coût par vente", () => {
    const insta = arbre.find((n) => n.cle === "instagram")!;
    expect(insta.ventes).toBe(1);
    expect(insta.enfants).toHaveLength(0);
    expect(insta.cpa).toBeNull();
    expect(insta.faibleVolume).toBe(true);
    expect(totalNoeuds(arbre).ventes).toBe(4);
  });
});

describe("parCrea", () => {
  it("additionne la même vidéo dans plusieurs groupes", () => {
    const creas = parCrea(ventes, entonnoir);
    const v20 = creas.find((c) => c.nom === "Vidéo 20")!;
    expect(v20.depense).toBe(500);
    expect(v20.leads).toBe(60);
    expect(v20.ventes).toBe(3);
    expect(creas.find((c) => c.nom === "Vidéo 4")!.ventes).toBe(0);
  });
});

describe("profil des acheteurs", () => {
  it("priorité : ventes ÷ leads de la même priorité", () => {
    const p = Object.fromEntries(profilPriorite(ventes, entonnoir).map((l) => [l.cle, l]));
    expect(p.A.ventes).toBe(2);
    expect(p.A.leads).toBe(40);
    expect(p.A.tauxVente).toBe(0.05);
    expect(p["?"].ventes).toBe(1);
  });

  it("délai et paiement", () => {
    const d = Object.fromEntries(profilDelai(ventes).map((l) => [l.cle, l]));
    expect(d["0-2"].ventes).toBe(3);
    expect(d["?"].ventes).toBe(1);
    const s = signaux(ventes);
    expect(s.comptant).toBe(1);
    expect(s.echelonne).toBe(3);
    expect(s.reinscrits).toBe(1);
  });
});

describe("tendance", () => {
  it("compare à la moyenne, rien sous le seuil de volume", () => {
    expect(tendance(70, 100, true, false)).toBe("bon");
    expect(tendance(130, 100, true, false)).toBe("mauvais");
    expect(tendance(110, 100, true, false)).toBeNull();
    expect(tendance(3, 2, false, false)).toBe("bon");
    expect(tendance(70, 100, true, true)).toBeNull();
  });
});
