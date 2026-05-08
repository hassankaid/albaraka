// ═══════════════════════════════════════════════════════════════════════════
// cancel-stripe-subscription
// Annule une subscription Stripe attachée à une vente, et marque les paiements
// pending de cette vente comme 'lost'. Réservé au CEO.
//
// Body : { sale_id: string }
// Returns : { ok: true, subscription_id, cancelled_at, payments_marked_lost: number }
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const STRIPE_SECRET_KEY_LIVE = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_SECRET_KEY_TEST = Deno.env.get("STRIPE_SECRET_KEY_TEST") || "";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Tente DELETE /v1/subscriptions/{id} avec les 2 clés (live d'abord, test en
// fallback). Retourne {data, mode} si succès, throw sinon.
async function stripeCall(
  apiKey: string,
  path: string,
  method: "GET" | "DELETE" = "GET",
): Promise<{ ok: boolean; data: any; status: number }> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { _raw: text }; }
  return { ok: res.ok, data, status: res.status };
}

// Vérifie si la sub est déjà annulée (idempotence). Stripe DELETE
// sur une sub déjà canceled renvoie une erreur — on lit donc d'abord
// l'état pour décider si on appelle DELETE ou si on rapporte succès.
async function tryCancelOrAlreadyCanceled(
  apiKey: string,
  subscriptionId: string,
): Promise<{ ok: boolean; status: number; data: any; alreadyCanceled?: boolean }> {
  // 1) GET pour voir si elle existe et son statut
  const getRes = await stripeCall(apiKey, `/subscriptions/${subscriptionId}`, "GET");
  if (!getRes.ok) {
    // Pas trouvée avec cette clé (404) ou autre erreur : on fait remonter tel quel
    return getRes;
  }
  const subStatus = String(getRes.data?.status || "");
  // Statuts "déjà terminés" Stripe : pas de DELETE nécessaire
  const terminatedStatuses = new Set(["canceled", "incomplete_expired", "ended"]);
  if (terminatedStatuses.has(subStatus)) {
    return { ok: true, status: 200, data: getRes.data, alreadyCanceled: true };
  }
  // 2) DELETE puisqu'elle est encore active/past_due/etc.
  return stripeCall(apiKey, `/subscriptions/${subscriptionId}`, "DELETE");
}

async function cancelSubscription(subscriptionId: string): Promise<{ data: any; mode: "live" | "test"; alreadyCanceled?: boolean }> {
  if (STRIPE_SECRET_KEY_LIVE) {
    const r = await tryCancelOrAlreadyCanceled(STRIPE_SECRET_KEY_LIVE, subscriptionId);
    if (r.ok) return { data: r.data, mode: "live", alreadyCanceled: r.alreadyCanceled };
    if (r.status !== 404) throw new Error(`Stripe live: ${r.status} ${JSON.stringify(r.data)}`);
  }
  if (STRIPE_SECRET_KEY_TEST) {
    const r = await tryCancelOrAlreadyCanceled(STRIPE_SECRET_KEY_TEST, subscriptionId);
    if (r.ok) return { data: r.data, mode: "test", alreadyCanceled: r.alreadyCanceled };
    if (r.status === 404) {
      // Sub introuvable des 2 côtés : on remonte 404 plutôt que d'erreur générique
      throw new Error(`Stripe: subscription not found (live + test) ${subscriptionId}`);
    }
    throw new Error(`Stripe test: ${r.status} ${JSON.stringify(r.data)}`);
  }
  throw new Error("No Stripe API key configured");
}

