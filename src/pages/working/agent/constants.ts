export type AgentContextType = "setting_dm";

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
