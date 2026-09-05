// ═══════════════════════════════════════════════════════════════════════════
// reschedule-lassana-day12 — One-shot : décale les échéances de LASSANA CISSE
// du 29 au 12 du mois, SANS annuler l'abonnement.
//
// Contexte : mensualité d'août impayée par manque de fonds (confirmé avec le
// client, pas un refus de carte). Il aura les fonds le 12. On reporte donc
// l'échéance d'août au 12/09 et on aligne les suivantes sur le 12.
//
//   n°2  29/08 (impayée)  →  12/09/2026
//   n°3  29/09            →  12/10/2026
//   n°4  29/10            →  12/11/2026
//   n°5  29/11            →  12/12/2026
//   n°6  29/12            →  12/01/2027
//
// Montant inchangé : 5 × 500 €. Total préservé à 3 000 € (500 € déjà encaissés).
//
// POURQUOI PAS D'ANNULATION. `adjust-stripe-subscription-amount` pose la règle
// maison : on modifie l'abonnement en place plutôt que de le résilier, pour ne
// pas faire re-saisir la carte au client. Les cas Mekhlouf et Fouad ont été
// résiliés parce que la FORME du plan changeait (phases, montants différents)
// ou que l'échéancier n'avait pas démarré. Ici seules les dates bougent : un
// `trial_end` suffit, et le client garde un abonnement valide de bout en bout.
//
// Stripe ancre le cycle de facturation sur la fin de période d'essai : après le
// prélèvement du 12/09, les suivants tombent d'eux-mêmes le 12 de chaque mois.
//
// La date de fin existante (29/01/2027) est CONSERVÉE : elle tombe après le
// dernier prélèvement du 12/01/2027 et avant celui du 12/02 qui n'aura donc
// jamais lieu. Aucun 6e prélèvement possible.
//
// Étapes :
//   1. Garde-fou : l'email du client Stripe doit correspondre
//   2. Vérifie qu'un moyen de paiement est bien attaché
//   3. VOID la facture ouverte du 29/08 (sinon Stripe continue ses relances)
//   4. PATCH l'abonnement : trial_end = 12/09/2026, sans proratisation
//   5. Relit l'abonnement pour confirmer le nouvel état
//   6. Met à jour les 5 échéances en base + repasse la n°2 en « pending »
//   7. Repasse la vente de « late » à « in_progress »
//
// `dry_run: true` exécute les lectures et les contrôles, n'écrit rien.
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";

const EXPECTED_EMAIL = "lassana.a47@gmail.com";
const CUSTOMER_ID = "cus_UySmUZHKHnivxP";
const SUB_ID = "sub_1TyVr7JX0OcQy7IOUCLPmudO";
const OPEN_INVOICE_ID = "in_1U9ke0JX0OcQy7IOBUK47Npp";
const SALE_ID = "5adea691-ae17-48f0-ad78-5d2483411310";

// 12/09/2026 à 12:00 UTC — soit 14h00 à Paris. Volontairement en milieu de
// journée : le client a annoncé avoir les fonds « le 12 », un prélèvement à
// minuit passerait avant l'approvisionnement.
const NOUVELLE_DATE = Math.floor(new Date("2026-09-12T12:00:00Z").getTime() / 1000);

const NOUVELLES_ECHEANCES: Record<number, string> = {
  2: "2026-09-12",
  3: "2026-10-12",
  4: "2026-11-12",
  5: "2026-12-12",
  6: "2027-01-12",
};

function flattenForm(obj: any, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      v.forEach((item, idx) => {
        if (typeof item === "object" && item !== null) Object.assign(out, flattenForm(item, `${key}[${idx}]`));
        else out[`${key}[${idx}]`] = String(item);
      });
    } else if (typeof v === "object") Object.assign(out, flattenForm(v, key));
    else out[key] = String(v);
  }
  return out;
}

