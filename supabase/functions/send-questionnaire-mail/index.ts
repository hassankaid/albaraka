// ─────────────────────────────────────────────────────────────────────────
// Campagne e-mail du questionnaire clients, via Resend.
//
// Appel : POST { envoi: "initial" | "relance1" | "relance2",
//                dry_run?: true, apercu?: true,
//                destinataire_test?: "adresse@exemple.fr", max?: 1..400 }
//
// Trois messages, textes de l'annexe du cahier des charges :
//   initial  → tous les clients
//   relance1 → les non-répondants seulement
//   relance2 → les non-répondants seulement, dernier rappel
//
// ⚠️ LA DATE LIMITE N'EST PAS ÉCRITE EN DUR. Elle vaut 72 heures après le
// PREMIER envoi, et les trois messages annoncent donc la même échéance quel
// que soit le jour où on les déclenche. Avant le premier envoi, la fonction
// la calcule à partir de maintenant — c'est ce qui rend l'aperçu honnête.
//
// ⚠️ Les invitations marquées `test` ou `exclu` ne partent jamais.
//
// ⚠️ TOUJOURS `dry_run` D'ABORD : il donne le nombre de destinataires et la
// date limite retenue, sans rien envoyer.
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Même expéditeur que les autres campagnes : c'est ce domaine dont
// l'authentification (SPF, DKIM, DMARC) est établie et vérifiée.
const FROM_ADDR = "Sidali · AL BARAKA <conference@albarakaecosysteme.com>";
const REPLY_TO = ["contact@albarakaecosysteme.com"];
const UNSUB_BASE = "https://plateforme.albarakaecosysteme.com/stop";
const LIEN_BASE = "https://plateforme.albarakaecosysteme.com/questionnaire/";

const CAMPAIGN_SLUG = "questionnaire_clients";
const DELAI_HEURES = 72;
const DELAY_MS = 230;

type Envoi = "initial" | "relance1" | "relance2";
const SEQ: Record<Envoi, number> = { initial: 1, relance1: 2, relance2: 3 };

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

/** « mercredi 25 septembre à 11h00 », en heure de Paris. */
function formatEcheance(d: Date): string {
  const jour = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long",
  }).format(d);
  const heure = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit",
  }).format(d).replace(":", "h");
  return `${jour} à ${heure}`;
}

function wrap(preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>AL BARAKA</title></head>
<body style="margin:0;padding:0;background-color:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.6;">
<div style="display:none;font-size:1px;color:#f5f3ee;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f3ee;padding:24px 0;">
<tr><td align="center">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:8px;padding:32px 28px;">
<tr><td style="font-size:15px;color:#1a1a1a;">
${body}
<div style="margin-top:40px;padding-top:24px;border-top:1px solid #e5e1d7;font-size:12px;color:#7a7a7a;text-align:center;line-height:1.5;">
AL BARAKA — Écosystème de l'entrepreneuriat halal<br>
<a href="{{UNSUB_URL}}" style="color:#7a7a7a;text-decoration:underline;">Se désabonner</a>
</div>
</td></tr></table></td></tr></table></body></html>`;
}

function cta(libelle: string): string {
  return `<table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:28px auto 10px;">
<tr><td align="center" bgcolor="#C9A04E" style="background-color:#C9A04E;border:1px solid #C9A04E;border-radius:6px;">
<a href="{{LIEN}}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">${libelle}</a>
</td></tr></table>
<p style="text-align:center;font-size:13px;line-height:1.5;color:#7a7a7a;margin:0 0 22px;">Le bouton ne s'affiche pas ?<br><a href="{{LIEN}}" target="_blank" style="color:#A8813A;text-decoration:underline;">Ouvrir le questionnaire</a></p>`;
}

