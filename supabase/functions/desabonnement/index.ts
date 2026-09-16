// Désabonnement e-mail.
//
// Deux entrées, volontairement différentes :
//
//   GET  → une page avec un bouton à cliquer. Elle ne désabonne PAS.
//   POST → le désabonnement effectif.
//
// Pourquoi ne pas désabonner directement sur le GET : les liens des messages
// sont visités par des robots (antivirus, filtres d'opérateur, aperçus de
// messagerie). On l'a mesuré ici même — le 13/09, un seul et même navigateur
// Chrome sous Linux a suivi 88 liens SMS différents. Un GET qui désabonne
// viderait la liste tout seul.
//
// Le POST couvre aussi le « désabonnement en un clic » de Gmail et Yahoo
// (RFC 8058) : le client de messagerie poste `List-Unsubscribe=One-Click`
// sans jamais ouvrir la page.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function page(titre: string, message: string, bouton?: { token: string }): string {
  const action = bouton
    ? `<form method="POST" action="?t=${encodeURIComponent(bouton.token)}" style="margin-top:28px">
         <button type="submit" style="background:#1a1a1a;color:#fff;border:0;border-radius:999px;padding:14px 28px;font-size:15px;font-weight:600;cursor:pointer">
           Confirmer le désabonnement
         </button>
       </form>`
    : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${titre}</title></head>
<body style="margin:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a">
<div style="max-width:520px;margin:0 auto;padding:64px 24px;text-align:center">
  <div style="background:#fff;border-radius:12px;padding:40px 32px">
    <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#C9A84C;font-weight:700">AL BARAKA</div>
    <h1 style="font-size:22px;margin:14px 0 10px">${titre}</h1>
    <p style="font-size:15px;line-height:1.6;color:#555;margin:0">${message}</p>
    ${action}
  </div>
</div></body></html>`;
}

function html(corps: string, status = 200): Response {
  return new Response(corps, { status, headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);
  const token = (url.searchParams.get("t") || url.searchParams.get("token") || "").trim();

  if (!token) {
    return html(page("Lien incomplet", "Ce lien de désabonnement est incomplet. Réponds à l'e-mail que tu as reçu et on s'en occupe à la main."), 400);
  }

  if (req.method === "GET") {
    return html(page(
      "Se désabonner",
      "Tu ne recevras plus nos e-mails d'invitation aux conférences. Confirme ci-dessous.",
      { token },
    ));
  }

  if (req.method !== "POST") {
    return html(page("Méthode non gérée", "Utilise le lien reçu dans l'e-mail."), 405);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const corps = await req.text().catch(() => "");
  const unClic = corps.includes("List-Unsubscribe=One-Click");

  const { data, error } = await supabase.rpc("desabonner_email", {
    p_token: token,
    p_source: unClic ? "un-clic" : "lien",
  });

  // Un jeton inconnu ne dit rien de plus qu'un jeton connu : pas de fuite
  // d'information, et surtout jamais d'erreur affichée à quelqu'un qui veut
  // simplement partir.
  if (error) {
    console.error("[desabonnement]", error.message);
    return html(page("Un instant", "On n'a pas pu enregistrer ta demande. Réessaie dans quelques minutes."), 500);
  }

  // Gmail et Yahoo attendent un 200 sec, pas une page.
  if (unClic) {
    return new Response("OK", { status: 200, headers: { ...CORS, "Content-Type": "text/plain" } });
  }

  return html(page(
    "C'est fait",
    data
      ? "Tu ne recevras plus nos e-mails. Tu restes le bienvenu sur la plateforme."
      : "Ta demande est enregistrée. Tu ne recevras plus nos e-mails.",
  ));
});
