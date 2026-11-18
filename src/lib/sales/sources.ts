// ─────────────────────────────────────────────────────────────────────────
// Dashboard Sales, lot 2 (18/11/2026) : performance des ventes par source.
//
// Deux jeux de données, sans nom de client ni commission (l'agence les voit) :
//   • les ventes de la période, avec leur source jusqu'à la pub ;
//   • l'entonnoir (leads, inscrits, RDV) et la dépense, par source et priorité.
//
// Les taux se calculent ici, APRÈS addition, comme dans le reste du tableau de
// bord. La dépense d'un canal ou d'une campagne vient de la remontée par
// campagne (celle des totaux de l'onglet Marketing) ; celle d'un groupe ou d'une
// créa vient de la remontée par pub. Ce que la seconde n'explique pas apparaît
// sous la campagne en « Pub non identifiée ».
//
// Une « créa », c'est le nom de la pub sur une plateforme : Snap diffuse la même
// vidéo dans plusieurs pubs, qu'il faut lire ensemble.
// ─────────────────────────────────────────────────────────────────────────
import { libelleCanal } from "@/lib/marketing/perf";

export interface VenteSource {
  vente_id: string;
  vendu_le: string;
  conference_date: string | null;
  montant_ht: number;
  encaisse: number;
  perdue: boolean;
  nb_echeances: number;
  lead_cree_le: string | null;
  canal: string | null;
  canal_libelle: string | null;
  tunnel: string | null;
  plateforme: string | null;
  campagne_id: string | null;
  campagne_nom: string | null;
  groupe_id: string | null;
  groupe_nom: string | null;
  pub_id: string | null;
  pub_nom: string | null;
  quiz_priorite: string | null;
  reinscrit: boolean;
  signal_jeu_ven: boolean;
}

export interface EntonnoirSource {
  canal: string | null;
  canal_libelle: string | null;
  plateforme: string | null;
  campagne_id: string | null;
  campagne_nom: string | null;
  groupe_id: string | null;
  groupe_nom: string | null;
  pub_id: string | null;
  pub_nom: string | null;
  quiz_priorite: string | null;
  leads: number;
  inscrits: number;
  rdv: number;
  rdv_tenus: number;
  depense_campagne: number;
  depense_pub: number;
}

export type Niveau = "canal" | "campagne" | "groupe" | "crea";

export interface Mesures {
  depense: number;
  leads: number;
  inscrits: number;
  rdv: number;
  rdvTenus: number;
  ventes: number;
  perdues: number;
  caSigne: number;
  caNet: number;
  encaisse: number;
}

export interface Derives {
  cpl: number | null;
  coutParRdv: number | null;
  /** Dépense ÷ ventes hors ventes perdues. */
  cpa: number | null;
  /** CA net (hors ventes perdues) ÷ dépense. */
  roas: number | null;
  tauxInscription: number | null;
  tauxVente: number | null;
  /** Moins de 3 ventes et moins de 30 leads : trop peu pour conclure. */
  faibleVolume: boolean;
}

export interface NoeudSource extends Mesures, Derives {
  cle: string;
  niveau: Niveau;
  nom: string;
  plateforme: string | null;
  enfants: NoeudSource[];
}

export const SEUIL_VENTES = 3;
export const SEUIL_LEADS = 30;

const MESURES_VIDES = (): Mesures => ({
  depense: 0, leads: 0, inscrits: 0, rdv: 0, rdvTenus: 0, ventes: 0, perdues: 0, caSigne: 0, caNet: 0, encaisse: 0,
});

export const NOM_PLATEFORME: Record<string, string> = { meta: "Meta", snap: "Snapchat", google: "Google" };

const PUBLICITE = new Set(["meta_ads", "snap_ads", "google_ads"]);

export function nomCanal(canal: string | null, libelle?: string | null): string {
  if (!canal) return "Non attribué";
  return libelle?.trim() || libelleCanal(canal);
}