async function stripeApi(method: string, path: string, body?: Record<string, any>): Promise<any> {
  const formBody = body ? new URLSearchParams(flattenForm(body)).toString() : undefined;
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      ...(formBody ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: formBody,
  });
  const text = await res.text();
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Stripe ${method} ${path} → ${res.status}: ${JSON.stringify(parsed?.error ?? parsed).slice(0, 500)}`);
  }
  return parsed;
}

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b, null, 2), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const iso = (u: number | null | undefined) => (u ? new Date(u * 1000).toISOString() : null);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!STRIPE_KEY) return json({ error: "STRIPE_SECRET_KEY manquante" }, 500);

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const log: any[] = [];

    // ── 1. Garde-fou email ──────────────────────────────────────────────
    const cust = await stripeApi("GET", `customers/${CUSTOMER_ID}`);
    const email = String(cust?.email ?? "").trim().toLowerCase();
    if (email !== EXPECTED_EMAIL) {
      return json({ error: "email_ne_correspond_pas", attendu: EXPECTED_EMAIL, trouve: email }, 409);
    }
    log.push({ etape: "1_garde_fou_email", client: cust.name, email });

    // ── 2. Moyen de paiement ────────────────────────────────────────────
    const sub = await stripeApi("GET", `subscriptions/${SUB_ID}`);
    let pmId: string | null = typeof sub.default_payment_method === "string" ? sub.default_payment_method : null;
    if (!pmId) pmId = cust.invoice_settings?.default_payment_method ?? null;
    if (!pmId) {
      const pms = await stripeApi("GET", `customers/${CUSTOMER_ID}/payment_methods?limit=1`);
      pmId = pms.data?.[0]?.id ?? null;
    }
    if (!pmId) {
      return json({ error: "aucun_moyen_de_paiement", message: "Sans carte attachée, le prélèvement du 12/09 échouera." }, 400);
    }
    const pm = await stripeApi("GET", `payment_methods/${pmId}`);
    log.push({
      etape: "2_moyen_de_paiement",
      pm_id: pmId,
      carte: pm.card?.last4,
      expiration: pm.card ? `${pm.card.exp_month}/${pm.card.exp_year}` : null,
      statut_abonnement_avant: sub.status,
      fin_prevue: iso(sub.cancel_at),
    });

    // La carte expire-t-elle avant le dernier prélèvement (12/01/2027) ?
    if (pm.card) {
      const finCarte = new Date(pm.card.exp_year, pm.card.exp_month, 0);
      const dernierPrelevement = new Date("2027-01-12T00:00:00Z");
      if (finCarte < dernierPrelevement) {
        log.push({
          etape: "2b_alerte_carte",
          message: `La carte expire le ${pm.card.exp_month}/${pm.card.exp_year}, avant le dernier prélèvement du 12/01/2027. Les derniers échoueront sauf mise à jour.`,
        });
      }
    }

    if (dryRun) {
      const { data: aModifier } = await supabase
        .from("payments").select("payment_number, due_date, status, amount")
        .eq("sale_id", SALE_ID).in("status", ["pending", "late"])
        .order("payment_number");
      return json({
        dry_run: true,
        message: "Aucune écriture. Voici ce qui serait fait.",
        facture_a_annuler: OPEN_INVOICE_ID,
        abonnement: { id: SUB_ID, statut_actuel: sub.status, trial_end_vise: iso(NOUVELLE_DATE) },
        echeances_actuelles: aModifier,
        echeances_cibles: NOUVELLES_ECHEANCES,
        log,
      });
    }

    // ── 3. VOID la facture ouverte ──────────────────────────────────────
    const inv = await stripeApi("GET", `invoices/${OPEN_INVOICE_ID}`);
    let voided = inv;
    if (inv.status === "open") {
      voided = await stripeApi("POST", `invoices/${OPEN_INVOICE_ID}/void`);
    }
    log.push({ etape: "3_annulation_facture", id: voided.id, statut_avant: inv.status, statut_apres: voided.status });

    // ── 4. Décalage en place, sans proratisation ────────────────────────
    const updated = await stripeApi("POST", `subscriptions/${SUB_ID}`, {
      trial_end: NOUVELLE_DATE,
      proration_behavior: "none",
    });
    log.push({
      etape: "4_decalage_abonnement",
      statut: updated.status,
      periode_courante_fin: iso(updated.current_period_end),
      trial_end: iso(updated.trial_end),
      fin_prevue: iso(updated.cancel_at),
    });

    // ── 5. Relecture de confirmation ────────────────────────────────────
    const relu = await stripeApi("GET", `subscriptions/${SUB_ID}`);
    log.push({
      etape: "5_relecture",
      statut: relu.status,
      prochain_prelevement: iso(relu.trial_end ?? relu.current_period_end),
      montant: (relu.items?.data?.[0]?.price?.unit_amount ?? 0) / 100,
    });

    // ── 6. Échéances en base ────────────────────────────────────────────
    const { data: aModifier, error: fetchErr } = await supabase
      .from("payments").select("id, payment_number, due_date, status")
      .eq("sale_id", SALE_ID).in("status", ["pending", "late"])
      .order("payment_number");
    if (fetchErr) throw new Error(`Lecture échéances : ${fetchErr.message}`);

    const majEcheances: any[] = [];
    for (const p of aModifier ?? []) {
      const cible = NOUVELLES_ECHEANCES[p.payment_number as number];
      if (!cible) continue;
      const { error } = await supabase.from("payments").update({
        due_date: cible,
        status: "pending",
        notes: `Décalage du 29 au 12 du mois (30/08/2026) — impayé d'août reporté au 12/09, accord client. Abonnement ${SUB_ID} conservé.`,
        updated_at: new Date().toISOString(),
      }).eq("id", p.id);
      if (error) throw new Error(`Écriture échéance ${p.payment_number} : ${error.message}`);
      majEcheances.push({ n: p.payment_number, avant: p.due_date, apres: cible, statut_avant: p.status });
    }
    log.push({ etape: "6_echeances", modifiees: majEcheances });

    // ── 7. Statut de la vente ───────────────────────────────────────────
    const { error: saleErr } = await supabase
      .from("sales").update({ payment_status: "in_progress" }).eq("id", SALE_ID);
    if (saleErr) throw new Error(`Écriture vente : ${saleErr.message}`);
    log.push({ etape: "7_vente", payment_status: "late → in_progress" });

    return json({
      success: true,
      resume: {
        client: cust.name,
        abonnement_conserve: SUB_ID,
        statut_final: relu.status,
        facture_annulee: OPEN_INVOICE_ID,
        prochain_prelevement: iso(relu.trial_end ?? relu.current_period_end),
        echeances_modifiees: majEcheances.length,
        carte: pm.card?.last4,
      },
      log,
    });
  } catch (e: any) {
    console.error("[reschedule-lassana-day12]", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
