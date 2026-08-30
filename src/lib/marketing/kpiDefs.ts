// Les sept indicateurs du tableau de bord, dans l'ordre où ils sont lus.
//
// `sens` dit dans quelle direction va le progrès, et c'est ce qui permet
// d'afficher correctement l'écart à l'objectif : dépasser son objectif de CPL
// est une mauvaise nouvelle, dépasser son objectif de CA en est une bonne.
import type { Kpis } from "./perf";
import { fmtEuros, fmtNombre, fmtPourcent } from "./perf";
import type { KpiObjectif } from "@/hooks/useMarketingPerf";

export type Sens = "haut" | "bas" | "neutre";

export interface DefKpi {
  cle: KpiObjectif;
  libelle: string;
  /** Rappel de la définition, affiché au survol — pour qu'on n'ait pas à le demander. */
  aide: string;
  sens: Sens;
  valeur: (k: Kpis) => number | null;
  format: (v: number | null) => string;
}

export const KPIS: DefKpi[] = [
  {
    cle: "leads",
    libelle: "Leads",
    aide: "Inscriptions enregistrées sur la période.",
    sens: "haut",
    valeur: (k) => k.leads,
    format: (v) => fmtNombre(v),
  },
  {
    cle: "cpl",
    libelle: "CPL",
    aide: "Dépense publicitaire divisée par le nombre de leads. Vide sans dépense : un lead organique n'a pas de coût publicitaire.",
    sens: "bas",
    valeur: (k) => k.cpl,
    format: (v) => fmtEuros(v, 2),
  },
  {
    cle: "ventes",
    libelle: "Ventes",
    aide: "Ventes rattachées à la période.",
    sens: "haut",
    valeur: (k) => k.ventes,
    format: (v) => fmtNombre(v),
  },
  {
    cle: "ca",
    libelle: "CA généré",
    aide: "Chiffre d'affaires hors taxes des ventes de la période.",
    sens: "haut",
    valeur: (k) => k.ca,
    format: (v) => fmtEuros(v),
  },
  {
    cle: "cout_par_vente",
    libelle: "Coût par vente",
    aide: "Dépense publicitaire divisée par le nombre de ventes.",
    sens: "bas",
    valeur: (k) => k.coutParVente,
    format: (v) => fmtEuros(v, 2),
  },
  {
    cle: "budget",
    libelle: "Budget ads dépensé",
    aide: "Dépense Meta Ads. Les autres canaux n'ont pas de budget à ce jour.",
    sens: "neutre",
    valeur: (k) => k.depense,
    format: (v) => fmtEuros(v, 2),
  },
  {
    cle: "roi",
    libelle: "ROI",
    aide: "(CA − dépense) ÷ dépense. 0 % signifie que la publicité s'est remboursée sans rien rapporter.",
    sens: "haut",
    valeur: (k) => k.roi,
    format: (v) => fmtPourcent(v),
  },
];

/** Écart à l'objectif, et s'il va dans le bon sens. */
export interface Ecart {
  absolu: number;
  pourcent: number | null;
  favorable: boolean;
}

export function calculerEcart(def: DefKpi, reel: number | null, objectif: number | null): Ecart | null {
  if (reel === null || objectif === null || !Number.isFinite(reel) || !Number.isFinite(objectif)) return null;
  const absolu = reel - objectif;
  const pourcent = objectif !== 0 ? (absolu / Math.abs(objectif)) * 100 : null;
  const favorable = def.sens === "bas" ? absolu <= 0 : def.sens === "haut" ? absolu >= 0 : true;
  return { absolu, pourcent, favorable };
}
