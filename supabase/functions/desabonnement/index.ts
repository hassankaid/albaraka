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
const PAGE_HUMAINE = "https://plateforme.albarakaecosysteme.com/desabonnement";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);
  const token = (url.searchParams.get("t") || url.searchParams.get("token") || "").trim();

  if (!token) {
    if (req.method === "GET") {
      return new Response(null, { status: 302, headers: { ...CORS, Location: PAGE_HUMAINE } });
    }
    return new Response("jeton manquant", { status: 400, headers: { ...CORS, "Content-Type": "text/plain" } });
  }

  if (req.method === "GET") {
    return new Response(null, {
      status: 302,
      headers: { ...CORS, Location: `${PAGE_HUMAINE}?t=${encodeURIComponent(token)}` },
    });
  }

  if (req.method !== "POST") {
    return new Response("methode non geree", { status: 405, headers: { ...CORS, "Content-Type": "text/plain" } });
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
    return new Response("erreur", { status: 500, headers: { ...CORS, "Content-Type": "text/plain" } });
  }

  // Gmail, Yahoo et la page statique attendent tous une réponse sèche.
  return new Response("OK", { status: 200, headers: { ...CORS, "Content-Type": "text/plain" } });
});