function nomCrea(pubId: string | null, pubNom: string | null): string {
  if (pubNom?.trim()) return pubNom.trim();
  if (!pubId) return "Pub non identifiée";
  return `Pub ${pubId.slice(0, 8)}…`;
}

const cleCrea = (plateforme: string | null, pubId: string | null, pubNom: string | null) =>
  pubNom?.trim() ? `${plateforme}|nom|${pubNom.trim().toLowerCase()}` : `${plateforme}|id|${pubId ?? ""}`;

/** Chemin d'une ligne dans l'arborescence : canal → campagne → groupe → créa. */
interface Chemin {
  canal: { cle: string; nom: string };
  campagne?: { cle: string; nom: string };
  groupe?: { cle: string; nom: string };
  crea?: { cle: string; nom: string };
  plateforme: string | null;
}

function chemin(r: {
  canal: string | null; canal_libelle: string | null; plateforme: string | null;
  campagne_id: string | null; campagne_nom: string | null; groupe_id: string | null; groupe_nom: string | null;
  pub_id: string | null; pub_nom: string | null;
}): Chemin {
  const canal = r.canal ?? "non_attribue";
  const c: Chemin = { canal: { cle: canal, nom: nomCanal(r.canal, r.canal_libelle) }, plateforme: r.plateforme };
  if (!PUBLICITE.has(canal)) return c;
  c.campagne = r.campagne_id
    ? { cle: r.campagne_id, nom: r.campagne_nom?.trim() || `Campagne ${r.campagne_id.slice(0, 8)}…` }
    : { cle: "?", nom: "Campagne non identifiée" };
  if (canal === "google_ads") return c; // Google ne transmet ni groupe ni pub
  c.groupe = r.groupe_id
    ? { cle: r.groupe_id, nom: r.groupe_nom?.trim() || `Groupe ${r.groupe_id.slice(0, 8)}…` }
    : { cle: "?", nom: "Pub non identifiée" };
  if (r.groupe_id) c.crea = { cle: cleCrea(r.plateforme, r.pub_id, r.pub_nom), nom: nomCrea(r.pub_id, r.pub_nom) };
  return c;
}

interface Brouillon extends Mesures {
  cle: string;
  niveau: Niveau;
  nom: string;
  plateforme: string | null;
  /** Dépense de la remontée par campagne (canal, campagne). */
  depC: number;
  /** Dépense de la remontée par pub (groupe, créa). */
  depP: number;
  enfants: Map<string, Brouillon>;
}

function brouillon(cle: string, niveau: Niveau, nom: string, plateforme: string | null): Brouillon {
  return { ...MESURES_VIDES(), cle, niveau, nom, plateforme, depC: 0, depP: 0, enfants: new Map() };
}

function ajouter(b: Brouillon, m: Partial<Mesures> & { depC?: number; depP?: number }) {
  for (const k of Object.keys(m) as (keyof typeof m)[]) (b as unknown as Record<string, number>)[k] += Number(m[k]) || 0;
}

function enfant(parent: Brouillon, cle: string, niveau: Niveau, nom: string, plateforme: string | null): Brouillon {
  let e = parent.enfants.get(cle);
  if (!e) {
    e = brouillon(`${parent.cle}/${cle}`, niveau, nom, plateforme);
    parent.enfants.set(cle, e);
  }
  return e;
}

function placer(racine: Map<string, Brouillon>, c: Chemin, m: Partial<Mesures> & { depC?: number; depP?: number }) {
  let n = racine.get(c.canal.cle);
  if (!n) {
    n = brouillon(c.canal.cle, "canal", c.canal.nom, PUBLICITE.has(c.canal.cle) ? c.plateforme : null);
    racine.set(c.canal.cle, n);
  }
  const noeuds = [n];
  if (c.campagne) noeuds.push(enfant(noeuds[noeuds.length - 1], c.campagne.cle, "campagne", c.campagne.nom, c.plateforme));
  if (c.groupe) noeuds.push(enfant(noeuds[noeuds.length - 1], c.groupe.cle, "groupe", c.groupe.nom, c.plateforme));
  if (c.crea) noeuds.push(enfant(noeuds[noeuds.length - 1], c.crea.cle, "crea", c.crea.nom, c.plateforme));
  for (const x of noeuds) ajouter(x, m);
}

