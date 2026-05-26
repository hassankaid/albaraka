/**
 * Mode démo M3 — 10 cas pré-remplis (Argent · Relations · Santé).
 *
 * Transposition fidèle des `DEMO_NICHES` Sidali V2.
 * Cake Design = cas verbatim complet. Les 9 autres sont en placeholder
 * `ready: false` — transcription mécanique au prochain lot.
 *
 * Mode démo : state non persisté en BDD (cf. usePersistedState).
 */

import type { M3State } from "./types";

export interface M3DemoCase {
  key: string;
  segment: "argent" | "relations" | "sante";
  emoji: string;
  title: string;
  summary: string;
  ready: boolean;
  patch?: Partial<M3State>;
}

// ── Cake Design (verbatim Sidali) ──────────────────────────────────────────
const CAKE_DESIGN_PATCH: Partial<M3State> = {
  current_step: "promesse",
  market_type: "b2c_transfo",
  m1_data: {
    source: "demo_cake_design",
    sous_niche_2: {
      phrase_finale: "Cake designers passionnées qui veulent vivre du cake design haut de gamme depuis chez elles",
      cible: "Femmes musulmanes francophones, 28-40 ans, déjà passionnées de pâtisserie, en reconversion ou en congé parental, qui font des gâteaux pour leur entourage et n'arrivent pas à les vendre à un prix juste",
      douleur: "Vendent leurs gâteaux 80€ alors qu'ils en valent 400€, ne savent pas se positionner sur le wedding cake haut de gamme, manquent de méthode pour passer de l'amateur au pro",
      methode: "Méthode Wedding-Premium™ : passer du gâteau d'anniversaire à 50€ au wedding cake à 600€+ en 90 jours",
    },
    avatar: {
      socio: { nom: "Inès", age: "31 ans", situation: "Infirmière à Toulouse, fait des gâteaux pour sa famille depuis 4 ans, veut quitter l'hôpital pour rester avec ses 2 enfants. Salaire 2 100€/mois, son mari gagne 3 800€." },
    },
    marche: { id: "argent", label: "💰 Argent" },
  },
  m2_data: null,
  promesse: {
    text: "Aider les passionnées de cake design à signer leur premier wedding cake à 600€+ en 90 jours, sans passer par le CAP Pâtissier ni louer un atelier.",
    score: 92, attempts: 1, validated: true, forced: false,
    feedback: { verdict: "✓ Promesse validée — SMDC respectés." },
    history: [],
  },
  mecanisme: {
    nom: "Méthode Wedding-Premium™",
    etapes: [
      "Cartographier ton portfolio actuel et identifier ton style signature",
      "Construire ta gamme premium (3 packs : 350€ / 600€ / 1200€)",
      "Mettre en place ton tunnel Instagram → demande de devis → vente",
      "Lancer les 3 premières commandes wedding cake en cohorte",
    ],
    score: 88, attempts: 2, validated: true, forced: false,
    feedback: { verdict: "✓ Mécanisme validé — nom propriétaire fort + étapes actionnables." },
    history: [],
  },
  vehicule: {
    format: "cohorte_groupe",
    justification: "Cohorte fermée de 12 femmes maximum, 1 live de groupe par semaine sur Zoom (les jeudis 21h après les enfants), Discord pour le partage de gâteaux quotidien, et 2 sessions 1to1 par mois pour personnaliser le suivi de leur portfolio. Programme sur 12 semaines.",
    validated: true,
  },
  bonus: {
    items: [
      { nom: "Pack Photos Pro · 30 fonds + scripts d'éclairage smartphone", valeur: "297€", raison: "Permet de produire des photos qui justifient un prix premium dès la semaine 2, avant même d'avoir terminé son nouveau portfolio." },
      { nom: "Templates de devis & contrats wedding cake", valeur: "197€", raison: "Tous les documents pour facturer comme une pro (devis, contrat, conditions d'annulation). Premier devis pro envoyé la semaine 1." },
      { nom: "Accès à la communauté Cake Premium pendant 6 mois", valeur: "120€/mois × 6 = 720€", raison: "Briser la solitude de l'auto-entrepreneuse à domicile. Soutien et entraide entre cake designers musulmanes francophones." },
    ],
    score: 90, attempts: 1, validated: true, forced: false,
    feedback: { verdict: "✓ Bonus validés — chaque bonus a un nom + valeur + raison ancrée." },
    history: [],
  },
  garantie: {
    type: "continuite",
    formulation: "Si après avoir suivi les 8 premiers modules ET soumis tes 3 nouveaux gâteaux portfolio, tu n'as pas signé ta première commande wedding cake à 400€+ dans les 90 jours du programme, je continue à t'accompagner gratuitement pendant 60 jours supplémentaires — jusqu'à ce que tu y arrives.",
    score: 85, attempts: 2, validated: true, forced: false,
    feedback: { verdict: "✓ Garantie solide avec conditions claires + délai." },
    history: [],
  },
  urgence: {
    type: "cohorte_limitee",
    justification: "12 places dans la cohorte de septembre, parce que je ne peux pas accompagner sérieusement plus de 12 cake designers en même temps (les 1to1 + les revues de portfolio prennent du temps). Prochaine cohorte en janvier.",
    score: 82, attempts: 1, validated: true, forced: false,
    feedback: { verdict: "✓ Urgence éthique — capacité d'accompagnement justifiée." },
    history: [],
  },
  prix: {
    montant: "1497",
    leviers: {
      resultat:    { score: 80, justification: "Promesse mesurable (premier wedding cake à 600€+) avec un résultat business clair. Bonus à valeur cumulée 1 214€ qui amplifie la perception." },
      probabilite: { score: 85, justification: "Mécanisme propriétaire structuré (Wedding-Premium™ avec 4 étapes nommées) + garantie continuité qui inverse le risque + cohorte 12 max + 1to1 mensuel = méthode crédible." },
      delai:       { score: 95, justification: "Délai annoncé : 90 jours (cadre clair). Quick-win semaine 2 (Pack Photos Pro). Étapes du mécanisme = livrables intermédiaires identifiables." },
      effort:      { score: 78, justification: "Véhicule cohorte + lives groupe + 1to1 mensuel + bonus templates de devis et contrats = parcours cadré, l'élève ne part pas d'une page blanche." },
    },
    levier_faible: "effort",
    alignements: { format: true, cible: true, ancrage: true },
    score: 86, attempts: 1, validated: true, forced: false,
    feedback: {
      verdict: "✓ Positionnement validé · Score 86/100 · 1497€ ancré, format cohérent, cible solvable.",
      weak: "Le levier FACILITÉ est le moins fort (78/100). Le programme demande encore de la production active (gâteaux portfolio, devis envoyés).",
      action_concrete: "Renforce les éléments done-for-you : checklists imprimables, scripts de réponse aux clients, calendrier de production guidé semaine par semaine.",
      propositions: [
        { text: "Ajouter un bonus 'Calendrier de production 12 semaines' qui dit exactement quoi faire chaque jour.", cible_etape: "Bonus" },
        { text: "Inclure un format 'corrections en direct' dans les lives — réduit l'effort de réflexion de l'élève.", cible_etape: "Véhicule" },
      ],
    },
    history: [],
  },
};

