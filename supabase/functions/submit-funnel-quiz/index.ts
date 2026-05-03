// ═══════════════════════════════════════════════════════════════════════════
// submit-funnel-quiz
// Public endpoint pour le tunnel "Quiz Scoring" embed dans Systemio.
//
// Flow :
//   1. Le front (page /quiz-funnel embed dans iframe Systemio) appelle ce
//      endpoint avec : slug du tunnel, identité (prénom/email/tél), réponses.
//   2. On résout le tunnel pour récupérer la thank_you_url.
//   3. On crée/réutilise le contact + on crée un lead (source = quiz_scoring,
//      source_detail = slug).
//   4. On insert les réponses + score + catégorie dans funnel_quiz_responses.
//   5. On retourne la thank_you_url au front qui redirige.
//
// verify_jwt: false (endpoint public).
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  computeQuizResult,
  isQuizComplete,
  QUIZ_QUESTIONS,
  type QuizAnswers,
} from "./quiz.ts";

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

function normalizeEmail(email?: string | null): string | null {
  if (!email) return null;
  return email.trim().toLowerCase() || null;
}

function normalizeName(name?: string | null): string | null {
  if (!name) return null;
  return name.trim() || null;
}

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

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$/.test(slug);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // Champs requis
  const slug = (body?.slug as string | undefined)?.toLowerCase();
  const firstName = normalizeName(body?.first_name);
  const email = normalizeEmail(body?.email);
  const rawPhone = body?.phone as string | undefined;
  const answers = body?.answers as QuizAnswers | undefined;

  if (!slug || !isValidSlug(slug)) return json({ error: "invalid_slug" }, 400);
  if (!firstName || firstName.length < 2) return json({ error: "invalid_first_name" }, 400);
  if (!email || !isValidEmail(email)) return json({ error: "invalid_email" }, 400);
  if (!rawPhone || !isValidPhone(rawPhone)) return json({ error: "invalid_phone" }, 400);
  if (!answers || typeof answers !== "object") return json({ error: "invalid_answers" }, 400);
  if (!isQuizComplete(answers)) return json({ error: "incomplete_answers" }, 400);

  const phone = formatPhoneE164(rawPhone);
  if (!phone) return json({ error: "invalid_phone" }, 400);

  // Filtre les réponses pour ne garder QUE les codes valides connus.
  // Évite qu'un attaquant injecte des clés/valeurs arbitraires en base.
  const sanitizedAnswers: QuizAnswers = {};
  for (const q of QUIZ_QUESTIONS) {
    const code = answers[q.id];
    if (code && q.options.some((o) => o.code === code)) {
      sanitizedAnswers[q.id] = code;
    }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    // ─── 1. Résoudre le tunnel ────────────────────────────────────────────
    const { data: funnel, error: funnelErr } = await supabase
      .from("quiz_funnels")
      .select("slug, name, thank_you_url, active")
      .eq("slug", slug)
      .maybeSingle();

    if (funnelErr) throw funnelErr;
    if (!funnel) return json({ error: "funnel_not_found" }, 404);
    if (!funnel.active) return json({ error: "funnel_inactive" }, 410);

    // ─── 2. Calcul score (côté serveur, jamais le front) ──────────────────
    const { score, category } = computeQuizResult(sanitizedAnswers);

    // ─── 3. Contact ───────────────────────────────────────────────────────
    const fullNameUpper = firstName.toUpperCase();
    const { data: contactId, error: contactErr } = await supabase.rpc(
      "find_or_create_contact",
      { p_email: email, p_phone: phone, p_full_name: fullNameUpper },
    );
    if (contactErr) throw contactErr;

    // ─── 4. Lead CRM ──────────────────────────────────────────────────────
    // On crée systématiquement un nouveau lead (chaque soumission de quiz =
    // une nouvelle qualification, même si le contact existe déjà). Le commercial
    // verra plusieurs leads dans la timeline du contact.
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .insert({
        contact_id: contactId,
        source: "quiz_scoring",
        source_detail: slug,
        status: "a_qualifier",
        raw_full_name: fullNameUpper,
        raw_email: email,
        raw_phone: phone,
        quiz_score: score,
        quiz_category: category,
        notes: `Lead issu du Quiz Scoring (tunnel : ${funnel.name}). Score : ${score}/70 — ${category}.`,
      })
      .select("id")
      .single();

    if (leadErr) throw leadErr;

    // ─── 5. Réponses au quiz ──────────────────────────────────────────────
    const { error: respErr } = await supabase
      .from("funnel_quiz_responses")
      .insert({
        lead_id: lead.id,
        funnel_slug: slug,
        score,
        category,
        answers: sanitizedAnswers,
      });

    if (respErr) throw respErr;

    // ─── 6. Activité (pour la timeline du lead) ───────────────────────────
    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      action: "created",
      note: `Créé via Quiz Scoring (${funnel.name}). Score ${score}/70 — ${category}.`,
    });

    return json({
      ok: true,
      lead_id: lead.id,
      score,
      category,
      thank_you_url: funnel.thank_you_url,
    });
  } catch (error) {
    const message = extractErrorMessage(error);
    console.error("[submit-funnel-quiz] error", JSON.stringify(error, null, 2));
    return json({ error: "internal", message }, 500);
  }
});

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
