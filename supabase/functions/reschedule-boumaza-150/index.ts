// ═══════════════════════════════════════════════════════════════════════════
// reschedule-boumaza-150 — One-shot : NAIMA BOUMAZA (naima.boumaza@yahoo.fr)
//
// Business Developer, 2 000 € en 8 x 250 €. Cinq échéances encaissées, 750 €
// restants. On les étale sur cinq mensualités de 150 €.
//
//   AVANT : 3 x 250 € — 06/09, 06/10, 06/11
//   APRÈS : 5 x 150 € — 06/09, 06/10, 06/11, 06/12/2026, 06/01/2027
//
// Le plan passe de 8 à 10 mensualités. Le 6 du mois est conservé : c'est déjà
// l'ancre de facturation, il n'y a donc PAS de `trial_end` ici. Le prélèvement
// de demain est justement la mensualité de septembre demandée — le décaler
// reviendrait à sauter un mois.
//
// ⚠️ URGENCE : la facture du 06/09 part à 12h35 UTC, pour 250 €. Sans cette
// opération passée avant, la cliente est prélevée de l'ancien montant.
//
// ⚠️ LE PRIX N'EST PAS LE MONTANT PRÉLEVÉ. Un coupon ETHIC20 de −20 %
// (`duration: forever`) s'applique à cet abonnement : le catalogue affiche
// 312,50 € et la cliente paie 250 €. Pour qu'elle paie 150 € NET, le prix doit
// donc être posé à 187,50 € — poser 150 € la ferait prélever de 120 €.
// La fonction VÉRIFIE le taux de remise avant d'écrire, et refuse si ce n'est
// plus −20 % : le calcul serait faux sans que rien ne le signale.
//
// ⚠️ LE PIÈGE DES DÉCLENCHEURS. Les montants changent, donc
// `trigger_update_commission_on_payment_amount` va appeler
// `rebalance_commission_group`, qui recalcule TOUTES les commissions de la
// vente — y compris les 10 lignes déjà PAYÉES — au prorata des montants du
// moment. On laisse faire, puis on RÉÉCRIT tout à la fin en relisant les
// montants réels. Un UPDATE sur `commissions` ne redéclenche rien.
//
// Commissions attendues (25 % par échéance : agence 20 %, setter 5 %) :
//   échéances 1-5 à 250 € → 50,00 + 12,50
//   échéances 6-10 à 150 € → 30,00 +  7,50
//   totaux : agence 400,00 € (20 % de 2 000), setter 100,00 € (5 %). Sans dérive.
//
// À SAVOIR POUR LA SUITE : sa Visa ****6452 expire en 12/2026. Les quatre
// premières échéances passent, la dernière du 06/01/2027 tombe APRÈS
// l'expiration. Il faudra lui envoyer un lien de mise à jour de carte d'ici là.
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

const EMAIL      = "naima.boumaza@yahoo.fr";
const CUSTOMER   = "cus_UHkxoO73ZGNZYW";
const SUB_ID     = "sub_1TJBRHJX0OcQy7IOiB2djbdL";
const SALE_ID    = "1ca8b02d-ebbc-426d-96b1-09d7a2d617b8";
const CONTACT_ID = "320bfd7b-367b-401b-bfe8-705377378b48";

// Ce que la cliente doit réellement payer, remise déduite.
const NET_CENTS = 15_000; // 150,00 €
// Après le prélèvement du 06/01/2027, avant celui du 06/02 qui n'aura pas lieu.
const CANCEL_AT = Math.floor(new Date("2027-01-20T12:00:00Z").getTime() / 1000);

