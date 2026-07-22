// ─────────────────────────────────────────────────────────────────────────
// tunnel-lead-submit — Edge function publique du module « tunnels » (funnels
// natifs). REMPLACE le webhook Systeme.io comme source de leads.
//
// Verify JWT: false (endpoint public navigateur). Tout en service_role.
//
// Reçoit le formulaire d'inscription d'une landing (tunnel WhatsApp) et crée
// le lead dans le CRM, comme le fait submit-quiz-lead — MAIS :
//   - AUCUN email au prospect, AUCUNE notification interne
//     (on ne met NI source='apporteur_quiz' NI apporteur_id → le trigger
//      trg_notify_apporteur_lead_captured ne se déclenche pas).
//   - source = webi_wa_ads | webi_wa_instagram_organic | webi_wa_tiktok_organic
//     (whitelist ; défaut webi_wa_direct). status = 'a_qualifier' OBLIGATOIRE
//     (le default 'nouveau' violerait leads_status_check).
//   - UTM stockés dans les colonnes utm_* ; fbclid/referrer (pas de colonne
//     dédiée) consignés dans notes.
//   - Pas d'apporteur → lead non assigné (reste dans le pool), comme les
//     anciens leads « webi ».
// ─────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Sources autorisées pour les tunnels (doit matcher leads_source_check).
const ALLOWED_SOURCES = new Set([
  // Tunnel WhatsApp
  "webi_wa_ads",
  "webi_wa_instagram_organic",
  "webi_wa_tiktok_organic",
  "webi_wa_direct",
  // Tunnel VSL
  "webi_vsl_ads",
  "webi_vsl_instagram_organic",
  "webi_vsl_tiktok_organic",
  "webi_vsl_direct",
]);
function safeSource(s: unknown): string {
  if (typeof s === "string" && ALLOWED_SOURCES.has(s)) return s;
  // Filet de sécurité si le client envoie une source non reconnue.
  if (typeof s === "string" && s.startsWith("webi_vsl")) return "webi_vsl_direct";
  return "webi_wa_direct";
}

function normalizeEmail(email?: string | null): string | null {
  if (!email) return null;
  return email.trim().toLowerCase() || null;
}

function normalizeName(name?: string | null): string | null {
  if (!name) return null;
  return name.trim() || null;
}

// E.164 (FR + Maroc), identique au funnel quiz.
function formatPhoneE164(phone?: string | null): string | null {
  if (!phone) return null;
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);
  if (!cleaned.startsWith("+")) {
    if (cleaned.startsWith("212") && cleaned.length >= 12) cleaned = "+" + cleaned;
    else if (cleaned.startsWith("0") && cleaned.length === 10) cleaned = "+33" + cleaned.slice(1);
    else if (cleaned.length === 9) cleaned = "+33" + cleaned;
    else cleaned = "+" + cleaned;
  }
  return cleaned;
}

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[^\d]/g, "");
  if (cleaned.length < 8 || cleaned.length > 15) return false;
  if (/^(.)\1{7,}$/.test(cleaned)) return false;
  return true;
}

function clip(v: unknown, max = 300): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function extractErrorMessage(error: unknown): string {
  if (!error) return "unknown";
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const e = error as Record<string, unknown>;
    const parts: string[] = [];
    if (e.message) parts.push(String(e.message));
    if (e.details) parts.push(`details: ${e.details}`);
    if (e.hint) parts.push(`hint: ${e.hint}`);
    if (e.code) parts.push(`code: ${e.code}`);
    if (parts.length > 0) return parts.join(" | ");
    try { return JSON.stringify(error); } catch { return "unserializable_error"; }
  }
  return String(error);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const body = await req.json().catch(() => ({}));

    const firstName = normalizeName(body?.first_name as string);
    const email = normalizeEmail(body?.email as string);
    const rawPhone = body?.phone as string | undefined;

    // Prénom + Email + Téléphone (comme la landing SIO — pas de nom de famille).
    if (!firstName || firstName.length < 2) return json({ error: "invalid_first_name" }, 400);
    if (!email || !isValidEmail(email)) return json({ error: "invalid_email" }, 400);
    if (!rawPhone || !isValidPhone(rawPhone)) return json({ error: "invalid_phone" }, 400);
    const phoneE164 = formatPhoneE164(rawPhone);
    if (!phoneE164) return json({ error: "invalid_phone" }, 400);

    const source = safeSource(body?.source);
    const src = clip(body?.src, 40); // token brut (ads/ig/tiktok/direct)
    const utm = {
      utm_source: clip(body?.utm_source, 120),
      utm_medium: clip(body?.utm_medium, 120),
      utm_campaign: clip(body?.utm_campaign, 200),
      utm_content: clip(body?.utm_content, 200),
      utm_term: clip(body?.utm_term, 200),
    };
    const fbclid = clip(body?.fbclid, 255);
    const referrer = clip(body?.referrer, 300);

    const fullNameUpper = firstName.toUpperCase();

    // 1) Contact (dédup email/téléphone).
    const { data: contactId, error: contactError } = await supabase.rpc("find_or_create_contact", {
      p_email: email,
      p_phone: phoneE164,
      p_full_name: fullNameUpper,
    });
    if (contactError) throw contactError;

    // 2) Lead CRM. PAS d'apporteur_id / apporteur_source → aucune notif, lead au pool.
    const tunnelName = source.startsWith("webi_vsl") ? "VSL" : "WhatsApp";
    const noteParts = [`Lead tunnel ${tunnelName} (conférence).`];
    if (src) noteParts.push(`src=${src}`);
    if (fbclid) noteParts.push(`fbclid=${fbclid}`);
    if (referrer) noteParts.push(`ref=${referrer}`);

    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .insert({
        contact_id: contactId,
        source, // webi_wa_*
        source_detail: src, // ads | ig | tiktok | direct
        status: "a_qualifier", // OBLIGATOIRE (default 'nouveau' viole la CHECK)
        raw_full_name: fullNameUpper,
        raw_email: email,
        raw_phone: phoneE164,
        notes: noteParts.join(" "),
        ...utm,
      })
      .select("id")
      .single();
    if (leadErr) throw leadErr;

    return json({ ok: true, lead_id: lead.id, contact_id: contactId });
  } catch (error) {
    const message = extractErrorMessage(error);
    console.error("[tunnel-lead-submit] error", JSON.stringify(error, null, 2));
    return json({ error: "internal", message }, 500);
  }
});