// Fallback pour les ventes Systeme.io : Systeme.io utilise Stripe en backend, donc
// la subscription existe côté Stripe même si on ne stocke pas son ID en BDD.
// On retrouve le customer Stripe par email puis on cherche une sub active/past_due.
async function findStripeSubByEmail(email: string): Promise<{ subscriptionId: string; mode: "live" | "test"; customerId: string } | null> {
  const tryKey = async (apiKey: string, mode: "live" | "test") => {
    const safeEmail = email.replace(/'/g, "\\'");
    const search = await stripeCall(apiKey, `/customers/search?query=${encodeURIComponent(`email:'${safeEmail}'`)}&limit=10`);
    if (!search.ok) return null;
    const customers = search.data?.data || [];
    for (const cust of customers) {
      const subs = await stripeCall(apiKey, `/subscriptions?customer=${cust.id}&status=all&limit=20`);
      if (!subs.ok) continue;
      // Cherche une sub annulable : active, past_due, unpaid, trialing
      // (canceled / incomplete / ended ne servent à rien)
      const cancellableStatuses = new Set(["active", "past_due", "unpaid", "trialing"]);
      const candidates = (subs.data?.data || []).filter((s: any) => cancellableStatuses.has(s.status));
      if (candidates.length > 0) {
        // Prend la plus récente (created max)
        const best = candidates.sort((a: any, b: any) => (b.created || 0) - (a.created || 0))[0];
        return { subscriptionId: best.id, mode, customerId: cust.id };
      }
    }
    return null;
  };
  if (STRIPE_SECRET_KEY_LIVE) {
    const r = await tryKey(STRIPE_SECRET_KEY_LIVE, "live");
    if (r) return r;
  }
  if (STRIPE_SECRET_KEY_TEST) {
    const r = await tryKey(STRIPE_SECRET_KEY_TEST, "test");
    if (r) return r;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    // ── Auth : CEO uniquement ──
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "ceo") return json({ error: "forbidden_ceo_only" }, 403);

    // ── Body ──
    const body = await req.json().catch(() => ({}));
    const saleId = body?.sale_id as string | undefined;
    if (!saleId) return json({ error: "sale_id_required" }, 400);

    // ── Récupère les payments de la vente ──
    const { data: payments, error: paymentsErr } = await supabase
      .from("payments")
      .select("id, status, stripe_subscription_id, payment_number, amount")
      .eq("sale_id", saleId);
    if (paymentsErr) throw paymentsErr;

    const pendingPaymentIds = (payments || [])
      .filter((p) => p.status === "pending")
      .map((p) => p.id);

    if (pendingPaymentIds.length === 0) {
      return json({
        error: "no_pending_payments",
        message: "Aucun paiement pending sur cette vente — la subscription a peut-être déjà été annulée ou tous les paiements sont passés.",
      }, 400);
    }

    // ── Identifie la subscription à annuler ──
    // On regarde UNIQUEMENT les pending pour ne pas tenter d'annuler une
    // ancienne sub déjà terminée attachée à des paiements paid (ex: après
    // un replan, le payment paid garde l'ancien sub_id, mais les nouveaux
    // pending n'en ont pas — il ne faut PAS retoucher l'ancien sub).
    const subscriptionIds = Array.from(new Set(
      (payments || [])
        .filter((p) => p.status === "pending")
        .map((p) => p.stripe_subscription_id)
        .filter((s): s is string => !!s)
    ));

    let subId: string | null = null;
    let usedFallback = false;
    let stripeMode: "live" | "test" | null = null;
    let alreadyCanceled = false;

    if (subscriptionIds.length === 1) {
      subId = subscriptionIds[0];
    } else if (subscriptionIds.length > 1) {
      return json({
        error: "multiple_subscriptions",
        message: "Plusieurs subscriptions distinctes attachées aux pending. Inattendu.",
        subscriptions: subscriptionIds,
      }, 400);
    } else {
      // Pas de sub_id sur les pending. Deux scénarios :
      //   1. Vente Systeme.io legacy → fallback par email
      //   2. Post-replan : nouveaux pending sans sub_id encore (la nouvelle sub
      //      sera créée quand le client paiera via le lien rebill). Dans ce cas
      //      on ne cherche PAS via email (risque d'annuler la mauvaise sub d'un
      //      autre business du customer). On marque juste les pending lost.
      const { data: sale } = await supabase
        .from("sales")
        .select("contact_id, systeme_io_order_id")
        .eq("id", saleId)
        .single();
      if (!sale?.contact_id) return json({ error: "sale_not_found" }, 404);

      const isSystemeIoLegacy = !!sale.systeme_io_order_id;
      if (isSystemeIoLegacy) {
        const { data: contact } = await supabase
          .from("contacts")
          .select("email")
          .eq("id", sale.contact_id)
          .single();
        if (!contact?.email) {
          return json({
            error: "no_subscription",
            message: "Vente Systeme.io sans email contact — impossible de retrouver la sub.",
          }, 400);
        }
        const found = await findStripeSubByEmail(contact.email);
        if (found) {
          subId = found.subscriptionId;
          stripeMode = found.mode;
          usedFallback = true;
        }
        // Si fallback échoue : on continue quand même (subId reste null) pour
        // marquer les pending lost. La vente Systeme.io a peut-être déjà été
        // annulée manuellement.
      }
      // Sinon : pas de fallback (post-replan, vente manuelle, etc.). On marque
      // juste les pending lost sans toucher à Stripe.
    }

    // ── Annule la subscription Stripe (si on en a une) ──
    let cancelMode: "live" | "test" | null = stripeMode;
    if (subId) {
      try {
        const cancelResult = await cancelSubscription(subId);
        cancelMode = cancelResult.mode;
        alreadyCanceled = !!cancelResult.alreadyCanceled;
      } catch (e: any) {
        return json({
          error: "stripe_cancel_failed",
          message: `Annulation Stripe échouée : ${e?.message || String(e)}`,
          subscription_id: subId,
        }, 502);
      }
    }

    // ── Marque les paiements pending comme 'lost' ──
    const cancelledAtIso = new Date().toISOString();
    const sourceLabel = usedFallback
      ? "Systeme.io→Stripe (fallback email)"
      : subId
        ? "Stripe natif"
        : "Pas de subscription Stripe (manuel ou post-replan)";
    const noteParts = [
      subId ? `Subscription Stripe ${subId}` : "Pending",
      `${alreadyCanceled ? "déjà annulée" : "annulée"} le ${cancelledAtIso.slice(0, 10)}`,
      `(CEO ${user.email})`,
      `Source: ${sourceLabel}`,
      cancelMode ? `Mode: ${cancelMode}` : null,
    ].filter(Boolean);
    const note = noteParts.join(". ") + ".";

    const { error: updErr, count } = await supabase
      .from("payments")
      .update({
        status: "lost",
        notes: note,
        updated_at: cancelledAtIso,
      }, { count: "exact" })
      .in("id", pendingPaymentIds);
    if (updErr) throw updErr;

    // ── Met à jour le payment_status de la vente ──
    await supabase.from("sales").update({ payment_status: "lost" }).eq("id", saleId);

    return json({
      ok: true,
      subscription_id: subId,
      stripe_mode: cancelMode,
      stripe_already_canceled: alreadyCanceled,
      cancelled_at: cancelledAtIso,
      payments_marked_lost: count ?? pendingPaymentIds.length,
      sale_id: saleId,
      used_systemeio_fallback: usedFallback,
    });
  } catch (err: any) {
    console.error("[cancel-stripe-subscription] error", err);
    return json({ error: "internal", message: err?.message || String(err) }, 500);
  }
});
