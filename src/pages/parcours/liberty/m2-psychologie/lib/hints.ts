/**
 * Hints contextuels M2 — affichés sous le titre de chaque étape selon le
 * type de marché de l'avatar (B2C_INFO / B2C_TRANSFO / B2B).
 * Transposition fidèle des HINTS Sidali V2.
 */

import type { MarketType } from "./types";

type StepKey = "step1" | "step2" | "step3" | "step6";

export const HINTS: Record<StepKey, Record<MarketType, string>> = {
  step1: {
    B2C_INFO:
      "Pour un marché B2C info (savoir, compétence à acquérir), la douleur profonde est souvent l'humiliation sociale d'être en retard ou de ne pas comprendre. Cherche les moments où l'avatar se tait dans une conversation parce qu'il a peur de paraître ignorant.",
    B2C_TRANSFO:
      "Pour un marché B2C transformation (corps, finance, relations), la douleur est dans le miroir, sur la balance, dans le compte en banque, dans le silence du conjoint. Cherche les moments physiques précis où l'avatar voit le décalage entre qui il est et qui il veut être.",
    B2B:
      "Pour un marché B2B, la douleur n'est pas une émotion molle, c'est une perte chiffrable : un client qui part, un deal raté, une équipe qui démissionne, un trimestre rouge. Cherche les chiffres concrets qui font mal.",
  },
  step2: {
    B2C_INFO:
      "Le désir B2C info, c'est l'autorité retrouvée. L'avatar veut être celui qu'on consulte, pas celui qui consulte. Décris la scène où il devient la référence dans son cercle.",
    B2C_TRANSFO:
      "Le désir B2C transformation, c'est l'image dans le miroir, la photo qu'on ose poster, le compliment qu'on reçoit. Décris une scène sensorielle, pas un objectif chiffré.",
    B2B:
      "Le désir B2B, c'est la liberté opérationnelle : la machine tourne sans toi, le pipeline se remplit tout seul, le board te valide en 5 minutes. Décris une journée type post-transformation.",
  },
  step3: {
    B2C_INFO:
      "Le coût d'inaction info, c'est le retard cumulé. Pendant que ton avatar hésite, ses pairs publient, sont cités, sont payés. À 5 ans, l'écart est irrécupérable.",
    B2C_TRANSFO:
      "Le coût d'inaction transformation, c'est la dégradation silencieuse. Le corps qui s'enfonce, le couple qui s'éteint, le compte qui se vide. Le quotidien empire de 1% par jour, et un jour ça craque.",
    B2B:
      "Le coût d'inaction B2B est calculable : LTV perdue, opportunité manquée, parts de marché cédées. Ne fais pas mou, sors les chiffres.",
  },
  step6: {
    B2C_INFO:
      "En info, la majorité des prospects sont au niveau 2 (conscient du problème) ou 3 (cherche des solutions). Le copy doit nommer le problème mieux qu'eux ne savent le nommer.",
    B2C_TRANSFO:
      "En transformation, beaucoup sont au niveau 1 (inconscients) ou 2. Il faut souvent les éveiller avant de vendre. C'est plus long mais plus rentable.",
    B2B:
      "En B2B, les décideurs sont souvent au niveau 3 ou 4. Ils ont déjà comparé, ils veulent la preuve différentielle.",
  },
};

export function getHint(step: StepKey, market: MarketType | null | undefined): string {
  if (!market || !HINTS[step]) return "";
  return HINTS[step][market] ?? "";
}
