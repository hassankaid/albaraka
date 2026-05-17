// ═══════════════════════════════════════════════════════════════════════════
// rdv-funnel-submit
// Edge function publique (verify_jwt=false) appelee par le funnel /rdv.
// Trois actions possibles dans un seul handler pour minimiser les deploys :
//
//   POST { action: "coords", first_name, last_name, email, phone, phone_country? }
//     -> Insert un row dans rdv_funnel_leads avec status='coords_only'.
//     -> Retourne { lead_id }.
//
//   POST { action: "answer", lead_id, question_index (1..5), answer ('yes'|'no') }
//     -> Insert un row dans rdv_funnel_answers (historique).
//     -> Si answer='no' : update lead.status='disqualified',
//        disqualified_at_question=question_index.
//     -> Si answer='yes' : aucun update (la qualification finale passe par
//        l'action "qualified" appelee a la fin du parcours).
//     -> Retourne { ok: true }.
//
//   POST { action: "qualified", lead_id }
//     -> Verifie qu'il y a bien 5 reponses 'yes' (les plus recentes de chaque
//        question_index), puis passe status='qualified' et qualified_at=now().
//     -> Idempotent : si deja qualified ou booked, retourne ok sans changer.
//     -> Retourne { ok: true, already_qualified?: true }.
//
// Pas d'auth Supabase : le funnel est public. La securite repose sur :
//   - service_role utilise cote serveur uniquement (jamais expose)
//   - Validation stricte des inputs (regex email, format E.164)
//   - RLS active sur les 2 tables : aucune ecriture/lecture client direct possible
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractClientIp(req: Request): string | null {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return null;
}

