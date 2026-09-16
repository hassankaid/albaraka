// Rapport de délivrabilité, tous les lundis à 8h (heure de Paris).
//
// Les chiffres viennent de nos propres événements Resend, pas de l'API Resend :
// c'est la seule source qui porte le user_agent, donc la seule façon d'écarter
// les ouvertures de robots. Sans ce filtre, 36 % des « ouvertures » de
// septembre étaient des machines — dont le proxy d'images de Google, qui
// déclenche parfois une ouverture 7 secondes AVANT l'envoi.
//
// Appel : POST { dry_run?: true, reference?: "2026-09-21T08:00:00+02:00", force?: true }
// Le cron passe toutes les heures le lundi ; la fonction ne fait rien tant
// qu'il n'est pas 8h à Paris, et ne s'exécute qu'une fois par semaine.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM = "AL BARAKA <noreply@albarakaecosysteme.com>";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEUIL_PLAINTE_ROUGE = 0.3;   // seuil Google
const SEUIL_PLAINTE_ALERTE = 0.1;
const SEUIL_REJET_ALERTE = 2.0;

function heureParis(d: Date) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(d);
  return {
    jour: f.find((p) => p.type === "weekday")?.value ?? "",
    heure: Number(f.find((p) => p.type === "hour")?.value ?? "-1"),
  };
}

/** Lundi de la semaine rapportée, au format AAAA-MM-JJ. */
function lundiRapporte(reference: Date): string {
  const paris = new Date(reference.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const jour = (paris.getDay() + 6) % 7; // 0 = lundi
  const lundiCourant = new Date(paris);
  lundiCourant.setDate(paris.getDate() - jour);
  lundiCourant.setDate(lundiCourant.getDate() - 7);
  return lundiCourant.toISOString().slice(0, 10);
}

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((1000 * n) / d) / 10 : 0;
}

function ligne(label: string, valeur: string, note = ""): string {
  return `<tr>
    <td style="padding:9px 0;border-bottom:1px solid #eee;color:#555;font-size:14px">${label}</td>
    <td style="padding:9px 0;border-bottom:1px solid #eee;text-align:right;font-weight:700;font-size:15px">${valeur}</td>
    <td style="padding:9px 0 9px 12px;border-bottom:1px solid #eee;color:#888;font-size:12px">${note}</td>
  </tr>`;
}

