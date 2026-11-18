// Vérifie que l'onglet Sales s'affiche en entier avec des données fictives :
// synthèse, ventes perdues, classements, bloc « À corriger », liste.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import SalesTab from "./SalesTab";

const base = {
  conference_date: "2026-11-15", email: null, telephone: null, produit: "PASS AL BARAKA",
  montant_ht: 2000, en_retard: 0, lead_id: "l1", lead_cree_le: "2026-11-10T10:00:00Z",
  canal: "snap_ads", canal_libelle: "Snap Ads", tunnel: null, pub_plateforme: "snap", pub_id: "p1",
  pub_nom: "Vidéo 20", groupe_nom: null, campagne_nom: null, quiz_priorite: "A",
};

const donnees = {
  ventes: [
    { ...base, vente_id: "v1", vendu_le: "2026-11-15T15:00:00Z", client: "Client Un", statut_paiement: "paid",
      nb_echeances: 1, encaisse: 2000, reste_a_encaisser: 0,
      intervenants: [
        { role: "closer", user_id: "c1", nom: "Closer A", montant: 200, verse: 200 },
        { role: "setter", user_id: "s1", nom: "Setter B", montant: 100, verse: 0 },
      ] },
    { ...base, vente_id: "v2", vendu_le: "2026-11-16T15:00:00Z", client: "Client Deux", statut_paiement: "lost",
      nb_echeances: 8, encaisse: 250, reste_a_encaisser: 0, canal: "sans_source", canal_libelle: "Sans source",
      intervenants: [{ role: "closer", user_id: "c1", nom: "Closer A", montant: 150, verse: 0 }] },
  ],
  calls: [
    { call_id: "k1", closer_id: "c1", closer: "Closer A", statut: "close", prevu_le: "2026-11-15T14:00:00Z",
      client: "Client Un", conference_date: "2026-11-15", achete: true },
    { call_id: "k2", closer_id: "c1", closer: "Closer A", statut: "planifie", prevu_le: "2026-11-01T14:00:00Z",
      client: "Client Trois", conference_date: "2026-11-15", achete: false },
  ],
  setters: [{ user_id: "s1", full_name: "Setter B", nb_appeles: 50, nb_inscrits: 20, nb_calls: 2 }],
};

vi.mock("@/hooks/useSalesDashboard", () => ({
  useSalesDashboard: (f: unknown) => ({ data: f ? donnees : undefined, isLoading: false, isError: false, error: null }),
}));

vi.mock("@/hooks/useSalesSources", () => ({
  useSalesSources: (f: unknown) => ({
    data: f ? {
      ventes: [{
        vente_id: "v1", vendu_le: "2026-11-15T15:00:00Z", conference_date: "2026-11-15", montant_ht: 2000, encaisse: 2000,
        perdue: false, nb_echeances: 1, lead_cree_le: "2026-11-10T10:00:00Z", canal: "snap_ads", canal_libelle: "Snap Ads",
        tunnel: null, plateforme: "snap", campagne_id: "c1", campagne_nom: "Campagne froide", groupe_id: "g1", groupe_nom: "Groupe 1",
        pub_id: "p1", pub_nom: "Vidéo 20", quiz_priorite: "A", reinscrit: false, signal_jeu_ven: false,
      }],
      entonnoir: [{
        canal: "snap_ads", canal_libelle: "Snap Ads", plateforme: "snap", campagne_id: "c1", campagne_nom: "Campagne froide",
        groupe_id: null, groupe_nom: null, pub_id: null, pub_nom: null, quiz_priorite: null,
        leads: 0, inscrits: 0, rdv: 0, rdv_tenus: 0, depense_campagne: 500, depense_pub: 0,
      }],
    } : undefined,
    isLoading: false, isError: false, error: null,
  }),
}));

describe("SalesTab", () => {
  it("affiche la synthèse, les perdues, les classements et ce qui est à corriger", async () => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <SalesTab />
        </TooltipProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Ventes PASS")).toBeTruthy();
    expect(screen.getAllByText("Ventes perdues").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Closer A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Setter B").length).toBeGreaterThan(0);
    expect(screen.getByText(/À corriger pour des chiffres justes/)).toBeTruthy();
    expect(screen.getByText(/vente\(s\) sans setter/)).toBeTruthy();
    expect(screen.getByText(/call\(s\) passé\(s\) sans résultat/)).toBeTruthy();
    expect(screen.getAllByText("Client Deux")).toHaveLength(2); // bloc des perdues + liste
    expect(screen.getByText("Ventes par source")).toBeTruthy();
    expect(screen.getAllByText("Snap Ads").length).toBeGreaterThan(0);
    expect(screen.getByText("Profil des acheteurs")).toBeTruthy();
    expect(screen.getAllByText("×4").length).toBeGreaterThan(0); // 2 000 € de CA pour 500 € de dépense
  });
});
