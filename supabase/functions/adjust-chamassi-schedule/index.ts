// ═══════════════════════════════════════════════════════════════════════════
// adjust-chamassi-schedule — One-shot : solde le plan de SAIDINA CHAMASSI en
// 8 mensualités, SANS résilier l'abonnement existant.
//
// Situation au 23/09/2026 :
//   Vente 2 000 € en 9 fois, 871,42 € encaissés sur 4 échéances.
//   Reste 1 128,58 €. Abonnement sub_1TuVea… en past_due, facture de
//   septembre (225,71 €) ouverte depuis le 18/09.
//
// Ce que fait cette fonction, dans cet ordre :
//   1. VOID la facture de septembre           → sort l'abonnement de past_due
//   2. Repose l'abonnement à 141,07 €/mois, prochain prélèvement le 24/10,
//      puis le 24 de chaque mois, arrêt automatique après le 24/04/2027
//   3. RELIT la facture que Stripe a préparée et refuse de continuer si un
//      prorata s'y est glissé, ou si le total n'est pas 141,07 € pile
//   4. Prélève 141,09 € TOUT DE SUITE         → hors abonnement, sur la carte
//   5. Réécrit l'échéancier en base : 12 lignes (4 payées + 8 nouvelles)
//
// L'encaissement vient EN DERNIER, après tous les contrôles : c'est la seule
// opération irréversible, et un prorata inattendu doit pouvoir l'empêcher.
//
// ⚠️ AUCUN PRORATA. `proration_behavior: "none"` sur chaque écriture Stripe.
// Changer le prix et la date d'un abonnement en cours de période pousse Stripe
// à calculer de lui-même un crédit ou un complément au prorata des jours
// écoulés : le client verrait alors partir un montant que personne n'a décidé.
// L'abonnement garde UN SEUL montant, 141,07 €, de bout en bout.
//
// ⚠️ LES 2 CENTIMES SONT SUR LE PRÉLÈVEMENT D'AUJOURD'HUI, pas sur le dernier.
// 1 128,58 / 8 ne tombe pas juste. Les poser sur la dernière échéance aurait
// demandé de programmer une écriture Stripe pour avril 2027 — une pièce mobile
// de sept mois pour deux centimes, ou d'encadrer l'abonnement dans un
// échéancier à phases, c'est-à-dire exactement la mécanique qu'on évite en ne
// le résiliant pas. Aujourd'hui, le montant est sous notre contrôle direct :
// 141,09 € une fois, puis 141,07 € sept fois. Total identique au centime.
//
// ⚠️ L'ANCIENNE DATE DE FIN ÉTAIT AU 18/02/2027. Telle quelle, elle coupait
// l'abonnement après le prélèvement de février : trois échéances, 423 €,
// ne seraient jamais parties. On la repousse au 25/04/2027.
//
// Si le prélèvement échoue, l'abonnement est déjà correctement reposé et
// l'échéancier en base n'a pas bougé : il suffit de réessayer l'encaissement,
// sans rien refaire d'autre.
//
// Body : { confirmer: true }  — garde-fou contre un appel accidentel.
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Constantes du cas, relevées dans Stripe et en base le 23/09/2026 ──────
const SUB_ID = "sub_1TuVeaJX0OcQy7IOOblBTDpL";
const FACTURE_SEPTEMBRE = "in_1UH0TAJX0OcQy7IOr6P0reEN"; // LMHJLOHF-0008, 225,71 €
const CUSTOMER_ID = "cus_UUzJTW9vrjuMv4";
const SALE_ID = "8f5ff620-6992-4459-8e1e-3475c3957ac6";
const CONTACT_ID = "bdb1dd92-bf60-4e11-a08d-69a13ca98f1d";

const CENTS_AUJOURDHUI = 14109; // 141,09 € — absorbe les 2 centimes d'arrondi
const CENTS_MENSUALITE = 14107; // 141,07 € — les sept suivantes

