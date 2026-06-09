/** Phrases par segment de marché — verbatim de la source Script Forge. */
import type { Segment } from "./types";

export interface SegPhrases {
  painProbe: string;
  visionProbe: string;
  gap: string;
  scale: string;
  objections: [string, string][];
}

export const SEG_PHRASES: Record<Segment, SegPhrases> = {
  argent: {
    painProbe: "ta situation financière actuelle, t'en dis quoi ?",
    visionProbe: "combien tu viserais à stabiliser dans",
    gap: "sans rien faire, ta situation financière dans 1 an, ça ressemble à quoi ?",
    scale: "stabiliser",
    objections: [
      ["C'est trop cher", "Recadrer en ROI mensuel. Diviser le prix par les heures travaillées."],
      ["J'ai pas le budget", "Isoler envie/capacité. Proposer facilités jusqu'à 10x."],
      ["Je préfère réinvestir dans ma boîte", "Ta meilleure ressource c'est ton cerveau. Investir sur toi = investir sur tout le reste."],
    ],
  },
  sante: {
    painProbe: "décris-moi une journée type avec le symptôme",
    visionProbe: "comment tu te sentirais après cette transformation dans",
    gap: "si tu continues comme ça, ton corps/mental dans 5 ans, ça donne quoi ?",
    scale: "atteindre",
    objections: [
      ["J'ai déjà tout essayé", "C'est exactement pour ça que ça va marcher cette fois — pas une méthode, un ACCOMPAGNEMENT."],
      ["Je peux le faire seul", "Tu connais les bonnes pratiques. Ce qui te manque c'est pas l'info, c'est la constance."],
      ["C'est cher pour s'occuper de soi", "C'est pas un luxe, c'est ce qui te permet de tout faire le reste."],
    ],
  },
  relations: {
    painProbe: "décris-moi une scène concrète récente qui s'est mal passée",
    visionProbe: "comment tu rêves d'une interaction dans",
    gap: "si rien ne change, ta relation/situation dans 1-2 ans, c'est quoi ?",
    scale: "reconnecter / apaiser",
    objections: [
      ["C'est l'autre le problème, pas moi", "OK. Et toi t'as 100% de levier sur toi. C'est par là qu'on commence."],
      ["Je dois en parler à mon partenaire", "C'est sain. Si la décision est juste, elle sera la même demain."],
      ["J'ai honte d'en arriver à payer pour ça", "Demander de l'aide c'est de la maturité. La plupart attendent trop longtemps."],
    ],
  },
};
