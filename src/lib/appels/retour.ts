// Analyse d'appels, V1 coach (maquette validée par Hassan le 25/10/2026).
// L'IA rend un brouillon (analyse_ia) ; le coach le corrige (analyse_coach) puis le valide.
// Ici : la note recalculée à chaque correction (poids de la grille, jamais par l'IA), le
// nombre de corrections, et le texte transmis à l'élève, construit à partir des champs
// corrigés pour que chaque correction du coach s'y retrouve.

export interface Citation {
  tour?: number;
  texte?: string;
  citation?: string;
  /** secondes dans l'appel, ajouté par la machine après vérification */
  horodatage?: number;
}

/** Un point d'une liste à cocher (les 8 explications de fin d'appel, référentiel v0.5). */
export interface PointListe extends Citation {
  n: number;
  libelle: string;
  fait: "oui" | "partiel" | "non";
}

export interface Etape {
  code: string;
  nom: string;
  poids: number;
  note: number;
  justification: string;
  citations?: Citation[];
  /** étape notée par une liste (fin d'appel) : la note vient des points cochés */
  liste?: PointListe[];
}

export interface Regle extends Citation {
  code: string;
  statut: string;
  mesure?: string;
  commentaire?: string;
}

export interface Objection extends Citation {
  nom: string;
  care_applique?: string;
  commentaire?: string;
}

export interface PointFort extends Citation {
  titre: string;
  pourquoi: string;
  etape?: string;
  regle?: string;
  retire?: boolean;
}

export interface Axe extends Citation {
  titre: string;
  probleme: string;
  pourquoi?: string;
  formulation_ideale: string;
  etape?: string;
  retire?: boolean;
}

export interface ErreurCritique extends Citation {
  titre: string;
  explication: string;
}

export interface FicheCloser {
  prenom?: string;
  ville_ou_pays?: string;
  situation?: string;
  budget?: string;
  score_couleur?: string;
  motivations?: string;
  conjoint?: string;
  notes_closer?: string;
}

/** Un point à travailler au format de la coach (référentiel v0.6, 24/11/2026). */
export interface PointRetour extends Citation {
  titre: string;
  constat: string;
  /** la phrase exacte à dire la prochaine fois (affichée avec 👉) */
  formulation?: string;
  suite?: string;
  moins_grave?: boolean;
  retire?: boolean;
}

export interface Reussite {
  texte: string;
  retire?: boolean;
}

/** Le retour au format de Sabrina : verdict, réussites, points à travailler, 3 priorités. */
export interface RetourCoach {
  verdict: string;
  point_principal?: { titre: string; texte: string; retire?: boolean } | null;
  reussites: Reussite[];
  points: PointRetour[];
  priorites: string[];
}

export interface Analyse {
  type_coherent?: boolean;
  remarque_type?: string;
  prospect_informe?: boolean;
  erreurs_critiques: ErreurCritique[];
  etapes: Etape[];
  regles: Regle[];
  mots_faiblesse?: Citation[];
  objections: Objection[];
  analyse_globale: string;
  points_forts: PointFort[];
  axes: Axe[];
  conseil_prioritaire: { etape?: string; texte: string };
  encouragement: string;
  fiche_closer?: FicheCloser;
  note_etapes: number;
  penalite: number;
  note_globale: number;
  alerte_duree?: string | null;
  /** format « coach » (v0.6) : le retour lu par l'élève, sans note */
  retour?: RetourCoach;
  prospect_absent?: boolean;
  clos_sans_budget?: boolean;
}

export interface Tour {
  n: number;
  loc: "SETTER" | "PROSPECT";
  texte: string;
  t0: number;
  t1: number;
  doute?: boolean;
}

export type StatutAppel = "depose" | "en_cours" | "a_valider" | "valide" | "erreur";

export const LIBELLE_STATUT: Record<StatutAppel, string> = {
  depose: "Dépôt en cours",
  en_cours: "Analyse en cours",
  a_valider: "Prêt à valider",
  valide: "Validé",
  erreur: "Erreur",
};

/** Les étapes de la machine, dans l'ordre (appel_job_maj). */
export const ETAPES_MACHINE = [
  { cle: "demarrage", nom: "Démarrage" },
  { cle: "reception", nom: "Fichier reçu" },
  { cle: "transcription", nom: "Transcription" },
  { cle: "voix", nom: "Voix séparées" },
  { cle: "analyse", nom: "Analyse avec la grille" },
] as const;

export function rangEtape(etape: string | null | undefined): number {
  const i = ETAPES_MACHINE.findIndex((e) => e.cle === etape);
  return i < 0 ? 0 : i;
}