function mesuresVente(v: VenteSource): Mesures {
  return {
    ...MESURES_VIDES(),
    ventes: 1,
    perdues: v.perdue ? 1 : 0,
    caSigne: Number(v.montant_ht) || 0,
    caNet: v.perdue ? 0 : Number(v.montant_ht) || 0,
    encaisse: Number(v.encaisse) || 0,
  };
}

export function deriver<T extends Mesures>(m: T): T & Derives {
  const ventesNettes = m.ventes - m.perdues;
  return {
    ...m,
    cpl: m.depense > 0 && m.leads > 0 ? m.depense / m.leads : null,
    coutParRdv: m.depense > 0 && m.rdv > 0 ? m.depense / m.rdv : null,
    cpa: m.depense > 0 && ventesNettes > 0 ? m.depense / ventesNettes : null,
    roas: m.depense > 0 ? m.caNet / m.depense : null,
    tauxInscription: m.leads > 0 ? m.inscrits / m.leads : null,
    tauxVente: m.leads > 0 ? m.ventes / m.leads : null,
    faibleVolume: m.ventes < SEUIL_VENTES && m.leads < SEUIL_LEADS,
  };
}

function finaliser(b: Brouillon): NoeudSource {
  // Canal et campagne : dépense par campagne. Groupe et créa : dépense par pub.
  const depense = b.niveau === "canal" || b.niveau === "campagne" ? b.depC : b.depP;
  const enfants = [...b.enfants.values()];
  if (b.niveau === "campagne" && enfants.length) {
    const expliquee = enfants.reduce((a, e) => a + e.depP, 0);
    const reste = b.depC - expliquee;
    if (reste > 1) {
      const inconnu = b.enfants.get("?") ?? brouillon(`${b.cle}/?`, "groupe", "Pub non identifiée", b.plateforme);
      inconnu.depP += reste;
      if (!b.enfants.has("?")) {
        b.enfants.set("?", inconnu);
        enfants.push(inconnu);
      }
    }
  }
  const { depC: _c, depP: _p, enfants: _e, ...mesures } = b;
  const finis = enfants.map(finaliser).sort(parDefaut);
  if (b.niveau === "campagne") distinguerHomonymes(finis);
  return { ...deriver({ ...mesures, depense }), enfants: finis };
}

/**
 * Snap crée souvent plusieurs groupes du même nom (« Broad - FR, BEL ») : on
 * ajoute au nom les créas qu'ils diffusent, pour qu'on les reconnaisse.
 */
function distinguerHomonymes(groupes: NoeudSource[]) {
  const compte = new Map<string, number>();
  for (const g of groupes) compte.set(g.nom, (compte.get(g.nom) ?? 0) + 1);
  for (const g of groupes) {
    if ((compte.get(g.nom) ?? 0) < 2 || !g.enfants.length) continue;
    const creas = [...g.enfants].sort((a, b) => b.depense - a.depense || b.leads - a.leads).map((c) => c.nom);
    g.nom = `${g.nom} · ${creas.slice(0, 2).join(", ")}${creas.length > 2 ? ` +${creas.length - 2}` : ""}`;
  }
  // Toujours identiques (mêmes créas) : la fin de l'identifiant du groupe départage.
  const encore = new Map<string, number>();
  for (const g of groupes) encore.set(g.nom, (encore.get(g.nom) ?? 0) + 1);
  for (const g of groupes) {
    const id = g.cle.split("/").pop() ?? "";
    if ((encore.get(g.nom) ?? 0) > 1 && id && id !== "?") g.nom = `${g.nom} (#${id.slice(-4)})`;
  }
}

