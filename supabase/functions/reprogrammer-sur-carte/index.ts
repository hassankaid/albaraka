// ═══════════════════════════════════════════════════════════════════════════
// reprogrammer-sur-carte
//
// Appelée par l'outil « Replanifier » (ReschedulePaymentsModal), APRÈS l'arrêt
// de l'ancien abonnement et la création des nouvelles échéances en base.
// Recrée tout de suite l'abonnement Stripe sur la carte déjà enregistrée du
// client : plus besoin qu'il rouvre un lien de re-paiement.
//
// Pourquoi (12/11/2026) : trois replanifications (Imène Bachir, Lahcen Liatim,
// Ouissam Fares) attendaient un lien que le client n'a jamais utilisé. Plus
// rien n'était programmé chez Stripe, sans alerte, et l'échéance d'Imène du
// 10/11 n'est jamais partie.
//
// Body    : { sale_id: string, ancienne_subscription_id?: string }
// Réponse : { ok: true, subscription_id, carte, premier_prelevement, arret, nombre, mensuel }
//         | { ok: false, raison }  → l'outil propose alors le lien de re-paiement.
//
// Réservé au CEO. Aucun prélèvement immédiat : l'abonnement démarre en période
// d'essai jusqu'à la 1re échéance (au plus tôt dans 15 min si elle est déjà
// due), et s'arrête seul après la dernière (cancel_at = fin exacte de la
// N-ième période, proration_behavior=none).
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { calculerPlan, carteExpireeAvant, ajouterMoisUTC } from "../_shared/plan_abonnement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const CLE_LIVE = Deno.env.get("STRIPE_SECRET_KEY") || "";
const CLE_TEST = Deno.env.get("STRIPE_SECRET_KEY_TEST") || "";

