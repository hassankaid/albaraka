// ═══════════════════════════════════════════════════════════════════════════
// reschedule-bamar-split — One-shot : BAMAR GUEYE (gavroche30@hotmail.fr)
//
// PASS AL BARAKA, 2 000 € en 2 fois. 1 000 € encaissés le 30/08/2026. On scinde
// le solde en deux.
//
//   AVANT : 1 x 1 000 € le 30/09/2026
//   APRÈS : 500 € le 30/09/2026, puis 500 € le 30/10/2026
//
// Le 30 est conservé plutôt que le 31 : c'est l'ancre de facturation Stripe
// (vente du 30/08). Décaler au 31 désynchroniserait la base et l'abonnement
// pour ne gagner qu'un jour.
//
// STRIPE — deux modifications seulement, en un appel :
//   - le montant passe de 1 000 € à 500 €. La date du 30/09 est déjà la bonne,
//     donc pas de `trial_end` ici, contrairement aux reports précédents.
//   - `cancel_at` passe du 30/10 au 31/10. C'est INDISPENSABLE : la fin était
//     calée pile sur la fin de période, donc Stripe se serait arrêté juste
//     avant de prélever en octobre, et le second versement n'aurait jamais eu
//     lieu.
//
// ⚠️ LE PIÈGE DES DÉCLENCHEURS, constaté sur Khady Gueye le 03/09/2026.
//
// `payments` porte `trigger_update_commission_on_payment_amount` : dès qu'un
// montant d'échéance change, `rebalance_commission_group` recalcule TOUTES les
// commissions de la vente — y compris celles déjà PAYÉES — en répartissant
// `amount_ht x taux` au prorata des montants du moment. Ici, faire passer
// l'échéance 2 de 1 000 à 500 € donnerait à l'échéance 1, déjà réglée,
// 1 000/1 500 x 200 = 133,33 € au lieu de 100 €.
//
// D'où l'ordre retenu : on écrit d'abord les échéances, on laisse le
// rééquilibrage faire ce qu'il veut, puis on RÉÉCRIT TOUTES les commissions de
// la vente, ligne payée comprise. Un UPDATE sur `commissions` ne redéclenche
// rien — c'est le seul moyen sûr d'avoir le dernier mot.
//
// COMMISSIONS AU CENTIME PRÈS (règle du 03/09/2026) : montant de l'échéance x
// taux, arrondi demi-supérieur sur la 2e décimale, en arithmétique entière.
// Ici les comptes tombent ronds — closer 100 + 50 + 50 = 200 € = 10 % de
// 2 000 €, agence 200 + 100 + 100 = 400 € = 20 %. Aucune dérive d'arrondi.
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

const EMAIL      = "gavroche30@hotmail.fr";
const CUSTOMER   = "cus_VAT56Tw56YZ9Sa";
const SUB_ID     = "sub_1UA89ZJX0OcQy7IOjP0OYvMm";
const SALE_ID    = "2324d887-efb9-4daa-9022-5a8168e1bd71";
const CONTACT_ID = "da9dfaf0-a4be-4e8e-ac78-b7b4ebabb23e";

// Lendemain du dernier prélèvement, convention déjà en place dans
// `repair-sale-subscription`.
const CANCEL_AT = Math.floor(new Date("2026-10-31T12:00:00Z").getTime() / 1000);

const MONTANT_CENTS = 50_000; // 500,00 €
const ECHEANCIER: Array<[number, string]> = [
  [2, "2026-09-30"],
  [3, "2026-10-30"], // nouvelle
];
const NB_TOTAL = 3;

