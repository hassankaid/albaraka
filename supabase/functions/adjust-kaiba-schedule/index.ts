// ═══════════════════════════════════════════════════════════════════════════
// adjust-kaiba-schedule — One-shot : remet en route la dernière échéance
// d'ENIS KAIBA, calée au 25/09/2026.
//
// Situation au 24/09/2026 :
//   Business Developer, 1 997 € en 12 fois. 11 encaissées (1 830,58 €).
//   Reste la 12e, 166,42 €. Sa facture du 07/09 est ouverte, l'abonnement
//   est en past_due, et Stripe a RENONCÉ : neuf tentatives, aucune suivante.
//   Plus rien ne se déclenchait tout seul.
//
// Ce que fait cette fonction, dans cet ordre :
//   1. VOID la facture en échec        → l'abonnement sort de past_due
//   2. Cale le prochain prélèvement au 25/09/2026, sans prorata
//   3. RELIT la facture que Stripe a préparée et refuse de continuer si un
//      prorata s'y est glissé, ou si le total n'est pas 166,42 € pile
//   4. Aligne l'échéance en base : 25/09, 166,42 €, en attente
//
// AUCUN ARGENT NE BOUGE AUJOURD'HUI. Le prélèvement a lieu demain, par
// l'abonnement. C'est ce qui distingue ce cas de celui de Chamassi.
//
// ⚠️ AUCUN PRORATA. `proration_behavior: "none"`. Déplacer la date de
// facturation d'un abonnement en cours de période pousse Stripe à calculer un
// crédit ou un complément au prorata des jours écoulés — le client verrait
// partir un montant que personne n'a décidé.
//
// ⚠️ LA DATE DE FIN FIXE PROVOQUAIT UN PRORATA, constaté au premier essai :
// Stripe sortait une facture de 68,04 € au lieu de 166,42 €.
//
// Elle était au 07/10. En calant le prélèvement au 25/09, la période facturée
// devenait 25/09 → 07/10 : douze jours, donc douze jours facturés. Une date de
// fin posée À L'INTÉRIEUR d'une période la tronque, et Stripe facture au
// prorata — quelle que soit la valeur de `proration_behavior`, qui ne gouverne
// que les ajustements de changement de tarif.
//
// `cancel_at_period_end` ne marche pas non plus ici, essayé aussi : pendant
// une période d'essai, « fin de période » désigne la fin de L'ESSAI, soit le
// 25/09. L'abonnement s'annulait donc la veille de facturer, et Stripe
// répondait « aucune facture à venir ».
//
// La seule construction qui facture un mois plein est donc : AUCUNE date de
// fin aujourd'hui. La période 25/09 → 25/10 est alors entière, et la facture
// sort à 166,42 €.
//
// L'arrêt se pose LE LENDEMAIN, une fois la facture émise : une date de fin
// posée après coup ne réécrit pas une facture déjà sortie. C'est l'objet de
// la tâche `kaiba_arret_abonnement`, programmée au 26/09 — sans elle,
// l'abonnement facturerait de nouveau le 25/10 une somme que personne ne
// doit. Elle ne fait qu'annuler : elle ne peut pas prélever.
//
// ⚠️ LA LIGNE EN BASE PORTE ENCORE LA FACTURE EN ÉCHEC et son paiement. On
// les efface : les laisser ferait référence à une facture annulée, et
// pourrait brouiller le rapprochement de la prochaine.
//
// Body : { confirmer: true }
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

// ─── Constantes du cas, relevées dans Stripe et en base le 24/09/2026 ──────
const SUB_ID = "sub_1SQuJOJX0OcQy7IOyQ85yZvL";
const FACTURE_EN_ECHEC = "in_1UD7CKJX0OcQy7IOB1Pqfcia"; // ROHPHRJ9-0011, 166,42 €
const SALE_ID = "6919b52a-5565-4e67-b5b2-11f34c2f4006";
const ECHEANCE = 12;