const p = (t: string) => `<p>${t}</p>`;
const puces = (l: string[]) => l.map((x) => `<p style="margin:6px 0 6px 4px;">${x}</p>`).join("\n");
const SIG = `<p style="margin-top:24px;">Sidali<br><span style="color:#7a7a7a;">Fondateur d'AL BARAKA</span></p>
<p style="color:#A8813A;font-weight:600;margin-top:4px;">Gagne ta liberté. C'est ça la vraie baraka.</p>`;

interface Gabarit { name: string; subject: string; preheader: string; body: string }

const TEMPLATES: Record<Envoi, Gabarit> = {
  initial: {
    name: "Questionnaire — envoi initial",
    subject: "{{PRENOM}}, j'ai besoin de ton avis (5 minutes)",
    preheader: "5 minutes pour m'aider à améliorer ton accompagnement.",
    body: [
      p("Salam {{PRENOM}},"),
      p("Je t'écris directement, sans détour."),
      p("Je veux que AL BARAKA soit à la hauteur de ce que tu mérites. Pour ça, j'ai besoin de mieux te connaître : qui tu es, où tu en es, ce qui te freine, et ce que je peux améliorer dans ton accompagnement."),
      p("J'ai préparé un questionnaire très court : 5 minutes chrono."),
      cta("JE RÉPONDS AU QUESTIONNAIRE"),
      p("Pourquoi c'est important :"),
      puces([
        "Ce que tu me dis va servir à améliorer directement la formation et le suivi.",
        "Je veux comprendre ce qui bloque vraiment les élèves pour mieux les aider à avancer.",
        "Tes réponses sont confidentielles : seule mon équipe y a accès.",
      ]),
      p("Sois franc(he), même si c'est une critique. C'est comme ça qu'on avance ensemble."),
      p("Merci d'avance, Barakallahou fik."),
      SIG,
      p(`<span style="color:#7a7a7a;">P.S. : le questionnaire reste ouvert jusqu'au {{DATE_LIMITE}}. Plus tu réponds vite, plus vite j'agis.</span>`),
    ].join("\n"),
  },

  relance1: {
    name: "Questionnaire — relance",
    subject: "{{PRENOM}}, il me manque juste ton avis",
    preheader: "Ça prend 5 minutes, et ça change vraiment les choses.",
    body: [
      p("Salam {{PRENOM}},"),
      p("Petit rappel : je n'ai pas encore reçu ton retour sur le questionnaire."),
      p("Je sais que tu as mille choses à gérer, mais 5 minutes de ton temps m'aident vraiment à améliorer ton accompagnement et celui de toute la communauté."),
      cta("JE RÉPONDS MAINTENANT"),
      p("Tes réponses sont confidentielles, et chaque retour est lu."),
      p("Barakallahou fik,"),
      SIG,
    ].join("\n"),
  },

  relance2: {
    name: "Questionnaire — dernier rappel",
    subject: "Dernier rappel, {{PRENOM}} : le questionnaire ferme bientôt",
    preheader: "Il ferme le {{DATE_LIMITE}}.",
    body: [
      p("Salam {{PRENOM}},"),
      p("Dernier rappel : le questionnaire ferme le {{DATE_LIMITE}}."),
      p("Si tu veux que ta voix compte dans l'évolution d'AL BARAKA, c'est maintenant : 5 minutes, pas plus."),
      cta("JE RÉPONDS"),
      p("Merci pour ta confiance, Barakallahou fik."),
      SIG,
    ].join("\n"),
  },
};

