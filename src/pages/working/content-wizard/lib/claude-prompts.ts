import { ContentFormat, ContentTheme } from "../types";
import { THEMES_LABELS_FR, FORMATS_LABELS_FR } from "../constants";

export function buildIdeasPrompt(format: ContentFormat, theme: ContentTheme): string {
  const themeLabel = THEMES_LABELS_FR[theme];
  const formatLabel = FORMATS_LABELS_FR[format];

  return `Tu es un expert en création de contenu pour musulmans francophones.

Génère exactement 5 idées de ${formatLabel} sur le thème : ${themeLabel}.

Le ton doit être sincère, fraternel, authentique. Jamais commercial.
Cible : musulmans francophones qui veulent créer une activité digitale halal pour quitter le salariat.

Réponds UNIQUEMENT avec un JSON valide au format suivant, sans texte avant ou après, sans balises markdown :
{
  "ideas": [
    {"titre": "Titre accrocheur de l'idée 1", "accroche": "Une phrase qui donne envie de regarder la vidéo"},
    {"titre": "Titre 2", "accroche": "Accroche 2"},
    {"titre": "Titre 3", "accroche": "Accroche 3"},
    {"titre": "Titre 4", "accroche": "Accroche 4"},
    {"titre": "Titre 5", "accroche": "Accroche 5"}
  ]
}`;
}

export function buildScriptPrompt(
  format: ContentFormat,
  ideaTitle: string,
  ideaHook: string
): string {
  const formatLabel = FORMATS_LABELS_FR[format];

  return `Tu es un expert en scripts vidéo pour musulmans francophones.

Rédige un script pour une ${formatLabel} de 60 à 90 secondes.

IDÉE CHOISIE :
- Titre : ${ideaTitle}
- Accroche : ${ideaHook}

STRUCTURE OBLIGATOIRE :
1. HOOK (2-3 phrases captivantes qui arrêtent le scroll)
2. VALEUR (5-6 phrases de contenu sincère et utile)
3. CTA (1 phrase fraternelle qui invite à agir)

Pour chaque section, fournis aussi 3 mots-clés en anglais pour Pexels (pour les B-rolls).

Ton : sincère, fraternel, authentique. Jamais commercial.

Réponds UNIQUEMENT avec un JSON valide au format suivant, sans texte avant ou après, sans balises markdown :
{
  "script": {
    "hook": "Le texte du hook ici",
    "keywords_pexels_1": ["mot1", "mot2", "mot3"],
    "valeur": "Le texte de la valeur ici",
    "keywords_pexels_2": ["mot1", "mot2", "mot3"],
    "cta": "Le texte du CTA ici",
    "keywords_pexels_3": ["mot1", "mot2", "mot3"],
    "full_text": "HOOK:\\n[hook complet]\\n\\nVALEUR:\\n[valeur complète]\\n\\nCTA:\\n[cta complet]"
  }
}`;
}

export function extractJsonFromResponse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Aucun JSON trouvé dans la réponse Claude");
    }
    return JSON.parse(match[0]);
  }
}
