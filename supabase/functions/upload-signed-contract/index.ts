// ═══════════════════════════════════════════════════════════════════════════
// upload-signed-contract v1
//
// Endpoint authentifié appelé par le front pour finaliser la signature d'un
// contrat client. Workflow :
//
//   1. Vérifie le JWT user (Authorization header)
//   2. Récupère la ligne `client_contracts` correspondante et vérifie que
//      l'utilisateur en est bien le propriétaire (buyer_profile_id) ET que
//      le contrat est encore en status 'pending_signature'.
//   3. Décode les 2 payloads base64 (PDF signé + PNG signature seule).
//   4. Upload les fichiers dans le bucket privé `contracts/{sale_id}/...`
//   5. UPDATE la row pour marquer le contrat comme signé + preuves (IP, UA).
//   6. Retourne { ok: true, signed_pdf_path }.
//
// Idempotence : si le contrat est déjà 'signed', on renvoie 409 sans rien
// modifier — le client doit refresh sa page.
//
// verify_jwt = true
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Décode une string base64 en Uint8Array (binaire). */
function base64ToUint8Array(b64: string): Uint8Array {
  // Tolère les éventuels préfixes data:...;base64,
  const commaIdx = b64.indexOf(",");
  const clean = commaIdx >= 0 ? b64.slice(commaIdx + 1) : b64;
  const binary = atob(clean);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Récupère le premier IP de la chaîne x-forwarded-for. */
function extractClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
    return json({ error: "missing_env" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "missing_authorization" }, 401);
  }

  // Vérification du JWT user
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: "unauthorized" }, 401);
  }
  const userId = userData.user.id;

  // Body
  let body: {
    contract_id?: string;
    signed_pdf_base64?: string;
    signature_png_base64?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const contractId = body.contract_id?.trim();
  const signedPdfB64 = body.signed_pdf_base64;
  const signaturePngB64 = body.signature_png_base64;

  if (!contractId || !signedPdfB64 || !signaturePngB64) {
    return json({ error: "missing_fields" }, 400);
  }

  // Service role pour lire/écrire la ligne contract + storage
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // 1. Fetch contrat + check ownership + status
  const { data: contract, error: fetchErr } = await admin
    .from("client_contracts")
    .select(
      "id, sale_id, buyer_profile_id, contract_number, status, signed_pdf_path",
    )
    .eq("id", contractId)
    .maybeSingle();

  if (fetchErr) {
    console.error("[upload-signed-contract] fetch error", fetchErr);
    return json({ error: "fetch_failed" }, 500);
  }
  if (!contract) {
    return json({ error: "contract_not_found" }, 404);
  }
  if (contract.buyer_profile_id !== userId) {
    return json({ error: "forbidden" }, 403);
  }
  if (contract.status === "signed") {
    return json(
      {
        error: "already_signed",
        signed_pdf_path: contract.signed_pdf_path,
      },
      409,
    );
  }
  if (contract.status !== "pending_signature") {
    return json({ error: "invalid_status", status: contract.status }, 409);
  }

  // 2. Décode les payloads
  let pdfBytes: Uint8Array;
  let pngBytes: Uint8Array;
  try {
    pdfBytes = base64ToUint8Array(signedPdfB64);
    pngBytes = base64ToUint8Array(signaturePngB64);
  } catch (err) {
    console.error("[upload-signed-contract] decode error", err);
    return json({ error: "invalid_base64" }, 400);
  }

  if (pdfBytes.byteLength === 0 || pngBytes.byteLength === 0) {
    return json({ error: "empty_payload" }, 400);
  }

  // 3. Upload Storage (paths conformes à la migration phase 1)
  const signedPdfPath = `${contract.sale_id}/${contract.contract_number}_signed.pdf`;
  const signaturePngPath = `${contract.sale_id}/signature_${contract.contract_number}.png`;

  const { error: pdfUploadErr } = await admin.storage
    .from("contracts")
    .upload(signedPdfPath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (pdfUploadErr) {
    console.error("[upload-signed-contract] pdf upload error", pdfUploadErr);
    return json({ error: "pdf_upload_failed", detail: pdfUploadErr.message }, 500);
  }

  const { error: pngUploadErr } = await admin.storage
    .from("contracts")
    .upload(signaturePngPath, pngBytes, {
      contentType: "image/png",
      upsert: true,
    });
  if (pngUploadErr) {
    console.error("[upload-signed-contract] png upload error", pngUploadErr);
    return json({ error: "png_upload_failed", detail: pngUploadErr.message }, 500);
  }

  // 4. UPDATE row
  const nowIso = new Date().toISOString();
  const clientIp = extractClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? null;

  const { error: updateErr } = await admin
    .from("client_contracts")
    .update({
      signed_pdf_path: signedPdfPath,
      signature_png_path: signaturePngPath,
      signed_at: nowIso,
      signature_ip: clientIp,
      signature_user_agent: userAgent,
      status: "signed",
      last_attempt_at: nowIso,
      last_error: null,
    })
    .eq("id", contractId)
    .eq("status", "pending_signature"); // garde de course (anti-double signature)

  if (updateErr) {
    console.error("[upload-signed-contract] update error", updateErr);
    return json({ error: "update_failed", detail: updateErr.message }, 500);
  }

  // Phase 6 (19/05/2026) : trigger l'email de confirmation au client avec le
  // PDF signé en pièce jointe. Fire-and-forget pour ne pas bloquer la réponse.
  // L'edge function est appelée avec le service role (verify_jwt=false côté
  // send-signed-contract-email).
  fetch(`${SUPABASE_URL}/functions/v1/send-signed-contract-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ contract_id: contractId }),
  }).catch((err) => {
    console.error("[upload-signed-contract] failed to trigger signed-contract email", err);
  });

  return json({
    ok: true,
    signed_pdf_path: signedPdfPath,
    signature_png_path: signaturePngPath,
    signed_at: nowIso,
  });
});
