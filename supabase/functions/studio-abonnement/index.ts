// Studio : abonnement à 10 €/mois TTC (5 vidéos par jour au lieu d'une), décision de
// Sidali du 13/10/2026.
//
// POST { action, ... }   Authorization: Bearer <jeton Supabase de l'élève>
//   etat                 relit l'abonnement chez Stripe et renvoie le quota du jour
//   souscrire            crée une page de paiement Stripe Checkout (abonnement mensuel)
//   confirmer {session}  au retour de Stripe : enregistre l'abonnement
//   resilier / reprendre résiliation en fin de période, ou annulation de la résiliation
//
// Pas de webhook : l'état est relu chez Stripe à chaque « etat » (ouverture du Studio).
// Mode test ou live selon studio_config.stripe_mode : clé STRIPE_TEST_SECRET_KEY ou
// STRIPE_SECRET_KEY, prix studio_config.prix_test ou prix_live. Un abonnement n'est
// valable que dans le mode courant (studio_est_abonne).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ORIGINES = [
  "https://plateforme.albarakaecosysteme.com",
  "https://view.albarakaecosysteme.com",
  "https://albarakaecosysteme.com",
  "https://www.albarakaecosysteme.com",
  "http://localhost:8080",
];

const cors = (origine: string | null) => ({
  "Access-Control-Allow-Origin": origine && ORIGINES.includes(origine) ? origine : ORIGINES[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
});

type Abonnement = {
  user_id: string;
  mode: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  statut: string | null;
};

serve(async (req) => {
  const origine = req.headers.get("origin");
  const json = (corps: unknown, status = 200) =>
    new Response(JSON.stringify(corps), { status, headers: { ...cors(origine), "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(origine) });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return json({ error: "Session expirée : reconnecte-toi." }, 401);
    const user = u.user;

    const { data: config } = await admin.from("studio_config").select("cle, valeur");
    const conf = Object.fromEntries((config ?? []).map((c: { cle: string; valeur: unknown }) => [c.cle, c.valeur]));
    const mode = conf.stripe_mode === "live" ? "live" : "test";
    const cle = Deno.env.get(mode === "live" ? "STRIPE_SECRET_KEY" : "STRIPE_TEST_SECRET_KEY");
    const prix = conf[mode === "live" ? "prix_live" : "prix_test"] as string | undefined;
    if (!cle || !prix) return json({ error: `Abonnement Studio pas encore configuré (${mode}).` }, 500);

    const stripe = async (chemin: string, params?: Record<string, string>, methode = params ? "POST" : "GET") => {
      const r = await fetch(`https://api.stripe.com/v1/${chemin}`, {
        method: methode,
        headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: params ? new URLSearchParams(params) : undefined,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error?.message ?? `Stripe ${r.status}`);
      return d;
    };

    const quota = async () => {
      const { data } = await admin.rpc("studio_quota", { p_user_id: user.id });
      const { data: abo } = await admin.from("studio_abonnements").select("*").eq("user_id", user.id).maybeSingle();
      return {
        quota: data,
        abonnement: abo && abo.mode === mode
          ? { statut: abo.statut, fin_periode: abo.fin_periode, resiliation_prevue: abo.resiliation_prevue }
          : null,
        mode,
      };
    };

    const enregistrer = async (sub: Record<string, any>, client: string) => {
      const fin = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
      await admin.from("studio_abonnements").upsert({
        user_id: user.id,
        mode,
        stripe_customer_id: client,
        stripe_subscription_id: sub.id,
        statut: sub.status,
        fin_periode: fin ? new Date(fin * 1000).toISOString() : null,
        resiliation_prevue: !!sub.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      });
    };

    const { data: abo } = await admin.from("studio_abonnements").select("*").eq("user_id", user.id).maybeSingle();
    const actuel = (abo && abo.mode === mode ? abo : null) as Abonnement | null;
    const corps = await req.json().catch(() => ({}));
    const action = corps?.action;

    if (action === "etat") {
      if (actuel?.stripe_subscription_id) {
        const sub = await stripe(`subscriptions/${actuel.stripe_subscription_id}`);
        await enregistrer(sub, sub.customer);
      }
      return json(await quota());
    }

    // Les actions qui suivent supposent l'accès au Studio.
    const { data: ouvert } = await admin.rpc("studio_ouvert", { p_user_id: user.id });
    if (!ouvert) return json({ error: "Le Studio n'est pas ouvert pour ton compte." }, 403);

    if (action === "souscrire") {
      if (actuel && ["active", "trialing"].includes(actuel.statut ?? "")) {
        return json({ error: "Tu es déjà abonné au Studio." }, 409);
      }
      const base = origine && ORIGINES.includes(origine) ? origine : ORIGINES[0];
      const params: Record<string, string> = {
        mode: "subscription",
        "line_items[0][price]": prix,
        "line_items[0][quantity]": "1",
        client_reference_id: user.id,
        "metadata[user_id]": user.id,
        "metadata[usage]": "studio",
        "subscription_data[metadata][user_id]": user.id,
        "subscription_data[metadata][usage]": "studio",
        success_url: `${base}/studio/abonnement?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/studio/abonnement`,
        locale: "fr",
      };
      if (actuel?.stripe_customer_id) params.customer = actuel.stripe_customer_id;
      else if (user.email) params.customer_email = user.email;
      const session = await stripe("checkout/sessions", params);
      return json({ url: session.url });
    }

    if (action === "confirmer") {
      const id = String(corps?.session_id ?? "");
      if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return json({ error: "Session de paiement invalide." }, 400);
      const session = await stripe(`checkout/sessions/${id}?expand[]=subscription`);
      if (session.client_reference_id !== user.id) return json({ error: "Ce paiement ne correspond pas à ton compte." }, 403);
      if (session.status !== "complete" || !session.subscription) return json({ error: "Le paiement n'est pas terminé." }, 409);
      await enregistrer(session.subscription, session.customer);
      return json(await quota());
    }

    if (action === "resilier" || action === "reprendre") {
      if (!actuel?.stripe_subscription_id) return json({ error: "Aucun abonnement Studio." }, 404);
      const sub = await stripe(`subscriptions/${actuel.stripe_subscription_id}`, {
        cancel_at_period_end: action === "resilier" ? "true" : "false",
      });
      await enregistrer(sub, sub.customer);
      return json(await quota());
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