// Validation simple : email + format E.164 (+ et 6-15 chiffres)
const EMAIL_RX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const E164_RX = /^\+[1-9]\d{6,14}$/;
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const action = String(body?.action || "").trim();
  if (!action) return json({ error: "action_required" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // ─────────────────────────────────────────────────────────────────────
    // ACTION : coords — capture initiale du lead
    // ─────────────────────────────────────────────────────────────────────
    if (action === "coords") {
      const firstName = String(body?.first_name || "").trim();
      const lastName = String(body?.last_name || "").trim();
      const email = String(body?.email || "").trim().toLowerCase();
      const phone = String(body?.phone || "").trim();
      const phoneCountry = body?.phone_country ? String(body.phone_country).trim().toUpperCase() : null;

      if (!firstName || firstName.length < 2) return json({ error: "first_name_required" }, 400);
      if (!lastName || lastName.length < 2) return json({ error: "last_name_required" }, 400);
      if (!email || !EMAIL_RX.test(email)) return json({ error: "invalid_email" }, 400);
      if (!phone || !E164_RX.test(phone)) return json({ error: "invalid_phone" }, 400);

      const clientIp = extractClientIp(req);
      const userAgent = req.headers.get("user-agent");

      const { data: inserted, error: insertErr } = await supabase
        .from("rdv_funnel_leads")
        .insert({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          phone_country: phoneCountry,
          status: "coords_only",
          ip: clientIp,
          user_agent: userAgent,
        })
        .select("id")
        .single();

      if (insertErr || !inserted) {
        console.error("[rdv-funnel-submit] insert coords error", insertErr);
        return json({ error: "insert_failed" }, 500);
      }

      return json({ ok: true, lead_id: inserted.id });
    }

    // ─────────────────────────────────────────────────────────────────────
    // ACTION : answer — log d'une reponse Q1..Q5 (+ disqualification eventuelle)
    // ─────────────────────────────────────────────────────────────────────
    if (action === "answer") {
      const leadId = String(body?.lead_id || "").trim();
      const questionIndex = Number(body?.question_index);
      const answer = String(body?.answer || "").trim().toLowerCase();

      if (!leadId || !UUID_RX.test(leadId)) return json({ error: "invalid_lead_id" }, 400);
      if (!Number.isInteger(questionIndex) || questionIndex < 1 || questionIndex > 5)
        return json({ error: "invalid_question_index" }, 400);
      if (answer !== "yes" && answer !== "no") return json({ error: "invalid_answer" }, 400);

      // Verifier que le lead existe (sinon UUID forge = abus)
      const { data: leadRow, error: leadErr } = await supabase
        .from("rdv_funnel_leads")
        .select("id, status")
        .eq("id", leadId)
        .maybeSingle();
      if (leadErr) {
        console.error("[rdv-funnel-submit] select lead error", leadErr);
        return json({ error: "internal" }, 500);
      }
      if (!leadRow) return json({ error: "lead_not_found" }, 404);

      // Log la reponse (historique)
      const { error: answerInsertErr } = await supabase
        .from("rdv_funnel_answers")
        .insert({
          lead_id: leadId,
          question_index: questionIndex,
          answer,
        });
      if (answerInsertErr) {
        console.error("[rdv-funnel-submit] insert answer error", answerInsertErr);
        return json({ error: "insert_answer_failed" }, 500);
      }

      if (answer === "no") {
        // Disqualification : on flag le lead. Si le user revient et change
        // sa reponse plus tard, l'action "answer" sera rappelee et l'action
        // "qualified" (a la fin du parcours) requalifiera le lead.
        const { error: updateErr } = await supabase
          .from("rdv_funnel_leads")
          .update({
            status: "disqualified",
            disqualified_at_question: questionIndex,
          })
          .eq("id", leadId);
        if (updateErr) {
          console.error("[rdv-funnel-submit] disqualify update error", updateErr);
          return json({ error: "update_failed" }, 500);
        }
      }

      return json({ ok: true });
    }

    // ─────────────────────────────────────────────────────────────────────
    // ACTION : qualified — passage final en status='qualified'
    // ─────────────────────────────────────────────────────────────────────
    if (action === "qualified") {
      const leadId = String(body?.lead_id || "").trim();
      if (!leadId || !UUID_RX.test(leadId)) return json({ error: "invalid_lead_id" }, 400);

      const { data: leadRow, error: leadErr } = await supabase
        .from("rdv_funnel_leads")
        .select("id, status")
        .eq("id", leadId)
        .maybeSingle();
      if (leadErr) {
        console.error("[rdv-funnel-submit] select lead error", leadErr);
        return json({ error: "internal" }, 500);
      }
      if (!leadRow) return json({ error: "lead_not_found" }, 404);

      // Idempotent : si deja qualified ou booked, ne rien changer.
      if (leadRow.status === "qualified" || leadRow.status === "booked") {
        return json({ ok: true, already_qualified: true });
      }

      // Verifier qu'on a bien 5 reponses 'yes' (la plus recente de chaque
      // question_index 1..5). On utilise DISTINCT ON pour ne garder que la
      // derniere reponse de chaque question. Si une question a un 'no'
      // recent ou est absente, on refuse.
      const { data: answers, error: answersErr } = await supabase
        .from("rdv_funnel_answers")
        .select("question_index, answer, answered_at")
        .eq("lead_id", leadId)
        .order("answered_at", { ascending: false });
      if (answersErr) {
        console.error("[rdv-funnel-submit] select answers error", answersErr);
        return json({ error: "internal" }, 500);
      }

      // Construit le map question_index -> derniere reponse
      const latestByQuestion = new Map<number, "yes" | "no">();
      for (const row of answers || []) {
        const idx = row.question_index as number;
        if (!latestByQuestion.has(idx)) {
          latestByQuestion.set(idx, row.answer as "yes" | "no");
        }
      }

      for (let i = 1; i <= 5; i++) {
        if (latestByQuestion.get(i) !== "yes") {
          return json({
            error: "not_all_yes",
            question_index: i,
            current_answer: latestByQuestion.get(i) ?? null,
          }, 400);
        }
      }

      const { error: updateErr } = await supabase
        .from("rdv_funnel_leads")
        .update({
          status: "qualified",
          qualified_at: new Date().toISOString(),
          disqualified_at_question: null,
        })
        .eq("id", leadId);
      if (updateErr) {
        console.error("[rdv-funnel-submit] qualify update error", updateErr);
        return json({ error: "update_failed" }, 500);
      }

      return json({ ok: true });
    }

    return json({ error: "unknown_action", action }, 400);
  } catch (e: any) {
    console.error("[rdv-funnel-submit] unexpected error", e);
    return json({ error: "internal", detail: e?.message ?? null }, 500);
  }
});
