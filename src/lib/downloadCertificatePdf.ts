import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import CertificatePdfDocument, {
  type CertificatePdfData,
} from "@/components/training/CertificatePdfDocument";

const VERIFY_BASE_URL =
  typeof window !== "undefined" ? `${window.location.origin}/verify` : "https://app.ethicarena.com/verify";

export function getVerifyUrl(certificateNumber: string): string {
  return `${VERIFY_BASE_URL}/${certificateNumber}`;
}

async function buildQrDataUrl(verifyUrl: string): Promise<string> {
  return QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
    color: { dark: "#0A0A0A", light: "#FFFFFF" },
  });
}

export async function buildCertificateBlob(input: {
  certificateNumber: string;
  recipientName: string;
  formationTitle: string;
  issuedAt: Date;
}): Promise<Blob> {
  const verifyUrl = getVerifyUrl(input.certificateNumber);
  const qrDataUrl = await buildQrDataUrl(verifyUrl);
  const data: CertificatePdfData = {
    certificateNumber: input.certificateNumber,
    recipientName: input.recipientName,
    formationTitle: input.formationTitle,
    issuedAt: input.issuedAt,
    verifyUrl,
    qrDataUrl,
  };
  const doc = createElement(CertificatePdfDocument, { data });
  return await pdf(doc).toBlob();
}

export function storagePathFor(userId: string, certificateId: string): string {
  return `${userId}/${certificateId}.pdf`;
}

export async function uploadCertificatePdf(
  blob: Blob,
  userId: string,
  certificateId: string,
): Promise<string> {
  const path = storagePathFor(userId, certificateId);
  const { error } = await supabase.storage
    .from("certificates")
    .upload(path, blob, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (error) throw new Error(`Upload du certificat échoué : ${error.message}`);
  return path;
}

export async function getCertificateSignedUrl(
  storagePath: string,
  expiresInSec = 60 * 60 * 24 * 7,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from("certificates")
    .createSignedUrl(storagePath, expiresInSec);
  if (error || !data?.signedUrl) {
    throw new Error("Impossible de générer le lien du certificat");
  }
  return data.signedUrl;
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadCertificate(
  certificateId: string,
  filename?: string,
): Promise<void> {
  const { data: cert, error } = await supabase
    .from("formation_certificates")
    .select("id, certificate_number, pdf_storage_path, user_id, formation_id, issued_at")
    .eq("id", certificateId)
    .single();
  if (error || !cert) throw new Error("Certificat introuvable");

  let path = cert.pdf_storage_path;
  if (!path) {
    const [{ data: profile }, { data: formation }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", cert.user_id).single(),
      supabase.from("formations").select("titre").eq("id", cert.formation_id).single(),
    ]);
    const blob = await buildCertificateBlob({
      certificateNumber: cert.certificate_number,
      recipientName: profile?.full_name ?? "",
      formationTitle: formation?.titre ?? "",
      issuedAt: new Date(cert.issued_at),
    });
    path = await uploadCertificatePdf(blob, cert.user_id, cert.id);
    await supabase
      .from("formation_certificates")
      .update({ pdf_storage_path: path })
      .eq("id", cert.id);

    triggerBrowserDownload(blob, filename ?? `${cert.certificate_number}.pdf`);
    return;
  }

  const signedUrl = await getCertificateSignedUrl(path);
  const resp = await fetch(signedUrl);
  if (!resp.ok) throw new Error("Téléchargement du certificat échoué");
  const blob = await resp.blob();
  triggerBrowserDownload(blob, filename ?? `${cert.certificate_number}.pdf`);
}
