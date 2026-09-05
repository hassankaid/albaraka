// ═══════════════════════════════════════════════════════════════════════════
// reschedule-khady-day5 — One-shot : KHADY GUEYE (gueyekhady1956@gmail.com)
//
// PASS AL BARAKA, 2 000 €. Vendue le 30/08/2026, 1 mensualité de 285,71 €
// déjà encaissée. On rééquilibre le reste autour de 250 € et on cale tout
// sur le 5 du mois.
//
//   AVANT : 6 x 285,71 €, du 30/09/2026 au 02/03/2027
//   APRÈS : 244,95 € le 05/10, puis 6 x 244,89 € jusqu'au 05/04/2027
//
// Reste à encaisser : 2 000,00 − 285,71 = 1 714,29 €. Réparti sur 7 échéances
// selon l'algorithme maison « first-absorbs-extras » : 24 489 centimes de base,
// et les 6 centimes résiduels portés par la première. Le total retombe donc
// exactement sur 2 000,00 €.
//
// LE PLAN S'ALLONGE D'UN MOIS, et c'est inévitable : descendre de 285,71 à
// ~250 € sans changer le reste dû exige une échéance de plus. 7 mensualités
// deviennent 8.
//
// Deux effets de bord voulus :
//   - les 5 jours du 30/09 au 05/10 ne sont pas facturés (proration_behavior
//     none). C'est la contrepartie du report demandé.
//   - le 5 supprime un cas tordu : l'ancienne 7e échéance tombait le 02/03/2027
//     parce que février n'a pas de 30.
//
// ⚠️ À PASSER AVANT LE 30/09/2026 16h25 UTC. Sa période courante s'arrête là ;
// après, Stripe aura prélevé 285,71 € et il faudra tout reprendre.
//
// Modification EN PLACE : son abonnement est une subscription simple, sans
// `subscription_schedule`. On ne résilie rien, elle ne re-saisit pas sa carte.
// `repair-sale-subscription` aurait créé une SECONDE subscription active et
// donc un double prélèvement — ce n'est pas la bonne porte.
//
// COMMISSIONS AU CENTIME PRÈS (règle posée le 03/09/2026). Arrondi
// demi-supérieur sur la 2e décimale, en arithmétique entière. Le code existant
// fait `Math.round(euros * pct)`, qui diverge sur 137 combinaisons à 15 % et
// 2 294 à 25 % : la valeur exacte y tombe pile sur le demi-centime et la
// virgule flottante la fait basculer en dessous. Les taux de Khady (5, 10,
// 20 %) ne divergent jamais — le calcul entier est ici une garantie, pas une
// correction.
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

const EMAIL      = "gueyekhady1956@gmail.com";
const CUSTOMER   = "cus_VAWaMNmrvQE7Up";
const SUB_ID     = "sub_1UABXUJX0OcQy7IORuI9mE2o";
const SALE_ID    = "f13c249f-1233-4050-a92d-59647f71105e";
const CONTACT_ID = "f0016e6b-b707-48b8-8d72-43b73a529952";

// Milieu de journée : un prélèvement à minuit passerait avant tout
// approvisionnement du compte.
const TRIAL_END = Math.floor(new Date("2026-10-05T12:00:00Z").getTime() / 1000);
// Dernière échéance + 24h, comme le fait déjà `repair-sale-subscription`.
const CANCEL_AT = Math.floor(new Date("2027-04-06T12:00:00Z").getTime() / 1000);

const BASE_CENTS  = 24489; // 244,89 €
const EXTRA_CENTS = 6;     // portés par la première échéance → 244,95 €

// (numéro d'échéance, date, montant en centimes)
const ECHEANCIER: Array<[number, string, number]> = [
  [2, "2026-10-05", BASE_CENTS + EXTRA_CENTS],
  [3, "2026-11-05", BASE_CENTS],
  [4, "2026-12-05", BASE_CENTS],
  [5, "2027-01-05", BASE_CENTS],
  [6, "2027-02-05", BASE_CENTS],
  [7, "2027-03-05", BASE_CENTS],
  [8, "2027-04-05", BASE_CENTS], // nouvelle
];
const NB_TOTAL = 8;

