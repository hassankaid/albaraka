/**
 * Fenêtre « Factures de recouvrement » (09/10/2026) : liste des REC, état
 * actuel de l'échéance, téléchargement (à l'unité ou ZIP) et Excel du cabinet.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const factures = [
  {
    id: "a", numero: "REC0000001", client_nom: "JEAN EXEMPLE", payment_number: 6, total_payments: 12,
    montant: "166.42", date_facture: "2026-05-06", transmise_le: "2026-08-29", echeance_statut: "lost", echeance_payee_le: null,
  },
  {
    id: "b", numero: "REC0000022", client_nom: "MARIE TEST", payment_number: 3, total_payments: 8,
    montant: "250.00", date_facture: "2026-09-03", transmise_le: null, echeance_statut: "paid", echeance_payee_le: "2026-10-01",
  },
];

const exporter = vi.fn(async (_f: unknown) => 1);
const zip = vi.fn(async (_f: unknown[], _cb?: unknown) => [] as string[]);
const une = vi.fn(async (_f: unknown) => undefined);

vi.mock("@/hooks/useRecouvrement", () => ({
  useFacturesRecouvrement: () => ({ data: factures, isLoading: false }),
  useExporterCabinet: () => ({ mutateAsync: exporter, isPending: false }),
  telechargerZipREC: (f: unknown[], cb?: unknown) => zip(f, cb),
  telechargerFactureREC: (f: unknown) => une(f),
}));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import RecouvrementDialog from "./RecouvrementDialog";

beforeEach(() => {
  exporter.mockClear();
  zip.mockClear();
  une.mockClear();
});
afterEach(cleanup);

describe("la liste des factures REC", () => {
  it("affiche chaque facture avec l'état ACTUEL de son échéance", () => {
    render(<RecouvrementDialog open onClose={() => {}} />);
    expect(screen.getAllByTestId("ligne-rec")).toHaveLength(2);
    expect(screen.getByText("REC0000001")).toBeTruthy();
    expect(screen.getByText("Impayée")).toBeTruthy();
    expect(screen.getByText(/^Payée le 1 oct\.? 2026$/)).toBeTruthy();
    expect(screen.getByText(/2 facture\(s\) · 1 pas encore transmise\(s\)/)).toBeTruthy();
  });

  it("télécharge une facture, ou toutes en ZIP", async () => {
    render(<RecouvrementDialog open onClose={() => {}} />);
    fireEvent.click(screen.getByTitle("Télécharger REC0000022"));
    await waitFor(() => expect(une).toHaveBeenCalledWith(factures[1]));
    fireEvent.click(screen.getByText("Tout télécharger (ZIP)"));
    await waitFor(() => expect(zip).toHaveBeenCalled());
    expect((zip.mock.calls[0][0] as unknown[]).length).toBe(2);
  });

  it("l'Excel du cabinet prend par défaut les factures pas encore transmises", async () => {
    render(<RecouvrementDialog open onClose={() => {}} />);
    fireEvent.click(screen.getByText("Excel du cabinet (non transmises)"));
    await waitFor(() => expect(exporter).toHaveBeenCalledWith([factures[1]]));
  });

  it("avec une sélection, ZIP et Excel ne portent que sur elle", async () => {
    render(<RecouvrementDialog open onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText("Sélectionner REC0000001"));
    fireEvent.click(screen.getByText("Excel du cabinet (sélection)"));
    await waitFor(() => expect(exporter).toHaveBeenCalledWith([factures[0]]));
    fireEvent.click(screen.getByText("Télécharger la sélection (ZIP)"));
    await waitFor(() => expect(zip).toHaveBeenCalled());
    expect(zip.mock.calls[0][0]).toEqual([factures[0]]);
  });
});

describe("l'échéancier du client et la fiche de vente", () => {
  const lire = (f: string) => readFileSync(resolve(process.cwd(), f), "utf-8");
  const modal = lire("src/components/payments/PaymentScheduleModal.tsx");
  const cellule = lire("src/components/payments/FacturesEcheance.tsx");
  const vente = lire("src/components/sales/SaleDetailModal.tsx");

  it("propose le recouvrement seulement sur une échéance impayée et échue, sans facture", () => {
    expect(cellule).toContain("const recouvrable = !rec && !fac && peutPartirEnRecouvrement(p);");
    expect(modal).toContain("<CelluleFacture p={p} rec={rec} fac={fac} onAskRecouvrement={onAskRecouvrement} />");
  });

  it("la fiche de vente (« Mes ventes ») montre les factures au CEO et fige les échéances REC", () => {
    expect(vente).toContain("{isCeo && saleId && payments.length > 0 && (");
    expect(vente).toContain("<FacturesVenteSection saleId={saleId}");
    expect(vente.match(/\{!estFigee\(p\.id\) && \(/g)).toHaveLength(2); // bureau + mobile
  });

  it("fige une échéance transmise au cabinet : ni date, ni montant, ni suppression", () => {
    expect(modal).toContain("const fige = isPaid || !!rec;");
    expect(modal).toContain("{!fige && (");
    expect(modal).not.toMatch(/\{!isPaid && \(\s*<Button[^>]*\n[^>]*\n[^>]*red-400/);
  });
});
