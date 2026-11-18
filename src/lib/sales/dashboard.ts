// Dashboard Sales, lot 1 (18/11/2026) : calculs à partir des lignes renvoyées
// par sales_dashboard_ventes, sales_dashboard_calls et equipe_qualification_plage.
//
// Règles décidées avec Hassan le 18/11 :
//   - une vente = un bon de commande PASS saisi (toutes ont reçu au moins un
//     paiement) ; les ventes perdues comptent, et sont mises en avant à part ;
//   - qui a closé, qui a setté : les commissions saisies sur la vente ;
//   - les montants de commission sont affichés dans les classements.

export interface Intervenant {
  role: "closer" | "setter" | "apporteur" | "agence_marketing" | string;
  user_id: string | null;
  nom: string;
  /** Total des commissions de la personne sur la vente, échéances cumulées, hors annulées. */
  montant: number | null;
  /** Dont déjà versé. */
  verse: number | null;
}

export interface VenteDashboard {
  vente_id: string;
  vendu_le: string;
  conference_date: string | null;
  client: string | null;
  email: string | null;
  telephone: string | null;
  produit: string | null;
  montant_ht: number;
  statut_paiement: string;
  nb_echeances: number;
  encaisse: number;
  en_retard: number;
  reste_a_encaisser: number;
  intervenants: Intervenant[];
  lead_id: string | null;
  lead_cree_le: string | null;
  canal: string | null;
  canal_libelle: string | null;
  tunnel: string | null;
  pub_plateforme: string | null;
  pub_id: string | null;
  pub_nom: string | null;
  groupe_nom: string | null;
  campagne_nom: string | null;
  quiz_priorite: string | null;
}

export interface CallDashboard {
  call_id: string;
  closer_id: string | null;
  closer: string | null;
  statut: string;
  prevu_le: string | null;
  client: string | null;
  conference_date: string | null;
  achete: boolean;
}

export interface SetterActivite {
  user_id: string;
  full_name: string;
  nb_appeles: number;
  nb_inscrits: number;
  nb_calls: number;
}

export const LIBELLES_STATUT_VENTE: Record<string, string> = {
  in_progress: "En cours",
  paid: "Payée",
  late: "En retard",
  lost: "Perdue",
};

/** Statuts d'un call qui a eu lieu. */
const CALL_TENU = new Set(["close", "non_close", "follow_up", "disqualifie", "renvoye_conference", "rediffusion"]);

export const estPerdue = (v: VenteDashboard) => v.statut_paiement === "lost";

export function intervenantsDe(v: VenteDashboard, role: string): Intervenant[] {
  return v.intervenants.filter((i) => i.role === role);
}

export const nomsDe = (v: VenteDashboard, role: string): string =>
  intervenantsDe(v, role).map((i) => i.nom).join(", ");

/** Canaux pour lesquels on ne sait pas d'où vient l'acheteur. */
const SANS_SOURCE = new Set(["sans_source", "autre"]);
export const estSansSource = (v: VenteDashboard) => !v.lead_id || !v.canal || SANS_SOURCE.has(v.canal);

const somme = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function mediane(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const t = [...xs].sort((a, b) => a - b);
  const m = Math.floor(t.length / 2);
  return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2;
}

// ── Synthèse ───────────────────────────────────────────────────────────────

export interface Synthese {
  ventes: number;
  caSigne: number;
  perdues: number;
  caPerdu: number;
  /** Chiffre d'affaires signé hors ventes perdues. */
  caNet: number;
  encaisse: number;
  resteAEncaisser: number;
  enRetard: number;
  panierMoyen: number | null;
  /** Part des ventes (hors perdues) payées en une fois, entre 0 et 1. */
  partComptant: number | null;
  /** Jours entre l'inscription du lead et l'achat. */
  delaiMedianJours: number | null;
  commissions: number;
  commissionsVersees: number;
}

