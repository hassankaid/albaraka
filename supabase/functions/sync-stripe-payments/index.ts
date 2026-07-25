// sync-stripe-payments — Réconciliation Stripe -> plateforme (v2 "link-first")
//
// Objectif : filet de sécurité quotidien. Pour chaque échéance encore
// pending/late, on va lire la VÉRITÉ côté Stripe (via le sub_id stocké) et
// aligner la plateforme :
//   - facture payée non reflétée  -> échéance "paid" à la VRAIE date Stripe (Paris)
//   - facture échouée (open past-due / uncollectible) -> échéance "late"
// On stocke l'invoice_id + payment_intent_id au passage (idempotence + audit).
//
// SÉCURITÉ : mode APERÇU par défaut. Le corps { "dry_run": false } est requis
// pour écrire réellement. Sans ça, la fonction ne fait que RAPPORTER ce qu'elle
// changerait, sans toucher à la base.
//
// Corps optionnel :
//   { "dry_run": false }      -> applique les changements (sinon: aperçu seul)
//   { "only_sale": "<uuid>" }  -> limite à une vente (debug)

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  const d = details !== undefined ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[SYNC v2] ${step}${d}`);
};

// Date au format YYYY-MM-DD en heure de Paris (règle Hassan : dates FR).
function parisDate(unixSeconds: number): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date(unixSeconds * 1000)); // en-CA => YYYY-MM-DD
}

interface Payment {
  id: string;
  payment_number: number;
  amount: number;
  due_date: string;
  status: string;
  sale_id: string;
  stripe_subscription_id: string | null;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
}

interface Change {
  payment_id: string;
  sale_id: string;
  payment_number: number;
  from: string;
  to: string;
  paid_at?: string;
  amount_platform: number;
  amount_stripe: number;
  invoice: string;
  note?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dryRun = body?.dry_run !== false; // DÉFAUT = true (sécurité)
    const onlySale: string | null = body?.only_sale ?? null;

    log(`Start`, { dryRun, onlySale });

    async function stripeInvoicesForSub(subId: string): Promise<any[]> {
      const res = await fetch(
        `https://api.stripe.com/v1/invoices?subscription=${subId}&limit=100`,
        { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } },
      );
      if (!res.ok) {
        log(`Stripe invoices error for ${subId}`, { status: res.status });
        return [];
      }
      const j = await res.json();
      return j.data || [];
    }

    // 1) Toutes les échéances encore pending/late.
    let q = supabase
      .from("payments")
      .select(
        "id, payment_number, amount, due_date, status, sale_id, stripe_subscription_id, stripe_invoice_id, stripe_payment_intent_id",
      )
      .in("status", ["pending", "late"]);
    if (onlySale) q = q.eq("sale_id", onlySale);
    const { data: candidates, error: candErr } = await q;
    if (candErr) throw candErr;

    const withSub = (candidates || []).filter((p: Payment) => p.stripe_subscription_id);
    const legacyNoSub = (candidates || []).filter((p: Payment) => !p.stripe_subscription_id);
    log(`Candidates pending/late`, {
      total: candidates?.length || 0,
      with_sub: withSub.length,
      legacy_no_sub: legacyNoSub.length,
    });

    // 2) Charger TOUTES les échéances des abos concernés (pour compter les déjà-payées).
    const subIds = [...new Set(withSub.map((p: Payment) => p.stripe_subscription_id!))];
    const allBySub = new Map<string, Payment[]>();
    for (let i = 0; i < subIds.length; i += 50) {
      const chunk = subIds.slice(i, i + 50);
      const { data: rows } = await supabase
        .from("payments")
        .select(
          "id, payment_number, amount, due_date, status, sale_id, stripe_subscription_id, stripe_invoice_id, stripe_payment_intent_id",
        )
        .in("stripe_subscription_id", chunk);
      for (const r of rows || []) {
        const arr = allBySub.get(r.stripe_subscription_id) || [];
        arr.push(r);
        allBySub.set(r.stripe_subscription_id, arr);
      }
    }

    const changes: Change[] = [];

    // 3) LINK-FIRST : réconciliation par abonnement.
    for (const subId of subIds) {
      const invoices = await stripeInvoicesForSub(subId);
      if (invoices.length === 0) continue;

      const paidInvoices = invoices
        .filter((i: any) => i.status === "paid" && (i.amount_paid || 0) > 0)
        .sort(
          (a: any, b: any) =>
            (a.status_transitions?.paid_at || a.created) -
            (b.status_transitions?.paid_at || b.created),
        );
      const failedInvoices = invoices.filter(
        (i: any) =>
          (i.status === "open" || i.status === "uncollectible") && (i.attempt_count || 0) >= 1,
      );

      const pays = (allBySub.get(subId) || []).sort(
        (a, b) => a.payment_number - b.payment_number,
      );

      // 3a) Les i-ème factures payées correspondent aux i-ème échéances (ordre).
      for (let i = 0; i < paidInvoices.length && i < pays.length; i++) {
        const inv = paidInvoices[i];
        const pay = pays[i];
        if (pay.status === "paid") continue; // déjà OK -> idempotent
        // Cette échéance est pending/late alors que Stripe a encaissé la i-ème facture.
        const paidAt = parisDate(inv.status_transitions?.paid_at || inv.created);
        const piId =
          typeof inv.payment_intent === "string" ? inv.payment_intent : inv.payment_intent?.id;
        changes.push({
          payment_id: pay.id,
          sale_id: pay.sale_id,
          payment_number: pay.payment_number,
          from: pay.status,
          to: "paid",
          paid_at: paidAt,
          amount_platform: pay.amount,
          amount_stripe: (inv.amount_paid || 0) / 100,
          invoice: inv.id,
        });
        if (!dryRun) {
          await supabase
            .from("payments")
            .update({
              status: "paid",
              paid_at: paidAt,
              stripe_invoice_id: inv.id,
              ...(piId ? { stripe_payment_intent_id: piId } : {}),
            })
            .eq("id", pay.id)
            .in("status", ["pending", "late"]);
        }
      }

      // 3b) Détection des échecs : la 1re échéance non couverte par une facture payée,
      //     si une facture Stripe a échoué -> late.
      const nextIdx = paidInvoices.length;
      if (nextIdx < pays.length && failedInvoices.length > 0) {
        const pay = pays[nextIdx];
        if (pay.status === "pending") {
          const inv = failedInvoices.sort((a: any, b: any) => a.created - b.created)[0];
          const piId =
            typeof inv.payment_intent === "string" ? inv.payment_intent : inv.payment_intent?.id;
          changes.push({
            payment_id: pay.id,
            sale_id: pay.sale_id,
            payment_number: pay.payment_number,
            from: "pending",
            to: "late",
            amount_platform: pay.amount,
            amount_stripe: 0,
            invoice: inv.id,
            note: `facture ${inv.status} (${inv.attempt_count} tentative(s))`,
          });
          if (!dryRun) {
            await supabase
              .from("payments")
              .update({
                status: "late",
                stripe_invoice_id: inv.id,
                ...(piId ? { stripe_payment_intent_id: piId } : {}),
              })
              .eq("id", pay.id)
              .eq("status", "pending");
          }
        }
      }
    }

    const paidCount = changes.filter((c) => c.to === "paid").length;
    const lateCount = changes.filter((c) => c.to === "late").length;
    const recovered = changes
      .filter((c) => c.to === "paid")
      .reduce((s, c) => s + c.amount_stripe, 0);

    log(`Done`, { dryRun, paidCount, lateCount, recovered, legacy_skipped: legacyNoSub.length });

    return new Response(
      JSON.stringify(
        {
          mode: dryRun ? "DRY_RUN (aucune écriture)" : "APPLIED",
          summary: {
            candidates: candidates?.length || 0,
            would_mark_paid: paidCount,
            would_mark_late: lateCount,
            recovered_eur: Math.round(recovered * 100) / 100,
            legacy_no_sub_skipped: legacyNoSub.length,
          },
          changes,
        },
        null,
        2,
      ),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    log("ERROR", { message: String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
