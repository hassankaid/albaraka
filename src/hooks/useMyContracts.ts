/**
 * Hook TanStack Query pour lister et récupérer les contrats client.
 *
 * RLS `client_contracts_select_owner_or_ceo` filtre déjà côté Postgres :
 *   - buyer_profile_id = auth.uid()
 *   - OU profile.role = 'ceo'
 * On peut donc faire un simple `select("*")` sans filtre client.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ContractTemplateKey } from "@/pages/contract/templates";

export interface ContractAgreementSnapshot {
  id: string;
  text: string;
  checked: boolean;
  checked_at: string | null;
}

export interface ContractRow {
  id: string;
  contract_number: string;
  sale_id: string;
  contact_id: string | null;
  buyer_profile_id: string | null;
  template_key: ContractTemplateKey;

  client_first_name: string;
  client_last_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  client_postal_code: string;
  client_city: string;
  client_country: string;

  amount_total: number;
  amount_original: number;
  discount_amount: number;
  coupon_code: string | null;
  payment_modality: string;
  installments_count: number;
  first_payment_date: string;

  agreements_snapshot: ContractAgreementSnapshot[];

  status: "pending_signature" | "signed" | "voided";
  unsigned_pdf_path: string | null;
  signed_pdf_path: string | null;
  signature_png_path: string | null;
  signed_at: string | null;
  signature_ip: string | null;
  signature_user_agent: string | null;

  email_sent_at: string | null;
  email_sent_to: string | null;

  created_at: string;
  updated_at: string;
}

/** Lien Storage signé temporaire pour télécharger un PDF signé. */
export async function getSignedContractUrl(
  signedPdfPath: string,
  expiresInSeconds = 60 * 60,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from("contracts")
    .createSignedUrl(signedPdfPath, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error("Impossible de récupérer le lien de téléchargement");
  }
  return data.signedUrl;
}

/** Liste les contrats visibles par l'utilisateur connecté (filtrage RLS). */
export function useMyContracts() {
  return useQuery({
    queryKey: ["my-contracts"],
    queryFn: async (): Promise<ContractRow[]> => {
      const { data, error } = await (supabase as any)
        .from("client_contracts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContractRow[];
    },
  });
}

/** Récupère un contrat précis (par id). RLS bloque si pas owner/CEO. */
export function useContract(contractId: string | undefined) {
  return useQuery({
    queryKey: ["my-contracts", contractId],
    enabled: !!contractId,
    queryFn: async (): Promise<ContractRow | null> => {
      if (!contractId) return null;
      const { data, error } = await (supabase as any)
        .from("client_contracts")
        .select("*")
        .eq("id", contractId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ContractRow | null;
    },
  });
}