export function synthese(ventes: VenteDashboard[]): Synthese {
  const actives = ventes.filter((v) => !estPerdue(v));
  const perdues = ventes.filter(estPerdue);
  const delais = ventes
    .filter((v) => v.lead_cree_le)
    .map((v) => (new Date(v.vendu_le).getTime() - new Date(v.lead_cree_le as string).getTime()) / 86_400_000)
    .filter((j) => j >= 0);
  const toutes = ventes.flatMap((v) => v.intervenants);
  return {
    ventes: ventes.length,
    caSigne: somme(ventes.map((v) => v.montant_ht)),
    perdues: perdues.length,
    caPerdu: somme(perdues.map((v) => v.montant_ht)),
    caNet: somme(actives.map((v) => v.montant_ht)),
    encaisse: somme(ventes.map((v) => v.encaisse)),
    resteAEncaisser: somme(actives.map((v) => v.reste_a_encaisser)),
    enRetard: somme(actives.map((v) => v.en_retard)),
    panierMoyen: ventes.length ? somme(ventes.map((v) => v.montant_ht)) / ventes.length : null,
    partComptant: actives.length ? actives.filter((v) => v.nb_echeances <= 1).length / actives.length : null,
    delaiMedianJours: mediane(delais),
    commissions: somme(toutes.map((i) => i.montant ?? 0)),
    commissionsVersees: somme(toutes.map((i) => i.verse ?? 0)),
  };
}

// ── Classements ────────────────────────────────────────────────────────────

export interface LigneClassement {
  cle: string;
  nom: string;
  ventes: number;
  perdues: number;
  caSigne: number;
  encaisse: number;
  panierMoyen: number | null;
  commissions: number;
  commissionsVersees: number;
}

/** Ventes, chiffre d'affaires et commissions de chaque personne ayant un rôle donné. */
export function classementParRole(ventes: VenteDashboard[], role: string): LigneClassement[] {
  const parPersonne = new Map<string, LigneClassement>();
  for (const v of ventes) {
    for (const i of intervenantsDe(v, role)) {
      const cle = i.user_id ?? `ext:${i.nom}`;
      const l = parPersonne.get(cle) ?? {
        cle, nom: i.nom, ventes: 0, perdues: 0, caSigne: 0, encaisse: 0,
        panierMoyen: null, commissions: 0, commissionsVersees: 0,
      };
      l.ventes += 1;
      if (estPerdue(v)) l.perdues += 1;
      l.caSigne += v.montant_ht;
      l.encaisse += v.encaisse;
      l.commissions += i.montant ?? 0;
      l.commissionsVersees += i.verse ?? 0;
      parPersonne.set(cle, l);
    }
  }
  return [...parPersonne.values()]
    .map((l) => ({ ...l, panierMoyen: l.ventes ? l.caSigne / l.ventes : null }))
    .sort((a, b) => b.ventes - a.ventes || b.caSigne - a.caSigne);
}

export interface LigneCloser extends LigneClassement {
  callsPris: number;
  tenus: number;
  noShow: number;
  aRenseigner: number;
  aVenir: number;
  /** Calls tenus suivis d'un achat de la personne. */
  tenusAchetes: number;
  /** Calls tenus suivis d'un achat / calls tenus. Surestimé tant que des calls restent à renseigner. */
  tauxClosing: number | null;
  /** Ventes saisies à son nom sans call Calendly tenu par lui (vente en direct, rediffusion…). */
  ventesSansCall: number;
  tauxNoShow: number | null;
}

export function classementClosers(ventes: VenteDashboard[], calls: CallDashboard[], maintenant = new Date()): LigneCloser[] {
  const base = new Map(classementParRole(ventes, "closer").map((l) => [l.cle, l]));
  const stats = new Map<string, { nom: string; pris: number; tenus: number; tenusAchetes: number; noShow: number; aRenseigner: number; aVenir: number }>();
  for (const c of calls) {
    if (c.statut === "annule" || !c.closer_id) continue;
    const s = stats.get(c.closer_id) ?? { nom: c.closer ?? "?", pris: 0, tenus: 0, tenusAchetes: 0, noShow: 0, aRenseigner: 0, aVenir: 0 };
    s.pris += 1;
    if (CALL_TENU.has(c.statut)) {
      s.tenus += 1;
      if (c.achete || c.statut === "close") s.tenusAchetes += 1;
    }
    else if (c.statut === "no_show") s.noShow += 1;
    else if (c.statut === "planifie") {
      if (c.prevu_le && new Date(c.prevu_le) < maintenant) s.aRenseigner += 1;
      else s.aVenir += 1;
    }
    stats.set(c.closer_id, s);
  }
  const cles = new Set([...base.keys(), ...stats.keys()]);
  return [...cles].map((cle) => {
    const b = base.get(cle);
    const s = stats.get(cle);
    const ventesN = b?.ventes ?? 0;
    const passes = s ? s.tenus + s.noShow : 0;
    return {
      cle,
      nom: b?.nom ?? s?.nom ?? "?",
      ventes: ventesN,
      perdues: b?.perdues ?? 0,
      caSigne: b?.caSigne ?? 0,
      encaisse: b?.encaisse ?? 0,
      panierMoyen: b?.panierMoyen ?? null,
      commissions: b?.commissions ?? 0,
      commissionsVersees: b?.commissionsVersees ?? 0,
      callsPris: s?.pris ?? 0,
      tenus: s?.tenus ?? 0,
      noShow: s?.noShow ?? 0,
      aRenseigner: s?.aRenseigner ?? 0,
      aVenir: s?.aVenir ?? 0,
      tenusAchetes: s?.tenusAchetes ?? 0,
      tauxClosing: s && s.tenus > 0 ? s.tenusAchetes / s.tenus : null,
      ventesSansCall: Math.max(0, ventesN - (s?.tenusAchetes ?? 0)),
      tauxNoShow: passes > 0 ? (s as { noShow: number }).noShow / passes : null,
    };
  }).sort((a, b) => b.ventes - a.ventes || b.caSigne - a.caSigne || b.callsPris - a.callsPris);
}

