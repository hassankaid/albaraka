// ═══════════════════════════════════════════════════════════════════════════
// controle-echeanciers — tous les matins (tâche pg_cron `controle_echeanciers`)
//
// Vérifie, directement chez Stripe, que chaque échéancier en cours a bien un
// abonnement VIVANT derrière (essai, actif ou en relance). Sinon, alerte dans
// la cloche du CEO.
//
// Pourquoi (12/11/2026) : après une replanification, trois échéanciers
// attendaient un lien de re-paiement jamais utilisé. Ils restaient « en
// attente » dans la plateforme alors que plus rien n'était programmé chez
// Stripe, et l'échéance d'Imène Bachir du 10/11 n'est jamais partie. La même
// vérification, faite à la main sur les 63 échéanciers ce jour-là, est
// désormais automatique.
//
// Lecture seule chez Stripe. Une alerte par vente au plus tous les 3 jours.
// Délai de grâce de 48 h après une replanification (le client peut être en
// train d'utiliser son lien).
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLES = [Deno.env.get("STRIPE_SECRET_KEY") || "", Deno.env.get("STRIPE_SECRET_KEY_TEST") || ""].filter(Boolean);

const STATUTS_VIVANTS = ["trialing", "active", "past_due"];
const GRACE_MS = 48 * 3600 * 1000;
const TYPE = "echeancier_sans_prelevement";

async function statutAbonnement(subId: string): Promise<string | null> {
  for (const cle of CLES) {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, {
      headers: { Authorization: `Bearer ${cle}` },
    });
    if (res.ok) return (await res.json()).status as string;
  }
  return null; // introuvable avec les deux clés
}

const euros = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;
const dateFr = (d: string) => d.split("-").reverse().join("/");

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const maintenant = Date.now();

  // Toutes les échéances ouvertes (par tranches : le serveur plafonne à 1000 lignes).
  // deno-lint-ignore no-explicit-any
  const echeances: any[] = [];
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await supabase
      .from("payments")
      .select("id, sale_id, amount, due_date, status, created_at, stripe_subscription_id, sales!payments_sale_id_fkey!inner(id, contacts!sales_contact_id_fkey(full_name))")
      .in("status", ["pending", "late"])
      .order("due_date", { ascending: true })
      .order("id", { ascending: true })
      .range(debut, debut + 999);
    if (error) {
      console.error("[controle-echeanciers]", error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
    }
    echeances.push(...(data || []));
    if (!data || data.length < 1000) break;
  }

  // Regroupe par vente.
  const ventes = new Map<string, { client: string; prochaine: any; subs: Set<string>; recente: number }>();
  for (const e of echeances || []) {
    const v = ventes.get(e.sale_id) ?? {
      client: (e as any).sales?.contacts?.full_name ?? "Client",
      prochaine: e,
      subs: new Set<string>(),
      recente: 0,
    };
    if (e.stripe_subscription_id) v.subs.add(e.stripe_subscription_id);
    v.recente = Math.max(v.recente, Date.parse(e.created_at));
    ventes.set(e.sale_id, v);
  }

  const alertes: { sale_id: string; client: string; raison: string; prochaine: string; montant: number }[] = [];
  for (const [saleId, v] of ventes) {
    if (maintenant - v.recente < GRACE_MS) continue; // replanifiée il y a moins de 48 h
    let raison: string | null = null;
    if (v.subs.size === 0) {
      raison = "aucun abonnement Stripe rattaché (lien de re-paiement non utilisé ?)";
    } else {
      const statuts = await Promise.all([...v.subs].map((s) => statutAbonnement(s)));
      if (!statuts.some((s) => s && STATUTS_VIVANTS.includes(s))) {
        raison = `abonnement Stripe ${statuts.map((s) => s ?? "introuvable").join(", ")}`;
      }
    }
    if (raison) {
      alertes.push({
        sale_id: saleId,
        client: v.client,
        raison,
        prochaine: v.prochaine.due_date,
        montant: Number(v.prochaine.amount),
      });
    }
  }

  // Une notification par CEO et par vente, au plus tous les 3 jours.
  const { data: ceos } = await supabase.from("profiles").select("id").eq("role", "ceo");
  const depuis = new Date(maintenant - 3 * 24 * 3600 * 1000).toISOString();
  let envoyees = 0;
  for (const a of alertes) {
    for (const ceo of ceos || []) {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", ceo.id)
        .eq("type", TYPE)
        .eq("metadata->>sale_id", a.sale_id)
        .gte("created_at", depuis);
      if ((count ?? 0) > 0) continue;
      await supabase.from("notifications").insert({
        user_id: ceo.id,
        type: TYPE,
        title: `Aucun prélèvement programmé : ${a.client}`,
        body: `Prochaine échéance le ${dateFr(a.prochaine)} (${euros(a.montant)}) : ${a.raison}. Ouvre la vente pour la reprogrammer.`,
        link: "/payments",
        metadata: { sale_id: a.sale_id, raison: a.raison },
      });
      envoyees++;
    }
  }

  const resume = { ok: true, ventes_verifiees: ventes.size, alertes: alertes.length, notifications: envoyees, detail: alertes };
  console.log("[controle-echeanciers]", JSON.stringify(resume));
  return new Response(JSON.stringify(resume), { headers: { "Content-Type": "application/json" } });
});
