// ─────────────────────────────────────────────────────────────────────────
// rappel-prelevement — email 3 jours avant chaque prélèvement automatique.
//
// Demande de Hassan le 28/09/2026. Texte validé le même jour : date du
// prélèvement, et compte à approvisionner DÈS LA VEILLE. On ne parle ni de
// « dans 3 jours » ni d'heure : l'heure de débit varie d'un abonnement à
// l'autre (constaté : vers 2 h pour la plupart, mais pas tous).
//
// POST { mode, date?, to? }   — en-tête `x-jeton-interne` obligatoire
//   mode "apercu" : ce qui serait envoyé pour `date` (défaut : J+3 à Paris),
//                   et les anomalies. N'envoie rien, n'écrit rien.
//   mode "test"   : construit le rappel du premier client concerné et l'envoie
//                   à `to`, objet préfixé [TEST]. N'écrit rien.
//   mode "envoi"  : envoie les rappels du jour (appelé par pg_cron à 10 h).
//
// ⚠️ ENVOI SEULEMENT SI LA PLATEFORME ET STRIPE SONT D'ACCORD.
//   - échéance « pending » en base ET renouvellement Stripe le même jour →
//     rappel, avec le montant que STRIPE va prélever (remises comprises) ;
//   - base seule, ou Stripe seul → pas d'email, anomalie consignée dans
//     `rappels_prelevement`. « Stripe seul » est l'abonnement que la
//     plateforme croit soldé et qui s'apprête pourtant à prélever.
//
// ⚠️ PROTÉGÉE PAR JETON, pas par JWT : pg_cron n'a pas de session. Le jeton
// vit dans `secrets_internes` (aucune politique RLS : service_role seul). Sans
// lui, cette fonction exposerait des montants et des adresses de clients.
// ─────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  construireEmail,
  decaler,
  euros,
  jourParis,
  libelleOffre,
  masquer,
  prenomDe,
  type Rappel,
} from "./email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const FROM = "AL BARAKA <noreply@albarakaecosysteme.com>";
// Réponses vers la boîte de Sidali (30/09/2026) : contact@albarakaecosysteme.com
// ne reçoit rien (aucun MX), et ce mail invite à « envoyer un message ».
const REPLY_TO = ["sidali@albarakaecosysteme.com"];
const DELAI_JOURS = 3;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

// ── Stripe ────────────────────────────────────────────────────────────────

async function stripe(chemin: string): Promise<any> {
  const r = await fetch(`https://api.stripe.com/v1/${chemin}`, { headers: { Authorization: `Bearer ${STRIPE_KEY}` } });
  const b = await r.json();
  if (!r.ok) throw new Error(`Stripe ${chemin} ${r.status}: ${b?.error?.message ?? "erreur"}`);
  return b;
}

/** Tous les abonnements d'un statut, page par page (100 par page). */
async function abonnements(statut: string): Promise<any[]> {
  const tous: any[] = [];
  let apres = "";
  for (let i = 0; i < 50; i++) {
    const page = await stripe(
      `subscriptions?status=${statut}&limit=100&expand[]=data.default_payment_method${apres ? `&starting_after=${apres}` : ""}`,
    );
    tous.push(...page.data);
    if (!page.has_more) break;
    apres = page.data[page.data.length - 1].id;
  }
  return tous;
}

/** Fin de la période en cours : là où Stripe créera la prochaine facture. */
function finDePeriode(sub: any): number | null {
  if (sub.status === "trialing" && sub.trial_end) return sub.trial_end;
  return sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;
}

async function derniersChiffresCarte(sub: any): Promise<string | null> {
  const pm = sub.default_payment_method;
  if (pm && typeof pm === "object" && pm.card?.last4) return pm.card.last4;
  try {
    const cust = await stripe(`customers/${sub.customer}?expand[]=invoice_settings.default_payment_method`);
    return cust?.invoice_settings?.default_payment_method?.card?.last4 ?? null;
  } catch {
    return null;
  }
}

// ── Qui reçoit quoi ───────────────────────────────────────────────────────

interface Decision {
  sub: string;
  statut: "envoyer" | "anomalie" | "ignore";
  motif: string;
  rappel?: Rappel;
  payment_id?: string;
  contact_id?: string;
}

