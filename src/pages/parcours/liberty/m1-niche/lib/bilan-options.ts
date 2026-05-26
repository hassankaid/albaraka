// Options du Bilan d'orientation (Branche A).

export interface Archetype {
  id: string;
  emoji: string;
  label: string;
  desc: string;
}

export const ARCHETYPES: Archetype[] = [
  { id: "guide_spirituel", emoji: "🧘", label: "Guide spirituel", desc: "Tu cherches le sens, l'alignement, la transformation profonde" },
  { id: "strategie",        emoji: "🎯", label: "Stratège",         desc: "Tu raisonnes en ROI, méthode, scaling, chiffres" },
  { id: "compagnon",        emoji: "❤️", label: "Compagnon",        desc: "Tu accompagnes, tu apaises, tu es là dans la durée" },
  { id: "createur",         emoji: "🎨", label: "Créateur",         desc: "Tu construis, tu signes, tu exprimes" },
  { id: "pedagogue",        emoji: "📚", label: "Pédagogue",        desc: "Tu transmets, tu structures, tu certifies" },
  { id: "pionnier",         emoji: "🚀", label: "Pionnier",         desc: "Tu vas là où personne n'est allé, niches émergentes" },
];

export interface Marche {
  id: string;
  label: string;
  sous: string[];
  isFree?: boolean;
}

export const MARCHES: Marche[] = [
  { id: "argent",    label: "💰 Argent",    sous: ["Carrière", "Finance", "Business", "Investissement", "Reconversion", "Autre"] },
  { id: "sante",     label: "❤️ Santé",     sous: ["Santé mentale", "Nutrition", "Sport", "Sommeil", "Maladie chronique", "Autre"] },
  { id: "relations", label: "🤝 Relations", sous: ["Couple", "Parentalité", "Famille", "Séduction", "Communauté", "Autre"] },
  { id: "autre",     label: "🎨 Autre",     sous: [], isFree: true },
];
