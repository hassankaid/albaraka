// ─────────────────────────────────────────────────────────────────────────
// Modèle du tableau de bord Marketing V2.
//
// Une seule source de vérité : la fonction SQL `marketing_perf`, qui renvoie
// une ligne par couple canal × tunnel avec quatre MESURES BRUTES — leads,
// ventes, CA, dépense. Tout le reste (CPL, coût par vente, ROI) se calcule
// ici, à partir de sommes.
//
// C'est délibéré : un CPL moyen n'est pas la moyenne des CPL. En additionnant
// les mesures avant de diviser, un sous-total ne peut jamais contredire le
// total. Si les taux venaient du SQL, il faudrait les repondérer à chaque
// regroupement — et c'est là que les tableaux de bord se mettent à mentir.
// ─────────────────────────────────────────────────────────────────────────

/** Ligne brute renvoyée par `marketing_perf`. */
export interface PerfBrute {
  canal: string;
  tunnel: string;
  leads: number;
  ventes: number;
  ca: number;
  depense: number;
}

/** Les quatre mesures additionnables. */
export interface Mesures {
  leads: number;
  ventes: number;
  ca: number;
  depense: number;
}

/** Mesures + indicateurs dérivés. `null` = non calculable, à afficher « — ». */
export interface Kpis extends Mesures {
  /** Coût par lead. Nul sans dépense : un lead organique ne coûte pas 0 €, il n'a pas de coût publicitaire. */
  cpl: number | null;
  coutParVente: number | null;
  /** (CA − dépense) / dépense, en %. */
  roi: number | null;
  /** Part des leads transformés en vente, en %. Calculable partout, dépense ou non. */
  tauxConversion: number | null;
  /** CA rapporté par lead. Le seul rendement comparable entre un canal payant et un canal organique. */
  caParLead: number | null;
}

export const MESURES_NULLES: Mesures = { leads: 0, ventes: 0, ca: 0, depense: 0 };

export function additionner(lignes: Mesures[]): Mesures {
  return lignes.reduce(
    (a, l) => ({
      leads: a.leads + l.leads,
      ventes: a.ventes + l.ventes,
      ca: a.ca + l.ca,
      depense: a.depense + l.depense,
    }),
    { ...MESURES_NULLES },
  );
}

function ratio(numerateur: number, denominateur: number): number | null {
  return denominateur > 0 ? numerateur / denominateur : null;
}

export function calculerKpis(m: Mesures): Kpis {
  return {
    ...m,
    cpl: m.depense > 0 ? ratio(m.depense, m.leads) : null,
    coutParVente: m.depense > 0 ? ratio(m.depense, m.ventes) : null,
    roi: m.depense > 0 ? ((m.ca - m.depense) / m.depense) * 100 : null,
    tauxConversion: m.leads > 0 ? (m.ventes / m.leads) * 100 : null,
    caParLead: ratio(m.ca, m.leads),
  };
}

// ── Libellés ───────────────────────────────────────────────────────────────

export const CANAUX_MARKETING = ["meta_ads", "instagram_organic", "tiktok_organic", "direct", "tunnel_quiz_apporteurs"] as const;
export const TUNNELS = ["wa", "vsl", "quiz"] as const;

const LIB_CANAL: Record<string, string> = {
  meta_ads: "Meta Ads",
  instagram_organic: "Organique Instagram",
  tiktok_organic: "Organique TikTok",
  direct: "Accès direct",
  tunnel_quiz_apporteurs: "Tunnel Quiz Apporteurs",
  apporteur: "Apporteurs",
  non_attribue: "Non attribué",
  autre: "Autre",
};

const LIB_TUNNEL: Record<string, string> = {
  wa: "WhatsApp",
  vsl: "VSL",
  quiz: "Quiz apporteur",
  webinaire_legacy: "Webinaire (ancien)",
  apporteur: "Apporteurs",
  non_attribue: "Non attribué",
  autre: "Autre",
};

export const libelleCanal = (c: string): string => LIB_CANAL[c] ?? c;
export const libelleTunnel = (t: string): string => LIB_TUNNEL[t] ?? t;
export const libelleCombinaison = (c: string, t: string): string =>
  `${libelleCanal(c)} · ${libelleTunnel(t)}`;

// ── Regroupements ──────────────────────────────────────────────────────────

export interface Segment {
  cle: string;
  libelle: string;
  kpis: Kpis;
}

function regrouper(
  lignes: PerfBrute[],
  cle: (l: PerfBrute) => string,
  libelle: (l: PerfBrute) => string,
): Segment[] {
  const paquets = new Map<string, { libelle: string; lignes: PerfBrute[] }>();
  for (const l of lignes) {
    const k = cle(l);
    if (!paquets.has(k)) paquets.set(k, { libelle: libelle(l), lignes: [] });
    paquets.get(k)!.lignes.push(l);
  }
  return [...paquets.entries()]
    .map(([cle, p]) => ({ cle, libelle: p.libelle, kpis: calculerKpis(additionner(p.lignes)) }))
    .sort((a, b) => b.kpis.leads - a.kpis.leads);
}

