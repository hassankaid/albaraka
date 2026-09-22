// ─────────────────────────────────────────────────────────────────────────
// Tunnel « Al Baraka 200 €/mois » — contenu de la page.
//
// La copy vient du document de l'équipe marketing (« Copy LP offre 200 €/mois »)
// et est reprise telle quelle : bandeau, titre, sous-titre, puis la vidéo,
// l'agenda et le mur de témoignages.
// ─────────────────────────────────────────────────────────────────────────
import type { VimeoTestimonial } from "../lib/testimonials";

export const BANDEAU =
  "Pour les musulmans de 20 à 35 ans qui veulent construire une activité en ligne halal, même sans expérience";

export const TITRE =
  "Remplace ton salaire en construisant ton activité en ligne, halal, grâce au Process Al Baraka";

export const SOUS_TITRE =
  "Découvre comment des centaines de musulmans exactement comme toi ont construit leur indépendance financière, halal, en partant de zéro, et comment tu peux commencer, toi aussi, sans sortir 3000 € d'un coup.";

export const RDV_TITRE = "Réserve ton étude de faisabilité";

export const RDV_TEXTE =
  "On regarde ta situation ensemble, honnêtement. Si le Process Al Baraka peut vraiment t'aider, on te le dit. Si c'est pas le bon moment pour toi, on te le dit aussi. Choisis ton créneau ci-dessous.";

/**
 * Agenda de l'offre à 200 €/mois — un événement DISTINCT de ceux des autres
 * tunnels, pour que les rendez-vous qui en viennent soient identifiables dans
 * `calls.event_type`.
 *
 * Pas d'opt-in en amont sur ce tunnel (décision Hassan : la qualification se
 * fait pendant l'appel), donc rien à pré-remplir — le visiteur saisit ses
 * coordonnées directement dans Calendly.
 */
export const CALENDLY_URL = "https://calendly.com/d/d3n4-p7g-trn/al-baraka-200-mois";

/**
 * Les neuf témoignages demandés, dans l'ordre donné par Hassan.
 *
 * Identifiants, hash et proportions lus dans l'API Vimeo le 22/09/2026 : le
 * hash est OBLIGATOIRE (les vidéos du compte sont « masquées de Vimeo », sans
 * lui le lecteur refuse de démarrer) et les proportions sont les vraies
 * dimensions du fichier, sinon le cadre ajoute des bandes noires.
 *
 * ⚠️ Chaque vidéo doit aussi autoriser `event.albarakaecosysteme.com` dans ses
 * domaines Vimeo — cette page n'est servie que depuis ce domaine, et un
 * lecteur non autorisé y renvoie 403 sans que ça se voie ailleurs.
 *
 * Les légendes sont les prénoms : le document ne fournit pas de texte, et on
 * n'invente pas de résultat chiffré.
 */
export const TEMOIGNAGES_200: VimeoTestimonial[] = [
  { kind: "vimeo", id: "1218417464", hash: "56e814239f", ratio: "16 / 9",     title: "Sabrine" },
  { kind: "vimeo", id: "1218417479", hash: "416ffd5e0a", ratio: "9 / 16",     title: "Adil" },
  { kind: "vimeo", id: "1221742459", hash: "09be40cde3", ratio: "832 / 464",  title: "Sabrina" },
  { kind: "vimeo", id: "1218417494", hash: "4597e9f8d3", ratio: "1916 / 1080", title: "Mohamed" },
  { kind: "vimeo", id: "1218417477", hash: "8505a4f948", ratio: "9 / 16",     title: "Jebril" },
  { kind: "vimeo", id: "1218417480", hash: "116bab04ec", ratio: "9 / 16",     title: "Barbara" },
  { kind: "vimeo", id: "1218417485", hash: "26629d58c4", ratio: "9 / 16",     title: "Djounaid" },
  { kind: "vimeo", id: "1218417497", hash: "f7c7eacdf9", ratio: "478 / 850",  title: "Nourredine" },
  { kind: "vimeo", id: "1218417484", hash: "ed0ba4f77e", ratio: "16 / 9",     title: "Hedi" },
];
