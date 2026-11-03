// Dépenses publicitaires envoyées chaque matin par Make, un scénario par compte :
// la dépense par campagne et par jour des 7 derniers jours (les plateformes corrigent
// leurs chiffres après coup). Rejouable sans risque. Protégée par la clé partagée
// avec Make (en-tête X-Cle-CRM, secret MAKE_CRM_SECRET).
//
//   POST { "plateforme": "meta", "compte": "act_123", "lignes": [...] }
//   GET  → dernière remontée de chaque compte suivi (scénario de surveillance)
//
// Make peut envoyer les champs bruts de la plateforme : ils sont traduits ici, pour
// garder les scénarios aussi simples que possible. Snap envoie ses statistiques et ses
// campagnes telles quelles (snap_stats, snap_campagnes).
//
// Depuis le 03/11/2026, un second scénario par compte (Meta, Snap) envoie la dépense
// par PUB : « niveau »: "pub". Elle va dans ads_pubs (onglet « Par créa ») et ne touche
// pas à ads, qui fait les totaux du tableau de bord. Snap envoie alors aussi ses pubs
// et ses groupes (snap_pubs, snap_groupes) pour les noms.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
// Par pub et par jour, Snap renvoie une ligne pour chaque pub du compte, même à 0 € :
// un import ponctuel d'un mois dépasse le mégaoctet.
const TAILLE_MAX = 1024 * 1024;
const TAILLE_MAX_PUB = 20 * 1024 * 1024;
const PLATEFORMES = ["meta", "snap", "google"];

const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });

async function empreinte(texte: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte)));
}

async function cleValide(req: Request) {
  const secret = Deno.env.get("MAKE_CRM_SECRET");
  const recue = req.headers.get("x-cle-crm");
  if (!secret || !recue) return false;
  const [a, b] = await Promise.all([empreinte(recue.trim()), empreinte(secret)]);
  return a.every((octet, i) => octet === b[i]);
}

// Make transforme la date du jour (« 2026-10-12 ») en instant, à minuit à Paris :
// « 2026-10-11T22:00:00Z ». On relit ce jour-là dans le même fuseau.
const jourParis = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
function lireJour(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : jourParis.format(d);
}

function normaliser(l: Record<string, unknown>) {
  return {
    jour: lireJour(l.jour ?? l.date_start ?? l.day),
    campagne_id: String(l.campagne_id ?? l.campaign_id ?? "").trim(),
    campagne: l.campagne ?? l.campaign_name ?? null,
    montant: l.montant ?? l.spend ?? l.cost ?? 0,
    impressions: l.impressions ?? 0,
    clics: l.clics ?? l.inline_link_clicks ?? l.clicks ?? 0,
    devise: l.devise ?? l.account_currency ?? "EUR",
  };
}

function normaliserPub(l: Record<string, unknown>) {
  return {
    jour: lireJour(l.jour ?? l.date_start ?? l.day),
    pub_id: String(l.pub_id ?? l.ad_id ?? "").trim(),
    pub: l.pub ?? l.ad_name ?? null,
    groupe_id: l.groupe_id ?? l.adset_id ?? null,
    groupe: l.groupe ?? l.adset_name ?? null,
    campagne_id: l.campagne_id ?? l.campaign_id ?? null,
    campagne: l.campagne ?? l.campaign_name ?? null,
    montant: l.montant ?? l.spend ?? 0,
    impressions: l.impressions ?? 0,
    clics: l.clics ?? l.inline_link_clicks ?? l.clicks ?? 0,
    devise: l.devise ?? l.account_currency ?? "EUR",
  };
}

const enListe = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : v);