async function decider(cible: string, sb: any): Promise<Decision[]> {
  // 1) Ce que la plateforme attend ce jour-là.
  const { data: echeances, error } = await sb
    .from("payments")
    .select("id, contact_id, amount, due_date, payment_number, total_payments, stripe_subscription_id, contacts(email, full_name), sales(product)")
    .eq("status", "pending")
    .eq("due_date", cible)
    .not("stripe_subscription_id", "is", null);
  if (error) throw error;
  const parSub = new Map<string, any>();
  for (const e of echeances ?? []) parSub.set(e.stripe_subscription_id, e);

  // 2) Ce que Stripe va prélever ce jour-là.
  const subs = [...(await abonnements("active")), ...(await abonnements("trialing"))];
  const stripeCeJour = new Map<string, any>();
  for (const s of subs) {
    const fin = finDePeriode(s);
    if (fin && jourParis(new Date(fin * 1000)) === cible && !(s.cancel_at && s.cancel_at <= fin)) stripeCeJour.set(s.id, s);
  }

  const decisions: Decision[] = [];

  for (const [id, e] of parSub) {
    const s = stripeCeJour.get(id);
    if (!s) {
      decisions.push({ sub: id, statut: "anomalie", motif: "La plateforme attend un prélèvement ce jour-là, Stripe n'en prévoit pas.", payment_id: e.id, contact_id: e.contact_id });
      continue;
    }
    // Le montant que Stripe va réellement prélever.
    let facture: any;
    try {
      facture = await stripe(`invoices/upcoming?subscription=${id}`);
    } catch (err) {
      decisions.push({ sub: id, statut: "anomalie", motif: `Prochaine facture Stripe illisible : ${(err as Error).message}`, payment_id: e.id, contact_id: e.contact_id });
      continue;
    }
    const montant = (facture.amount_due ?? 0) / 100;
    const quand = facture.next_payment_attempt ?? facture.period_end;
    if (montant <= 0) {
      decisions.push({ sub: id, statut: "ignore", motif: "Rien à prélever (montant nul).", payment_id: e.id, contact_id: e.contact_id });
      continue;
    }
    if (quand && jourParis(new Date(quand * 1000)) !== cible) {
      decisions.push({ sub: id, statut: "anomalie", motif: `Stripe prélèvera le ${jourParis(new Date(quand * 1000))}, pas le ${cible}.`, payment_id: e.id, contact_id: e.contact_id });
      continue;
    }
    const email = e.contacts?.email?.trim();
    if (!email) {
      decisions.push({ sub: id, statut: "anomalie", motif: "Client sans adresse email.", payment_id: e.id, contact_id: e.contact_id });
      continue;
    }
    const ecart = Math.abs(montant - Number(e.amount));
    decisions.push({
      sub: id,
      statut: "envoyer",
      motif: ecart > 0.01 ? `Montant Stripe ${euros(montant)} ≠ plateforme ${euros(Number(e.amount))} : le rappel annonce celui de Stripe.` : "Plateforme et Stripe concordent.",
      payment_id: e.id,
      contact_id: e.contact_id,
      rappel: {
        prenom: prenomDe(e.contacts?.full_name),
        email,
        montant,
        jour: cible,
        offre: libelleOffre(e.sales?.product),
        numero: e.payment_number,
        total: e.total_payments,
        carte: await derniersChiffresCarte(s),
      },
    });
  }

  for (const [id] of stripeCeJour) {
    if (parSub.has(id)) continue;
    decisions.push({ sub: id, statut: "anomalie", motif: "Stripe va prélever ce jour-là, la plateforme n'attend aucune échéance (abonnement soldé qui continue ?)." });
  }
  return decisions;
}

