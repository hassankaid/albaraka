// ═══════════════════════════════════════════════════════════════════════════
// notify-apporteur-lead
// Envoie à l'apporteur un email quand un lead arrive via SON funnel quiz.
//   kind = "captured"  → lead créé (coordonnées) : "nouveau lead capturé"
//   kind = "completed" → lead a terminé le quiz   : profil détecté + relance
// Appelée par 2 triggers DB (pg_net) — uniquement pour les leads du quiz apporteur.
// verify_jwt = false (déclenchée côté serveur). Non bloquant pour la capture.
// Params: { kind, lead_id?, submission_id?, test_email?, dry_run? }
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "AL BARAKA <noreply@albarakaecosysteme.com>";
const APP_URL = "https://albarakaecosysteme.com";
const GOLD = "#C9A04E";
const INK = "#0A0908";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function firstNameOf(full: string): string {
  const t = titleCase(full).split(" ");
  return t[0] || full;
}

function phoneDigits(phone: string): string {
  return (phone || "").replace(/[^\d]/g, "");
}

function formatDateParis(iso: string | null): string {
  try {
    const d = iso ? new Date(iso) : new Date();
    const date = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
    const time = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d).replace(":", "h");
    return `le ${date} à ${time}`;
  } catch {
    return "";
  }
}

const PROFILES: Record<string, { label: string; desc: string; icon: string }> = {
  batisseur: { label: "Le Bâtisseur", desc: "Structuré, prêt à s'investir dans la durée.", icon: "🏗️" },
  connecteur: { label: "Le Connecteur", desc: "À l'aise avec les gens, fort en relationnel.", icon: "🤝" },
  createur: { label: "Le Créateur", desc: "Créatif, attiré par le contenu et l'image.", icon: "🎨" },
};

interface MailData {
  apporteurFirstName: string;
  prospectFirstName: string;
  prospectFullName: string;
  phoneE164: string;
  email: string;
  slug: string;
  dateStr: string;
  profileCode?: string | null;
}

// ─── Templates HTML email ──────────────────────────────────────────────────
function shell(inner: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f3ef;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
<div style="max-width:480px;margin:0 auto;padding:20px 14px;">
<div style="background:#ffffff;border:1px solid #e6e4dd;border-radius:14px;overflow:hidden;">
<div style="background:${INK};padding:14px 20px;">
<span style="color:${GOLD};font-weight:bold;letter-spacing:3px;font-size:13px;">AL BARAKA</span>
</div>
${inner}
</div>
<p style="color:#9b988f;font-size:11px;line-height:1.6;text-align:center;margin:14px 6px 0;">
Tu reçois cet email car ce lead provient de ton quiz apporteur AL BARAKA.<br>Retrouve-le dans ton espace, onglet « Mes leads à traiter ».
</p>
</div></body></html>`;
}

function leadRows(d: MailData): string {
  const row = (label: string, value: string) =>
    `<tr>
<td style="padding:9px 0;border-bottom:1px solid #eee;color:#9b988f;font-size:13px;width:90px;vertical-align:top;">${label}</td>
<td style="padding:9px 0;border-bottom:1px solid #eee;color:#1a1a1a;font-size:15px;font-weight:bold;">${value}</td>
</tr>`;
  return `<table style="width:100%;border-collapse:collapse;margin:0 0 18px;">
${row("Nom", esc(d.prospectFullName))}
${row("Téléphone", esc(d.phoneE164))}
${row("Email", esc(d.email))}
${row("Reçu", esc(d.dateStr))}
<tr><td style="padding:9px 0;color:#9b988f;font-size:13px;vertical-align:top;">Source</td><td style="padding:9px 0;color:#1a1a1a;font-size:15px;font-weight:bold;">Ton quiz · /quiz/${esc(d.slug)}</td></tr>
</table>`;
}

function actionButtons(d: MailData): string {
  const wa = `https://wa.me/${phoneDigits(d.phoneE164)}`;
  return `<table style="width:100%;border-collapse:collapse;margin:0 0 18px;"><tr>
<td style="padding-right:5px;width:50%;">
<a href="tel:${esc(d.phoneE164)}" style="display:block;text-align:center;border:1px solid #d8d5cc;border-radius:8px;padding:11px;color:#1a1a1a;text-decoration:none;font-size:14px;font-weight:bold;">📞 Appeler</a>
</td>
<td style="padding-left:5px;width:50%;">
<a href="${wa}" style="display:block;text-align:center;border:1px solid #d8d5cc;border-radius:8px;padding:11px;color:#1a1a1a;text-decoration:none;font-size:14px;font-weight:bold;">💬 WhatsApp</a>
</td>
</tr></table>`;
}

function ctaButton(): string {
  return `<div style="text-align:center;margin:4px 0 4px;">
<a href="${APP_URL}/my-space/leads" style="display:inline-block;background:${GOLD};color:#2c2c2a;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 26px;border-radius:8px;">Voir le lead dans mon espace</a>
</div>`;
}

function tipBox(html: string): string {
  return `<div style="background:#f6f5f1;border-radius:8px;padding:12px 14px;margin:0 0 20px;color:#5f5e5a;font-size:13px;line-height:1.6;">${html}</div>`;
}

