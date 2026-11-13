// ═══════════════════════════════════════════════════════════════════════════
// contrat-v3-envoyer — contrats v3 (13/11/2026)
//
// Produit le PDF UNIQUE remis au client et le lui envoie, dès la validation de
// sa commande (cahier des charges de Sidali du 12/11/2026, §4) :
//   1. le contrat accepté, toutes variables remplies, avec la date et l'heure de
//      chaque case cochée et l'acceptation électronique (le paiement vaut signature) ;
//   2. Annexe 1 — l'attestation de demande d'accès immédiat et de renonciation
//      au droit de rétractation, pré-remplie (texte exact de la case 2, heure,
//      adresse IP, activation de l'accès) ;
//   3. Annexe 2 — les CGV dans la version acceptée.
// Puis : PDF rangé dans le bucket privé `contracts`, e-mail « Ton contrat … – N° … »
// avec le PDF joint, et copie de l'e-mail gardée comme preuve (archivage 5 ans).
//
// Appelée par stripe-webhook (clé service) juste après la création du contrat.
// Peut être rappelée par le CEO (renvoi) : { contract_id, renvoyer: true }.
// Les textes viennent de ../_shared/contrat_v3.ts, comme sur la page de paiement.
// ═══════════════════════════════════════════════════════════════════════════
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { construirePdfContratV3, POLICES_CONTRAT } from "../_shared/contrat_v3_pdf.ts";
import {
  dateHeureParis,
  objetEmailV3,
  PDF_CGV_V3,
  PHRASE_ACCORD_EMAIL,
  type DonneesContratV3,
} from "../_shared/contrat_v3.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM = Deno.env.get("RESEND_FROM_EMAIL") || "AL BARAKA <noreply@albarakaecosysteme.com>";
const SITE = "https://plateforme.albarakaecosysteme.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

// ─── E-mail ─────────────────────────────────────────────────────────────────
function base64(octets: Uint8Array): string {
  let s = "";
  for (let i = 0; i < octets.length; i += 0x8000) s += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(s);
}