function corpsHtml(s: any, precedent: any | null): { html: string; alertes: string[] } {
  const alertes: string[] = [];
  const tauxPlainte = pct(s.plaintes, s.delivres);
  const tauxRejet = pct(s.rejets, s.envois);
  const tauxOuverture = pct(s.ouvreurs, s.personnes);
  const ouvPrecedent = precedent ? pct(precedent.ouvreurs, precedent.personnes) : null;

  if (tauxPlainte >= SEUIL_PLAINTE_ROUGE) alertes.push(`Plaintes à ${tauxPlainte} % — au-dessus du seuil de Google (0,3 %). À traiter cette semaine.`);
  else if (tauxPlainte >= SEUIL_PLAINTE_ALERTE) alertes.push(`Plaintes à ${tauxPlainte} % — à surveiller (seuil Google : 0,3 %).`);
  if (tauxRejet >= SEUIL_REJET_ALERTE) alertes.push(`${tauxRejet} % d'adresses en erreur — la qualité des adresses collectées se dégrade.`);
  if (ouvPrecedent !== null && ouvPrecedent > 0 && tauxOuverture < ouvPrecedent - 10) {
    alertes.push(`Ouvertures en baisse de ${Math.round(ouvPrecedent - tauxOuverture)} points par rapport à la semaine précédente.`);
  }
  if (s.envois === 0) alertes.push("Aucun envoi cette semaine.");

  const fournisseurs = (s.par_fournisseur || []).map((f: any) => `
    <tr>
      <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:14px">${f.fournisseur}</td>
      <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;color:#666">${f.personnes}</td>
      <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;font-weight:700">${f.ouvreurs_pct ?? 0} %</td>
    </tr>`).join("");

  const campagnes = (s.par_campagne || []).map((c: any) => `
    <tr>
      <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:13px">${c.campagne}</td>
      <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;color:#666">${c.personnes}</td>
      <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;font-weight:700">${c.ouvreurs_pct ?? 0} %</td>
    </tr>`).join("");

  const blocAlertes = alertes.length
    ? `<div style="background:#fdf3f3;border:1px solid #e8b4b4;border-radius:8px;padding:14px 16px;margin:20px 0">
         <div style="font-weight:700;font-size:14px;margin-bottom:6px">À regarder</div>
         ${alertes.map((a) => `<div style="font-size:13px;color:#7a2020;line-height:1.6">— ${a}</div>`).join("")}
       </div>`
    : `<div style="background:#f2f8f4;border:1px solid #bcd9c6;border-radius:8px;padding:14px 16px;margin:20px 0;font-size:13px;color:#2a5c3c">
         Rien à signaler cette semaine.
       </div>`;

  const comparaison = ouvPrecedent !== null
    ? `${tauxOuverture > ouvPrecedent ? "▲" : tauxOuverture < ouvPrecedent ? "▼" : "="} ${ouvPrecedent} % la semaine d'avant`
    : "";

  const html = `<!doctype html><html><body style="margin:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;padding:28px 0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:10px;padding:32px 28px">
<tr><td>
  <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#C9A84C;font-weight:700">AL BARAKA · Délivrabilité</div>
  <h1 style="font-size:21px;margin:10px 0 4px;color:#1a1a1a">Semaine du ${s.debut} au ${s.fin}</h1>
  <p style="margin:0;color:#888;font-size:13px">Ouvertures et clics de robots exclus.</p>

  ${blocAlertes}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px">
    ${ligne("E-mails envoyés", String(s.envois), `${s.personnes} personnes`)}
    ${ligne("Acceptés par le destinataire", `${pct(s.delivres, s.envois)} %`, `${s.delivres} / ${s.envois}`)}
    ${ligne("Ont ouvert", `${tauxOuverture} %`, comparaison)}
    ${ligne("Ont cliqué", `${pct(s.cliqueurs, s.personnes)} %`, `${s.cliqueurs} personnes`)}
    ${ligne("Adresses en erreur", String(s.rejets), `${tauxRejet} %`)}
    ${ligne("Plaintes pour spam", String(s.plaintes), `${tauxPlainte} % — seuil Google 0,3 %`)}
    ${ligne("Désabonnements", String(s.desabonnements), "via le nouveau lien")}
    ${ligne("Ouvertures écartées (robots)", String(s.ouvertures_machine), "ne comptent pas")}
  </table>

  ${fournisseurs ? `<h2 style="font-size:15px;margin:26px 0 8px;color:#1a1a1a">Par messagerie</h2>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#999;padding-bottom:4px">Fournisseur</td>
        <td style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#999;text-align:right;padding-bottom:4px">Personnes</td>
        <td style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#999;text-align:right;padding-bottom:4px">Ouvrent</td></tr>
    ${fournisseurs}
  </table>` : ""}

  ${campagnes ? `<h2 style="font-size:15px;margin:26px 0 8px;color:#1a1a1a">Par campagne</h2>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${campagnes}</table>` : ""}

  <div style="margin-top:28px;padding-top:18px;border-top:1px solid #eee;font-size:11px;color:#999;line-height:1.6">
    « Accepté » ne veut pas dire « arrivé dans la boîte de réception » : aucun fournisseur ne dit
    dans quel dossier il range un message. Un écart durable entre deux messageries reste le meilleur
    indice d'un classement en indésirables.
  </div>
</td></tr></table></td></tr></table></body></html>`;

  return { html, alertes };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const json = (o: unknown, status = 200) =>
    new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  const body = await req.json().catch(() => ({}));
  const reference = body?.reference ? new Date(body.reference) : new Date();
  const { jour, heure } = heureParis(reference);

  // Le cron tape toutes les heures le lundi : on ne retient que 8h à Paris.
  if (!body?.force && !(jour === "Mon" && heure === 8)) {
    return json({ ok: true, ignore: true, motif: "hors creneau", jour, heure_paris: heure });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const semaine = lundiRapporte(reference);

  if (!body?.dry_run && !body?.force) {
    const { data: deja } = await supabase
      .from("rapports_delivrabilite").select("semaine_du").eq("semaine_du", semaine).maybeSingle();
    if (deja) return json({ ok: true, ignore: true, motif: "deja_envoye", semaine_du: semaine });
  }

  const { data: stats, error } = await supabase.rpc("stats_delivrabilite_semaine", {
    p_reference: reference.toISOString(),
  });
  if (error) return json({ error: "stats_indisponibles", detail: error.message }, 500);

  const refPrecedente = new Date(reference.getTime() - 7 * 24 * 3600 * 1000);
  const { data: precedent } = await supabase.rpc("stats_delivrabilite_semaine", {
    p_reference: refPrecedente.toISOString(),
  });

  const { html, alertes } = corpsHtml(stats, precedent ?? null);
  const sujet = alertes.length
    ? `Délivrabilité ${stats.debut}–${stats.fin} — ${alertes.length} point${alertes.length > 1 ? "s" : ""} à regarder`
    : `Délivrabilité ${stats.debut}–${stats.fin} — rien à signaler`;

  const { data: temoins } = await supabase
    .from("conference_envois_temoins").select("valeur").eq("canal", "mail");
  const destinataires = (temoins || []).map((t: any) => t.valeur).filter(Boolean);

  if (body?.dry_run) {
    return json({ dry_run: true, semaine_du: semaine, sujet, destinataires, alertes, stats });
  }

  if (!RESEND_API_KEY) return json({ error: "missing_resend_key" }, 500);
  if (destinataires.length === 0) return json({ error: "aucun_destinataire" }, 500);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: destinataires, subject: sujet, html }),
  });
  const reponse = await res.json().catch(() => ({}));
  if (!res.ok) return json({ error: "envoi_echoue", detail: reponse }, 502);

  await supabase.from("rapports_delivrabilite")
    .upsert({ semaine_du: semaine, resume: stats }, { onConflict: "semaine_du" });

  return json({ ok: true, semaine_du: semaine, sujet, destinataires, alertes });
});
