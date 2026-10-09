// Factures de recouvrement REC (09/10/2026) — voir src/lib/recouvrement.ts.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { classeurCabinet, nomFichierFacture, type FactureRecouvrement } from "@/lib/recouvrement";

export interface FactureREC extends FactureRecouvrement {
  id: string;
  payment_id: string;
  sale_id: string | null;
  contact_id: string | null;
  produit: string | null;
  client_pays: string | null;
  pdf_path: string | null;
  origine: "plateforme" | "fichier_cabinet";
  transmise_le: string | null;
  created_at: string;
  /** État ACTUEL de l'échéance : une facture REC peut être payée ensuite. */
  echeance_statut: string | null;
  echeance_payee_le: string | null;
}

/** Facture FAC (échéance payée), pour l'afficher à côté dans l'échéancier. */
export interface FactureFAC {
  id: string;
  invoice_number: string;
  payment_id: string;
  html_path: string | null;
  client_name: string;
}

// Table absente des types générés (src/integrations/supabase/types.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function aplatir(r: any): FactureREC {
  return {
    ...r,
    produit_vente: r.sales?.product ?? null,
    echeance_statut: r.payments?.status ?? null,
    echeance_payee_le: r.payments?.paid_at ?? null,
  };
}

const CHAMPS = "*, sales(product), payments(status, paid_at)";

export function useFacturesRecouvrement(enabled = true) {
  return useQuery({
    queryKey: ["factures-recouvrement"],
    enabled,
    queryFn: async (): Promise<FactureREC[]> => {
      const { data, error } = await db.from("factures_recouvrement").select(CHAMPS).order("numero", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(aplatir);
    },
  });
}

/** Les factures (REC et FAC) d'une vente, rangées par échéance. */
export function useFacturesDeVente(saleId: string | null | undefined) {
  return useQuery({
    queryKey: ["factures-vente", saleId],
    enabled: !!saleId,
    queryFn: async () => {
      const [rec, fac] = await Promise.all([
        db.from("factures_recouvrement").select(CHAMPS).eq("sale_id", saleId),
        db.from("client_invoices").select("id, invoice_number, payment_id, html_path, client_name").eq("sale_id", saleId),
      ]);
      if (rec.error) throw rec.error;
      if (fac.error) throw fac.error;
      const recParEcheance = new Map<string, FactureREC>();
      for (const r of rec.data ?? []) recParEcheance.set(r.payment_id, aplatir(r));
      const facParEcheance = new Map<string, FactureFAC>();
      for (const f of fac.data ?? []) facParEcheance.set(f.payment_id, f);
      return { recParEcheance, facParEcheance };
    },
  });
}

async function appeler(body: Record<string, unknown>): Promise<FactureREC> {
  const { data, error } = await supabase.functions.invoke("generer-facture-recouvrement", { body });
  if (error) {
    let detail = error.message;
    try {
      const corps = await (error as { context?: Response }).context?.json?.();
      if (corps?.error) detail = corps.detail ? `${corps.error} (${corps.detail})` : corps.error;
    } catch { /* corps illisible : on garde le message */ }
    throw new Error(detail);
  }
  return data.facture as FactureREC;
}

/** Crée la facture REC d'une échéance impayée (ou renvoie celle qui existe). */
export function useCreerFactureRecouvrement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => appeler({ payment_id: paymentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factures-recouvrement"] });
      qc.invalidateQueries({ queryKey: ["factures-vente"] });
    },
  });
}

function enregistrer(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function pdfDe(f: FactureREC): Promise<Blob> {
  // Facture reprise du fichier du cabinet : son PDF est produit au premier besoin.
  const chemin = f.pdf_path ?? (await appeler({ facture_id: f.id })).pdf_path;
  if (!chemin) throw new Error(`PDF indisponible pour ${f.numero}`);
  const { data, error } = await supabase.storage.from("invoices").download(chemin);
  if (error || !data) throw new Error(`Téléchargement impossible pour ${f.numero}`);
  return data;
}

export async function telechargerFactureREC(f: FactureREC): Promise<void> {
  enregistrer(await pdfDe(f), nomFichierFacture(f));
}

export async function telechargerFactureFAC(f: FactureFAC): Promise<void> {
  if (!f.html_path) throw new Error(`PDF indisponible pour ${f.invoice_number}`);
  const { data, error } = await supabase.storage.from("invoices").download(f.html_path);
  if (error || !data) throw new Error(`Téléchargement impossible pour ${f.invoice_number}`);
  enregistrer(data, `${f.invoice_number}.pdf`);
}

/** Toutes les factures choisies dans un seul ZIP. */
export async function telechargerZipREC(factures: FactureREC[], onAvance?: (fait: number) => void): Promise<string[]> {
  const zip = new JSZip();
  const echecs: string[] = [];
  let fait = 0;
  for (const f of factures) {
    try {
      zip.file(nomFichierFacture(f), await pdfDe(f));
    } catch {
      echecs.push(f.numero);
    }
    onAvance?.(++fait);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  enregistrer(blob, `factures-recouvrement-${new Date().toISOString().slice(0, 10)}.zip`);
  return echecs;
}

/** Toutes les factures d'une vente (FAC et REC) dans un seul ZIP. */
export async function telechargerZipVente(nomClient: string, recs: FactureREC[], facs: FactureFAC[]): Promise<string[]> {
  const zip = new JSZip();
  const echecs: string[] = [];
  for (const f of recs) {
    try {
      zip.file(nomFichierFacture(f), await pdfDe(f));
    } catch {
      echecs.push(f.numero);
    }
  }
  for (const f of facs) {
    try {
      if (!f.html_path) throw new Error();
      const { data, error } = await supabase.storage.from("invoices").download(f.html_path);
      if (error || !data) throw new Error();
      zip.file(`${f.invoice_number}.pdf`, data);
    } catch {
      echecs.push(f.invoice_number);
    }
  }
  const nom = nomClient.toUpperCase().replace(/[^A-Z0-9 -]/g, "").replace(/\s+/g, " ").trim() || "CLIENT";
  enregistrer(await zip.generateAsync({ type: "blob" }), `factures-${nom}.zip`);
  return echecs;
}

/**
 * Fichier Excel au format du cabinet. Les factures pas encore transmises
 * sont marquées « transmises » à la date du jour.
 */
export function useExporterCabinet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (factures: FactureREC[]) => {
      const blob = await classeurCabinet(factures);
      enregistrer(blob, `AL BARAKA - IMPAYES A TRANSMETTRE AU CABINET - ${new Date().toISOString().slice(0, 10)}.xlsx`);
      const aMarquer = factures.filter((f) => !f.transmise_le).map((f) => f.id);
      if (aMarquer.length) {
        const { error } = await db
          .from("factures_recouvrement")
          .update({ transmise_le: new Date().toISOString().slice(0, 10) })
          .in("id", aMarquer);
        if (error) throw error;
      }
      return aMarquer.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["factures-recouvrement"] }),
  });
}