/** Plus de ventes d'abord, puis plus de dépense. */
export const parDefaut = (a: NoeudSource, b: NoeudSource) =>
  b.ventes - a.ventes || b.caNet - a.caNet || b.depense - a.depense || b.leads - a.leads;

/** Arborescence canal → campagne → groupe → créa. */
export function arborescence(ventes: VenteSource[], entonnoir: EntonnoirSource[]): NoeudSource[] {
  const racine = new Map<string, Brouillon>();
  for (const r of entonnoir) {
    const c = chemin(r);
    // Ligne de dépense par campagne : elle s'arrête à la campagne.
    if (!r.groupe_id && !r.pub_id && !Number(r.leads) && Number(r.depense_campagne)) {
      delete c.groupe;
      delete c.crea;
    }
    const mesures = {
      leads: Number(r.leads) || 0, inscrits: Number(r.inscrits) || 0,
      rdv: Number(r.rdv) || 0, rdvTenus: Number(r.rdv_tenus) || 0,
      depC: Number(r.depense_campagne) || 0, depP: Number(r.depense_pub) || 0,
    };
    placer(racine, c, mesures);
  }
  for (const v of ventes) placer(racine, chemin(v), mesuresVente(v));
  return [...racine.values()].map(finaliser).sort(parDefaut);
}

/** Une ligne par créa (nom × plateforme), tous groupes et campagnes confondus. */
export function parCrea(ventes: VenteSource[], entonnoir: EntonnoirSource[]): NoeudSource[] {
  const m = new Map<string, Brouillon>();
  const ligne = (plateforme: string | null, pubId: string | null, pubNom: string | null) => {
    const cle = cleCrea(plateforme, pubId, pubNom);
    let b = m.get(cle);
    if (!b) {
      b = brouillon(cle, "crea", nomCrea(pubId, pubNom), plateforme);
      m.set(cle, b);
    }
    return b;
  };
  for (const r of entonnoir) {
    if (!r.pub_id || (r.canal !== "meta_ads" && r.canal !== "snap_ads")) continue;
    ajouter(ligne(r.plateforme, r.pub_id, r.pub_nom), {
      leads: Number(r.leads) || 0, inscrits: Number(r.inscrits) || 0,
      rdv: Number(r.rdv) || 0, rdvTenus: Number(r.rdv_tenus) || 0, depP: Number(r.depense_pub) || 0,
    });
  }
  for (const v of ventes) {
    if (!v.pub_id || (v.canal !== "meta_ads" && v.canal !== "snap_ads")) continue;
    ajouter(ligne(v.plateforme, v.pub_id, v.pub_nom), mesuresVente(v));
  }
  return [...m.values()].map(finaliser).sort(parDefaut);
}

export function totalNoeuds(noeuds: NoeudSource[]): Mesures & Derives {
  const t = MESURES_VIDES();
  for (const n of noeuds) for (const k of Object.keys(t) as (keyof Mesures)[]) t[k] += n[k];
  return deriver(t);
}

/** Aplatit l'arborescence (export, recherche). */
export function aplatir(noeuds: NoeudSource[], parents: string[] = []): { chemin: string[]; noeud: NoeudSource }[] {
  return noeuds.flatMap((n) => [{ chemin: [...parents, n.nom], noeud: n }, ...aplatir(n.enfants, [...parents, n.nom])]);
}

// ── Profil des acheteurs ───────────────────────────────────────────────────

export interface LigneProfil {
  cle: string;
  libelle: string;
  leads: number | null;
  ventes: number;
  caNet: number;
  tauxVente: number | null;
  part: number | null;
}

export const PRIORITES = ["A", "B", "C", "D"] as const;