export const TYPES_APPEL = [
  { cle: "setting_ads", nom: "Setting ADS", description: "Appel découverte après formulaire pub", ouvert: true },
  { cle: "setting_organique", nom: "Setting Organique", description: "Bientôt", ouvert: false },
  { cle: "closing_carte", nom: "Closing À la carte", description: "Bientôt", ouvert: false },
  { cle: "closing_pass", nom: "Closing Pass / Liberty", description: "Bientôt", ouvert: false },
] as const;

export const nomType = (cle: string) => TYPES_APPEL.find((t) => t.cle === cle)?.nom ?? cle;

/** « 6:24 » */
export function mmss(s: number): string {
  const t = Math.max(0, Math.round(s || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

/** « 6 min 24 » */
export function duree(s: number | null | undefined): string {
  if (!s) return "—";
  const t = Math.round(s);
  return `${Math.floor(t / 60)} min ${String(t % 60).padStart(2, "0")}`;
}

const arrondi = (x: number) => Math.round(x * 10) / 10;

/** « 1 point » ou « 3 points » : la pénalité d'enregistrement est réglée dans le référentiel. */
export const pointsEnMoins = (n: number) => `${n} point${n > 1 ? "s" : ""}`;

/** Note sur 100 : chaque note sur 10 × son poids, moins la pénalité (enregistrement non annoncé). */
export function recalculer(a: Analyse): Analyse {
  const noteEtapes = a.etapes.reduce((s, e) => s + Math.max(0, Math.min(10, e.note)) * e.poids, 0) / 10;
  return { ...a, note_etapes: arrondi(noteEtapes), note_globale: arrondi(Math.max(0, noteEtapes - (a.penalite || 0))) };
}

const meme = (x?: string, y?: string) => (x ?? "").trim() === (y ?? "").trim();

/** Combien de corrections dans le retour au format coach (verdict, réussites, points, priorités). */
function correctionsRetour(ia: RetourCoach | undefined, coach: RetourCoach | undefined): number {
  if (!ia || !coach) return 0;
  let n = 0;
  if (!meme(coach.verdict, ia.verdict)) n++;
  const pc = coach.point_principal;
  const pi = ia.point_principal;
  if (!!pc?.retire !== !!pi?.retire || !meme(pc?.titre, pi?.titre) || !meme(pc?.texte, pi?.texte)) n++;
  const comparer = <T extends { retire?: boolean }>(c: T[], i: T[]) => {
    c.forEach((x, k) => {
      const y = i[k];
      if (!y) n++; // ajouté par le coach
      else if (!!x.retire !== !!y.retire) n++;
      else if (JSON.stringify({ ...x, retire: undefined }) !== JSON.stringify({ ...y, retire: undefined })) n++;
    });
  };
  comparer(coach.reussites, ia.reussites);
  comparer(coach.points, ia.points);
  coach.priorites.forEach((p, k) => {
    if (!meme(p, ia.priorites[k])) n++;
  });
  return n;
}

/** Combien de corrections le coach a faites par rapport au brouillon de l'IA. */
export function compterCorrections(ia: Analyse, coach: Analyse): number {
  let n = 0;
  coach.etapes.forEach((e, i) => {
    const d = ia.etapes[i];
    if (!d) return;
    if (e.note !== d.note) n++;
    if (!meme(e.justification, d.justification)) n++;
  });
  const listes = (a: PointFort[] | Axe[], b: PointFort[] | Axe[]) =>
    a.forEach((x, i) => {
      const y = b[i];
      if (!y) return;
      if (x.retire !== y.retire) n++;
      else if (JSON.stringify({ ...x, retire: undefined }) !== JSON.stringify({ ...y, retire: undefined })) n++;
    });
  listes(coach.points_forts, ia.points_forts);
  listes(coach.axes, ia.axes);
  if (!meme(coach.analyse_globale, ia.analyse_globale)) n++;
  if (!meme(coach.conseil_prioritaire?.texte, ia.conseil_prioritaire?.texte)) n++;
  if (!meme(coach.encouragement, ia.encouragement)) n++;
  if ((coach.penalite || 0) !== (ia.penalite || 0)) n++;
  n += correctionsRetour(ia.retour, coach.retour);
  return n;
}

/** La phrase exacte entre « » (l'IA l'écrit parfois sans). */
export const entreGuillemets = (f: string) => {
  const t = f.trim().replace(/^(👉\s*)+/u, "");
  return t.startsWith("«") ? t : `« ${t.replace(/^«\s*|\s*»$/g, "")} »`;
};

/** Le retour au format de la coach (v0.6) : pas de note, pas de détail par étape (décision 1). */
export function texteRetourCoach(r: RetourCoach, prenom: string): string {
  const l: string[] = ["📞 Analyse de ton appel", "", `Salamou ‘alaykoum ${prenom},`, ""];
  if (r.verdict?.trim()) l.push(r.verdict.trim(), "");
  const pp = r.point_principal;
  if (pp && !pp.retire && pp.titre?.trim()) l.push(`⚠️ Le point principal : ${pp.titre.trim()}`, (pp.texte ?? "").trim(), "");
  const reussites = (r.reussites ?? []).filter((x) => !x.retire && (x.texte ?? "").trim());
  if (reussites.length) l.push("✅ Ce qui a bien marché", ...reussites.map((x) => `• ${(x.texte ?? "").trim()}`), "");
  const points = (r.points ?? []).filter((p) => !p.retire);
  if (points.length) l.push("⚠️ Points à travailler", "");
  points.forEach((p, i) => {
    const titre = (p.titre ?? "").trim();
    l.push(`${i + 1}. ${titre}${p.moins_grave && !/moins grave/i.test(titre) ? " (moins grave)" : ""}`);
    if (p.constat?.trim()) l.push(p.constat.trim());
    if (p.formulation?.trim()) l.push(`👉 ${entreGuillemets(p.formulation)}`);
    if (p.suite?.trim()) l.push(p.suite.trim());
    l.push("");
  });
  const priorites = (r.priorites ?? []).filter((x) => (x ?? "").trim());
  if (priorites.length) l.push("🎯 Pour ton prochain appel, en priorité", ...priorites.map((x, i) => `${i + 1}. ${x.trim()}`));
  return l.join("\n").trim();
}

/** Le texte que le coach transmet à l'élève (copier ou PDF). */
export function texteEleve(a: Analyse, prenom: string): string {
  if (a.retour) return texteRetourCoach(a.retour, prenom);
  const note = Math.round(a.note_globale);
  const lignes: string[] = [];
  let entete = `Note : ${note}/100`;
  if (a.penalite) entete += ` (${Math.round(a.note_etapes)} sur les étapes, −${a.penalite} car le prospect n'a pas été prévenu de l'enregistrement)`;
  lignes.push(entete + "." + (a.alerte_duree ? ` ${a.alerte_duree}.` : ""));
  lignes.push("", `Salamou ‘alaykoum ${prenom}, voici le retour sur ton appel.`, "", (a.analyse_globale ?? "").trim());
  const forts = (a.points_forts ?? []).filter((p) => !p.retire);
  if (forts.length) {
    lignes.push("", "Ce que tu as bien fait :");
    for (const p of forts) lignes.push(`• ${p.titre ?? ""} : ${(p.pourquoi ?? "").trim()}${p.citation ? ` (« ${p.citation} »)` : ""}`);
  }
  const axes = (a.axes ?? []).filter((x) => !x.retire);
  if (axes.length) {
    lignes.push("", "À améliorer :");
    axes.forEach((x, i) => {
      lignes.push(`${i + 1}. ${x.titre ?? ""}${(x.probleme ?? "").trim() ? ` : ${(x.probleme ?? "").trim()}` : ""}`);
      if ((x.formulation_ideale ?? "").trim()) lignes.push(`   À dire la prochaine fois : « ${(x.formulation_ideale ?? "").trim().replace(/^«\s*|\s*»$/g, "")} »`);
    });
  }
  if (a.conseil_prioritaire?.texte?.trim()) lignes.push("", `Ton conseil prioritaire : ${a.conseil_prioritaire.texte.trim()}`);
  lignes.push("", "Le détail par étape :");
  for (const e of a.etapes) {
    // étape à liste (fin d'appel) : l'élève voit ce qui manquait, pas seulement la note
    const detail = e.liste?.length && e.justification?.trim() ? ` (${e.justification.trim().replace(/\.$/, "")})` : "";
    lignes.push(`• ${e.code} ${e.nom} : ${e.note.toLocaleString("fr-FR")}/10${detail}`);
  }
  if (a.encouragement?.trim()) lignes.push("", a.encouragement.trim());
  return lignes.join("\n");
}

/** Prénom affichable à partir du nom complet (« YANIS BENALI » → « Yanis »). */
export function prenom(nomComplet: string | null | undefined): string {
  const p = (nomComplet ?? "").trim().split(/\s+/)[0] ?? "";
  return p ? p.charAt(0).toLocaleUpperCase("fr-FR") + p.slice(1).toLocaleLowerCase("fr-FR") : "";
}

/** Les tours tels que le coach les voit (voix inversées si besoin). */
export function avecVoix(tours: Tour[], inversees: boolean): Tour[] {
  if (!inversees) return tours;
  return tours.map((t) => ({ ...t, loc: t.loc === "SETTER" ? "PROSPECT" : "SETTER" }));
}

/** Le tour qu'on entend à l'instant `t` (le dernier commencé). */
export function tourA(tours: Tour[], t: number): number {
  let n = -1;
  for (const x of tours) {
    if (x.t0 <= t + 0.05) n = x.n;
    else break;
  }
  return n;
}
