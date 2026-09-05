// ═══════════════════════════════════════════════════════════════════════════
// stripe-subscription-lookup — DÉTECTEUR Stripe (lecture seule)
//
// Objectif : pour un email donné, retrouver tout ce que Stripe sait du client
//   - ses fiches client (customers)
//   - ses abonnements (subscriptions) : statut, montant mensuel, intervalle,
//     période courante
//   - ses factures (invoices) : payées / à venir, montant, date d'encaissement
//   - ses REMISES (coupons) et leur durée
//   - la PROCHAINE FACTURE telle que Stripe la calcule, remise déduite
//
// Les deux derniers points ont été ajoutés le 03/09/2026 après une alerte
// réelle : un abonnement affichait un prix catalogue de 312,50 € alors que
// toutes ses factures sortaient à 250 €. Un coupon de 20 % expliquait l'écart,
// mais rien ici ne le montrait — on ne pouvait donc pas savoir, avant de
// décaler un prélèvement, quel montant allait réellement partir. Le prix d'un
// item Stripe n'est PAS ce que le client paie ; seule la facture prévisionnelle
// fait foi.
//
// Cette fonction NE MODIFIE RIEN — ni Stripe, ni la base. Elle sert à VOIR,
// pour pouvoir ensuite rattacher en confiance les anciens clients (Systeme.io)
// à leur abonnement Stripe.
//
// Sécurité : verify_jwt=false pendant la phase de test (lecture seule). Sera
// remplacée par l'outil de rattachement sécurisé (verify_jwt + check CEO) une
// fois la phase de test validée.
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Mêmes secrets que le webhook Stripe — deux environnements.
const STRIPE_KEY_LIVE = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_KEY_TEST = Deno.env.get("STRIPE_SECRET_KEY_TEST") || "";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// GET sur l'API Stripe (x-www-form-urlencoded, comme le webhook existant).
async function stripeGet(path: string, apiKey: string): Promise<any> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(
      `Stripe GET ${path} → ${res.status} : ${JSON.stringify(body?.error ?? body)}`,
    );
  }
  return body;
}

