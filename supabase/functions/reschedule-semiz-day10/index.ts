// ═══════════════════════════════════════════════════════════════════════════
// reschedule-semiz-day10 — One-shot : EMIRHAN SEMIZ (semizemirhan10@gmail.com)
//
// BUSINESS DEVELOPPER 3.0, 2 000 € en 8 x 250 €. Quatre échéances encaissées le
// 2 (mai → août). On bascule les quatre restantes sur le 10 du mois.
//
//   AVANT : 02/09 (en retard), 02/10, 02/11, 02/12
//   APRÈS : 10/09, 10/10, 10/11, 10/12
//
// SEULES LES DATES BOUGENT. Les montants restent à 250 €, donc
// `trigger_update_commission_on_payment_amount` ne se déclenche pas et les 16
// lignes de commissions sont épargnées — contrairement aux reprises de Khady et
// Bamar, où c'est ce déclencheur qui avait réécrit des commissions déjà payées.
// Cette opération est donc la plus simple des cinq, et c'est vérifié après coup.
//
// Trois choses à savoir sur ce dossier :
//
//   1. La facture du 02/09 est OUVERTE (250 €). Il faut la passer en `void`
//      avant de poser `trial_end`, sinon Stripe continue ses relances sur
//      l'ancienne date en parallèle du nouveau calendrier.
//
//   2. L'abonnement N'A AUCUN `cancel_at`, avec 4 échéances sur 8 restantes.
//      Une fois la dernière encaissée, plus rien ne l'arrête : 250 €/mois
//      indéfiniment. Même défaut que chez Amelle Arrioui le 03/09. On pose la
//      fin au 25/12/2026 — après le prélèvement du 10/12, avant celui du 10/01
//      qui n'aura donc jamais lieu, et en laissant deux semaines aux relances
//      Stripe si le dernier échoue.
//
//   3. Le prix catalogue affiche 312,50 € alors que le client paie 250 € : un
//      coupon ETHIC20 de −20 %, `duration: forever`, explique l'écart. On ne
//      touche pas au prix, donc la remise reste appliquée. Ne jamais annoncer
//      un montant depuis `unit_amount` sur ce dossier.
//
// L'échec du 02/09 est un `insufficient_funds`, pas un refus de carte : la
// Mastercard ****6218 expire en 03/2029 et a encaissé les quatre échéances
// précédentes. Le report au 10 lui laisse cinq jours de plus.
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

const EMAIL        = "semizemirhan10@gmail.com";
const CUSTOMER     = "cus_URYj2MLCSeomVE";
const SUB_ID       = "sub_1TSfbrJX0OcQy7IOEiX8WWDd";
const SALE_ID      = "2b7c8868-33af-4e73-9724-64e9e4d41a54";
const OPEN_INVOICE = "in_1UBGEgJX0OcQy7IOdtXefZ61";

// 14h00 à Paris : un prélèvement à minuit passerait avant tout
// approvisionnement du compte, et ce client vient d'échouer sur fonds
// insuffisants.
const TRIAL_END = Math.floor(new Date("2026-09-10T12:00:00Z").getTime() / 1000);
// Après le 10/12, avant le 10/01. Marge volontairement large pour laisser
// vivre les relances Stripe sans jamais permettre un neuvième prélèvement.
const CANCEL_AT = Math.floor(new Date("2026-12-25T12:00:00Z").getTime() / 1000);

const MONTANT_ATTENDU = 250;
const ECHEANCIER: Array<[number, string]> = [
  [5, "2026-09-10"],
  [6, "2026-10-10"],
  [7, "2026-11-10"],
  [8, "2026-12-10"],
];

function flattenForm(obj: any, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === "object" && item !== null) Object.assign(out, flattenForm(item, `${key}[${i}]`));
        else out[`${key}[${i}]`] = String(item);
      });
    } else if (typeof v === "object") Object.assign(out, flattenForm(v, key));
    else out[key] = String(v);
  }
  return out;
}

async function stripeApi(method: string, path: string, body?: Record<string, any>): Promise<any> {
  const form = body ? new URLSearchParams(flattenForm(body)).toString() : undefined;
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: form,
  });
  const txt = await res.text();
  let parsed: any; try { parsed = JSON.parse(txt); } catch { parsed = { raw: txt }; }
  if (!res.ok) throw new Error(`Stripe ${method} ${path} → ${res.status}: ${JSON.stringify(parsed?.error ?? parsed).slice(0, 400)}`);
  return parsed;
}

