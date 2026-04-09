export type AgentContextType = "setting_dm";

export interface QuickShortcut {
  label: string;
  prompt: string;
}

export const AGENT_SHORTCUTS: QuickShortcut[] = [
  {
    label: "Silence total prospect",
    prompt: "J'ai envoyé mon vocal d'accroche il y a 48h, le prospect ne répond pas. Comment relancer ?",
  },
  {
    label: "'C'est combien ?'",
    prompt: "Le prospect me dit dès le premier message : \"C'est combien votre truc ?\". Comment répondre ?",
  },
  {
    label: "'Peux-tu m'en dire plus ?'",
    prompt: "Le prospect a regardé la vidéo et demande plus d'infos par message. Comment répondre sans dévoiler le métier ?",
  },
  {
    label: "'Ça ressemble à du MLM'",
    prompt: "Le prospect me dit : \"Ça ressemble à du MLM votre truc\". Comment désamorcer ?",
  },
  {
    label: "'Pas intéressé'",
    prompt: "Le prospect répond sèchement qu'il n'est pas intéressé. Comment conclure proprement ?",
  },
  {
    label: "'J'ai pas le temps'",
    prompt: "Le prospect dit qu'il n'a pas le temps. Comment garder la porte ouverte ?",
  },
  {
    label: "Qualifier le budget",
    prompt: "Je suis à l'étape budget. Le prospect évite de répondre. Comment qualifier sans être intrusif ?",
  },
  {
    label: "Inviter à la conférence",
    prompt: "Le prospect est qualifié. Comment l'inviter à la conférence de dimanche de manière convaincante ?",
  },
];

export interface ParsedAgentResponse {
  isThreeBlocks: boolean;
  blocks: {
    psychology?: string;
    response?: string;
    why?: string;
    direct?: string;
  };
}

export function parseAgentResponse(raw: string): ParsedAgentResponse {
  const parts = raw.split("---").map((p) => p.trim());

  if (parts.length === 3) {
    const psychology = parts[0].replace(/^🧠[^\n]*\n?/, "").trim();
    const response = parts[1].replace(/^💬[^\n]*\n?/, "").trim();
    const why = parts[2].replace(/^✅[^\n]*\n?/, "").trim();

    if (psychology && response && why) {
      return {
        isThreeBlocks: true,
        blocks: { psychology, response, why },
      };
    }
  }

  return {
    isThreeBlocks: false,
    blocks: { direct: raw.trim() },
  };
}

export function extractTitleFromMessage(content: string): string {
  const cleaned = content.trim().replace(/\s+/g, " ");
  if (cleaned.length <= 50) return cleaned;
  return cleaned.slice(0, 50).trim() + "…";
}