function buildCaptured(d: MailData): { subject: string; html: string } {
  const subject = `🎯 Nouveau lead capturé via ton quiz : ${d.prospectFullName}`;
  const inner = `<div style="padding:22px 20px;">
<h1 style="font-size:21px;margin:0 0 6px;color:#1a1a1a;">Tu as un nouveau lead, ${esc(d.apporteurFirstName)} 🎉</h1>
<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#5f5e5a;">
${esc(d.prospectFirstName)} vient de remplir ton quiz. Voici ses coordonnées — prends contact rapidement, l'intérêt est au plus haut juste après l'inscription.
</p>
${leadRows(d)}
${actionButtons(d)}
${tipBox("💡 Astuce : un lead recontacté dans l'heure répond bien plus souvent. Un message WhatsApp + un appel = le combo gagnant.")}
${ctaButton()}
</div>`;
  return { subject, html: shell(inner) };
}

function buildCompleted(d: MailData): { subject: string; html: string } {
  const p = PROFILES[d.profileCode ?? ""] ?? null;
  const subject = `✅ ${d.prospectFirstName} a terminé ton quiz — à recontacter si ce n'est pas déjà fait`;
  const profileBlock = p
    ? `<div style="background:#f6f5f1;border-radius:12px;padding:16px;margin:0 0 18px;">
<div style="color:#9b988f;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Profil détecté</div>
<div style="font-size:17px;font-weight:bold;color:#1a1a1a;margin-top:2px;">${p.icon} ${p.label}</div>
<div style="font-size:13px;color:#5f5e5a;margin-top:2px;">${p.desc}</div>
</div>`
    : "";
  const inner = `<div style="padding:22px 20px;">
<h1 style="font-size:21px;margin:0 0 6px;color:#1a1a1a;">${esc(d.prospectFirstName)} est allé(e) au bout de ton quiz ✅</h1>
<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#5f5e5a;">
Bonne nouvelle : toutes les questions ont été remplies. Aller jusqu'au bout, c'est un vrai signal d'intérêt — le moment idéal pour prendre contact si ce n'est pas déjà fait.
</p>
${profileBlock}
${leadRows(d)}
${actionButtons(d)}
${tipBox(`Déjà contacté(e) ? Parfait, ignore ce rappel. Sinon : ${esc(d.prospectFirstName)} vient de passer plusieurs minutes sur <b>ton</b> contenu — un message maintenant fera la différence.`)}
${ctaButton()}
</div>`;
  return { subject, html: shell(inner) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const kind = body?.kind as string | undefined;
  if (kind !== "captured" && kind !== "completed") return json({ error: "invalid_kind" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    let data: MailData | null = null;
    let apporteurEmail: string | null = null;

    if (kind === "captured") {
      const leadId = body?.lead_id as string | undefined;
      if (!leadId) return json({ error: "missing_lead_id" }, 400);
      const { data: lead } = await supabase
        .from("leads")
        .select("raw_full_name, raw_email, raw_phone, apporteur_id, source, source_detail, created_at")
        .eq("id", leadId)
        .maybeSingle();
      if (!lead) return json({ error: "lead_not_found" }, 404);
      if (lead.source !== "apporteur_quiz" || !lead.apporteur_id) {
        return json({ ok: true, skipped: "not_apporteur_quiz" });
      }
      const { data: prof } = await supabase
        .from("profiles").select("email, full_name").eq("id", lead.apporteur_id).maybeSingle();
      apporteurEmail = prof?.email ?? null;
      const full = titleCase(lead.raw_full_name ?? "");
      data = {
        apporteurFirstName: firstNameOf(prof?.full_name ?? "") || "",
        prospectFirstName: firstNameOf(lead.raw_full_name ?? ""),
        prospectFullName: full,
        phoneE164: lead.raw_phone ?? "",
        email: lead.raw_email ?? "",
        slug: String(lead.source_detail ?? "").replace(/^quiz:/, ""),
        dateStr: formatDateParis(lead.created_at),
      };
    } else {
      const submissionId = body?.submission_id as string | undefined;
      if (!submissionId) return json({ error: "missing_submission_id" }, 400);
      const { data: sub } = await supabase
        .from("lead_quiz_submissions")
        .select("first_name, last_name, email, phone, profile, owner_id, quiz_completed_at")
        .eq("id", submissionId)
        .maybeSingle();
      if (!sub) return json({ error: "submission_not_found" }, 404);
      const { data: owner } = await supabase
        .from("lead_quiz_owners").select("user_id, slug, display_name").eq("id", sub.owner_id).maybeSingle();
      if (!owner) return json({ error: "owner_not_found" }, 404);
      const { data: prof } = await supabase
        .from("profiles").select("email, full_name").eq("id", owner.user_id).maybeSingle();
      apporteurEmail = prof?.email ?? null;
      const full = titleCase(`${sub.first_name ?? ""} ${sub.last_name ?? ""}`.trim());
      data = {
        apporteurFirstName: firstNameOf(prof?.full_name ?? owner.display_name ?? "") || "",
        prospectFirstName: titleCase(sub.first_name ?? ""),
        prospectFullName: full,
        phoneE164: sub.phone ?? "",
        email: sub.email ?? "",
        slug: owner.slug ?? "",
        dateStr: formatDateParis(sub.quiz_completed_at),
        profileCode: sub.profile,
      };
    }

    const { subject, html } = kind === "captured" ? buildCaptured(data!) : buildCompleted(data!);

    const recipient = (body?.test_email as string | undefined) || apporteurEmail;
    if (body?.dry_run === true) {
      return json({ ok: true, dry_run: true, recipient, subject, html });
    }
    if (!recipient) return json({ ok: true, skipped: "no_recipient" });

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "resend_not_configured" }, 500);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: [recipient], subject, html }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[notify-apporteur-lead] resend error", res.status, JSON.stringify(out));
      return json({ error: "resend_failed", detail: out }, 502);
    }
    return json({ ok: true, kind, recipient, email_id: out?.id ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[notify-apporteur-lead] error", message);
    return json({ error: "internal", message }, 500);
  }
});
