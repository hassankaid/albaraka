// Rapport du lead scoring par conférence (décision 4 de Sidali, 28/10/2026) :
// pour chaque priorité et chaque tag, ce que deviennent les leads. Mêmes
// définitions que l'analyse du 12 au 25/10 (calculées en base, scoring_rapport).
import type { Feuille } from "@/lib/classeurXlsx";
import { PRIORITE_LABELS, reponsesCles, type Priorite } from "@/lib/leadScoring";
import { LEAD_STATUS_LABELS } from "@/lib/leadConfig";
import { nomCanal, nomTunnel } from "@/lib/leadSources";

export interface LigneRapport {
  axe: "priorite" | "tag" | "total";
  cle: string;
  leads: number;
  inscrits: number;
  pas_qualifies: number;
  injoignables: number;
  rdv: number;
  ventes: number;
  ca: number;
}

export interface LeadExporte {
  entree: string;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  canal: string | null;
  canal_precision: string | null;
  tunnel: string | null;
  conference_date: string | null;
  statut: string | null;
  setter: string | null;
  priorite: Priorite | null;
  score_100: number | null;
  reponses: Record<string, string> | null;
  saisi_setter: boolean;
  reinscrit: boolean;
  jeu_ven: boolean;
  score_70: number | null;
  rdv: boolean;
  ventes: number;
  ca: number;
}

const ORDRE = ["A", "B", "C", "D", "saisi_setter", "non_score", "reinscrit", "jeu_ven", "total"];

export function libelleSegment(cle: string): string {
  if (cle in PRIORITE_LABELS) return `${cle} — ${PRIORITE_LABELS[cle as Priorite]}`;
  return (
    {
      saisi_setter: "Saisi par le setter",
      non_score: "Non scoré",
      reinscrit: "Tag Réinscrit",
      jeu_ven: "Tag Jeu-Ven",
      total: "Total",
    } as Record<string, string>
  )[cle] ?? cle;
}

/** Les segments dans l'ordre de lecture : priorités, puis tags, puis total. */
export function ordonner(lignes: LigneRapport[]): LigneRapport[] {
  const rang = (c: string) => (ORDRE.indexOf(c) === -1 ? ORDRE.length : ORDRE.indexOf(c));
  return [...lignes].sort((a, b) => rang(a.cle) - rang(b.cle));
}

/** Pourcentage à une décimale, ou null s'il n'y a aucun lead. */
export function pct(n: number, total: number): number | null {
  return total > 0 ? Math.round((n / total) * 1000) / 10 : null;
}

export const ENTETE_RAPPORT = [
  "Segment", "Leads", "Inscrits conférence", "% inscrits", "Pas qualifiés", "% pas qualifiés",
  "Injoignables", "% injoignables", "RDV closing", "% RDV", "Ventes", "CA HT (€)",
];

export function ligneRapport(l: LigneRapport): (string | number | null)[] {
  return [
    libelleSegment(l.cle), l.leads, l.inscrits, pct(l.inscrits, l.leads), l.pas_qualifies, pct(l.pas_qualifies, l.leads),
    l.injoignables, pct(l.injoignables, l.leads), l.rdv, pct(l.rdv, l.leads), l.ventes, Number(l.ca),
  ];
}

export const ENTETE_LEADS = [
  "Entré le", "Nom", "E-mail", "Téléphone", "Source", "Tunnel", "Conférence", "Statut", "Setter",
  "Priorité", "Score /100", "Situation pro · Budget", "Tags signaux", "Saisi par le setter",
  "Score /70 (ancien)", "RDV closing", "Ventes", "CA HT (€)",
];

const dateParis = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });

export function ligneLead(l: LeadExporte): (string | number | null)[] {
  const source = l.canal ? (nomCanal(l.canal) ?? l.canal) + (l.canal_precision ? ` · ${l.canal_precision}` : "") : null;
  const tags = [l.reinscrit && "Réinscrit", l.jeu_ven && "Jeu-Ven"].filter(Boolean).join(", ");
  return [
    dateParis(l.entree), l.nom, l.email, l.telephone, source, l.tunnel ? (nomTunnel(l.tunnel) ?? l.tunnel) : null,
    l.conference_date, l.statut ? (LEAD_STATUS_LABELS[l.statut] ?? l.statut) : null, l.setter,
    l.priorite ?? "Non scoré", l.score_100, reponsesCles(l.reponses), tags || null, l.saisi_setter ? "Oui" : null,
    l.score_70, l.rdv ? "Oui" : "Non", l.ventes, Number(l.ca),
  ];
}

export function feuillesExport(titre: string, rapport: LigneRapport[], leads: LeadExporte[]): Feuille[] {
  return [
    {
      nom: "Rapport",
      lignes: [ENTETE_RAPPORT, ...ordonner(rapport).map(ligneRapport), [], [titre], [
        "Inscrits = inscrits à la conférence ou plus loin. Injoignables = pas de réponse ou faux numéro. RDV = appel réservé rattaché au lead (hors annulés). Ventes = ventes attribuées au lead.",
      ], ["« Saisi par le setter » : réponses saisies au téléphone, gardées à part du recalage de la grille."]],
      largeurs: [30, 8, 12, 10, 12, 12, 12, 12, 11, 8, 8, 11],
    },
    {
      nom: "Leads",
      lignes: [ENTETE_LEADS, ...leads.map(ligneLead)],
      largeurs: [15, 22, 28, 16, 22, 24, 12, 22, 20, 9, 10, 28, 16, 10, 10, 10, 8, 10],
    },
  ];
}