export interface LigneSetter extends LigneClassement {
  appeles: number;
  inscrits: number;
  calls: number;
  /** Inscrits / appelés. */
  tauxInscription: number | null;
  /** Ventes / appelés. */
  tauxVente: number | null;
}

export function classementSetters(ventes: VenteDashboard[], activite: SetterActivite[]): LigneSetter[] {
  const base = new Map(classementParRole(ventes, "setter").map((l) => [l.cle, l]));
  const act = new Map(activite.map((a) => [a.user_id, a]));
  const cles = new Set([...base.keys(), ...activite.filter((a) => a.nb_appeles > 0).map((a) => a.user_id)]);
  return [...cles].map((cle) => {
    const b = base.get(cle);
    const a = act.get(cle);
    const appeles = a?.nb_appeles ?? 0;
    const ventesN = b?.ventes ?? 0;
    return {
      cle,
      nom: b?.nom ?? a?.full_name ?? "?",
      ventes: ventesN,
      perdues: b?.perdues ?? 0,
      caSigne: b?.caSigne ?? 0,
      encaisse: b?.encaisse ?? 0,
      panierMoyen: b?.panierMoyen ?? null,
      commissions: b?.commissions ?? 0,
      commissionsVersees: b?.commissionsVersees ?? 0,
      appeles,
      inscrits: a?.nb_inscrits ?? 0,
      calls: a?.nb_calls ?? 0,
      tauxInscription: appeles > 0 ? (a?.nb_inscrits ?? 0) / appeles : null,
      tauxVente: appeles > 0 ? ventesN / appeles : null,
    };
  }).sort((a, b) => b.ventes - a.ventes || b.caSigne - a.caSigne || b.inscrits - a.inscrits);
}

// ── À corriger ─────────────────────────────────────────────────────────────

export interface ACorriger {
  ventesSansSetter: VenteDashboard[];
  ventesSansCloser: VenteDashboard[];
  ventesSansSource: VenteDashboard[];
  callsARenseigner: CallDashboard[];
}

export function aCorriger(ventes: VenteDashboard[], calls: CallDashboard[], maintenant = new Date()): ACorriger {
  return {
    // Une vente d'apporteur n'a pas de setter : ce n'est pas un oubli.
    ventesSansSetter: ventes.filter((v) =>
      intervenantsDe(v, "setter").length === 0 && intervenantsDe(v, "apporteur").length === 0 && v.canal !== "apporteur"),
    ventesSansCloser: ventes.filter((v) => intervenantsDe(v, "closer").length === 0),
    ventesSansSource: ventes.filter(estSansSource),
    callsARenseigner: calls.filter((c) => c.statut === "planifie" && !!c.prevu_le && new Date(c.prevu_le) < maintenant),
  };
}

// ── Formatage ──────────────────────────────────────────────────────────────

export function taux(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return `${Math.round(v * 100)} %`;
}

export function evolution(actuel: number, avant: number | undefined): string | undefined {
  if (avant === undefined || avant === 0) return undefined;
  const pct = Math.round(((actuel - avant) / Math.abs(avant)) * 100);
  return `${pct >= 0 ? "+" : ""}${pct} % vs conférence précédente`;
}
