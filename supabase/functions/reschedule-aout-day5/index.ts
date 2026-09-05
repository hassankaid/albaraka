// ═══════════════════════════════════════════════════════════════════════════
// reschedule-aout-day5 — One-shot : reporte au 05/09/2026 la DERNIÈRE échéance
// impayée d'AMELLE ARRIOUI et d'ISSOUF DOUMBIA.
//
//   AMELLE ARRIOUI  — BUSINESS DEVELOPPER, 8 × 250 € — n°8 du 25/08 → 05/09
//   ISSOUF DOUMBIA  — PASS AL BARAKA,      4 × 500 € — n°4 du 28/08 → 05/09
//
// Même méthode que `reschedule-lassana-day12` : on garde l'abonnement et on
// décale avec `trial_end`, plutôt que de résilier et faire re-saisir la carte.
//
// ⚠️ UNE DIFFÉRENCE MAJEURE ENTRE LES DEUX CLIENTS.
//
// L'abonnement d'Issouf a une fin programmée au 28/09/2026 : après le
// prélèvement du 05/09, le suivant tomberait le 05/10, donc après la
// résiliation. Rien à faire.
//
// Celui d'Amelle N'EN A AUCUNE. Elle a réglé 7 échéances sur 8, et rien
// n'arrête l'abonnement une fois la 8e encaissée : elle serait prélevée de
// 250 € tous les mois, indéfiniment. Ce défaut existe indépendamment de ce
// report — il aurait produit un trop-perçu dès le 25/09 si la facture d'août
// avait été payée. On pose donc la date de fin manquante, entre le prélèvement
// du 05/09 et celui du 05/10 qui n'aura jamais lieu.
//
// Étapes, par client :
//   1. Garde-fou : l'email du client Stripe doit correspondre
//   2. Vérifie qu'un moyen de paiement est attaché et n'expire pas avant
//   3. VOID la facture ouverte (sinon Stripe poursuit ses relances)
//   4. PATCH l'abonnement : trial_end = 05/09/2026, sans proratisation,
//      + cancel_at si la fin manque
//   5. Relit pour confirmer
//   6. Met à jour l'échéance en base et repasse la vente en « in_progress »
//
// `dry_run: true` fait toutes les lectures et les contrôles, n'écrit rien.
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";

// 05/09/2026 à 12:00 UTC — 14h00 à Paris. En milieu de journée volontairement :
// un prélèvement à minuit passerait avant tout approvisionnement du compte.
const NOUVELLE_DATE = Math.floor(new Date("2026-09-05T12:00:00Z").getTime() / 1000);
const NOUVELLE_DATE_ISO = "2026-09-05";

// Fin d'abonnement à poser quand elle manque : après le prélèvement du 05/09,
// avant celui du 05/10.
const FIN_A_POSER = Math.floor(new Date("2026-09-20T00:00:00Z").getTime() / 1000);

interface Cible {
  email: string;
  customer_id: string;
  sub_id: string;
  invoice_id: string;
  sale_id: string;
  payment_number: number;
  montant: number;
}

const CIBLES: Cible[] = [
  {
    email: "meila-mel@hotmail.fr",
    customer_id: "cus_TrK5GpB9scJQ74",
    sub_id: "sub_1StbRJJX0OcQy7IOLDcQnS3y",
    invoice_id: "in_1U8STqJX0OcQy7IOHxvIGcBa",
    sale_id: "4d2d35cd-77ec-4fa4-8b6f-c6a229c6727b",
    payment_number: 8,
    montant: 250,
  },
  {
    email: "issoufdoum01@gmail.com",
    customer_id: "cus_UbCQoNmtxKClVW",
    sub_id: "sub_1Tc01EJX0OcQy7IOp9YJKo2g",
    invoice_id: "in_1U9LsOJX0OcQy7IOu4zZG8pM",
    sale_id: "f84f0944-2625-4301-9fce-2dd9b836456a",
    payment_number: 4,
    montant: 500,
  },
];

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
    throw new Error(`Stripe ${method} ${path} → ${res.status}: ${JSON.stringify(parsed?.error ?? parsed).slice(0, 400)}`);
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