// Même réponse /stats, avec breakdown=ad. Les noms viennent de /ads, /adsquads et /campaigns.
function lignesSnapParPub(stats: any, pubs: any, groupes: any, campagnes: any, devise: unknown) {
  const nomsCampagnes = new Map<string, string>();
  for (const c of enListe(campagnes)?.campaigns ?? []) if (c.campaign?.id) nomsCampagnes.set(c.campaign.id, c.campaign.name);
  const lesGroupes = new Map<string, { nom: string; campagne: string }>();
  for (const g of enListe(groupes)?.adsquads ?? []) if (g.adsquad?.id) lesGroupes.set(g.adsquad.id, { nom: g.adsquad.name, campagne: g.adsquad.campaign_id });
  const lesPubs = new Map<string, { nom: string; groupe: string }>();
  for (const p of enListe(pubs)?.ads ?? []) if (p.ad?.id) lesPubs.set(p.ad.id, { nom: p.ad.name, groupe: p.ad.ad_squad_id });
  const lignes: Record<string, unknown>[] = [];
  for (const s of enListe(stats)?.timeseries_stats ?? []) {
    for (const t of s.timeseries_stat?.breakdown_stats?.ad ?? []) {
      const pub = lesPubs.get(t.id);
      const groupe = pub ? lesGroupes.get(pub.groupe) : undefined;
      for (const j of t.timeseries ?? []) {
        const montant = Number(j.stats?.spend ?? 0) / 1_000_000;
        if (!montant) continue;
        lignes.push({
          jour: String(j.start_time).slice(0, 10),
          pub_id: t.id,
          pub: pub?.nom ?? null,
          groupe_id: pub?.groupe ?? null,
          groupe: groupe?.nom ?? null,
          campagne_id: groupe?.campagne ?? null,
          campagne: groupe ? nomsCampagnes.get(groupe.campagne) ?? null : null,
          montant,
          impressions: j.stats?.impressions ?? 0,
          clics: j.stats?.swipes ?? 0,
          devise,
        });
      }
    }
  }
  return lignes;
}

// Réponse de /adaccounts/{id}/stats (granularity=DAY, breakdown=campaign). La dépense est
// en micro-unités, et le jour est celui du fuseau du compte (UTC+4 pour Ethicarena).
function lignesSnap(stats: any, campagnes: any, devise: unknown) {
  const noms = new Map<string, string>();
  for (const c of enListe(campagnes)?.campaigns ?? []) if (c.campaign?.id) noms.set(c.campaign.id, c.campaign.name);
  const lignes: Record<string, unknown>[] = [];
  for (const s of enListe(stats)?.timeseries_stats ?? []) {
    for (const t of s.timeseries_stat?.breakdown_stats?.campaign ?? []) {
      for (const j of t.timeseries ?? []) {
        lignes.push({
          jour: String(j.start_time).slice(0, 10),
          campagne_id: t.id,
          campagne: noms.get(t.id) ?? null,
          montant: Number(j.stats?.spend ?? 0) / 1_000_000,
          impressions: j.stats?.impressions ?? 0,
          clics: j.stats?.swipes ?? 0,
          devise,
        });
      }
    }
  }
  return lignes;
}

serve(async (req) => {
  if (!(await cleValide(req))) return json({ erreur: "Clé invalide." }, 401);

  if (req.method === "GET") {
    const { data, error } = await supabase.rpc("statut_depenses_pub");
    return error ? json({ erreur: error.message }, 500) : json(data);
  }

  const brut = await req.text();
  if (brut.length > TAILLE_MAX_PUB) return json({ erreur: "Envoi trop volumineux." }, 413);

  let plateforme = "";
  let compte = "";
  let parPub = false;
  let lignes: Record<string, unknown>[];
  try {
    const corps = JSON.parse(brut);
    plateforme = String(corps.plateforme ?? "").toLowerCase();
    compte = String(corps.compte ?? "").trim();
    parPub = corps.niveau === "pub";
    if (parPub) {
      lignes = corps.snap_stats
        ? lignesSnapParPub(corps.snap_stats, corps.snap_pubs, corps.snap_groupes, corps.snap_campagnes, corps.devise)
        : enListe(corps.lignes);
    } else {
      if (brut.length > TAILLE_MAX) return json({ erreur: "Envoi trop volumineux." }, 413);
      lignes = corps.snap_stats ? lignesSnap(corps.snap_stats, corps.snap_campagnes, corps.devise) : enListe(corps.lignes);
    }
  } catch {
    return json({ erreur: "JSON invalide." }, 400);
  }
  if (!PLATEFORMES.includes(plateforme) || !compte) return json({ erreur: "« plateforme » et « compte » attendus." }, 400);
  if (!Array.isArray(lignes)) return json({ erreur: "« lignes » attendu (liste)." }, 400);

  // Une campagne sans activité renvoie parfois une ligne vide : elle ne compte pas.
  const propres = parPub
    ? lignes.map(normaliserPub).filter((l) => l.jour && l.pub_id)
    : lignes.map(normaliser).filter((l) => l.jour && l.campagne_id);
  const { data, error } = await supabase.rpc(parPub ? "importer_depenses_pub_par_pub" : "importer_depenses_pub", {
    p_plateforme: plateforme, p_compte: compte, p_lignes: propres,
  });
  if (error) {
    await supabase.from("ads_imports").insert({ plateforme, compte_id: compte, erreur: error.message, niveau: parPub ? "pub" : "campagne" });
    return json({ erreur: error.message }, 500);
  }
  return json(data);
});
