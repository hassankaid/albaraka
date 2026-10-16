/**
 * Outil 6 — Ligne éditoriale & calendrier (étape 9, après « Piliers, formats et
 * calendrier »). Objectif : transformer des idées en un calendrier de 30 jours prêt
 * à suivre. Reprend la sous-niche, la méthode et les histoires (outil 5). Aides :
 * slides 165 à 177.
 *
 * Génération (cahier des charges) :
 *  - semaine type : lundi TOFU, mardi MOFU, mercredi histoire, jeudi TOFU,
 *    vendredi BOFU (témoignage), samedi MOFU, dimanche coulisses ;
 *  - sous 7 vidéos par semaine, on saute des jours en gardant l'alternance ;
 *  - piliers visés : éducatif 35 %, histoires 25 %, preuve et offre 20 %,
 *    coulisses 10 %, communauté 10 % ;
 *  - chaque idée n'est utilisée qu'une fois ; les jours « histoire » piochent
 *    dans les 4 histoires de l'outil 5.
 */
import { liste, lignes, ligneRemplie, texte, type DefinitionOutil, type Ligne, type Profil } from "./modele";
import { etapesMethode } from "./partage";
import { histoiresPourCalendrier } from "./outil5Histoires";

export const NIVEAUX = ["TOFU", "MOFU", "BOFU"];
export const PILIERS = ["Éducatif", "Histoires et inspiration", "Preuve et offre", "Coulisses", "Communauté"];
export const STATUTS = ["À faire", "Tourné", "Publié"];

type Creneau = { niveau: string; pilier: string | ((semaine: number) => string); source: "tofu" | "mofu" | "bofu" | "histoire" | "coulisses"; cta: string };

/** La semaine type, du lundi (1) au dimanche (0). */
const SEMAINE: Record<number, Creneau> = {
  1: { niveau: "TOFU", pilier: "Éducatif", source: "tofu", cta: "Abonnez-vous pour la suite" },
  2: { niveau: "MOFU", pilier: "Éducatif", source: "mofu", cta: "Enregistrez cette vidéo" },
  3: { niveau: "MOFU", pilier: "Histoires et inspiration", source: "histoire", cta: "Écrivez-moi en message privé si vous vous reconnaissez" },
  4: { niveau: "TOFU", pilier: "Histoires et inspiration", source: "tofu", cta: "Abonnez-vous pour la suite" },
  5: { niveau: "BOFU", pilier: "Preuve et offre", source: "bofu", cta: "Écrivez-moi [MOT] en message privé" },
  // une semaine sur deux, le samedi sert la preuve : on approche les 20 % visés
  6: { niveau: "MOFU", pilier: (s) => (s % 2 ? "Preuve et offre" : "Communauté"), source: "mofu", cta: "Dites-moi en commentaire…" },
  0: { niveau: "TOFU", pilier: "Coulisses", source: "coulisses", cta: "Abonnez-vous pour la suite" },
};

/** Les jours publiés selon le rythme (vidéos par semaine), en gardant l'alternance des niveaux. */
export const JOURS_PAR_RYTHME: Record<number, number[]> = {
  3: [1, 3, 5],
  4: [1, 2, 3, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 0],
};

function dateIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Le calendrier de 30 jours, à partir des idées, du rythme et de la date de début. */
export function genererCalendrier(p: Profil, aujourdhui = new Date()): Ligne[] {
  const rythme = Math.min(7, Math.max(3, Number(texte(p, "contenu.rythme")) || 7));
  const jours = JOURS_PAR_RYTHME[rythme];
  const debutTexte = texte(p, "contenu.debut");
  const debut = debutTexte ? new Date(`${debutTexte}T12:00:00`) : new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate(), 12);
  const piles: Record<string, string[]> = {
    tofu: [...liste(p, "contenu.tofu")], mofu: [...liste(p, "contenu.mofu")], bofu: [...liste(p, "contenu.bofu")],
    histoire: histoiresPourCalendrier(p), coulisses: [],
  };
  const calendrier: Ligne[] = [];
  for (let j = 0; j < 30; j++) {
    const d = new Date(debut);
    d.setDate(debut.getDate() + j);
    if (!jours.includes(d.getDay())) continue;
    const c = SEMAINE[d.getDay()];
    const semaine = Math.floor(j / 7);
    calendrier.push({
      date: dateIso(d),
      niveau: c.niveau,
      pilier: typeof c.pilier === "function" ? c.pilier(semaine) : c.pilier,
      format: "Reel",
      sujet: piles[c.source].shift() ?? (c.source === "coulisses" ? "Coulisses : votre quotidien, votre façon de travailler" : ""),
      accroche: "",
      cta: c.cta,
      declinaisons: "",
      statut: "À faire",
      vues: "",
    });
  }
  return calendrier;
}