/**
 * Commission au centime près, arrondi demi-supérieur.
 *
 * Tout est entier : `montantCents` et `pct` mis à l'échelle du millième
 * couvrent les taux décimaux (7,5 % → 7500) sans jamais passer par un flottant.
 * Les valeurs restent très en dessous de 2^53, donc exactes.
 */
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

    // ── 2. Garde-fou : l'état de départ est bien celui attendu ───────────
    // Empêche un second passage de re-décaler un échéancier déjà corrigé.
    const { data: vente } = await supabase
      .from("sales").select("mensualites, amount_ht").eq("id", SALE_ID).single();
    const { data: echeances } = await supabase
      .from("payments").select("id, payment_number, amount, status, due_date")
      .eq("sale_id", SALE_ID).order("payment_number");

    const payees   = (echeances ?? []).filter((p: any) => p.status === "paid");
    const attentes = (echeances ?? []).filter((p: any) => p.status !== "paid");
    if (vente?.mensualites !== 7 || attentes.length !== 6 || payees.length !== 1) {
      return json({
        erreur: "etat_de_depart_inattendu",
        message: "Attendu : 7 mensualités, 1 payée, 6 en attente. L'opération a peut-être déjà été passée.",
        constate: { mensualites: vente?.mensualites, payees: payees.length, en_attente: attentes.length },
      }, 409);
    }
    const encaisseCents = payees.reduce((s: number, p: any) => s + Math.round(Number(p.amount) * 100), 0);
    const resteCents = Math.round(Number(vente.amount_ht) * 100) - encaisseCents;
    if (resteCents !== BASE_CENTS * 7 + EXTRA_CENTS) {
      return json({ erreur: "reste_du_inattendu", attendu_cents: BASE_CENTS * 7 + EXTRA_CENTS, constate_cents: resteCents }, 409);
    }
    etapes.push({ etape: "2_etat_de_depart", encaisse: eur(encaisseCents), reste_a_encaisser: eur(resteCents) });

    // ── 3. Garde-fou : moyen de paiement utilisable le 05/10 ─────────────
    const sub = await stripeApi("GET", `subscriptions/${SUB_ID}`);
    let pmId: string | null = typeof sub.default_payment_method === "string" ? sub.default_payment_method : null;
    if (!pmId) pmId = cust.invoice_settings?.default_payment_method ?? null;
    if (!pmId) pmId = (await stripeApi("GET", `customers/${CUSTOMER}/payment_methods?limit=1`)).data?.[0]?.id ?? null;
    if (!pmId) return json({ erreur: "aucun_moyen_de_paiement", etapes }, 400);
    const pm = await stripeApi("GET", `payment_methods/${pmId}`);
    const finCarte = pm.card ? new Date(pm.card.exp_year, pm.card.exp_month, 0) : null;
    if (finCarte && finCarte < new Date("2026-10-05T00:00:00Z")) {
      return json({ erreur: "carte_expiree_avant_le_05_10", expiration: `${pm.card.exp_month}/${pm.card.exp_year}`, etapes }, 400);
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

    // ── Commissions : ce qui sera écrit ──────────────────────────────────
    const { data: modeles } = await supabase
      .from("commissions")
      .select("id, role, percentage, beneficiary_user_id, beneficiary_external, payment_id, status")
      .eq("sale_id", SALE_ID).eq("status", "pending");
    const roles = [...new Map((modeles ?? []).map((c: any) =>
      [c.role, { role: c.role, percentage: Number(c.percentage), beneficiary_user_id: c.beneficiary_user_id, beneficiary_external: c.beneficiary_external }],
    )).values()];

    const apercuCommissions = ECHEANCIER.map(([num, date, cents]) => ({
      echeance: num, date, montant: eur(cents),
      commissions: roles.map((r) => ({ role: r.role, taux: r.percentage, montant: eur(commissionCents(cents, r.percentage)) })),
    }));

    if (dryRun) {
      return json({
        dry_run: true, client: cust.name,
        echeancier_vise: apercuCommissions,
        stripe_vise: {
          trial_end: iso(TRIAL_END), nouveau_montant: eur(BASE_CENTS),
          centimes_residuels: EXTRA_CENTS, cancel_at: iso(CANCEL_AT),
          item_id: item.id, produit: item.price?.product,
        },
        etapes,
      });
    }

    // ── 4. Stripe : décalage + montant + fin, en UN SEUL appel ───────────
    // Atomique : pas d'état intermédiaire où l'ancre serait déplacée mais le
    // montant encore à 285,71 €.
    const maj = await stripeApi("POST", `subscriptions/${SUB_ID}`, {
      trial_end: TRIAL_END,
      cancel_at: CANCEL_AT,
      proration_behavior: "none",
      items: [{
        id: item.id,
        price_data: {
          currency: "eur",
          unit_amount: BASE_CENTS,
          product: item.price?.product,
          recurring: { interval: "month" },
        },
      }],
    });
    etapes.push({
      etape: "4_abonnement", statut: maj.status,
      trial_end: iso(maj.trial_end), fin_prevue: iso(maj.cancel_at),
      nouveau_montant: eur(maj.items?.data?.[0]?.price?.unit_amount ?? 0),
    });

    // ── 5. Les 6 centimes résiduels, sur la facture du 05/10 ─────────────
    const invItem = await stripeApi("POST", "invoiceitems", {
      customer: CUSTOMER, subscription: SUB_ID,
      amount: EXTRA_CENTS, currency: "eur",
      description: "Ajustement échéancier — centimes résiduels",
    });
    etapes.push({ etape: "5_centimes_residuels", id: invItem.id, montant: eur(EXTRA_CENTS) });

    // ── 6. Base : échéances ──────────────────────────────────────────────
    const parNumero = new Map(attentes.map((p: any) => [p.payment_number, p]));
    const echeancesEcrites: any[] = [];
    for (const [num, date, cents] of ECHEANCIER) {
      const existante = parNumero.get(num);
      const commun = {
        due_date: date, amount: eur(cents), total_payments: NB_TOTAL,
        status: "pending", updated_at: new Date().toISOString(),
        notes: `Échéancier recalé sur le 5 du mois et rééquilibré à ~250 € (03/09/2026). Abonnement ${SUB_ID} conservé.`,
      };
      if (existante) {
        const { data, error } = await supabase.from("payments").update(commun)
          .eq("id", existante.id).select("id, payment_number, due_date, amount").single();
        if (error) throw new Error(`Écriture échéance ${num} : ${error.message}`);
        echeancesEcrites.push({ ...data, action: "mise a jour" });
      } else {
        const { data, error } = await supabase.from("payments").insert({
          ...commun, sale_id: SALE_ID, contact_id: CONTACT_ID,
          payment_number: num, payment_method: "stripe", stripe_subscription_id: SUB_ID,
        }).select("id, payment_number, due_date, amount").single();
        if (error) throw new Error(`Création échéance ${num} : ${error.message}`);
        echeancesEcrites.push({ ...data, action: "creee" });
      }
    }
    // L'échéance déjà payée doit connaître le nouveau total, elle aussi.
    await supabase.from("payments").update({ total_payments: NB_TOTAL }).eq("sale_id", SALE_ID).eq("status", "paid");
    await supabase.from("sales").update({ mensualites: NB_TOTAL }).eq("id", SALE_ID);
    etapes.push({ etape: "6_echeances", lignes: echeancesEcrites, mensualites: `7 → ${NB_TOTAL}` });

    // ── 7. Base : commissions, au centime près ──────────────────────────
    // On repart des lignes en attente : celles qui existent sont recalculées,
    // et la nouvelle échéance reçoit son jeu complet.
    const parPaiement = new Map<string, any[]>();
    for (const c of (modeles ?? [])) {
      if (!parPaiement.has(c.payment_id)) parPaiement.set(c.payment_id, []);
      parPaiement.get(c.payment_id)!.push(c);
    }
    let recalculees = 0, creees = 0;
    for (const ligne of echeancesEcrites) {
      const cents = Math.round(Number(ligne.amount) * 100);
      const existantes = parPaiement.get(ligne.id) ?? [];
      for (const r of roles) {
        const montant = eur(commissionCents(cents, r.percentage));
        const dejaLa = existantes.find((c: any) => c.role === r.role);
        if (dejaLa) {
          const { error } = await supabase.from("commissions").update({ amount: montant }).eq("id", dejaLa.id);
          if (error) throw new Error(`Commission ${r.role} échéance ${ligne.payment_number} : ${error.message}`);
          recalculees++;
        } else {
          const { error } = await supabase.from("commissions").insert({
            sale_id: SALE_ID, payment_id: ligne.id, role: r.role,
            percentage: r.percentage, amount: montant, status: "pending",
            beneficiary_user_id: r.beneficiary_user_id, beneficiary_external: r.beneficiary_external,
          });
          if (error) throw new Error(`Création commission ${r.role} échéance ${ligne.payment_number} : ${error.message}`);
          creees++;
        }
      }
    }
    etapes.push({ etape: "7_commissions", recalculees, creees });

    // ── 8. Relecture ─────────────────────────────────────────────────────
    const relu = await stripeApi("GET", `subscriptions/${SUB_ID}`);
    return json({
      success: true, client: cust.name,
      abonnement_conserve: SUB_ID, statut: relu.status,
      prochain_prelevement: iso(relu.trial_end ?? relu.current_period_end),
      montant_mensuel: eur(relu.items?.data?.[0]?.price?.unit_amount ?? 0),
      fin_prevue: iso(relu.cancel_at),
      etapes,
    });
  } catch (e: any) {
    console.error("[reschedule-khady-day5]", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