/** Le 24 de chaque mois à 12h UTC : midi évite tout glissement de date. */
const ech = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
const PROCHAIN_PRELEVEMENT = ech("2026-10-24T12:00:00Z");
// Après le prélèvement du 24/04/2027, avant celui du 24/05 qui n'existe pas.
const FIN_ABONNEMENT = ech("2027-04-25T12:00:00Z");

/** Les huit échéances, telles qu'elles doivent finir en base. */
const NOUVELLES_ECHEANCES = [
  { numero: 5, date: "2026-09-23", cents: CENTS_AUJOURDHUI, payee: true },
  { numero: 6, date: "2026-10-24", cents: CENTS_MENSUALITE, payee: false },
  { numero: 7, date: "2026-11-24", cents: CENTS_MENSUALITE, payee: false },
  { numero: 8, date: "2026-12-24", cents: CENTS_MENSUALITE, payee: false },
  { numero: 9, date: "2027-01-24", cents: CENTS_MENSUALITE, payee: false },
  { numero: 10, date: "2027-02-24", cents: CENTS_MENSUALITE, payee: false },
  { numero: 11, date: "2027-03-24", cents: CENTS_MENSUALITE, payee: false },
  { numero: 12, date: "2027-04-24", cents: CENTS_MENSUALITE, payee: false },
];
const TOTAL_ECHEANCES = 12;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function aplatir(params: Record<string, unknown>): URLSearchParams {
  const out = new URLSearchParams();
  const marcher = (valeur: unknown, prefixe: string) => {
    if (valeur === null || valeur === undefined) return;
    if (Array.isArray(valeur)) {
      valeur.forEach((v, i) => marcher(v, `${prefixe}[${i}]`));
    } else if (typeof valeur === "object") {
      for (const [k, v] of Object.entries(valeur as Record<string, unknown>)) {
        marcher(v, prefixe ? `${prefixe}[${k}]` : k);
      }
    } else {
      out.append(prefixe, String(valeur));
    }
  };
  marcher(params, "");
  return out;
}