async function resendSend(payload: unknown): Promise<{ status: number; data: any }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  const body = await req.json().catch(() => ({} as any));
  const envoi = String(body?.envoi ?? "") as Envoi;
  const tpl = TEMPLATES[envoi];
  if (!tpl) {
    return new Response(JSON.stringify({ error: "envoi_inconnu", attendus: Object.keys(TEMPLATES) }), { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // La date limite : 72 h après le premier envoi réel. Tant qu'il n'y en a
  // pas eu, on la projette depuis maintenant pour que l'aperçu dise vrai.
  const { data: premier } = await supabase
    .from("questionnaire_invitations")
    .select("envoye_le")
    .not("envoye_le", "is", null)
    .order("envoye_le", { ascending: true })
    .limit(1);
  const depart = premier?.[0]?.envoye_le ? new Date(premier[0].envoye_le) : new Date();
  const dateLimite = formatEcheance(new Date(depart.getTime() + DELAI_HEURES * 3600 * 1000));

  const htmlTemplate = wrap(tpl.preheader, tpl.body);

  if (body?.apercu === true) {
    return new Response(
      render(htmlTemplate, {
        PRENOM: body?.prenom_test || "Prénom",
        LIEN: `${LIEN_BASE}<jeton personnel>`,
        DATE_LIMITE: dateLimite,
        UNSUB_URL: UNSUB_BASE,
      }),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  // Qui doit recevoir ce message : tout le monde pour l'envoi initial, les
  // non-répondants seulement pour les relances (critère de recette n°10).
  let q = supabase
    .from("questionnaire_invitations")
    .select("id, token, prenom, email, statut")
    .eq("test", false)
    // Les clients perdus et ceux qui ont demandé la suppression de leurs
    // données restent en base avec leur jeton, mais ne reçoivent rien.
    .eq("exclu", false);
  if (envoi === "initial") {
    q = q.eq("statut", "non_envoye");
  } else {
    q = q.neq("statut", "repondu").neq("statut", "non_envoye");
  }
  const { data: cibles, error: ciblesErr } = await q.order("email");
  if (ciblesErr) {
    return new Response(JSON.stringify({ error: "destinataires_indisponibles", detail: ciblesErr.message }), { status: 500 });
  }

  const maxParam = parseInt(body?.max);
  const maxRecipients = (Number.isFinite(maxParam) && maxParam > 0 && maxParam <= 400) ? maxParam : 400;
  const todo = (cibles ?? []).slice(0, maxRecipients);

  if (body?.dry_run === true) {
    return new Response(JSON.stringify({
      dry_run: true,
      envoi,
      template_name: tpl.name,
      objet: render(tpl.subject, { PRENOM: "Prénom" }),
      date_limite: dateLimite,
      date_limite_deja_fixee: Boolean(premier?.[0]?.envoye_le),
      destinataires: (cibles ?? []).length,
      partiraient_maintenant: todo.length,
      exemple_lien: `${LIEN_BASE}${todo[0]?.token ?? "<jeton>"}`,
    }), { status: 200 });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "resend_non_configure" }), { status: 500 });
  }

  // Envoi de contrôle : message identique, mais hors campagne. Rien n'est
  // journalisé, aucune invitation ne change d'état.
  const destTest = typeof body?.destinataire_test === "string" ? body.destinataire_test.trim() : "";
  if (destTest) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(destTest)) {
      return new Response(JSON.stringify({ error: "adresse_test_invalide", valeur: destTest }), { status: 400 });
    }
    const { data: inv } = await supabase
      .from("questionnaire_invitations")
      .select("token, prenom")
      .eq("email", destTest.toLowerCase())
      .maybeSingle();
    const { data: jt } = await supabase.rpc("jetons_desabonnement_email", { p_emails: [destTest] });
    const jeton = (jt || [])[0]?.token;
    const lienStop = jeton ? `${UNSUB_BASE}/${jeton}` : UNSUB_BASE;
    const vars = {
      PRENOM: body?.prenom_test || inv?.prenom || "frère/sœur",
      LIEN: inv?.token ? `${LIEN_BASE}${inv.token}` : `${LIEN_BASE}apercu`,
      DATE_LIMITE: dateLimite,
      UNSUB_URL: lienStop,
    };
    const rep = await resendSend({
      from: FROM_ADDR, to: [destTest], reply_to: REPLY_TO,
      subject: render(tpl.subject, vars), html: render(htmlTemplate, vars),
      ...(jeton ? { headers: { "List-Unsubscribe": `<${lienStop}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
      tags: [{ name: "campaign", value: CAMPAIGN_SLUG }, { name: "seq", value: String(SEQ[envoi]) }],
    });
    const ok = rep.status >= 200 && rep.status < 300;
    return new Response(JSON.stringify({
      envoi_test: true, envoi, destinataire: destTest, date_limite: dateLimite,
      lien_utilise: vars.LIEN, ok, resend_status: rep.status,
      erreur: ok ? null : rep.data,
    }), { status: ok ? 200 : 502 });
  }

  if (todo.length === 0) {
    return new Response(JSON.stringify({ ok: true, envoi, message: "personne_a_envoyer" }), { status: 200 });
  }

  const { data: jetons } = await supabase.rpc("jetons_desabonnement_email", {
    p_emails: todo.map((r: any) => r.email),
  });
  const jetonParEmail = new Map<string, string>(
    (jetons || []).map((j: any) => [String(j.email).toLowerCase().trim(), j.token]),
  );

  const logs: any[] = [];
  const envoyes: string[] = [];
  let okCount = 0, failCount = 0;

  for (const r of todo) {
    const jeton = jetonParEmail.get(String(r.email).toLowerCase().trim());
    const lienStop = jeton ? `${UNSUB_BASE}/${jeton}` : UNSUB_BASE;
    const vars = {
      PRENOM: r.prenom || "frère/sœur",
      LIEN: `${LIEN_BASE}${r.token}`,
      DATE_LIMITE: dateLimite,
      UNSUB_URL: lienStop,
    };
    const subject = render(tpl.subject, vars);

    let attempt = 0;
    let lastResp: any = null;
    while (attempt < 3) {
      lastResp = await resendSend({
        from: FROM_ADDR, to: [r.email], reply_to: REPLY_TO,
        subject, html: render(htmlTemplate, vars),
        ...(jeton ? { headers: { "List-Unsubscribe": `<${lienStop}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
        tags: [{ name: "campaign", value: CAMPAIGN_SLUG }, { name: "seq", value: String(SEQ[envoi]) }],
      });
      if ((lastResp.status >= 200 && lastResp.status < 300) || lastResp.status !== 429) break;
      attempt++;
      await sleep(500 * attempt);
    }

    const ok = lastResp.status >= 200 && lastResp.status < 300;
    if (ok) { okCount++; envoyes.push(r.id); } else failCount++;

    logs.push({
      campaign_slug: CAMPAIGN_SLUG,
      email_seq: SEQ[envoi],
      recipient_email: r.email,
      recipient_first_name: r.prenom,
      resend_email_id: ok ? lastResp.data?.id : null,
      subject,
      status: ok ? "sent" : "failed",
      error_message: ok ? null : (lastResp.data?.message || JSON.stringify(lastResp.data)),
    });

    // Journal et statuts par lots de 50 : un plantage en cours de route ne
    // doit pas faire repartir la campagne du début au prochain appel.
    if (logs.length >= 50) {
      await supabase.from("email_campaign_sends").insert(logs.splice(0, logs.length));
      await supabase.from("questionnaire_invitations")
        .update({ statut: "envoye", envoye_le: new Date().toISOString() })
        .in("id", envoyes.splice(0, envoyes.length))
        .eq("statut", "non_envoye");
    }
    await sleep(DELAY_MS);
  }

  if (logs.length > 0) {
    await supabase.from("email_campaign_sends").insert(logs);
  }
  if (envoyes.length > 0) {
    await supabase.from("questionnaire_invitations")
      .update({ statut: "envoye", envoye_le: new Date().toISOString() })
      .in("id", envoyes)
      .eq("statut", "non_envoye");
  }

  return new Response(JSON.stringify({
    ok: true, envoi, template_name: tpl.name,
    date_limite: dateLimite, envoyes: okCount, echecs: failCount,
  }), { status: 200 });
});