/**
 * Les apports individuels d'un apporteur — sa recommandation, son Instagram, son
 * WhatsApp — ne sont pas un canal marketing : les comparer aux campagnes
 * fausserait le classement. Ils restent visibles sur leur propre ligne.
 *
 * Le tunnel quiz, lui, EN EST un : le prospect remplit un formulaire sur une
 * page dédiée, exactement comme sur une landing. Il entre donc au classement.
 */
export const estCanalMarketing = (l: PerfBrute): boolean =>
  l.canal !== "apporteur" && l.canal !== "non_attribue";

export const parCanal = (lignes: PerfBrute[]): Segment[] =>
  regrouper(lignes, (l) => l.canal, (l) => libelleCanal(l.canal));

export const parTunnel = (lignes: PerfBrute[]): Segment[] =>
  regrouper(lignes, (l) => l.tunnel, (l) => libelleTunnel(l.tunnel));

export const parCombinaison = (lignes: PerfBrute[]): Segment[] =>
  regrouper(
    lignes,
    (l) => `${l.canal}|${l.tunnel}`,
    (l) => libelleCombinaison(l.canal, l.tunnel),
  );

// ── Meilleur / pire ────────────────────────────────────────────────────────

export type Critere = "roi" | "caParLead";

export interface Classement {
  meilleur: Segment | null;
  pire: Segment | null;
  critere: Critere;
  /** Segments réellement comparés — ceux qui ont assez de matière pour être jugés. */
  compares: Segment[];
  /** Écartés faute de volume, avec la raison. Affiché pour qu'aucun segment ne disparaisse en silence. */
  ecartes: { libelle: string; raison: string }[];
  /** Pourquoi il n'y a pas de gagnant, le cas échéant. */
  motif: "classe" | "volume_insuffisant" | "aucun_ecart";
}

/** En dessous de ce nombre de leads, un segment n'est pas comparable : un seul lead qui achète donne un rendement absurde. */
export const SEUIL_LEADS = 5;

/**
 * Classe des segments du meilleur au pire.
 *
 * Le critère n'est pas imposé : le ROI n'a de sens que si TOUS les segments
 * comparés ont une dépense. Dès qu'un canal organique entre dans la comparaison,
 * on bascule sur le CA par lead — le seul rendement qui se compare entre un
 * canal payant et un canal gratuit.
 */
export function classer(segments: Segment[]): Classement {
  const ecartes: { libelle: string; raison: string }[] = [];
  const compares = segments.filter((s) => {
    if (s.kpis.leads < SEUIL_LEADS) {
      ecartes.push({ libelle: s.libelle, raison: `${s.kpis.leads} lead${s.kpis.leads > 1 ? "s" : ""}, trop peu pour juger` });
      return false;
    }
    return true;
  });

  const tousPayants = compares.length > 0 && compares.every((s) => s.kpis.depense > 0);
  const critere: Critere = tousPayants ? "roi" : "caParLead";
  const valeur = (s: Segment) => (critere === "roi" ? s.kpis.roi : s.kpis.caParLead) ?? -Infinity;

  const tries = [...compares].sort((a, b) => valeur(b) - valeur(a));

  // Tant qu'aucune vente n'est tombée, tous les segments valent zéro. Trier des
  // égalités et couronner le premier de la liste donnerait un « meilleur canal »
  // qui ne dit rien — et sur lequel on arbitrerait du budget. Dans ce cas il n'y
  // a pas de gagnant, et on le dit.
  const valeurs = tries.map(valeur).filter((v) => Number.isFinite(v));
  const aucunEcart = valeurs.length > 0 && Math.max(...valeurs) === Math.min(...valeurs);

  if (tries.length === 0) {
    return { meilleur: null, pire: null, critere, compares: tries, ecartes, motif: "volume_insuffisant" };
  }
  if (aucunEcart) {
    return { meilleur: null, pire: null, critere, compares: tries, ecartes, motif: "aucun_ecart" };
  }

  return {
    meilleur: tries[0],
    pire: tries.length > 1 ? tries[tries.length - 1] : null,
    critere,
    compares: tries,
    ecartes,
    motif: "classe",
  };
}

export const libelleCritere = (c: Critere): string =>
  c === "roi" ? "ROI" : "CA par lead";

// ── Formatage ──────────────────────────────────────────────────────────────

const NBSP = " ";

export function fmtEuros(v: number | null, decimales = 0): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales }) + NBSP + "€";
}

export function fmtNombre(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("fr-FR");
}

export function fmtPourcent(v: number | null, decimales = 0): string {
  if (v === null || !Number.isFinite(v)) return "—";
  const signe = v > 0 ? "+" : "";
  return signe + v.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales }) + NBSP + "%";
}