async function stripe<T>(
  chemin: string,
  params?: Record<string, unknown>,
  methode: "GET" | "POST" = "POST",
): Promise<T> {
  const url = `https://api.stripe.com/v1${chemin}`;
  const init: RequestInit = {
    method: methode,
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  if (methode === "POST" && params) init.body = aplatir(params).toString();
  const res = await fetch(url, init);
  const corps = await res.json();
  if (!res.ok) {
    throw new Error(`Stripe ${methode} ${chemin} → ${res.status} : ${JSON.stringify(corps?.error ?? corps)}`);
  }
  return corps as T;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  if (body?.confirmer !== true) {
    return json({
      error: "confirmation_requise",
      message: "Cette opération prélève 141,09 € sur la carte du client. Appeler avec { confirmer: true }.",
    }, 400);
  }
  if (!STRIPE_KEY) return json({ error: "stripe_non_configure" }, 500);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const journal: Record<string, unknown> = {};

  try {
    // ── 1. État de départ ────────────────────────────────────────────────
    const sub = await stripe<any>(
      `/subscriptions/${SUB_ID}?expand[]=default_payment_method`, undefined, "GET",
    );
    const itemId = sub.items?.data?.[0]?.id;
    const produitId = sub.items?.data?.[0]?.price?.product;
    if (!itemId || !produitId) throw new Error("item ou produit introuvable sur l'abonnement");

    // La carte : celle de l'abonnement, sinon celle par défaut du client.
    let carte = sub.default_payment_method?.id ?? sub.default_payment_method ?? null;
    if (!carte) {
      const client = await stripe<any>(`/customers/${CUSTOMER_ID}`, undefined, "GET");
      carte = client.invoice_settings?.default_payment_method ?? client.default_source ?? null;
    }
    if (!carte) throw new Error("aucune carte enregistrée : impossible de prélever hors session");

    journal.depart = {
      statut: sub.status,
      montant_actuel_cents: sub.items?.data?.[0]?.price?.unit_amount,
      fin_prevue: sub.cancel_at,
      carte,
    };

    // ── 2. La facture de septembre ───────────────────────────────────────
    const facture = await stripe<any>(`/invoices/${FACTURE_SEPTEMBRE}`, undefined, "GET");
    if (facture.status === "open") {
      await stripe(`/invoices/${FACTURE_SEPTEMBRE}/void`, {});
      journal.facture_septembre = "annulée (void)";
    } else {
      journal.facture_septembre = `déjà en « ${facture.status} », rien à faire`;
    }

    // ── 3. Le nouveau tarif ──────────────────────────────────────────────
    const prix = await stripe<any>("/prices", {
      currency: "eur",
      unit_amount: CENTS_MENSUALITE,
      recurring: { interval: "month" },
      product: produitId,
      nickname: "PASS AL BARAKA — 141,07 €/mois (réétalement 09/2026)",
    });

    // ── 4. L'abonnement, modifié et non résilié ──────────────────────────
    // `trial_end` déplace le prochain prélèvement au 24/10 ET recale l'ancre
    // de facturation sur le 24. `proration_behavior: "none"` interdit à Stripe
    // d'inventer un crédit ou un complément au prorata des jours écoulés.
    const subMaj = await stripe<any>(`/subscriptions/${SUB_ID}`, {
      items: [{ id: itemId, price: prix.id }],
      proration_behavior: "none",
      trial_end: PROCHAIN_PRELEVEMENT,
      // Stripe refuse `cancel_at` et `cancel_at_period_end` ensemble : la date
      // exacte est ce qui compte ici, l'autre n'aurait rien apporté.
      cancel_at: FIN_ABONNEMENT,
      metadata: { reetalement: "2026-09-23", echeances: "8", plan: "141.09 + 7 x 141.07" },
    });
    journal.abonnement = {
      id: subMaj.id,
      statut: subMaj.status,
      nouveau_montant_cents: subMaj.items?.data?.[0]?.price?.unit_amount,
      prochain_prelevement: subMaj.trial_end,
      fin: subMaj.cancel_at,
    };

    // ── 5. Contrôle du prorata, AVANT d'encaisser quoi que ce soit ───────
    // On ne se fie pas à ce qu'on vient d'écrire : on lit la facture que
    // Stripe a préparée. Si une ligne de prorata s'y est glissée, ou si le
    // total n'est pas exactement 141,07 €, on s'arrête ici — aucun argent
    // n'a encore bougé, et l'abonnement se corrige à tête reposée.
    const apercu = await stripe<any>(`/invoices/upcoming?subscription=${SUB_ID}`, undefined, "GET");
    const lignes_apercu = (apercu.lines?.data ?? []).map((l: any) => ({
      description: l.description,
      montant_cents: l.amount,
      prorata: l.proration === true,
    }));
    journal.prochaine_facture = {
      total_cents: apercu.total,
      date: apercu.next_payment_attempt ?? apercu.period_end,
      lignes: lignes_apercu,
    };
    const aDuProrata = lignes_apercu.some((l: any) => l.prorata);
    if (aDuProrata || apercu.total !== CENTS_MENSUALITE) {
      return json({
        ok: false,
        etape: "controle_prorata",
        message: aDuProrata
          ? "Stripe a inséré une ligne de prorata dans la prochaine facture. Rien n'a été encaissé."
          : `La prochaine facture sort à ${apercu.total} centimes au lieu de ${CENTS_MENSUALITE}. Rien n'a été encaissé.`,
        journal,
      }, 409);
    }

    // ── 6. Le prélèvement immédiat ───────────────────────────────────────
    // Hors abonnement : c'est le seul moyen d'encaisser aujourd'hui sans
    // décaler le cycle, et de maîtriser le montant au centime. C'est la
    // SEULE opération irréversible de toute la fonction, d'où sa place ici,
    // après tous les contrôles.
    const pi = await stripe<any>("/payment_intents", {
      amount: CENTS_AUJOURDHUI,
      currency: "eur",
      customer: CUSTOMER_ID,
      payment_method: carte,
      off_session: true,
      confirm: true,
      description: "PASS AL BARAKA — échéance 5/12 (réétalement du 23/09/2026)",
      metadata: { sale_id: SALE_ID, payment_number: "5", source: "adjust-chamassi-schedule" },
    });
    if (pi.status !== "succeeded") {
      // L'abonnement est déjà correctement reposé : il ne reste qu'à
      // réessayer ce prélèvement, sans rien refaire d'autre.
      return json({
        ok: false,
        etape: "prelevement_immediat",
        statut_stripe: pi.status,
        message: "Le prélèvement n'est pas passé. L'abonnement est déjà reposé à 141,07 € au 24/10 ; l'échéancier en base n'a PAS été réécrit.",
        payment_intent: pi.id,
        journal,
      }, 402);
    }
    journal.prelevement_immediat = { id: pi.id, montant_cents: pi.amount, statut: pi.status };

    // ── 7. L'échéancier en base ──────────────────────────────────────────
    const { data: lignes } = await supabase
      .from("payments")
      .select("id, payment_number, status")
      .eq("sale_id", SALE_ID)
      .order("payment_number");
    const parNumero = new Map<number, { id: string; status: string }>(
      (lignes ?? []).map((l: any) => [l.payment_number, { id: l.id, status: l.status }]),
    );

    const ecrites: unknown[] = [];
    for (const e of NOUVELLES_ECHEANCES) {
      const commun = {
        amount: e.cents / 100,
        due_date: e.date,
        total_payments: TOTAL_ECHEANCES,
        status: e.payee ? "paid" : "pending",
        paid_at: e.payee ? e.date : null,
        payment_method: "stripe",
        stripe_subscription_id: SUB_ID,
        ...(e.payee ? { stripe_payment_intent_id: pi.id, stripe_invoice_id: null } : {}),
      };
      const existante = parNumero.get(e.numero);
      if (existante) {
        const { error } = await supabase.from("payments").update(commun).eq("id", existante.id);
        if (error) throw new Error(`maj échéance ${e.numero} : ${error.message}`);
        ecrites.push({ numero: e.numero, action: "mise à jour" });
      } else {
        const { error } = await supabase.from("payments").insert({
          ...commun,
          sale_id: SALE_ID,
          contact_id: CONTACT_ID,
          payment_number: e.numero,
        });
        if (error) throw new Error(`création échéance ${e.numero} : ${error.message}`);
        ecrites.push({ numero: e.numero, action: "créée" });
      }
    }

    // Les quatre déjà payées doivent annoncer le bon dénominateur.
    await supabase
      .from("payments")
      .update({ total_payments: TOTAL_ECHEANCES })
      .eq("sale_id", SALE_ID)
      .lte("payment_number", 4);

    await supabase.from("sales").update({
      mensualites: TOTAL_ECHEANCES,
      payment_status: "in_progress",
    }).eq("id", SALE_ID);

    journal.echeancier = ecrites;

    // ── 8. Le compte doit tomber juste ───────────────────────────────────
    const { data: total } = await supabase
      .from("payments")
      .select("amount, status")
      .eq("sale_id", SALE_ID);
    const somme = (total ?? []).reduce((s: number, l: any) => s + Number(l.amount), 0);
    const encaisse = (total ?? [])
      .filter((l: any) => l.status === "paid")
      .reduce((s: number, l: any) => s + Number(l.amount), 0);
    journal.controle = {
      total_echeancier: Math.round(somme * 100) / 100,
      attendu: 2000,
      encaisse: Math.round(encaisse * 100) / 100,
      reste: Math.round((somme - encaisse) * 100) / 100,
    };

    return json({ ok: true, journal });
  } catch (e) {
    return json({ ok: false, erreur: String(e), journal }, 500);
  }
});
