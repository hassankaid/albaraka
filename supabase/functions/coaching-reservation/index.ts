// ─────────────────────────────────────────────────────────────────────────
// coaching-reservation — lien de réservation d'un coaching individuel payé
// (demande de Sidali, 03/11/2026).
//
// Appelée par la page « merci » après un paiement sur /checkout/coaching, avec le
// jeton du lien de paiement. Tant que le webhook Stripe n'a pas enregistré la
// vente, elle répond « en_attente » : la page réessaie. Ensuite elle crée, UNE
// fois, un lien Calendly à usage unique sur l'agenda de l'offre (une seule
// réservation possible), le garde sur le lien de paiement et le renvoie avec le
// prénom, le nom, l'e-mail et le téléphone de l'élève déjà remplis.
//
// Sans paiement, aucun lien de réservation : l'agenda public n'est jamais donné.
//
// Verify JWT: false (page publique). Le jeton du lien de paiement fait office de
// clé : il n'est connu que de la personne qui a payé.
// ─────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Le lien Calendly avec l'élève pré-rempli (a1 = 1re question : le téléphone). */
function avecEleve(url: string, contact: { full_name?: string | null; email?: string | null; phone_normalized?: string | null } | null) {
  const u = new URL(url);
  if (contact?.full_name) u.searchParams.set("name", contact.full_name);
  if (contact?.email) u.searchParams.set("email", contact.email);
  if (contact?.phone_normalized) u.searchParams.set("a1", contact.phone_normalized);
  return u.toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });

  const body = await req.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token.trim().toUpperCase() : "";
  if (!/^ALB-PL-[A-Z0-9]{8}$/.test(token)) return json({ error: "invalid_token" }, 400);

  const { data: lien } = await supabase
    .from("payment_links")
    .select("id, status, sale_id, offre_coaching, reservation_url")
    .eq("token", token)
    .maybeSingle();
  if (!lien || !lien.offre_coaching) return json({ error: "not_found" }, 404);
  if (!lien.sale_id) return json({ statut: "en_attente" });

  const { data: vente } = await supabase
    .from("sales")
    .select("contact_id, contacts!sales_contact_id_fkey(full_name, email, phone_normalized)")
    .eq("id", lien.sale_id)
    .maybeSingle();
  const contact = (vente as any)?.contacts ?? null;

  if (lien.reservation_url) return json({ statut: "pret", url: avecEleve(lien.reservation_url, contact) });

  const { data: offre } = await supabase
    .from("offres_coaching")
    .select("calendly_event_type")
    .eq("slug", lien.offre_coaching)
    .maybeSingle();
  const jeton = Deno.env.get("CALENDLY_API_TOKEN");
  if (!offre || !jeton) return json({ error: "configuration" }, 500);

  const r = await fetch("https://api.calendly.com/scheduling_links", {
    method: "POST",
    headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      max_event_count: 1,
      owner: `https://api.calendly.com/event_types/${offre.calendly_event_type}`,
      owner_type: "EventType",
    }),
  });
  const reponse = await r.json().catch(() => ({}));
  const url = reponse?.resource?.booking_url;
  if (!r.ok || !url) {
    console.error("[coaching-reservation] Calendly a refusé le lien :", r.status, JSON.stringify(reponse));
    return json({ error: "calendly" }, 502);
  }

  // Deux appels simultanés : le premier enregistré gagne, l'autre relit.
  const { data: garde } = await supabase
    .from("payment_links")
    .update({ reservation_url: url, reservation_creee_le: new Date().toISOString() })
    .eq("id", lien.id)
    .is("reservation_url", null)
    .select("reservation_url")
    .maybeSingle();
  let final = garde?.reservation_url;
  if (!final) {
    const { data: relu } = await supabase.from("payment_links").select("reservation_url").eq("id", lien.id).maybeSingle();
    final = relu?.reservation_url ?? url;
  }
  return json({ statut: "pret", url: avecEleve(final, contact) });
});