const CENTS_ATTENDUS = 16642; // 166,42 €
const DATE_PRELEVEMENT = "2026-09-25";
/** Midi UTC : évite tout glissement de date d'un fuseau à l'autre. */
const PROCHAIN_PRELEVEMENT = Math.floor(
  new Date(`${DATE_PRELEVEMENT}T12:00:00Z`).getTime() / 1000,
);

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
  const res = await fetch(`https://api.stripe.com/v1${chemin}`, {
    method: methode,
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    ...(methode === "POST" && params ? { body: aplatir(params).toString() } : {}),
  });
  const corps = await res.json();
  if (!res.ok) {
    throw new Error(`Stripe ${methode} ${chemin} → ${res.status} : ${JSON.stringify(corps?.error ?? corps)}`);
  }
  return corps as T;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  // ── Mode « arrêt » : appelé le 26/09 par la tâche kaiba_arret_abonnement ──
  //
  // L'abonnement n'a volontairement AUCUNE date de fin aujourd'hui : en poser
  // une aurait tronqué la période et fait facturer au prorata. Une fois la
  // facture du 25/09 émise, ce risque disparaît — une date posée après coup ne
  // réécrit pas une facture déjà sortie. C'est donc ici qu'on referme.
  //
  // Sans ce passage, l'abonnement facturerait de nouveau 166,42 € le 25/10,
  // somme que personne ne doit. Il ne fait qu'annuler : il ne peut pas prélever.
  if (body?.mode === "arret") {
    if (!STRIPE_KEY) return json({ error: "stripe_non_configure" }, 500);
    try {
      const sub = await stripe<any>(`/subscriptions/${SUB_ID}`, undefined, "GET");
      if (sub.status === "canceled") {
        return json({ ok: true, deja_arrete: true, statut: sub.status });
      }
      const maj = await stripe<any>(`/subscriptions/${SUB_ID}`, { cancel_at_period_end: true });
      return json({
        ok: true,
        statut: maj.status,
        arret_fin_de_periode: maj.cancel_at_period_end,
        fin: maj.cancel_at ?? maj.current_period_end,
      });
    } catch (e) {
      return json({ ok: false, erreur: String(e) }, 500);
    }
  }

  if (body?.confirmer !== true) {
    return json({
      error: "confirmation_requise",
      message: "Annule la facture en échec et programme un prélèvement de 166,42 € au 25/09/2026. Appeler avec { confirmer: true }.",
    }, 400);
  }
  if (!STRIPE_KEY) return json({ error: "stripe_non_configure" }, 500);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const journal: Record<string, unknown> = {};

  try {
    // ── 1. État de départ ────────────────────────────────────────────────
    const sub = await stripe<any>(`/subscriptions/${SUB_ID}`, undefined, "GET");
    journal.depart = {
      statut: sub.status,
      montant_cents: sub.items?.data?.[0]?.price?.unit_amount,
      fin_prevue: sub.cancel_at,
      periode_fin: sub.current_period_end,
    };

    // ── 2. La facture en échec ───────────────────────────────────────────
    const facture = await stripe<any>(`/invoices/${FACTURE_EN_ECHEC}`, undefined, "GET");
    if (facture.status === "open") {
      await stripe(`/invoices/${FACTURE_EN_ECHEC}/void`, {});
      journal.facture_en_echec = `annulée (void) — ${facture.attempt_count} tentatives infructueuses`;
    } else {
      journal.facture_en_echec = `déjà en « ${facture.status} », rien à faire`;
    }

    // ── 3. Le prélèvement, calé à demain ─────────────────────────────────
    // Deux appels : Stripe refuse `cancel_at` et `cancel_at_period_end`
    // ensemble, même vides. On efface toute date de fin, puis on cale la date.
    await stripe(`/subscriptions/${SUB_ID}`, { cancel_at_period_end: false });
    await stripe(`/subscriptions/${SUB_ID}`, { cancel_at: "" });
    const subMaj = await stripe<any>(`/subscriptions/${SUB_ID}`, {
      trial_end: PROCHAIN_PRELEVEMENT,
      proration_behavior: "none",
      metadata: { recalage: "2026-09-24", prelevement_prevu: DATE_PRELEVEMENT },
    });
    journal.abonnement = {
      id: subMaj.id,
      statut: subMaj.status,
      prochain_prelevement: subMaj.trial_end,
      fin_a_la_fin_de_periode: subMaj.cancel_at_period_end,
      fin_date_fixe: subMaj.cancel_at,
      rappel: "l'arrêt est posé le 26/09 par la tâche kaiba_arret_abonnement",
    };

    // ── 4. Contrôle : ce que Stripe prélèvera vraiment ───────────────────
    const apercu = await stripe<any>(`/invoices/upcoming?subscription=${SUB_ID}`, undefined, "GET");
    const lignes = (apercu.lines?.data ?? []).map((l: any) => ({
      description: l.description,
      montant_cents: l.amount,
      prorata: l.proration === true,
    }));
    journal.prochaine_facture = {
      total_cents: apercu.total,
      date: apercu.next_payment_attempt ?? apercu.period_end,
      lignes,
    };
    const aDuProrata = lignes.some((l: any) => l.prorata);
    if (aDuProrata || apercu.total !== CENTS_ATTENDUS) {
      return json({
        ok: false,
        etape: "controle_prorata",
        message: aDuProrata
          ? "Stripe a inséré une ligne de prorata dans la prochaine facture. La base n'a PAS été modifiée."
          : `La prochaine facture sort à ${apercu.total} centimes au lieu de ${CENTS_ATTENDUS}. La base n'a PAS été modifiée.`,
        journal,
      }, 409);
    }

    // ── 5. L'échéance en base ────────────────────────────────────────────
    // On efface la facture en échec et son paiement : les garder ferait
    // référence à un document annulé, et pourrait brouiller le rapprochement
    // de la prochaine facture par le webhook.
    const { error } = await supabase
      .from("payments")
      .update({
        amount: CENTS_ATTENDUS / 100,
        due_date: DATE_PRELEVEMENT,
        status: "pending",
        stripe_invoice_id: null,
        stripe_payment_intent_id: null,
      })
      .eq("sale_id", SALE_ID)
      .eq("payment_number", ECHEANCE);
    if (error) throw new Error(`mise à jour de l'échéance : ${error.message}`);

    await supabase.from("sales").update({ payment_status: "in_progress" }).eq("id", SALE_ID);

    // ── 6. Le compte doit tomber juste ───────────────────────────────────
    const { data: lignesBase } = await supabase
      .from("payments").select("amount, status").eq("sale_id", SALE_ID);
    const somme = (lignesBase ?? []).reduce((s: number, l: any) => s + Number(l.amount), 0);
    const encaisse = (lignesBase ?? []).filter((l: any) => l.status === "paid")
      .reduce((s: number, l: any) => s + Number(l.amount), 0);
    journal.controle = {
      total_plan: Math.round(somme * 100) / 100,
      attendu: 1997,
      encaisse: Math.round(encaisse * 100) / 100,
      reste: Math.round((somme - encaisse) * 100) / 100,
    };

    return json({ ok: true, journal });
  } catch (e) {
    return json({ ok: false, erreur: String(e), journal }, 500);
  }
});