// ── Point d'entrée ────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const { data: secret } = await sb.from("secrets_internes").select("valeur").eq("cle", "rappel_prelevement").maybeSingle();
  const jeton = req.headers.get("x-jeton-interne") ?? "";
  if (!secret?.valeur || jeton !== secret.valeur) return json({ error: "non_autorise" }, 401);

  const body = await req.json().catch(() => ({}));
  const mode = String(body?.mode ?? "apercu");
  const cible = /^\d{4}-\d{2}-\d{2}$/.test(body?.date ?? "") ? body.date : decaler(jourParis(new Date()), DELAI_JOURS);
  if (!STRIPE_KEY || !RESEND_KEY) return json({ error: "configuration_manquante" }, 500);

  let decisions: Decision[];
  try {
    decisions = await decider(cible, sb);
  } catch (e) {
    console.error("[rappel-prelevement] decision", e);
    return json({ error: "decision_impossible", detail: (e as Error).message }, 500);
  }

  // Déjà envoyés pour cette date : on ne renvoie jamais.
  const { data: dejaFaits } = await sb
    .from("rappels_prelevement")
    .select("stripe_subscription_id")
    .eq("date_prelevement", cible)
    .eq("statut", "envoye");
  const deja = new Set((dejaFaits ?? []).map((r: any) => r.stripe_subscription_id));

  if (mode === "apercu") {
    return json({
      date_prelevement: cible,
      a_envoyer: decisions
        .filter((d) => d.statut === "envoyer")
        .map((d) => ({
          prenom: d.rappel!.prenom,
          email: masquer(d.rappel!.email),
          montant: d.rappel!.montant,
          offre: d.rappel!.offre,
          echeance: d.rappel!.numero && d.rappel!.total ? `${d.rappel!.numero}/${d.rappel!.total}` : null,
          carte: d.rappel!.carte,
          deja_envoye: deja.has(d.sub),
          note: d.motif,
        })),
      anomalies: decisions.filter((d) => d.statut !== "envoyer").map((d) => ({ sub: d.sub, statut: d.statut, motif: d.motif })),
    });
  }

  const envoyer = async (r: Rappel, to: string, prefixe = "", cle?: string) => {
    const { sujet, html, texte } = construireEmail(r);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
        ...(cle ? { "Idempotency-Key": cle } : {}),
      },
      body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject: prefixe + sujet, html, text: texte }),
    });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Resend ${res.status}: ${b?.message ?? "erreur"}`);
    return b?.id as string;
  };

  if (mode === "test") {
    const to = String(body?.to ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: "adresse_test_invalide" }, 400);
    const d = decisions.find((x) => x.statut === "envoyer");
    const exemple: Rappel = d?.rappel ?? {
      prenom: "Yasmine", email: to, montant: 200, jour: cible, offre: "Pass AL BARAKA", numero: 3, total: 12, carte: "4242",
    };
    const id = await envoyer({ ...exemple, email: to }, to, "[TEST] ");
    return json({ ok: true, resend_id: id, base: d ? "premier client concerné" : "exemple fictif (aucun client concerné)" });
  }

  if (mode !== "envoi") return json({ error: "mode_inconnu" }, 400);

  const bilan = { date_prelevement: cible, envoyes: 0, deja_envoyes: 0, anomalies: 0, ignores: 0, erreurs: 0 };
  for (const d of decisions) {
    if (d.statut !== "envoyer") {
      // Une anomalie n'est consignée qu'une fois par abonnement et par date.
      const { data: existe } = await sb.from("rappels_prelevement").select("id")
        .eq("stripe_subscription_id", d.sub).eq("date_prelevement", cible).eq("statut", d.statut).limit(1);
      if (!existe?.length) {
        await sb.from("rappels_prelevement").insert({
          stripe_subscription_id: d.sub, date_prelevement: cible, statut: d.statut === "anomalie" ? "anomalie" : "ignore",
          motif: d.motif, payment_id: d.payment_id ?? null, contact_id: d.contact_id ?? null,
        });
      }
      d.statut === "anomalie" ? bilan.anomalies++ : bilan.ignores++;
      continue;
    }
    if (deja.has(d.sub)) {
      bilan.deja_envoyes++;
      continue;
    }
    const r = d.rappel!;
    try {
      const id = await envoyer(r, r.email, "", `rappel-${d.sub}-${cible}`);
      const { error } = await sb.from("rappels_prelevement").insert({
        stripe_subscription_id: d.sub, date_prelevement: cible, statut: "envoye", motif: d.motif,
        payment_id: d.payment_id, contact_id: d.contact_id, montant: r.montant, email: r.email, resend_email_id: id,
      });
      if (error) console.error("[rappel-prelevement] journal", error);
      bilan.envoyes++;
    } catch (e) {
      console.error("[rappel-prelevement] envoi", d.sub, e);
      await sb.from("rappels_prelevement").insert({
        stripe_subscription_id: d.sub, date_prelevement: cible, statut: "erreur", motif: (e as Error).message.slice(0, 300),
        payment_id: d.payment_id, contact_id: d.contact_id, montant: r.montant, email: r.email,
      });
      bilan.erreurs++;
    }
  }
  console.log("[rappel-prelevement] bilan", JSON.stringify(bilan));
  return json(bilan);
});