function tsToIso(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

// Centimes Stripe → euros lisibles
function cents(amount: number | null | undefined): number | null {
  if (amount == null) return null;
  return Math.round(amount) / 100;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const email = (body?.email as string | undefined)?.trim().toLowerCase();
  // mode: "live" (défaut) ou "test". Les anciens clients Systeme.io sont en live.
  const mode = body?.mode === "test" ? "test" : "live";
  if (!email) return json({ error: "missing_email" }, 400);

  const apiKey = mode === "test" ? STRIPE_KEY_TEST : STRIPE_KEY_LIVE;
  if (!apiKey) return json({ error: `no_stripe_key_${mode}` }, 500);

  try {
    // ─── 1. Fiche(s) client Stripe par email ───
    const customersRes = await stripeGet(
      `customers?email=${encodeURIComponent(email)}&limit=10`,
      apiKey,
    );
    const customers = (customersRes.data ?? []) as any[];

    if (customers.length === 0) {
      return json({
        email,
        mode,
        found: false,
        message:
          "Aucune fiche client Stripe trouvée avec cet email dans cet environnement. " +
          "Vérifier l'orthographe de l'email, ou essayer mode 'test'.",
      });
    }

    // ─── 2. Pour chaque client : abonnements + factures ───
    const result = [];
    for (const cust of customers) {
      const subsRes = await stripeGet(
        `subscriptions?customer=${cust.id}&status=all&limit=20`,
        apiKey,
      );
      const subs = [];

      for (const sub of (subsRes.data ?? []) as any[]) {
        // Montant + intervalle depuis les items de l'abonnement
        const items = ((sub.items?.data ?? []) as any[]).map((it) => ({
          price_id: it.price?.id ?? null,
          montant_unitaire: cents(it.price?.unit_amount),
          devise: it.price?.currency ?? null,
          intervalle: it.price?.recurring?.interval ?? null,
          intervalle_count: it.price?.recurring?.interval_count ?? null,
          quantite: it.quantity ?? 1,
        }));

        // Toutes les factures de l'abonnement (payées + à venir)
        const invRes = await stripeGet(
          `invoices?subscription=${sub.id}&limit=100`,
          apiKey,
        );
        const invoices = ((invRes.data ?? []) as any[]).map((inv) => ({
          id: inv.id,
          numero: inv.number ?? null,
          statut: inv.status, // paid | open | draft | void | uncollectible
          montant_paye: cents(inv.amount_paid),
          montant_du: cents(inv.amount_due),
          devise: inv.currency,
          cree_le: tsToIso(inv.created),
          paye_le: tsToIso(inv.status_transitions?.paid_at),
          periode_debut: tsToIso(inv.period_start),
          periode_fin: tsToIso(inv.period_end),
          payment_intent:
            typeof inv.payment_intent === "string"
              ? inv.payment_intent
              : (inv.payment_intent?.id ?? null),
          hosted_invoice_url: inv.hosted_invoice_url ?? null,
        }));

        const facturesPayees = invoices.filter((i) => i.statut === "paid");

        // ─── Remises actives sur l'abonnement ───
        // `discounts` (pluriel) sur les versions récentes de l'API, `discount`
        // (singulier) sur les anciennes : on lit les deux.
        const bruts = Array.isArray(sub.discounts) && sub.discounts.length
          ? sub.discounts
          : (sub.discount ? [sub.discount] : []);
        const remises = bruts
          .map((d: any) => (typeof d === "string" ? null : d))
          .filter(Boolean)
          .map((d: any) => ({
            coupon_id: d.coupon?.id ?? null,
            nom: d.coupon?.name ?? null,
            pourcentage: d.coupon?.percent_off ?? null,
            montant_off: cents(d.coupon?.amount_off),
            duree: d.coupon?.duration ?? null,          // once | repeating | forever
            duree_en_mois: d.coupon?.duration_in_months ?? null,
            debut: tsToIso(d.start),
            // `end` n'est renseigné que pour un coupon `repeating`. Null sur un
            // coupon `forever` : la remise ne s'arrête jamais.
            fin: tsToIso(d.end),
          }));

        // ─── Ce que Stripe facturera réellement au prochain cycle ───
        // C'est la seule source fiable : elle applique remises, prorata et
        // taxes. Un abonnement résilié ou terminé n'en a pas — ce n'est pas
        // une erreur, on le dit simplement.
        let prochaineFacture: any = null;
        try {
          const up = await stripeGet(
            `invoices/upcoming?subscription=${sub.id}`,
            apiKey,
          );
          prochaineFacture = {
            montant_a_payer: cents(up.amount_due),
            sous_total: cents(up.subtotal),
            total: cents(up.total),
            remise_appliquee: cents(
              (up.total_discount_amounts ?? []).reduce(
                (s: number, d: any) => s + (d.amount ?? 0), 0,
              ),
            ),
            date_prevue: tsToIso(up.next_payment_attempt ?? up.period_end),
            periode_debut: tsToIso(up.period_start),
            periode_fin: tsToIso(up.period_end),
          };
        } catch (e: any) {
          prochaineFacture = { indisponible: e?.message ?? String(e) };
        }

        subs.push({
          subscription_id: sub.id,
          statut: sub.status, // active | past_due | canceled | trialing | unpaid | incomplete
          cree_le: tsToIso(sub.created),
          periode_courante_debut: tsToIso(sub.current_period_start),
          periode_courante_fin: tsToIso(sub.current_period_end),
          annulation_prevue_le: tsToIso(sub.cancel_at),
          annule_le: tsToIso(sub.canceled_at),
          items,
          remises,
          prochaine_facture: prochaineFacture,
          nb_factures_payees: facturesPayees.length,
          total_encaisse:
            facturesPayees.reduce((s, i) => s + (i.montant_paye ?? 0), 0),
          factures: invoices,
        });
      }

      result.push({
        customer_id: cust.id,
        email: cust.email,
        nom: cust.name ?? null,
        cree_le: tsToIso(cust.created),
        nb_abonnements: subs.length,
        abonnements: subs,
      });
    }

    return json({ email, mode, found: true, customers: result });
  } catch (e: any) {
    return json(
      { error: "stripe_error", message: e?.message ?? String(e) },
      500,
    );
  }
});