export function profilPriorite(ventes: VenteSource[], entonnoir: EntonnoirSource[]): LigneProfil[] {
  const cles = [...PRIORITES, "?"];
  const total = ventes.length;
  return cles.map((p) => {
    const de = (x: string | null) => (p === "?" ? !x || !(PRIORITES as readonly string[]).includes(x) : x === p);
    const v = ventes.filter((x) => de(x.quiz_priorite));
    const leads = entonnoir.filter((x) => de(x.quiz_priorite)).reduce((a, x) => a + (Number(x.leads) || 0), 0);
    return {
      cle: p,
      libelle: p === "?" ? "Non renseignée" : `Priorité ${p}`,
      leads,
      ventes: v.length,
      caNet: v.reduce((a, x) => a + (x.perdue ? 0 : Number(x.montant_ht) || 0), 0),
      tauxVente: leads > 0 ? v.length / leads : null,
      part: total ? v.length / total : null,
    };
  });
}

const JOUR = 86_400_000;

export function profilDelai(ventes: VenteSource[]): LigneProfil[] {
  const tranches: { cle: string; libelle: string; max: number }[] = [
    { cle: "0-2", libelle: "Moins de 3 jours", max: 3 },
    { cle: "3-7", libelle: "3 à 7 jours", max: 8 },
    { cle: "8-14", libelle: "8 à 14 jours", max: 15 },
    { cle: "15+", libelle: "15 jours et plus", max: Infinity },
  ];
  const total = ventes.length;
  const lignes = tranches.map((t, i) => {
    const min = i === 0 ? 0 : tranches[i - 1].max;
    const v = ventes.filter((x) => {
      if (!x.lead_cree_le) return false;
      const j = (new Date(x.vendu_le).getTime() - new Date(x.lead_cree_le).getTime()) / JOUR;
      return j >= min && j < t.max;
    });
    return {
      cle: t.cle, libelle: t.libelle, leads: null, ventes: v.length,
      caNet: v.reduce((a, x) => a + (x.perdue ? 0 : Number(x.montant_ht) || 0), 0),
      tauxVente: null, part: total ? v.length / total : null,
    };
  });
  const sans = ventes.filter((x) => !x.lead_cree_le);
  if (sans.length) {
    lignes.push({
      cle: "?", libelle: "Sans lead connu", leads: null, ventes: sans.length,
      caNet: sans.reduce((a, x) => a + (x.perdue ? 0 : Number(x.montant_ht) || 0), 0),
      tauxVente: null, part: total ? sans.length / total : null,
    });
  }
  return lignes;
}

export interface Signaux {
  ventes: number;
  comptant: number;
  echelonne: number;
  panierComptant: number | null;
  panierEchelonne: number | null;
  reinscrits: number;
  jeuVen: number;
}

export function signaux(ventes: VenteSource[]): Signaux {
  const comptant = ventes.filter((v) => v.nb_echeances <= 1);
  const echelonne = ventes.filter((v) => v.nb_echeances > 1);
  const panier = (xs: VenteSource[]) => (xs.length ? xs.reduce((a, v) => a + (Number(v.montant_ht) || 0), 0) / xs.length : null);
  return {
    ventes: ventes.length,
    comptant: comptant.length,
    echelonne: echelonne.length,
    panierComptant: panier(comptant),
    panierEchelonne: panier(echelonne),
    reinscrits: ventes.filter((v) => v.reinscrit).length,
    jeuVen: ventes.filter((v) => v.signal_jeu_ven).length,
  };
}

/**
 * Lecture d'un coût par rapport à la moyenne : « bon » s'il est au moins 20 %
 * meilleur, « mauvais » s'il est 25 % pire. Rien sous le seuil de volume.
 */
export function tendance(valeur: number | null, reference: number | null, plusPetitEstMieux: boolean, faibleVolume: boolean):
  "bon" | "mauvais" | null {
  if (faibleVolume || valeur === null || reference === null || reference <= 0) return null;
  const r = valeur / reference;
  if (plusPetitEstMieux) return r <= 0.8 ? "bon" : r >= 1.25 ? "mauvais" : null;
  return r >= 1.25 ? "bon" : r <= 0.8 ? "mauvais" : null;
}
