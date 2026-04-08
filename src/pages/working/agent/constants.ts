export type AgentContextType =
  | "setting_rdv"
  | "setting_conference"
  | "closing_ads"
  | "closing_organique"
  | "closing_bizdev";

export interface AgentContext {
  id: AgentContextType;
  label: string;
  emoji: string;
  description: string;
}

export const AGENT_CONTEXTS: AgentContext[] = [
  {
    id: "setting_rdv",
    label: "Setting RDV",
    emoji: "💬",
    description: "Prospection individuelle, verrouiller un RDV",
  },
  {
    id: "setting_conference",
    label: "Setting Conférence",
    emoji: "📣",
    description: "Invitation à une conférence gratuite",
  },
  {
    id: "closing_ads",
    label: "Closing Ads",
    emoji: "🎯",
    description: "Closing après lead publicitaire",
  },
  {
    id: "closing_organique",
    label: "Closing Organique",
    emoji: "🌱",
    description: "Closing après lead via contenu",
  },
  {
    id: "closing_bizdev",
    label: "Closing BizDev",
    emoji: "🔥",
    description: "Closing après qualification setter",
  },
];

export interface QuickShortcut {
  label: string;
  prompt: string;
}

export const AGENT_SHORTCUTS: QuickShortcut[] = [
  {
    label: "Gérer 'c'est trop cher'",
    prompt: "Le prospect vient de dire : \"C'est trop cher pour moi\". Comment répondre ?",
  },
  {
    label: "Objection 'je réfléchis'",
    prompt: "Le prospect dit qu'il doit y réfléchir après l'annonce du prix. Comment réagir ?",
  },
  {
    label: "Écran de fumée 'jamais à chaud'",
    prompt: "Le prospect dit : \"Je ne prends jamais de décision à chaud, c'est un principe\". Comment répondre ?",
  },
  {
    label: "Silence total prospect",
    prompt: "J'ai envoyé mon vocal d'accroche il y a 48h, le prospect ne répond pas. Comment relancer ?",
  },
  {
    label: "Budget insuffisant",
    prompt: "Le prospect est convaincu mais dit : \"Je n'ai pas les fonds disponibles maintenant\". Comment explorer ?",
  },
  {
    label: "Demande le prix direct",
    prompt: "Le prospect me dit dès le premier message : \"C'est combien votre truc ?\". Comment répondre ?",
  },
  {
    label: "'Peux-tu m'en dire plus ?'",
    prompt: "Le prospect a regardé la vidéo et demande plus d'infos par message. Comment répondre sans dévoiler le métier ?",
  },
  {
    label: "Les 4 piliers en bref",
    prompt: "Explique-moi les 4 piliers de l'accompagnement Al Baraka, version courte pour réviser avant un closing.",
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
