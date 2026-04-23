// ═══════════════════════════════════════════════════════════════════════════
// submit-quiz-lead
// Public edge function pour le tunnel quiz lead magnet partagé par les apporteurs.
// Verify JWT: false (endpoint public, accessible par le navigateur sans auth).
// Tout passe par le service_role pour bypass RLS.
// ═══════════════════════════════════════════════════════════════════════════

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

// Validation basique
function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[^\d]/g, "");
  if (cleaned.length < 8 || cleaned.length > 15) return false;
  // Refuser les séries répétées (ex: 1111111111)
  if (/^(.)\1{7,}$/.test(cleaned)) return false;
  return true;
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug) || /^[a-z0-9]{3,30}$/.test(slug);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const action = body?.action as string | undefined;
  if (!action) return json({ error: "missing_action" }, 400);

  try {
    switch (action) {
      case "resolve":
        return await handleResolve(supabase, body);
      case "view":
        return await handleView(supabase, body);
      case "email_captured":
        return await handleEmailCaptured(supabase, body, req);
      case "quiz_progress":
        return await handleQuizProgress(supabase, body);
      case "quiz_completed":
        return await handleQuizCompleted(supabase, body);
      case "phone_captured":
        return await handlePhoneCaptured(supabase, body);
      case "whatsapp_clicked":
        return await handleWhatsAppClicked(supabase, body);
      default:
        return json({ error: "unknown_action", action }, 400);
    }
  } catch (error) {
    // Les PostgrestError de Supabase sont des objets plains ({message, code, details, hint}).
    // Il faut les sérialiser proprement sinon on tombe sur "[object Object]".
    const message = extractErrorMessage(error);
    console.error("[submit-quiz-lead] error", action, JSON.stringify(error, null, 2));
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

// ─── resolve : charge les infos publiques d'un slug ───
async function handleResolve(supabase: any, body: any) {
  const slug = (body?.slug as string | undefined)?.toLowerCase();
  if (!slug || !isValidSlug(slug)) return json({ error: "invalid_slug" }, 400);

  const { data: owner, error: ownerError } = await supabase
    .from("lead_quiz_owners")
    .select("id, slug, display_name, display_role, whatsapp_phone, is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (ownerError) throw ownerError;
  if (!owner) return json({ error: "not_found" }, 404);

  const { data: config, error: configError } = await supabase
    .from("lead_quiz_configs")
    .select("version, questions, profiles, orientation_question, landing, intro, conference, whatsapp_message")
    .eq("is_active", true)
    .maybeSingle();

  if (configError) throw configError;
  if (!config) return json({ error: "no_active_config" }, 500);

  return json({
    owner: {
      id: owner.id,
      slug: owner.slug,
      display_name: owner.display_name,
      display_role: owner.display_role,
      whatsapp_phone: owner.whatsapp_phone,
    },
    config,
  });
}

// ─── view : ping visite (incrémente total_views, sans tracking perso) ───
async function handleView(supabase: any, body: any) {
  const slug = (body?.slug as string | undefined)?.toLowerCase();
  if (!slug || !isValidSlug(slug)) return json({ error: "invalid_slug" }, 400);

  // Atomic increment via RPC-free approach: fetch+update is fine au volume MVP
  const { data: owner } = await supabase
    .from("lead_quiz_owners")
    .select("id, total_views")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (owner) {
    await supabase
      .from("lead_quiz_owners")
      .update({ total_views: (owner.total_views ?? 0) + 1 })
      .eq("id", owner.id);
  }

  return json({ ok: true });
}

// ─── email_captured : crée la submission ───
async function handleEmailCaptured(supabase: any, body: any, req: Request) {
  const slug = (body?.slug as string | undefined)?.toLowerCase();
  const firstName = normalizeName(body?.first_name as string);
  const lastName = normalizeName(body?.last_name as string);
  const email = normalizeEmail(body?.email as string);

  if (!slug || !isValidSlug(slug)) return json({ error: "invalid_slug" }, 400);
  if (!firstName || firstName.length < 2) return json({ error: "invalid_first_name" }, 400);
  if (!lastName || lastName.length < 2) return json({ error: "invalid_last_name" }, 400);
  if (!email || !isValidEmail(email)) return json({ error: "invalid_email" }, 400);

  // Résoudre le propriétaire
  const { data: owner, error: ownerError } = await supabase
    .from("lead_quiz_owners")
    .select("id, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (ownerError) throw ownerError;
  if (!owner || !owner.is_active) return json({ error: "not_found" }, 404);

  // Récupérer la config active pour la version
  const { data: config } = await supabase
    .from("lead_quiz_configs")
    .select("version")
    .eq("is_active", true)
    .maybeSingle();
  const configVersion = config?.version ?? 1;

  // Créer la fiche contact dès maintenant (même sans téléphone)
  const fullNameUpper = `${firstName} ${lastName}`.toUpperCase();
  const { data: contactId, error: contactError } = await supabase.rpc("find_or_create_contact", {
    p_email: email,
    p_phone: null,
    p_full_name: fullNameUpper,
  });
  if (contactError) throw contactError;

  // Créer la submission
  const userAgent = req.headers.get("user-agent") ?? null;
  const referrer = (body?.referrer as string | undefined) ?? null;

  const { data: submission, error: subError } = await supabase
    .from("lead_quiz_submissions")
    .insert({
      owner_id: owner.id,
      config_version: configVersion,
      first_name: firstName,
      last_name: lastName,
      email,
      status: "email_captured",
      contact_id: contactId,
      user_agent: userAgent?.substring(0, 500) ?? null,
      referrer: referrer?.substring(0, 500) ?? null,
    })
    .select("id")
    .single();

  if (subError) throw subError;

  return json({ submission_id: submission.id });
}

// ─── quiz_progress : update incrémental de la submission ───
async function handleQuizProgress(supabase: any, body: any) {
  const submissionId = body?.submission_id as string | undefined;
  if (!submissionId) return json({ error: "missing_submission_id" }, 400);

  const answers = body?.answers;
  const lastQuestionReached = body?.last_question_reached as string | undefined;

  const updates: Record<string, unknown> = {
    last_seen_at: new Date().toISOString(),
  };

  // Statut : on passe à quiz_in_progress dès la première question
  const { data: existing } = await supabase
    .from("lead_quiz_submissions")
    .select("status, quiz_started_at")
    .eq("id", submissionId)
    .maybeSingle();

  if (!existing) return json({ error: "submission_not_found" }, 404);

  if (existing.status === "email_captured") {
    updates.status = "quiz_in_progress";
    updates.quiz_started_at = new Date().toISOString();
  }

  if (answers && typeof answers === "object") {
    updates.answers = answers;
  }
  if (lastQuestionReached) {
    updates.last_question_reached = lastQuestionReached;
  }

  const { error } = await supabase
    .from("lead_quiz_submissions")
    .update(updates)
    .eq("id", submissionId);

  if (error) throw error;
  return json({ ok: true });
}

// ─── quiz_completed : marque le quiz terminé avec profil + scores ───
async function handleQuizCompleted(supabase: any, body: any) {
  const submissionId = body?.submission_id as string | undefined;
  const profile = body?.profile as string | undefined;
  const scores = body?.scores;
  const orientationChoice = body?.orientation_choice as string | undefined;
  const answers = body?.answers;

  if (!submissionId) return json({ error: "missing_submission_id" }, 400);
  if (!profile || !["batisseur", "connecteur", "createur"].includes(profile)) {
    return json({ error: "invalid_profile" }, 400);
  }

  const updates: Record<string, unknown> = {
    status: "quiz_completed",
    profile,
    scores: scores ?? null,
    orientation_choice: orientationChoice ?? null,
    quiz_completed_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  };
  if (answers && typeof answers === "object") {
    updates.answers = answers;
  }

  const { error } = await supabase
    .from("lead_quiz_submissions")
    .update(updates)
    .eq("id", submissionId);

  if (error) throw error;
  return json({ ok: true });
}

// ─── phone_captured : ajoute le téléphone, crée le lead CRM ───
async function handlePhoneCaptured(supabase: any, body: any) {
  const submissionId = body?.submission_id as string | undefined;
  const rawPhone = body?.phone as string | undefined;

  if (!submissionId) return json({ error: "missing_submission_id" }, 400);
  if (!rawPhone || !isValidPhone(rawPhone)) return json({ error: "invalid_phone" }, 400);

  const phoneE164 = formatPhoneE164(rawPhone);
  if (!phoneE164) return json({ error: "invalid_phone" }, 400);

  // Récupérer la submission
  const { data: sub, error: subError } = await supabase
    .from("lead_quiz_submissions")
    .select("id, owner_id, first_name, last_name, email, phone, status, profile, lead_id, contact_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (subError) throw subError;
  if (!sub) return json({ error: "submission_not_found" }, 404);

  // Idempotence : si le lead existe déjà, on ne le recrée pas
  if (sub.lead_id) {
    return json({ ok: true, lead_id: sub.lead_id, contact_id: sub.contact_id, already_captured: true });
  }

  // Récupérer l'apporteur depuis l'owner
  const { data: owner } = await supabase
    .from("lead_quiz_owners")
    .select("id, user_id, slug, display_name")
    .eq("id", sub.owner_id)
    .single();

  // Re-find_or_create_contact avec le téléphone cette fois
  const fullNameUpper = `${sub.first_name} ${sub.last_name}`.toUpperCase();
  const { data: contactId, error: contactError } = await supabase.rpc("find_or_create_contact", {
    p_email: sub.email,
    p_phone: phoneE164,
    p_full_name: fullNameUpper,
  });
  if (contactError) throw contactError;

  // Créer le lead CRM
  const sourceDetail = `quiz:${owner.slug}`;
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert({
      contact_id: contactId,
      source: "apporteur_quiz",
      source_detail: sourceDetail,
      apporteur_id: owner.user_id,
      apporteur_source: "quiz",
      apporteur_source_detail: owner.slug,
      status: "a_qualifier",
      raw_full_name: fullNameUpper,
      raw_email: sub.email,
      raw_phone: phoneE164,
      notes: `Lead issu du quiz apporteur de ${owner.display_name} (/quiz/${owner.slug}). Profil : ${sub.profile ?? "non défini"}.`,
    })
    .select("id")
    .single();

  if (leadError) throw leadError;

  // Log d'activité (pour la timeline du lead)
  await supabase.from("lead_activities").insert({
    lead_id: lead.id,
    user_id: owner.user_id,
    action: "created",
    note: `Créé via le quiz apporteur (/quiz/${owner.slug}). Profil détecté : ${sub.profile ?? "non défini"}.`,
  });

  // MAJ de la submission
  const { error: updateError } = await supabase
    .from("lead_quiz_submissions")
    .update({
      phone: phoneE164,
      status: "phone_captured",
      contact_id: contactId,
      lead_id: lead.id,
      phone_captured_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (updateError) throw updateError;

  return json({ ok: true, lead_id: lead.id, contact_id: contactId });
}

// ─── whatsapp_clicked : log le clic final ───
async function handleWhatsAppClicked(supabase: any, body: any) {
  const submissionId = body?.submission_id as string | undefined;
  if (!submissionId) return json({ error: "missing_submission_id" }, 400);

  const { error } = await supabase
    .from("lead_quiz_submissions")
    .update({
      status: "whatsapp_clicked",
      whatsapp_clicked_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (error) throw error;
  return json({ ok: true });
}