const json = (b: any, s = 200) =>
  new Response(JSON.stringify(b, null, 2), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const iso = (u: number | null | undefined) => (u ? new Date(u * 1000).toISOString() : null);
const eur = (c: number) => Math.round(c) / 100;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!STRIPE_KEY) return json({ error: "STRIPE_SECRET_KEY manquante" }, 500);
    const dryRun = (await req.json().catch(() => ({})))?.dry_run === true;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const etapes: any[] = [];

    // ── 1. Garde-fou : le bon client ─────────────────────────────────────
    const cust = await stripeApi("GET", `customers/${CUSTOMER}`);
    if (String(cust?.email ?? "").trim().toLowerCase() !== EMAIL) {
      return json({ erreur: "email_ne_correspond_pas", trouve: cust?.email }, 400);
    }
    etapes.push({ etape: "1_garde_fou", nom: cust.name, email: cust.email });

    // ── 2. Garde-fou : état de départ attendu ────────────────────────────
    const { data: vente } = await supabase
      .from("sales").select("mensualites, amount_ht").eq("id", SALE_ID).single();
    const { data: echeances } = await supabase
      .from("payments").select("id, payment_number, amount, status, due_date")
      .eq("sale_id", SALE_ID).order("payment_number");

    const payees   = (echeances ?? []).filter((p: any) => p.status === "paid");
    const restantes = (echeances ?? []).filter((p: any) => p.status !== "paid");
    if (vente?.mensualites !== 8 || payees.length !== 4 || restantes.length !== 4) {
      return json({
        erreur: "etat_de_depart_inattendu",
        message: "Attendu : 8 mensualités, 4 payées, 4 restantes. L'opération a peut-être déjà été passée.",
        constate: { mensualites: vente?.mensualites, payees: payees.length, restantes: restantes.length },
      }, 409);
    }
    // Le montant ne doit surtout PAS bouger : c'est ce qui garantit que le
    // déclencheur de rééquilibrage des commissions restera silencieux.
    const mauvais = (echeances ?? []).filter((p: any) => Number(p.amount) !== MONTANT_ATTENDU);
    if (mauvais.length > 0) {
      return json({ erreur: "montants_inattendus", detail: mauvais.map((p: any) => ({ n: p.payment_number, montant: p.amount })) }, 409);
    }
    etapes.push({
      etape: "2_etat_de_depart",
      encaisse: payees.length * MONTANT_ATTENDU,
      reste_a_encaisser: restantes.length * MONTANT_ATTENDU,
      dates_avant: restantes.map((p: any) => `${p.payment_number}: ${p.due_date} (${p.status})`),
    });

    // ── 3. Garde-fou : carte utilisable jusqu'au 10/12 ───────────────────
    const sub = await stripeApi("GET", `subscriptions/${SUB_ID}`);
    // L'abonnement n'a pas de carte propre : Stripe retombe sur celle du
    // client. On résout dans le même ordre que lui pour contrôler la bonne.
    let pmId: string | null = typeof sub.default_payment_method === "string" ? sub.default_payment_method : null;
    if (!pmId) pmId = cust.invoice_settings?.default_payment_method ?? null;
    if (!pmId) pmId = (await stripeApi("GET", `customers/${CUSTOMER}/payment_methods?limit=1`)).data?.[0]?.id ?? null;
    if (!pmId) return json({ erreur: "aucun_moyen_de_paiement", etapes }, 400);
    const pm = await stripeApi("GET", `payment_methods/${pmId}`);
    const finCarte = pm.card ? new Date(pm.card.exp_year, pm.card.exp_month, 0) : null;
    if (finCarte && finCarte < new Date("2026-12-10T00:00:00Z")) {
      return json({ erreur: "carte_expiree_avant_le_10_12", expiration: `${pm.card.exp_month}/${pm.card.exp_year}`, etapes }, 400);
    }
    const remise = sub.discount?.coupon;
    etapes.push({
      etape: "3_moyen_de_paiement",
      carte: pm.card?.last4, expiration: pm.card ? `${pm.card.exp_month}/${pm.card.exp_year}` : null,
      statut_abonnement: sub.status,
      prix_catalogue: eur(sub.items?.data?.[0]?.price?.unit_amount ?? 0),
      remise: remise ? `${remise.name} -${remise.percent_off}% (${remise.duration})` : "aucune",
      montant_reellement_facture: MONTANT_ATTENDU,
      fin_prevue_avant: iso(sub.cancel_at),
    });

    if (dryRun) {
      const inv = await stripeApi("GET", `invoices/${OPEN_INVOICE}`);
      return json({
        dry_run: true, client: cust.name,
        echeancier_vise: ECHEANCIER.map(([n, d]) => ({ echeance: n, date: d, montant: MONTANT_ATTENDU })),
        stripe_vise: {
          facture_a_annuler: { id: inv.id, statut: inv.status, montant: eur(inv.amount_due) },
          trial_end: iso(TRIAL_END),
          cancel_at_avant: iso(sub.cancel_at), cancel_at_apres: iso(CANCEL_AT),
          note: "Aucun changement de montant : les 16 commissions ne bougent pas.",
        },
        etapes,
      });
    }

    // ── 4. VOID la facture ouverte du 02/09 ──────────────────────────────
    const inv = await stripeApi("GET", `invoices/${OPEN_INVOICE}`);
    let voided = inv;
    if (inv.status === "open") voided = await stripeApi("POST", `invoices/${OPEN_INVOICE}/void`);
    etapes.push({ etape: "4_facture", id: voided.id, avant: inv.status, apres: voided.status, montant: eur(inv.amount_due) });

    // ── 5. Décalage au 10 + pose de la fin manquante, en un seul appel ───
    const maj = await stripeApi("POST", `subscriptions/${SUB_ID}`, {
      trial_end: TRIAL_END,
      cancel_at: CANCEL_AT,
      proration_behavior: "none",
    });
    etapes.push({
      etape: "5_abonnement", statut: maj.status,
      trial_end: iso(maj.trial_end), fin_prevue: iso(maj.cancel_at),
      fin_posee_par_cette_operation: !sub.cancel_at,
    });

    // ── 6. Base : uniquement les dates, et le statut de l'échéance en retard
    const parNumero = new Map(restantes.map((p: any) => [p.payment_number, p]));
    const lignes: any[] = [];
    for (const [num, date] of ECHEANCIER) {
      const ligne = parNumero.get(num);
      if (!ligne) throw new Error(`Échéance ${num} introuvable parmi les restantes`);
      const { data, error } = await supabase
        .from("payments")
        .update({
          due_date: date,
          status: "pending",
          notes: `Échéances recalées sur le 10 du mois (05/09/2026). Abonnement ${SUB_ID} conservé, montant inchangé. Fin d'abonnement posée au 25/12/2026 — elle manquait.`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ligne.id)
        .select("payment_number, due_date, amount, status")
        .single();
      if (error) throw new Error(`Écriture échéance ${num} : ${error.message}`);
      lignes.push({ ...data, avant: ligne.due_date });
    }
    etapes.push({ etape: "6_echeances", lignes });

    // ── 7. Contrôle : les commissions n'ont pas bougé ────────────────────
    // Aucun montant n'a changé, donc le rééquilibrage n'aurait pas dû se
    // déclencher. On le VÉRIFIE plutôt que de le supposer : c'est précisément
    // cette supposition qui avait coûté 13,96 € sur le dossier Khady Gueye.
    const { data: commissions } = await supabase
      .from("commissions")
      .select("id, role, percentage, amount, status, payment_id")
      .eq("sale_id", SALE_ID);
    const { data: apres } = await supabase
      .from("payments").select("id, payment_number, amount").eq("sale_id", SALE_ID);
    const montantPar = new Map((apres ?? []).map((p: any) => [p.id, Number(p.amount)]));
    const anomalies = (commissions ?? []).filter((c: any) => {
      const base = montantPar.get(c.payment_id);
      if (base === undefined) return false;
      const attendu = Math.floor((Math.round(base * 100) * Math.round(Number(c.percentage) * 1000) + 50_000) / 100_000) / 100;
      return Number(c.amount) !== attendu;
    });
    etapes.push({
      etape: "7_controle_commissions",
      lignes_totales: (commissions ?? []).length,
      anomalies: anomalies.length,
      detail: anomalies.map((c: any) => ({ role: c.role, montant: c.amount, statut: c.status })),
    });

    // ── 8. Relecture ─────────────────────────────────────────────────────
    const relu = await stripeApi("GET", `subscriptions/${SUB_ID}`);
    return json({
      success: true, client: cust.name,
      abonnement_conserve: SUB_ID, statut: relu.status,
      prochain_prelevement: iso(relu.trial_end ?? relu.current_period_end),
      montant: MONTANT_ATTENDU,
      fin_prevue: iso(relu.cancel_at),
      commissions_intactes: anomalies.length === 0,
      etapes,
    });
  } catch (e: any) {
    console.error("[reschedule-semiz-day10]", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
