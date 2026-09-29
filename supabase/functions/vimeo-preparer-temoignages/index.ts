// ─────────────────────────────────────────────────────────────────────────
// Prépare sur Vimeo les vidéos des témoignages du site vitrine.
//
// Demande de Hassan le 29/09/2026 : les témoignages ajoutés dans l'admin
// affichaient « changez ces paramètres de confidentialité » sur le site. Chaque
// vidéo n'autorisait que plateforme. et view., et les liens collés ne portaient
// pas le hash. Désormais l'admin appelle cette fonction après chaque ajout, et
// un bouton permet de tout revérifier.
//
// Pour chaque vidéo de temoignages_vitrine :
//   1. ajoute à sa liste blanche les domaines du site qui manquent
//      (PUT additif : rien n'est jamais retiré) ;
//   2. enregistre le hash s'il manque ou diffère, la miniature si elle manque.
//
// Réservé au CEO. Le jeton Vimeo est un secret Supabase (VIMEO_TOKEN), jamais
// dans le code : le dépôt est public.
// ─────────────────────────────────────────────────────────────────────────
import { createClient } from "npm:@supabase/supabase-js@2";
import { choisirMiniature, domainesManquants, doublons, extraireHash } from "./vimeo.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const VIMEO_TOKEN = Deno.env.get("VIMEO_TOKEN");

const vimeo = (chemin: string, init: RequestInit = {}) =>
  fetch(`https://api.vimeo.com${chemin}`, {
    ...init,
    headers: {
      Authorization: `bearer ${VIMEO_TOKEN}`,
      Accept: "application/vnd.vimeo.*+json;version=3.4",
      ...(init.headers ?? {}),
    },
  });

interface Ligne {
  id: string;
  vimeo_id: string;
  hash: string | null;
  miniature: string | null;
  prenom: string;
}

interface Bilan {
  vimeo_id: string;
  prenoms: string[];
  nom_vimeo: string | null;
  domaines_ajoutes: string[];
  hash_enregistre: boolean;
  miniature_enregistree: boolean;
  erreur: string | null;
}

async function preparer(id: string, lignes: Ligne[], admin: ReturnType<typeof createClient>): Promise<Bilan> {
  const bilan: Bilan = {
    vimeo_id: id,
    prenoms: lignes.map((l) => l.prenom),
    nom_vimeo: null,
    domaines_ajoutes: [],
    hash_enregistre: false,
    miniature_enregistree: false,
    erreur: null,
  };

  const rv = await vimeo(`/videos/${id}?fields=name,player_embed_url,pictures.sizes`);
  if (!rv.ok) {
    bilan.erreur = rv.status === 404 ? "vidéo introuvable sur Vimeo" : `Vimeo a répondu ${rv.status}`;
    return bilan;
  }
  const video = await rv.json();
  bilan.nom_vimeo = video.name ?? null;

  const rd = await vimeo(`/videos/${id}/privacy/domains?per_page=100`);
  if (!rd.ok) {
    bilan.erreur = `lecture des domaines impossible (${rd.status})`;
    return bilan;
  }
  const autorises = ((await rd.json()).data ?? []).map((d: { domain: string }) => d.domain);
  for (const domaine of domainesManquants(autorises)) {
    const r = await vimeo(`/videos/${id}/privacy/domains/${domaine}`, { method: "PUT" });
    if (r.status === 204 || r.ok) bilan.domaines_ajoutes.push(domaine);
    else bilan.erreur = `ajout de ${domaine} refusé (${r.status})`;
  }

  const hash = extraireHash(video.player_embed_url);
  const miniature = choisirMiniature(video.pictures?.sizes);
  for (const l of lignes) {
    const champs: Record<string, string> = {};
    if (hash && l.hash !== hash) champs.hash = hash;
    if (!l.miniature && miniature) champs.miniature = miniature;
    if (!Object.keys(champs).length) continue;
    const { error } = await admin.from("temoignages_vitrine").update(champs).eq("id", l.id);
    if (error) bilan.erreur = `enregistrement impossible : ${error.message}`;
    else {
      bilan.hash_enregistre ||= !!champs.hash;
      bilan.miniature_enregistree ||= !!champs.miniature;
    }
  }
  return bilan;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  if (!VIMEO_TOKEN) return json({ error: "VIMEO_TOKEN absent des secrets" }, 500);

  const jeton = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!jeton) return json({ error: "Authentification requise" }, 401);
  const { data: u, error: eu } = await createClient(SUPABASE_URL, ANON).auth.getUser(jeton);
  if (eu || !u?.user) return json({ error: "Session invalide" }, 401);
  const admin = createClient(SUPABASE_URL, SERVICE);
  const { data: profil } = await admin.from("profiles").select("role").eq("id", u.user.id).single();
  if (profil?.role !== "ceo") return json({ error: "Réservé au CEO" }, 403);

  const corps = await req.json().catch(() => ({}));
  const cible = typeof corps.vimeo_id === "string" && /^\d{5,12}$/.test(corps.vimeo_id) ? corps.vimeo_id : null;

  let q = admin.from("temoignages_vitrine").select("id, vimeo_id, hash, miniature, prenom");
  if (cible) q = q.eq("vimeo_id", cible);
  const { data: lignes, error } = await q;
  if (error) return json({ error: error.message }, 500);

  const parVideo = new Map<string, Ligne[]>();
  for (const l of (lignes ?? []) as Ligne[]) parVideo.set(l.vimeo_id, [...(parVideo.get(l.vimeo_id) ?? []), l]);

  // Séquentiel : une vingtaine de vidéos au plus, et l'API Vimeo limite le débit.
  const bilans: Bilan[] = [];
  for (const [id, ls] of parVideo) bilans.push(await preparer(id, ls, admin));

  return json({
    videos: bilans,
    erreurs: bilans.filter((b) => b.erreur).length,
    doublons: doublons((lignes ?? []) as Ligne[]),
  });
});
