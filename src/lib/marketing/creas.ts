// ─────────────────────────────────────────────────────────────────────────
// Performance par créa (demande de Skalesy, 03/11/2026).
//
// `marketing_par_crea` renvoie une ligne par PUB, avec des mesures brutes :
// dépense, leads, inscrits, RDV, ventes, CA. Comme pour le reste du tableau de
// bord, les taux se calculent ici, APRÈS addition : le coût par vente d'une créa
// diffusée en cinq pubs n'est pas la moyenne des cinq coûts par vente.
//
// Une « créa », c'est le nom de la pub sur une plateforme : Snap diffuse la même
// vidéo dans plusieurs pubs (cinq « Vidéo 4 » le 03/11), qu'il faut lire ensemble.
// Une pub sans nom connu reste seule, sous son identifiant.
// ─────────────────────────────────────────────────────────────────────────

export type Plateforme = "meta" | "snap";

/** Ligne brute renvoyée par `marketing_par_crea`. */
export interface PubBrute {
  plateforme: Plateforme;
  pub_id: string | null;
  pub_nom: string | null;
  groupe_nom: string | null;
  campagne_nom: string | null;
  depense: number;
  impressions: number;
  clics: number;
  leads: number;
  inscrits: number;
  rdv: number;
  ventes: number;
  ca: number;
}

export interface LigneCrea {
  cle: string;
  plateforme: Plateforme;
  nom: string;
  /** Identifiants des pubs regroupées (null = leads dont la pub est inconnue). */
  pubIds: (string | null)[];
  depense: number;
  impressions: number;
  clics: number;
  leads: number;
  inscrits: number;
  rdv: number;
  ventes: number;
  ca: number;
  cpl: number | null;
  coutParVente: number | null;
  /** CA ÷ dépense : 3 veut dire 3 € de CA pour 1 € de pub. */
  roas: number | null;
  tauxInscription: number | null;
}

export const NOM_PLATEFORME: Record<Plateforme, string> = { meta: "Meta", snap: "Snapchat" };

export function nomPub(p: Pick<PubBrute, "pub_id" | "pub_nom">): string {
  if (p.pub_nom?.trim()) return p.pub_nom.trim();
  if (!p.pub_id) return "Pub non identifiée";
  return `Pub ${p.pub_id.slice(0, 8)}…`;
}

function deriver(l: Omit<LigneCrea, "cpl" | "coutParVente" | "roas" | "tauxInscription">): LigneCrea {
  return {
    ...l,
    cpl: l.depense > 0 && l.leads > 0 ? l.depense / l.leads : null,
    coutParVente: l.depense > 0 && l.ventes > 0 ? l.depense / l.ventes : null,
    roas: l.depense > 0 ? l.ca / l.depense : null,
    tauxInscription: l.leads > 0 ? (l.inscrits / l.leads) * 100 : null,
  };
}

/** Une ligne par créa (nom × plateforme), ou par pub si `parPub`. */
export function regrouper(pubs: PubBrute[], parPub = false): LigneCrea[] {
  const groupes = new Map<string, Omit<LigneCrea, "cpl" | "coutParVente" | "roas" | "tauxInscription">>();
  for (const p of pubs) {
    const nom = nomPub(p);
    const cle = parPub || !p.pub_nom?.trim()
      ? `${p.plateforme}|id|${p.pub_id ?? ""}`
      : `${p.plateforme}|nom|${nom.toLowerCase()}`;
    const g = groupes.get(cle) ?? {
      cle, plateforme: p.plateforme, nom, pubIds: [],
      depense: 0, impressions: 0, clics: 0, leads: 0, inscrits: 0, rdv: 0, ventes: 0, ca: 0,
    };
    g.pubIds.push(p.pub_id);
    g.depense += Number(p.depense) || 0;
    g.impressions += Number(p.impressions) || 0;
    g.clics += Number(p.clics) || 0;
    g.leads += Number(p.leads) || 0;
    g.inscrits += Number(p.inscrits) || 0;
    g.rdv += Number(p.rdv) || 0;
    g.ventes += Number(p.ventes) || 0;
    g.ca += Number(p.ca) || 0;
    groupes.set(cle, g);
  }
  return [...groupes.values()].map(deriver);
}

export function total(lignes: LigneCrea[]): LigneCrea {
  return deriver({
    cle: "total", plateforme: "meta", nom: "Total", pubIds: [],
    depense: lignes.reduce((a, l) => a + l.depense, 0),
    impressions: lignes.reduce((a, l) => a + l.impressions, 0),
    clics: lignes.reduce((a, l) => a + l.clics, 0),
    leads: lignes.reduce((a, l) => a + l.leads, 0),
    inscrits: lignes.reduce((a, l) => a + l.inscrits, 0),
    rdv: lignes.reduce((a, l) => a + l.rdv, 0),
    ventes: lignes.reduce((a, l) => a + l.ventes, 0),
    ca: lignes.reduce((a, l) => a + l.ca, 0),
  });
}

export type ColonneTri = "nom" | "depense" | "leads" | "cpl" | "inscrits" | "rdv" | "ventes" | "ca" | "coutParVente" | "roas";

/** Les valeurs vides (« — ») vont toujours en bas, quel que soit le sens. */
export function trier(lignes: LigneCrea[], col: ColonneTri, desc: boolean): LigneCrea[] {
  return [...lignes].sort((a, b) => {
    if (col === "nom") return desc ? b.nom.localeCompare(a.nom, "fr") : a.nom.localeCompare(b.nom, "fr");
    const va = a[col] as number | null;
    const vb = b[col] as number | null;
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    return desc ? vb - va : va - vb;
  });
}

// ── Périodes ────────────────────────────────────────────────────────────

export type PeriodeCrea = "7j" | "14j" | "30j" | "mois" | "mois_prec";

export const LIBELLES_PERIODE: Record<PeriodeCrea, string> = {
  "7j": "7 derniers jours",
  "14j": "14 derniers jours",
  "30j": "30 derniers jours",
  mois: "Mois en cours",
  mois_prec: "Mois précédent",
};

const jourParis = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

function decaler(ymd: string, jours: number): string {
  const d = new Date(ymd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

/** Bornes incluses, en jours de Paris. « 7 derniers jours » = aujourd'hui et les 6 jours d'avant. */
export function bornesPeriode(p: PeriodeCrea, maintenant = new Date()): { from: string; to: string } {
  const aujourdhui = jourParis(maintenant);
  if (p === "7j") return { from: decaler(aujourdhui, -6), to: aujourdhui };
  if (p === "14j") return { from: decaler(aujourdhui, -13), to: aujourdhui };
  if (p === "30j") return { from: decaler(aujourdhui, -29), to: aujourdhui };
  const premier = aujourdhui.slice(0, 8) + "01";
  if (p === "mois") return { from: premier, to: aujourdhui };
  const finPrec = decaler(premier, -1);
  return { from: finPrec.slice(0, 8) + "01", to: finPrec };
}