async function traiter(cible: Cible, supabase: any, dryRun: boolean) {
  const etapes: any[] = [];

  // ── 1. Garde-fou email ────────────────────────────────────────────────
  const cust = await stripeApi("GET", `customers/${cible.customer_id}`);
  const email = String(cust?.email ?? "").trim().toLowerCase();
  if (email !== cible.email) {
    return { client: cible.email, erreur: "email_ne_correspond_pas", trouve: email, etapes };
  }
  etapes.push({ etape: "1_garde_fou", nom: cust.name, email });

  // ── 2. Moyen de paiement ──────────────────────────────────────────────
  const sub = await stripeApi("GET", `subscriptions/${cible.sub_id}`);
  let pmId: string | null = typeof sub.default_payment_method === "string" ? sub.default_payment_method : null;
  if (!pmId) pmId = cust.invoice_settings?.default_payment_method ?? null;
  if (!pmId) {
    const pms = await stripeApi("GET", `customers/${cible.customer_id}/payment_methods?limit=1`);
    pmId = pms.data?.[0]?.id ?? null;
  }
  if (!pmId) {
    return { client: cible.email, erreur: "aucun_moyen_de_paiement", etapes };
  }
  const pm = await stripeApi("GET", `payment_methods/${pmId}`);
  const finCarte = pm.card ? new Date(pm.card.exp_year, pm.card.exp_month, 0) : null;
  const carteExpiree = finCarte ? finCarte < new Date("2026-09-05T00:00:00Z") : false;
  etapes.push({
    etape: "2_moyen_de_paiement",
    carte: pm.card?.last4,
    expiration: pm.card ? `${pm.card.exp_month}/${pm.card.exp_year}` : null,
    expire_avant_le_prelevement: carteExpiree,
    statut_avant: sub.status,
    fin_prevue_avant: iso(sub.cancel_at),
  });
  if (carteExpiree) {
    return { client: cible.email, erreur: "carte_expiree_avant_le_05_09", etapes };
  }

  const finManquante = !sub.cancel_at;

  if (dryRun) {
    const { data: ech } = await supabase
      .from("payments").select("payment_number, due_date, status, amount")
      .eq("sale_id", cible.sale_id).in("status", ["pending", "late"]);
    return {
      client: cible.email,
      nom: cust.name,
      dry_run: true,
      facture_a_annuler: cible.invoice_id,
      trial_end_vise: iso(NOUVELLE_DATE),
      fin_a_poser: finManquante ? iso(FIN_A_POSER) : "deja presente : " + iso(sub.cancel_at),
      echeance_actuelle: ech,
      etapes,
    };
  }

  // ── 3. VOID la facture ouverte ────────────────────────────────────────
  const inv = await stripeApi("GET", `invoices/${cible.invoice_id}`);
  let voided = inv;
  if (inv.status === "open") voided = await stripeApi("POST", `invoices/${cible.invoice_id}/void`);
  etapes.push({ etape: "3_facture", id: voided.id, avant: inv.status, apres: voided.status });

  // ── 4. Décalage + fin d'abonnement si manquante ───────────────────────
  const patch: Record<string, any> = { trial_end: NOUVELLE_DATE, proration_behavior: "none" };
  if (finManquante) patch.cancel_at = FIN_A_POSER;
  const updated = await stripeApi("POST", `subscriptions/${cible.sub_id}`, patch);
  etapes.push({
    etape: "4_abonnement",
    statut: updated.status,
    trial_end: iso(updated.trial_end),
    fin_prevue: iso(updated.cancel_at),
    fin_posee_par_cette_operation: finManquante,
  });

  // ── 5. Relecture ──────────────────────────────────────────────────────
  const relu = await stripeApi("GET", `subscriptions/${cible.sub_id}`);
  etapes.push({
    etape: "5_relecture",
    statut: relu.status,
    prochain_prelevement: iso(relu.trial_end ?? relu.current_period_end),
    fin_prevue: iso(relu.cancel_at),
    montant: (relu.items?.data?.[0]?.price?.unit_amount ?? 0) / 100,
  });

  // ── 6. Base ───────────────────────────────────────────────────────────
  const { data: maj, error: majErr } = await supabase
    .from("payments")
    .update({
      due_date: NOUVELLE_DATE_ISO,
      status: "pending",
      notes: `Dernière échéance reportée au 05/09/2026 (03/09/2026). Abonnement ${cible.sub_id} conservé.${finManquante ? " Fin d'abonnement posée au 20/09/2026 — elle manquait." : ""}`,
      updated_at: new Date().toISOString(),
    })
    .eq("sale_id", cible.sale_id)
    .eq("payment_number", cible.payment_number)
    .select("payment_number, due_date, status");
  if (majErr) throw new Error(`Écriture échéance ${cible.email} : ${majErr.message}`);

  const { error: sErr } = await supabase
    .from("sales").update({ payment_status: "in_progress" }).eq("id", cible.sale_id);
  if (sErr) throw new Error(`Écriture vente ${cible.email} : ${sErr.message}`);
  etapes.push({ etape: "6_base", echeance: maj, vente: "late → in_progress" });

  return {
    client: cible.email,
    nom: cust.name,
    success: true,
    abonnement_conserve: cible.sub_id,
    statut_final: relu.status,
    prochain_prelevement: iso(relu.trial_end ?? relu.current_period_end),
    montant: cible.montant,
    fin_posee: finManquante,
    etapes,
  };
}

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

    const resultats = [];
    for (const cible of CIBLES) {
      resultats.push(await traiter(cible, supabase, dryRun));
    }
    return json({ dry_run: dryRun, resultats });
  } catch (e: any) {
    console.error("[reschedule-aout-day5]", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