/** La répartition réelle des piliers d'un calendrier, en %. */
export function repartitionPiliers(cal: Ligne[]): Record<string, number> {
  const n = cal.length || 1;
  return Object.fromEntries(PILIERS.map((pl) => [pl, Math.round((cal.filter((l) => l.pilier === pl).length / n) * 100)]));
}

const dateCourte = (iso: string) => {
  const d = iso ? new Date(`${iso}T12:00:00`) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : iso;
};

export const outil6Calendrier: DefinitionOutil = {
  code: "liberty_calendrier",
  numero: 6,
  etape: "Étape 9",
  nom: "Ligne éditoriale & calendrier",
  objectif: "Transformer vos idées en un calendrier de 30 jours prêt à suivre.",
  fichier: "Liberty_Etape9_Ligne_editoriale_calendrier",
  ecrans: [
    {
      titre: "Vos idées",
      intro: "Votre contenu fonctionne comme un entonnoir : large en haut pour attirer, précis en bas pour convertir. 10 idées pour chaque niveau.",
      champs: [
        { cle: "contenu.tofu", type: "liste", fixe: 10, libelle: "10 sujets TOFU : votre marché", aide: "Des sujets larges, qui touchent beaucoup de monde. Objectif : vous faire découvrir.", exemple: "3 erreurs qui vous empêchent d'être en forme" },
        { cle: "contenu.mofu", type: "liste", fixe: 10, libelle: "10 sujets MOFU : votre segment", aide: "Des sujets plus précis, pour trier l'audience et garder les personnes concernées.", exemple: "Prendre du muscle : l'erreur n°1 à la salle" },
        { cle: "contenu.bofu", type: "liste", fixe: 10, libelle: "10 sujets BOFU : votre sous-niche", aide: "Des sujets ultra-précis, des témoignages, votre offre. Objectif : déclencher le message privé.", exemple: "Hommes minces : comment Karim a pris 8 kg en 90 jours" },
        {
          cle: "contenu.themes", type: "blocs", nomBloc: "Thème", ajout: "Ajouter un thème", initial: 3, max: 5,
          libelle: "Vos 3 à 5 thèmes principaux", aide: "Reliés aux étapes de votre méthode.",
          colonnes: [
            { cle: "theme", libelle: "Le thème", type: "court", exemple: "La nutrition pour prendre du muscle" },
            { cle: "etape", libelle: "L'étape de votre méthode", type: "choix", options: (p) => etapesMethode(p).map((e) => e.nom).filter(Boolean) },
          ],
        },
        { cle: "contenu.rythme", type: "choix", options: ["3", "4", "5", "6", "7"], libelle: "Votre rythme : vidéos par semaine", aide: "L'objectif est une vidéo par jour. Si c'est trop au début, commencez par 3 par semaine. Ce qui compte, c'est de ne jamais arrêter." },
        { cle: "contenu.debut", type: "date", libelle: "Date de début" },
      ],
    },
    {
      titre: "La génération",
      intro: "L'outil répartit vos idées sur 30 jours selon votre rythme : lundi TOFU, mardi MOFU, mercredi histoire, jeudi TOFU, vendredi BOFU (témoignage), samedi MOFU, dimanche coulisses. Sous 7 vidéos par semaine, il saute des jours en gardant l'alternance. Chaque idée n'est utilisée qu'une fois, et les jours « histoire » reprennent vos 4 histoires (outil 5).",
      champs: [
        {
          cle: "action.generer", type: "action", libelle: "Votre calendrier de 30 jours", bouton: "Générer mon calendrier",
          aide: "Piliers visés : éducatif 35 %, histoires 25 %, preuve et offre 20 %, coulisses 10 %, communauté 10 %.",
          confirmer: (p) => (lignes(p, "contenu.calendrier").some(ligneRemplie) ? "Un calendrier existe déjà : il sera remplacé par un nouveau calendrier, généré à partir de vos idées. Vos statuts et vos vues seront perdus." : null),
          executer: (p) => ({ "contenu.calendrier": genererCalendrier(p) }),
        },
        {
          cle: "info.repartition", type: "info", libelle: "",
          rendu: (p) => {
            const cal = lignes(p, "contenu.calendrier").filter(ligneRemplie);
            if (!cal.length) return null;
            const r = repartitionPiliers(cal);
            return { ton: "rappel", titre: `${cal.length} publications générées`, texte: PILIERS.map((pl) => `${pl} : ${r[pl]} %`).join(" · ") + "\nRetrouvez-les à l'écran suivant, ligne par ligne." };
          },
        },
      ],
    },
    {
      titre: "Votre calendrier",
      intro: "Chaque ligne est modifiable et déplaçable. Pendant vos 30 jours, mettez à jour le statut et les vues. L'accroche s'écrit à l'étape 10.",
      apercu: true,
      champs: [
        {
          cle: "contenu.calendrier", type: "blocs", nomBloc: "Publication", ajout: "Ajouter une publication", tableau: true, max: 60,
          libelle: "Jour par jour",
          filtres: [{ colonne: "niveau", libelle: "Niveau", options: NIVEAUX }, { colonne: "statut", libelle: "Statut", options: STATUTS }],
          colonnes: [
            { cle: "date", libelle: "Date", type: "date" },
            { cle: "niveau", libelle: "Niveau", type: "choix", options: NIVEAUX },
            { cle: "pilier", libelle: "Pilier", type: "choix", options: PILIERS },
            { cle: "format", libelle: "Format", type: "choix", options: ["Reel", "Carrousel"] },
            { cle: "sujet", libelle: "Sujet", type: "court" },
            { cle: "accroche", libelle: "Accroche (étape 10)", type: "court" },
            { cle: "cta", libelle: "Appel à l'action", type: "court" },
            { cle: "declinaisons", libelle: "Déclinaisons", type: "court", exemple: "Carrousel, 3 stories" },
            { cle: "statut", libelle: "Statut", type: "choix", options: STATUTS },
            { cle: "vues", libelle: "Vues", type: "nombre" },
          ],
        },
      ],
    },
  ],
  document: (p: Profil) => {
    const cal = lignes(p, "contenu.calendrier").filter(ligneRemplie);
    const r = repartitionPiliers(cal);
    return {
      titre: "Ligne éditoriale & calendrier de 30 jours",
      sections: [
        {
          titre: "Votre ligne éditoriale",
          blocs: [
            { t: "tableau", colonnes: ["Thème", "Étape de la méthode"], lignes: lignes(p, "contenu.themes").filter(ligneRemplie).map((l) => [l.theme ?? "", l.etape ?? ""]) },
            { t: "champ", libelle: "Rythme", valeur: texte(p, "contenu.rythme") ? `${texte(p, "contenu.rythme")} vidéos par semaine` : "" },
            { t: "champ", libelle: "Début", valeur: texte(p, "contenu.debut") ? dateCourte(texte(p, "contenu.debut")) : "" },
            { t: "champ", libelle: "Piliers", valeur: cal.length ? PILIERS.map((pl) => `${pl} ${r[pl]} %`).join(", ") : "" },
          ],
        },
        {
          titre: "Vos idées",
          blocs: [
            { t: "liste", libelle: "TOFU (marché)", items: liste(p, "contenu.tofu") },
            { t: "liste", libelle: "MOFU (segment)", items: liste(p, "contenu.mofu") },
            { t: "liste", libelle: "BOFU (sous-niche)", items: liste(p, "contenu.bofu") },
            { t: "saut" },
          ],
        },
        {
          titre: `Calendrier (${cal.length} publications)`,
          blocs: [{
            t: "tableau", colonnes: ["Date", "Niveau", "Pilier", "Format", "Sujet", "Accroche", "Statut"],
            lignes: cal.map((l) => [dateCourte(l.date ?? ""), l.niveau ?? "", l.pilier ?? "", l.format ?? "", l.sujet ?? "", l.accroche ?? "", l.statut ?? ""]),
          }],
        },
      ],
    };
  },
};