const STATUTS_VIVANTS = ["trialing", "active", "past_due"];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function stripe(
  cle: string,
  chemin: string,
  methode: "GET" | "POST" = "GET",
  params?: Record<string, string>,
  idempotence?: string,
): Promise<{ ok: boolean; data: any }> {
  const headers: Record<string, string> = { Authorization: `Bearer ${cle}` };
  let body: string | undefined;
  if (methode === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    if (idempotence) headers["Idempotency-Key"] = idempotence;
    body = new URLSearchParams(params || {}).toString();
  }
  try {
    const res = await fetch(`https://api.stripe.com/v1${chemin}`, { method: methode, headers, body });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (e) {
    return { ok: false, data: { error: { message: `réseau : ${String(e)}` } } };
  }
}

function refus(raison: string) {
  return json({ ok: false, raison });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    // ── Auth : CEO uniquement ──
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profil?.role !== "ceo") return json({ error: "forbidden_ceo_only" }, 403);

    const body = await req.json().catch(() => ({}));
    const saleId = body?.sale_id as string | undefined;
    const ancienneSub = (body?.ancienne_subscription_id as string | undefined) || null;
    if (!saleId) return json({ error: "sale_id_required" }, 400);

    // ── La vente et ses échéances ──
    const { data: vente } = await supabase
      .from("sales").select("id, product, contact_id").eq("id", saleId).single();
    if (!vente) return refus("vente introuvable");
    const { data: contact } = await supabase
      .from("contacts").select("email").eq("id", vente.contact_id).maybeSingle();

    const { data: paiements } = await supabase
      .from("payments")
      .select("id, payment_number, amount, due_date, status, stripe_subscription_id, stripe_payment_intent_id")
      .eq("sale_id", saleId)
      .order("payment_number", { ascending: true });
    const enAttente = (paiements || []).filter((p) => p.status === "pending");
    if (enAttente.length === 0) return refus("aucune échéance en attente");

    const resultat = calculerPlan(
      enAttente.map((p) => ({ amount: Number(p.amount), due_date: p.due_date })),
      new Date(),
    );
    if (!resultat.ok) return refus(resultat.raison);
    const plan = resultat.plan;

    // ── La carte enregistrée : abonnement précédent, puis paiements réussis ──
    const subsCandidates = [
      ancienneSub,
      ...[...(paiements || [])].reverse().map((p) => p.stripe_subscription_id),
    ].filter((s, i, arr): s is string => !!s && arr.indexOf(s) === i);
    const piCandidats = [...(paiements || [])]
      .reverse()
      .filter((p) => p.status === "paid" && p.stripe_payment_intent_id)
      .map((p) => p.stripe_payment_intent_id as string);

    let cle = "";
    let client: string | null = null;
    let carte: string | null = null;
    let produit: string | null = null;
    for (const k of [CLE_LIVE, CLE_TEST].filter(Boolean)) {
      for (const s of subsCandidates) {
        const r = await stripe(k, `/subscriptions/${s}`);
        if (!r.ok) continue;
        client = r.data.customer;
        produit = r.data.items?.data?.[0]?.price?.product ?? null;
        if (r.data.default_payment_method) {
          carte = r.data.default_payment_method;
          break;
        }
      }
      if (!carte) {
        for (const pi of piCandidats) {
          const r = await stripe(k, `/payment_intents/${pi}`);
          if (!r.ok) continue;
          // Sans autorisation des prélèvements suivants, la banque refuserait.
          if (r.data.setup_future_usage !== "off_session") continue;
          client = client || r.data.customer;
          carte = r.data.payment_method;
          break;
        }
      }
      if (client || carte) {
        cle = k;
        break;
      }
    }
    if (!cle || !client || !carte) return refus("aucune carte enregistrée réutilisable trouvée");
    if (!produit) return refus("produit Stripe de l'ancien abonnement introuvable");

    const pm = await stripe(cle, `/payment_methods/${carte}`);
    if (!pm.ok) return refus("carte enregistrée introuvable chez Stripe");
    if (pm.data.customer !== client) return refus("la carte n'est plus rattachée au client");
    const expM = Number(pm.data.card?.exp_month);
    const expA = Number(pm.data.card?.exp_year);
    if (expM && expA && carteExpireeAvant(expM, expA, plan.trialEnd)) {
      return refus(`carte expirée (${String(expM).padStart(2, "0")}/${expA})`);
    }
    const libelleCarte = `${pm.data.card?.brand ?? "carte"} •${pm.data.card?.last4 ?? "????"}`;

    // ── Jamais deux abonnements vivants pour la même vente ──
    const existants = await stripe(cle, `/subscriptions?customer=${client}&status=all&limit=100`);
    const vivant = (existants.data?.data || []).find(
      (s: any) => STATUTS_VIVANTS.includes(s.status) && s.metadata?.rebill_sale_id === saleId,
    );
    if (vivant) {
      await rattacher(supabase, saleId, vivant.id, enAttente, plan.trialEnd);
      return json({
        ok: true,
        deja: true,
        subscription_id: vivant.id,
        carte: libelleCarte,
        premier_prelevement: new Date((vivant.trial_end ?? plan.trialEnd) * 1000).toISOString(),
        arret: vivant.cancel_at ? new Date(vivant.cancel_at * 1000).toISOString() : null,
        nombre: plan.nombre,
        mensuel: plan.mensuelCents / 100,
      });
    }

    // ── Création ──
    const empreinte = enAttente.map((p) => `${p.id}:${p.amount}:${p.due_date}`).join("|");
    const idem = `reprog-${saleId}-${await hash(empreinte)}`;
    const cree = await stripe(cle, "/subscriptions", "POST", {
      customer: client,
      default_payment_method: carte,
      "items[0][price_data][currency]": "eur",
      "items[0][price_data][product]": produit,
      "items[0][price_data][unit_amount]": String(plan.mensuelCents),
      "items[0][price_data][recurring][interval]": "month",
      trial_end: String(plan.trialEnd),
      cancel_at: String(plan.cancelAt),
      proration_behavior: "none",
      off_session: "true",
      "metadata[source]": "rebill",
      "metadata[rebill_sale_id]": saleId,
      "metadata[product]": vente.product ?? "",
      "metadata[customer_email]": contact?.email ?? "",
      "metadata[recreation]": "outil Replanifier, carte enregistrée",
    }, idem);
    if (!cree.ok) return refus(`Stripe : ${cree.data?.error?.message ?? "création refusée"}`);
    const subId: string = cree.data.id;

    // Centimes de reste : sur la 1re facture réelle (après la période d'essai).
    // Créé APRÈS l'abonnement, sinon il partirait tout de suite sur la facture
    // d'essai à 0 €.
    if (plan.supplementPremiereCents > 0) {
      await stripe(cle, "/invoiceitems", "POST", {
        customer: client,
        subscription: subId,
        amount: String(plan.supplementPremiereCents),
        currency: "eur",
        description: "Ajustement d'arrondi de la 1re mensualité",
      }, `${idem}-ajustement`);
    }

    await rattacher(supabase, saleId, subId, enAttente, plan.trialEnd);

    return json({
      ok: true,
      subscription_id: subId,
      carte: libelleCarte,
      premier_prelevement: new Date(plan.trialEnd * 1000).toISOString(),
      arret: new Date(plan.cancelAt * 1000).toISOString(),
      nombre: plan.nombre,
      mensuel: plan.mensuelCents / 100,
    });
  } catch (e) {
    console.error("[reprogrammer-sur-carte]", e);
    return refus(`erreur interne : ${String((e as Error)?.message ?? e)}`);
  }
});

/**
 * Rattache l'abonnement aux échéances et les cale sur ses prélèvements
 * (utile quand la 1re échéance était déjà due : le 1er prélèvement part dans
 * 15 min, les suivantes un mois après). Le lien de re-paiement est invalidé :
 * sinon le client pourrait créer un 2e abonnement. Le webhook
 * `customer.subscription.created` voit le rattachement et ne refait rien.
 */
async function rattacher(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  saleId: string,
  subId: string,
  enAttente: { id: string; due_date: string }[],
  trialEnd: number,
) {
  const premier = new Date(trialEnd * 1000);
  for (let i = 0; i < enAttente.length; i++) {
    const due = ajouterMoisUTC(premier, i).toISOString().slice(0, 10);
    await supabase
      .from("payments")
      .update({ stripe_subscription_id: subId, due_date: due })
      .eq("id", enAttente[i].id)
      .eq("status", "pending");
  }
  await supabase.from("sales").update({ rebill_token: null, payment_status: "in_progress" }).eq("id", saleId);
}

async function hash(texte: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte));
  return Array.from(new Uint8Array(buf)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}
