import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  buildCertificateBlob,
  uploadCertificatePdf,
  downloadCertificate as triggerDownload,
  getCertificateSignedUrl,
} from "@/lib/downloadCertificatePdf";

export interface CertificateRow {
  id: string;
  certificate_number: string;
  user_id: string;
  formation_id: string;
  issued_at: string;
  issued_by: string | null;
  issue_source: "auto" | "manual";
  pdf_storage_path: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
}

export interface CertificateWithFormation extends CertificateRow {
  formation: { id: string; slug: string; titre: string; couleur: string | null };
}

export interface AdminCertificateRow extends CertificateWithFormation {
  user: { id: string; full_name: string | null; email: string };
  issued_by_profile: { full_name: string | null } | null;
}

export function useMyCertificates() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["certificates", "mine", profile?.id],
    enabled: !!profile?.id,
    queryFn: async (): Promise<CertificateWithFormation[]> => {
      const { data, error } = await supabase
        .from("formation_certificates")
        .select(
          "id, certificate_number, user_id, formation_id, issued_at, issued_by, issue_source, pdf_storage_path, revoked_at, revoked_reason, formations(id, slug, titre, couleur)",
        )
        .eq("user_id", profile!.id)
        .is("revoked_at", null)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        formation: r.formations,
      }));
    },
  });
}

export function useCertificateForFormation(formationId: string | undefined) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["certificates", "one", profile?.id, formationId],
    enabled: !!profile?.id && !!formationId,
    queryFn: async (): Promise<CertificateRow | null> => {
      const { data, error } = await supabase
        .from("formation_certificates")
        .select(
          "id, certificate_number, user_id, formation_id, issued_at, issued_by, issue_source, pdf_storage_path, revoked_at, revoked_reason",
        )
        .eq("user_id", profile!.id)
        .eq("formation_id", formationId!)
        .is("revoked_at", null)
        .maybeSingle();
      if (error) throw error;
      return data as CertificateRow | null;
    },
  });
}

export function useAllCertificates(filters?: {
  formationId?: string;
  includeRevoked?: boolean;
}) {
  return useQuery({
    queryKey: ["certificates", "admin", "all", filters],
    queryFn: async (): Promise<AdminCertificateRow[]> => {
      let q = supabase
        .from("formation_certificates")
        .select(
          "id, certificate_number, user_id, formation_id, issued_at, issued_by, issue_source, pdf_storage_path, revoked_at, revoked_reason, formations(id, slug, titre, couleur), profiles!formation_certificates_user_id_fkey(id, full_name, email), issued_by_profile:profiles!formation_certificates_issued_by_fkey(full_name)",
        )
        .order("issued_at", { ascending: false });
      if (filters?.formationId) q = q.eq("formation_id", filters.formationId);
      if (!filters?.includeRevoked) q = q.is("revoked_at", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        formation: r.formations,
        user: r.profiles,
        issued_by_profile: r.issued_by_profile,
      }));
    },
  });
}

interface IssueCertInput {
  user_id: string;
  formation_id: string;
  source: "auto" | "manual";
}

export function useIssueCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: IssueCertInput) => {
      const { data, error } = await supabase.functions.invoke("issue-certificate", {
        body: input,
      });
      if (error) throw new Error(error.message || "Émission du certificat échouée");
      if ((data as any)?.error) throw new Error((data as any).error);

      const certId = (data as any).certificate_id as string;
      const certNumber = (data as any).certificate_number as string;
      const alreadyIssued = (data as any).already_issued as boolean;
      const existingPath = (data as any).pdf_storage_path as string | null;

      // If already issued and PDF exists, nothing to do
      if (alreadyIssued && existingPath) {
        return { certificate_id: certId, certificate_number: certNumber, pdf_ready: true };
      }

      // Build + upload PDF client-side
      const [{ data: profile }, { data: formation }, { data: certRow }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", input.user_id).single(),
        supabase.from("formations").select("titre").eq("id", input.formation_id).single(),
        supabase
          .from("formation_certificates")
          .select("issued_at")
          .eq("id", certId)
          .single(),
      ]);

      const blob = await buildCertificateBlob({
        certificateNumber: certNumber,
        recipientName: profile?.full_name ?? "",
        formationTitle: formation?.titre ?? "",
        issuedAt: certRow?.issued_at ? new Date(certRow.issued_at) : new Date(),
      });
      const path = await uploadCertificatePdf(blob, input.user_id, certId);
      await supabase
        .from("formation_certificates")
        .update({ pdf_storage_path: path })
        .eq("id", certId);

      return { certificate_id: certId, certificate_number: certNumber, pdf_ready: true };
    },
    onSuccess: (_, input) => {
      qc.invalidateQueries({ queryKey: ["certificates"] });
      qc.invalidateQueries({ queryKey: ["student-tracking"] });
      qc.invalidateQueries({ queryKey: ["training"] });
      qc.invalidateQueries({
        queryKey: ["certificates", "one", input.user_id, input.formation_id],
      });
    },
  });
}

export function useRevokeCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { certificateId: string; reason: string }) => {
      const { error } = await supabase
        .from("formation_certificates")
        .update({
          revoked_at: new Date().toISOString(),
          revoked_reason: args.reason,
        })
        .eq("id", args.certificateId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certificates"] });
    },
  });
}

export async function downloadCertificateById(
  certificateId: string,
  filename?: string,
) {
  return triggerDownload(certificateId, filename);
}

export async function viewCertificateSignedUrl(storagePath: string) {
  return getCertificateSignedUrl(storagePath);
}