const echapper = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function htmlEmail(prenom: string, numero: string, objet: string): string {
  const salut = prenom ? `Salamou ‘alaykoum ${echapper(prenom)},` : "Salamou ‘alaykoum,";
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${echapper(objet)}</title></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Georgia,'Times New Roman',serif;color:#EDEDED;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0A0A0A;"><tr><td align="center" style="padding:36px 16px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#141414;border:1px solid rgba(212,175,55,0.25);border-radius:12px;">
<tr><td align="center" style="padding:40px 32px 8px;"><h1 style="margin:0;font-size:28px;color:#D4AF37;letter-spacing:6px;font-weight:normal;">AL BARAKA</h1>
<p style="margin:10px 0 0;color:#9A9A9A;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Ton contrat</p></td></tr>
<tr><td style="padding:24px 40px 8px;font-size:16px;line-height:1.7;">
<p style="margin:0 0 16px;font-size:20px;">${salut}</p>
<p style="margin:0 0 16px;">Merci pour ta confiance. Ta commande est validée et ton accès est ouvert.</p>
<p style="margin:0 0 16px;">${echapper(PHRASE_ACCORD_EMAIL)}</p>
<p style="margin:0 0 16px;">Contrat N° <strong style="color:#D4AF37;font-weight:normal;">${echapper(numero)}</strong> — garde bien ce message : le PDF joint est ta copie du contrat.</p>
<p style="margin:0 0 24px;">Tu peux aussi le retrouver à tout moment dans ton espace personnel.</p>
</td></tr>
<tr><td align="center" style="padding:18px 32px;border-top:1px solid rgba(212,175,55,0.25);"><p style="margin:0;font-size:11px;color:#9A9A9A;">Ethicarena L.L.C-FZ — <a href="${SITE}" style="color:#D4AF37;text-decoration:none;">plateforme.albarakaecosysteme.com</a> — contact@ethicarena.com</p></td></tr>
</table></td></tr></table></body></html>`;
}

// ─── Fichiers joints : CGV datées et police, servies par le site ────────────
// Repli sur le stockage privé (contracts/_modeles/) si le site ne les sert pas.
// deno-lint-ignore no-explicit-any
async function lireFichier(supabase: any, url: string, cheminStockage: string): Promise<Uint8Array | null> {
  try {
    const r = await fetch(url);
    if (r.ok) return new Uint8Array(await r.arrayBuffer());
  } catch { /* repli ci-dessous */ }
  const { data } = await supabase.storage.from("contracts").download(cheminStockage);
  return data ? new Uint8Array(await data.arrayBuffer()) : null;
}

async function fabriquer(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  d: DonneesContratV3,
  extra: { navigateur: string | null; accesActiveLe: string | null; envoyeLe: string },
): Promise<Uint8Array> {
  const [cgv, normale, grasse] = await Promise.all([
    lireFichier(supabase, `${SITE}${PDF_CGV_V3}`, `_modeles${PDF_CGV_V3.replace("/cgv", "")}`),
    lireFichier(supabase, POLICES_CONTRAT.normale, "_modeles/Lato-Regular.ttf"),
    lireFichier(supabase, POLICES_CONTRAT.grasse, "_modeles/Lato-Bold.ttf"),
  ]);
  if (!cgv) throw new Error(`CGV introuvables : ${SITE}${PDF_CGV_V3}`);
  return await construirePdfContratV3(d, extra, cgv, normale && grasse ? { normale, grasse } : null);
}

// ─── Point d'entrée ─────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Accès : la clé service (stripe-webhook) ou un CEO connecté (renvoi manuel).
  const jeton = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (jeton !== SERVICE_ROLE) {
    const { data: u } = await supabase.auth.getUser(jeton);
    const { data: prof } = u?.user ? await supabase.from("profiles").select("role").eq("id", u.user.id).maybeSingle() : { data: null };
    if ((prof as { role?: string } | null)?.role !== "ceo") return json({ error: "forbidden" }, 403);
  }

  let corps: { contract_id?: string; renvoyer?: boolean; sans_email?: boolean; essai?: { donnees: DonneesContratV3 & { navigateur?: string | null }; email?: string | null } } = {};
  try {
    corps = await req.json();
  } catch {
    return json({ error: "json_invalide" }, 400);
  }

  // Mode essai (tests avant mise en ligne) : le vrai PDF à partir de données fictives,
  // rangé dans contracts/_essais/, et envoyé à une adresse de test si demandé.
  // Rien n'est écrit dans client_contracts.
  if (corps.essai?.donnees) {
    const d = corps.essai.donnees;
    const envoyeLe = new Date().toISOString();
    const pdf = await fabriquer(supabase, d, { navigateur: d.navigateur ?? null, accesActiveLe: d.acceptation?.accepteLe ?? envoyeLe, envoyeLe });
    const chemin = `_essais/essai-${envoyeLe.replace(/[:.]/g, "-")}-${d.offre}.pdf`;
    const { error: e1 } = await supabase.storage.from("contracts").upload(chemin, pdf, { contentType: "application/pdf", upsert: true });
    if (e1) return json({ error: "depot_impossible", detail: e1.message }, 500);
    let email: unknown = null;
    if (corps.essai.email) {
      const objet = `[ESSAI] ${objetEmailV3(d.offre, d.numero || "ESSAI", d.module)}`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM,
          to: [corps.essai.email],
          subject: objet,
          html: htmlEmail(d.client.nom.split(" ")[0] || "", d.numero || "ESSAI", objet),
          attachments: [{ filename: `Contrat-${d.numero || "ESSAI"}.pdf`, content: base64(pdf) }],
        }),
      });
      email = { statut: r.status, reponse: await r.json().catch(() => null) };
    }
    return json({ ok: true, essai: true, pdf: chemin, octets: pdf.length, email });
  }

  if (!corps.contract_id) return json({ error: "contract_id requis" }, 400);

  const { data: c, error } = await supabase
    .from("client_contracts")
    .select("id, sale_id, contract_number, client_first_name, client_email, contrat_version, donnees_contrat, signed_pdf_path, email_sent_at, acces_active_le, agreements_snapshot, signature_user_agent")
    .eq("id", corps.contract_id)
    .maybeSingle();
  if (error || !c) return json({ error: "contrat_introuvable" }, 404);
  const contrat = c as Record<string, any>;
  if (!contrat.contrat_version || !contrat.donnees_contrat) return json({ error: "pas_un_contrat_v3" }, 400);
  if (contrat.email_sent_at && !corps.renvoyer) return json({ ok: true, deja_envoye: contrat.email_sent_at });

  const d = contrat.donnees_contrat as DonneesContratV3 & { navigateur?: string | null };
  const envoyeLe = new Date().toISOString();
  let pdf: Uint8Array;
  try {
    pdf = await fabriquer(supabase, d, { navigateur: d.navigateur ?? contrat.signature_user_agent ?? null, accesActiveLe: contrat.acces_active_le, envoyeLe });
  } catch (e) {
    console.error(`[contrat-v3-envoyer] PDF ${contrat.contract_number} :`, e);
    await supabase.from("client_contracts").update({ last_error: `PDF : ${String(e).slice(0, 300)}`, last_attempt_at: envoyeLe }).eq("id", contrat.id);
    return json({ error: "pdf_impossible", detail: String(e) }, 500);
  }

  const chemin = `${contrat.sale_id}/contrat-${contrat.contract_number}.pdf`;
  const { error: upErr } = await supabase.storage.from("contracts").upload(chemin, pdf, { contentType: "application/pdf", upsert: true });
  if (upErr) {
    console.error(`[contrat-v3-envoyer] dépôt ${chemin} :`, upErr);
    await supabase.from("client_contracts").update({ last_error: `Dépôt : ${upErr.message}`, last_attempt_at: envoyeLe }).eq("id", contrat.id);
    return json({ error: "depot_impossible", detail: upErr.message }, 500);
  }
  await supabase.from("client_contracts").update({ signed_pdf_path: chemin, last_error: null, last_attempt_at: envoyeLe }).eq("id", contrat.id);
  if (corps.sans_email) return json({ ok: true, pdf: chemin });

  // E-mail au client, PDF joint
  const objet = objetEmailV3(d.offre, contrat.contract_number, d.module);
  const html = htmlEmail(contrat.client_first_name || "", contrat.contract_number, objet);
  if (!RESEND_API_KEY) return json({ error: "resend_non_configure", pdf: chemin }, 500);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [contrat.client_email],
      subject: objet,
      html,
      attachments: [{ filename: `Contrat-${contrat.contract_number}.pdf`, content: base64(pdf) }],
    }),
  });
  const rep = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`[contrat-v3-envoyer] e-mail ${contrat.contract_number} :`, res.status, rep);
    await supabase.from("client_contracts").update({ last_error: `E-mail : ${res.status} ${JSON.stringify(rep).slice(0, 250)}`, last_attempt_at: envoyeLe }).eq("id", contrat.id);
    return json({ error: "email_impossible", detail: rep, pdf: chemin }, 502);
  }

  // Copie de l'e-mail envoyé (preuve, archivage 5 ans)
  const copie = `${contrat.sale_id}/email-contrat-${contrat.contract_number}.html`;
  const entete = `<!-- Envoyé le ${dateHeureParis(envoyeLe)} à ${echapper(contrat.client_email)} — objet : ${echapper(objet)} — Resend ${rep?.id ?? ""} — pièce jointe : Contrat-${contrat.contract_number}.pdf -->\n`;
  await supabase.storage.from("contracts").upload(copie, new TextEncoder().encode(entete + html), { contentType: "text/html; charset=utf-8", upsert: true });
  await supabase
    .from("client_contracts")
    .update({ email_sent_at: envoyeLe, email_sent_to: contrat.client_email, email_resend_id: rep?.id ?? null, email_copie_path: copie })
    .eq("id", contrat.id);

  console.log(`[contrat-v3-envoyer] ${contrat.contract_number} envoyé à ${contrat.client_email} (${rep?.id ?? "?"})`);
  return json({ ok: true, pdf: chemin, email: rep?.id ?? null });
});