/** Commission au centime près, arrondi demi-supérieur, sans virgule flottante. */
function commissionCents(montantCents: number, pct: number): number {
  const pctMilli = Math.round(pct * 1000);
  return Math.floor((montantCents * pctMilli + 50_000) / 100_000);
}

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
      .from("payments").select("id, payment_number, amount, status")
      .eq("sale_id", SALE_ID).order("payment_number");

    const payees   = (echeances ?? []).filter((p: any) => p.status === "paid");
    const attentes = (echeances ?? []).filter((p: any) => p.status !== "paid");
    if (vente?.mensualites !== 2 || payees.length !== 1 || attentes.length !== 1) {
      return json({
        erreur: "etat_de_depart_inattendu",
        message: "Attendu : 2 mensualités, 1 payée, 1 en attente. L'opération a peut-être déjà été passée.",
        constate: { mensualites: vente?.mensualites, payees: payees.length, en_attente: attentes.length },
      }, 409);
    }
    const encaisseCents = payees.reduce((s: number, p: any) => s + Math.round(Number(p.amount) * 100), 0);
    const resteCents = Math.round(Number(vente.amount_ht) * 100) - encaisseCents;
    if (resteCents !== MONTANT_CENTS * 2) {
      return json({ erreur: "reste_du_inattendu", attendu_cents: MONTANT_CENTS * 2, constate_cents: resteCents }, 409);
    }
    etapes.push({ etape: "2_etat_de_depart", encaisse: eur(encaisseCents), reste_a_encaisser: eur(resteCents) });

    // ── 3. Garde-fou : moyen de paiement utilisable jusqu'au 30/10 ───────
    const sub = await stripeApi("GET", `subscriptions/${SUB_ID}`);
    let pmId: string | null = typeof sub.default_payment_method === "string" ? sub.default_payment_method : null;
    if (!pmId) pmId = cust.invoice_settings?.default_payment_method ?? null;
    if (!pmId) pmId = (await stripeApi("GET", `customers/${CUSTOMER}/payment_methods?limit=1`)).data?.[0]?.id ?? null;
    if (!pmId) return json({ erreur: "aucun_moyen_de_paiement", etapes }, 400);
    const pm = await stripeApi("GET", `payment_methods/${pmId}`);
    const finCarte = pm.card ? new Date(pm.card.exp_year, pm.card.exp_month, 0) : null;
    if (finCarte && finCarte < new Date("2026-10-30T00:00:00Z")) {
      return json({ erreur: "carte_expiree_avant_le_30_10", expiration: `${pm.card.exp_month}/${pm.card.exp_year}`, etapes }, 400);
    }
    const item = sub.items?.data?.[0];
    if (!item) return json({ erreur: "abonnement_sans_item", etapes }, 500);
    etapes.push({
      etape: "3_moyen_de_paiement",
      carte: pm.card?.last4, expiration: pm.card ? `${pm.card.exp_month}/${pm.card.exp_year}` : null,
      statut_abonnement: sub.status,
      montant_actuel: eur(item.price?.unit_amount ?? 0),
      fin_prevue_avant: iso(sub.cancel_at),
    });

    // Rôles de la vente, tels qu'ils existent déjà.
    const { data: toutesCommissions } = await supabase
      .from("commissions")
      .select("id, role, percentage, beneficiary_user_id, beneficiary_external, payment_id, status")
      .eq("sale_id", SALE_ID);
    const roles = [...new Map((toutesCommissions ?? []).map((c: any) =>
      [c.role, { role: c.role, percentage: Number(c.percentage), beneficiary_user_id: c.beneficiary_user_id, beneficiary_external: c.beneficiary_external }],
    )).values()];

    if (dryRun) {
      const apercu = [
        { echeance: 1, date: "2026-08-30", montant: eur(encaisseCents), statut: "payee",
          commissions: roles.map((r) => ({ role: r.role, taux: r.percentage, montant: eur(commissionCents(encaisseCents, r.percentage)) })) },
        ...ECHEANCIER.map(([num, date]) => ({
          echeance: num, date, montant: eur(MONTANT_CENTS), statut: "a venir",
          commissions: roles.map((r) => ({ role: r.role, taux: r.percentage, montant: eur(commissionCents(MONTANT_CENTS, r.percentage)) })),
        })),
      ];
      return json({
        dry_run: true, client: cust.name, echeancier_vise: apercu,
        stripe_vise: {
          nouveau_montant: eur(MONTANT_CENTS),
          cancel_at_avant: iso(sub.cancel_at), cancel_at_apres: iso(CANCEL_AT),
          item_id: item.id, produit: item.price?.product,
          note: "Pas de trial_end : le 30/09 est deja la bonne date.",
        },
        etapes,
      });
    }

    // ── 4. Stripe : montant + fin, en un seul appel ─────────────────────
    const maj = await stripeApi("POST", `subscriptions/${SUB_ID}`, {
      cancel_at: CANCEL_AT,
      proration_behavior: "none",
      items: [{
        id: item.id,
        price_data: {
          currency: "eur", unit_amount: MONTANT_CENTS,
          product: item.price?.product, recurring: { interval: "month" },
        },
      }],
    });
    etapes.push({
      etape: "4_abonnement", statut: maj.status,
      nouveau_montant: eur(maj.items?.data?.[0]?.price?.unit_amount ?? 0),
      fin_prevue: iso(maj.cancel_at),
      prochain_prelevement: iso(maj.current_period_end),
    });

    // ── 5. Base : échéances ──────────────────────────────────────────────
    const parNumero = new Map(attentes.map((p: any) => [p.payment_number, p]));
    const lignes: any[] = [];
    for (const [num, date] of ECHEANCIER) {
      const existante = parNumero.get(num);
      const commun = {
        due_date: date, amount: eur(MONTANT_CENTS), total_payments: NB_TOTAL,
        status: "pending", updated_at: new Date().toISOString(),
        notes: `Solde de 1 000 € scindé en 2 x 500 € (03/09/2026). Abonnement ${SUB_ID} conservé.`,
      };
      if (existante) {
        const { data, error } = await supabase.from("payments").update(commun)
          .eq("id", existante.id).select("id, payment_number, due_date, amount").single();
        if (error) throw new Error(`Écriture échéance ${num} : ${error.message}`);
        lignes.push({ ...data, action: "mise a jour" });
      } else {
        const { data, error } = await supabase.from("payments").insert({
          ...commun, sale_id: SALE_ID, contact_id: CONTACT_ID,
          payment_number: num, payment_method: "stripe", stripe_subscription_id: SUB_ID,
        }).select("id, payment_number, due_date, amount").single();
        if (error) throw new Error(`Création échéance ${num} : ${error.message}`);
        lignes.push({ ...data, action: "creee" });
      }
    }
    await supabase.from("payments").update({ total_payments: NB_TOTAL }).eq("sale_id", SALE_ID).eq("status", "paid");
    await supabase.from("sales").update({ mensualites: NB_TOTAL }).eq("id", SALE_ID);
    etapes.push({ etape: "5_echeances", lignes, mensualites: `2 → ${NB_TOTAL}` });

    // ── 6. Commissions : réécriture INTÉGRALE, dernier mot sur le trigger ─
    // On relit les échéances APRÈS écriture, pour partir des montants réels
    // et non de ceux qu'on croit avoir posés.
    const { data: apres } = await supabase
      .from("payments").select("id, payment_number, amount, status")
      .eq("sale_id", SALE_ID).order("payment_number");
    const { data: commissionsApres } = await supabase
      .from("commissions").select("id, role, percentage, payment_id, amount, status").eq("sale_id", SALE_ID);

    const parPaiement = new Map<string, any[]>();
    for (const c of (commissionsApres ?? [])) {
      if (!parPaiement.has(c.payment_id)) parPaiement.set(c.payment_id, []);
      parPaiement.get(c.payment_id)!.push(c);
    }

    let corrigees = 0, creees = 0, inchangees = 0;
    const reparees: any[] = [];
    for (const p of (apres ?? [])) {
      const cents = Math.round(Number(p.amount) * 100);
      const existantes = parPaiement.get(p.id) ?? [];
      for (const r of roles) {
        const attendu = eur(commissionCents(cents, r.percentage));
        const dejaLa = existantes.find((c: any) => c.role === r.role);
        if (dejaLa) {
          if (Number(dejaLa.amount) !== attendu) {
            const { error } = await supabase.from("commissions").update({ amount: attendu }).eq("id", dejaLa.id);
            if (error) throw new Error(`Commission ${r.role} échéance ${p.payment_number} : ${error.message}`);
            reparees.push({ echeance: p.payment_number, role: r.role, avant: Number(dejaLa.amount), apres: attendu, statut: dejaLa.status });
            corrigees++;
          } else inchangees++;
        } else {
          const { error } = await supabase.from("commissions").insert({
            sale_id: SALE_ID, payment_id: p.id, role: r.role,
            percentage: r.percentage, amount: attendu, status: p.status === "paid" ? "due" : "pending",
            beneficiary_user_id: r.beneficiary_user_id, beneficiary_external: r.beneficiary_external,
          });
          if (error) throw new Error(`Création commission ${r.role} échéance ${p.payment_number} : ${error.message}`);
          creees++;
        }
      }
    }
    etapes.push({ etape: "6_commissions", corrigees, creees, inchangees, detail_corrections: reparees });

    // ── 7. Relecture ─────────────────────────────────────────────────────
    const relu = await stripeApi("GET", `subscriptions/${SUB_ID}`);
    return json({
      success: true, client: cust.name,
      abonnement_conserve: SUB_ID, statut: relu.status,
      prochain_prelevement: iso(relu.current_period_end),
      montant_mensuel: eur(relu.items?.data?.[0]?.price?.unit_amount ?? 0),
      fin_prevue: iso(relu.cancel_at),
      etapes,
    });
  } catch (e: any) {
    console.error("[reschedule-bamar-split]", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