export const M3_DEMO_CASES: M3DemoCase[] = [
  // ─── ARGENT (4) ───
  { key: "cake_design", segment: "argent", emoji: "🎂",
    title: "Cake design haut de gamme",
    summary: "Wedding cakes 600€+ pour cake designers passionnées (B2C transfo · cohorte)",
    ready: true, patch: CAKE_DESIGN_PATCH },
  { key: "closing_high_ticket", segment: "argent", emoji: "💼",
    title: "Closing high-ticket à distance",
    summary: "Vendre des programmes 3-10k€ par téléphone, 100% halal (B2C transfo · cohorte)",
    ready: false },
  { key: "immobilier_halal", segment: "argent", emoji: "🏘",
    title: "Immobilier locatif halal sans crédit",
    summary: "Bailleur sans crédit conventionnel (B2C info · hybride 6 mois)",
    ready: false },
  { key: "agence_seo_local", segment: "argent", emoji: "📍",
    title: "Agence SEO local pour commerçants musulmans",
    summary: "B2B service récurrent · ramener des clients aux restos halal et boutiques modestes",
    ready: false },
  // ─── RELATIONS (3) ───
  { key: "preparation_mariage", segment: "relations", emoji: "💍",
    title: "Préparation au mariage pour sœurs",
    summary: "Sœurs en quête de mariage halal serein (B2C transfo · cohorte 12 sem)",
    ready: false },
  { key: "parentalite_islamique", segment: "relations", emoji: "👶",
    title: "Parentalité islamique 3-12 ans",
    summary: "Mamans qui veulent éduquer dans le calme + la sunnah (B2C transfo · cohorte)",
    ready: false },
  { key: "sortir_dependance", segment: "relations", emoji: "🌿",
    title: "Sortir de la dépendance affective",
    summary: "Femmes en sortie de relation toxique qui veulent retrouver leur sakina (B2C transfo)",
    ready: false },
  // ─── SANTÉ (3) ───
  { key: "remise_en_forme_pudique", segment: "sante", emoji: "💪",
    title: "Remise en forme pudique à domicile",
    summary: "Programme sport halal pour sœurs voilées qui ne fréquentent pas les salles mixtes",
    ready: false },
  { key: "cycle_feminin", segment: "sante", emoji: "🌙",
    title: "Cycle féminin & fertilité naturelle",
    summary: "Méthodes naturelles compatibles avec la pratique musulmane (B2C transfo · cohorte)",
    ready: false },
  { key: "reset_post_ramadan", segment: "sante", emoji: "🍽",
    title: "Reset alimentaire post-Ramadan",
    summary: "Programme intensif 30 jours pour stabiliser le poids post-Ramadan (B2C transfo)",
    ready: false },
];