const ECHEANCIER: Array<[number, string]> = [
  [6,  "2026-09-06"],
  [7,  "2026-10-06"],
  [8,  "2026-11-06"],
  [9,  "2026-12-06"], // nouvelle
  [10, "2027-01-06"], // nouvelle
];
const NB_TOTAL = 10;

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
      .from("payments").select("id, payment_number, amount, status, due_date")
      .eq("sale_id", SALE_ID).order("payment_number");

    const payees    = (echeances ?? []).filter((p: any) => p.status === "paid");
    const restantes = (echeances ?? []).filter((p: any) => p.status !== "paid");
    if (vente?.mensualites !== 8 || payees.length !== 5 || restantes.length !== 3) {
      return json({
        erreur: "etat_de_depart_inattendu",
        message: "Attendu : 8 mensualités, 5 payées, 3 restantes. L'opération a peut-être déjà été passée.",
        constate: { mensualites: vente?.mensualites, payees: payees.length, restantes: restantes.length },
      }, 409);
    }
    const encaisseCents = payees.reduce((s: number, p: any) => s + Math.round(Number(p.amount) * 100), 0);
    const resteCents = Math.round(Number(vente.amount_ht) * 100) - encaisseCents;
    if (resteCents !== NET_CENTS * ECHEANCIER.length) {
      return json({
        erreur: "reste_du_inattendu",
        attendu: eur(NET_CENTS * ECHEANCIER.length), constate: eur(resteCents),
      }, 409);
    }
    etapes.push({ etape: "2_etat_de_depart", encaisse: eur(encaisseCents), reste_a_encaisser: eur(resteCents) });

    // ── 3. LE CALCUL QUI COMPTE : quel prix pour 150 € net ? ─────────────
    // Le prix catalogue n'est pas ce que la cliente paie. On repart du taux de
    // remise RÉEL, lu à l'instant, plutôt que d'un montant écrit en dur.
    const sub = await stripeApi("GET", `subscriptions/${SUB_ID}`);
    const item = sub.items?.data?.[0];
    if (!item) return json({ erreur: "abonnement_sans_item", etapes }, 500);

    const coupon = sub.discount?.coupon;
    const pctOff = Number(coupon?.percent_off ?? 0);
    if (coupon && coupon.amount_off) {
      return json({ erreur: "remise_en_montant_fixe_non_geree", detail: coupon }, 409);
    }
    // brut x (1 - pct/100) = net  →  brut = net / (1 - pct/100)
    const brutCents = Math.round(NET_CENTS / (1 - pctOff / 100));
    const netVerif = Math.round(brutCents * (1 - pctOff / 100));
    if (netVerif !== NET_CENTS) {
      return json({
        erreur: "le_prix_ne_retombe_pas_sur_le_net_voulu",
        remise_pct: pctOff, brut_calcule: eur(brutCents), net_obtenu: eur(netVerif), net_voulu: eur(NET_CENTS),
      }, 409);
    }
    etapes.push({
      etape: "3_calcul_du_prix",
      remise: coupon ? `${coupon.name} -${pctOff}% (${coupon.duration})` : "aucune",
      prix_catalogue_avant: eur(item.price?.unit_amount ?? 0),
      prix_catalogue_apres: eur(brutCents),
      montant_preleve_attendu: eur(NET_CENTS),
    });

    // ── 4. Garde-fou : la carte ──────────────────────────────────────────
    let pmId: string | null = typeof sub.default_payment_method === "string" ? sub.default_payment_method : null;
    if (!pmId) pmId = cust.invoice_settings?.default_payment_method ?? null;
    if (!pmId) pmId = (await stripeApi("GET", `customers/${CUSTOMER}/payment_methods?limit=1`)).data?.[0]?.id ?? null;
    if (!pmId) return json({ erreur: "aucun_moyen_de_paiement", etapes }, 400);
    const pm = await stripeApi("GET", `payment_methods/${pmId}`);
    const finCarte = pm.card ? new Date(pm.card.exp_year, pm.card.exp_month, 0) : null;
    // On NE BLOQUE PAS sur l'expiration : elle tombe entre l'avant-dernière et
    // la dernière échéance. Bloquer priverait la cliente des quatre premières.
    // On le remonte pour qu'un lien de mise à jour de carte parte à temps.
    const derniereEcheance = new Date("2027-01-06T00:00:00Z");
    etapes.push({
      etape: "4_moyen_de_paiement",
      carte: pm.card?.last4, expiration: pm.card ? `${pm.card.exp_month}/${pm.card.exp_year}` : null,
      couvre_toutes_les_echeances: finCarte ? finCarte >= derniereEcheance : null,
      alerte: finCarte && finCarte < derniereEcheance
        ? `La carte expire avant l'échéance du 06/01/2027 — prévoir un lien de mise à jour.`
        : null,
    });

    if (dryRun) {
      let prochaine: any = null;
      try {
        const up = await stripeApi("GET", `invoices/upcoming?subscription=${SUB_ID}`);
        prochaine = { montant_actuel: eur(up.amount_due), tentative_le: iso(up.next_payment_attempt) };
      } catch (e: any) { prochaine = { indisponible: e?.message }; }
      return json({
        dry_run: true, client: cust.name,
        echeancier_vise: ECHEANCIER.map(([n, d]) => ({ echeance: n, date: d, montant: eur(NET_CENTS) })),
        stripe_vise: {
          prochaine_facture_sans_action: prochaine,
          nouveau_prix_catalogue: eur(brutCents),
          cancel_at_avant: iso(sub.cancel_at), cancel_at_apres: iso(CANCEL_AT),
          note: "Pas de trial_end : le 6 est deja l'ancre, le prelevement de demain EST la mensualite de septembre.",
        },
        etapes,
      });
    }

    // ── 5. Stripe : nouveau prix + fin, en un seul appel ─────────────────
    const maj = await stripeApi("POST", `subscriptions/${SUB_ID}`, {
      cancel_at: CANCEL_AT,
      proration_behavior: "none",
      items: [{
        id: item.id,
        price_data: {
          currency: "eur", unit_amount: brutCents,
          product: item.price?.product, recurring: { interval: "month" },
        },
      }],
    });
    etapes.push({
      etape: "5_abonnement", statut: maj.status,
      nouveau_prix_catalogue: eur(maj.items?.data?.[0]?.price?.unit_amount ?? 0),
      fin_prevue: iso(maj.cancel_at),
      fin_posee_par_cette_operation: !sub.cancel_at,
    });

    // ── 6. Contrôle immédiat : ce que Stripe facturera vraiment demain ───
    // C'est la seule preuve qui vaille. Si la remise n'était pas appliquée au
    // nouveau prix, on le voit ICI plutôt que sur le relevé de la cliente.
    let controle: any;
    try {
      const up = await stripeApi("GET", `invoices/upcoming?subscription=${SUB_ID}`);
      controle = {
        montant_a_payer: eur(up.amount_due),
        conforme: Math.round(up.amount_due) === NET_CENTS,
        tentative_le: iso(up.next_payment_attempt),
      };
    } catch (e: any) { controle = { indisponible: e?.message ?? String(e) }; }
    etapes.push({ etape: "6_facture_previsionnelle", ...controle });

    // ── 7. Base : échéances ──────────────────────────────────────────────
    const parNumero = new Map(restantes.map((p: any) => [p.payment_number, p]));
    const lignes: any[] = [];
    for (const [num, date] of ECHEANCIER) {
      const existante = parNumero.get(num);
      const commun = {
        due_date: date, amount: eur(NET_CENTS), total_payments: NB_TOTAL,
        status: "pending", updated_at: new Date().toISOString(),
        notes: `Solde de 750 € réétalé en 5 x 150 € (05/09/2026). Abonnement ${SUB_ID} conservé, prix catalogue porté à ${eur(brutCents)} € pour donner ${eur(NET_CENTS)} € remise déduite.`,
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
    etapes.push({ etape: "7_echeances", lignes, mensualites: `8 → ${NB_TOTAL}` });

    // ── 8. Commissions : réécriture INTÉGRALE, dernier mot sur le trigger ─
    const { data: apres } = await supabase
      .from("payments").select("id, payment_number, amount, status")
      .eq("sale_id", SALE_ID).order("payment_number");
    const { data: commissionsApres } = await supabase
      .from("commissions").select("id, role, percentage, payment_id, amount, status, beneficiary_user_id, beneficiary_external")
      .eq("sale_id", SALE_ID);

    const roles = [...new Map((commissionsApres ?? []).map((c: any) =>
      [c.role, { role: c.role, percentage: Number(c.percentage), beneficiary_user_id: c.beneficiary_user_id, beneficiary_external: c.beneficiary_external }],
    )).values()];
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
    etapes.push({ etape: "8_commissions", corrigees, creees, inchangees, detail_corrections: reparees });

    // ── 9. Relecture ─────────────────────────────────────────────────────
    const relu = await stripeApi("GET", `subscriptions/${SUB_ID}`);
    return json({
      success: true, client: cust.name,
      abonnement_conserve: SUB_ID, statut: relu.status,
      prochain_prelevement: iso(relu.current_period_end),
      montant_preleve: eur(NET_CENTS),
      prix_catalogue: eur(relu.items?.data?.[0]?.price?.unit_amount ?? 0),
      fin_prevue: iso(relu.cancel_at),
      facture_de_demain_conforme: controle?.conforme ?? null,
      etapes,
    });
  } catch (e: any) {
    console.error("[reschedule-boumaza-150]", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
