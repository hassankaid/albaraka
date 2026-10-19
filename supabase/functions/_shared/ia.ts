// Appel à l'IA commun à toutes les edge functions (décision de Hassan, 19/10/2026) :
// tout passe par OpenRouter (une seule clé, un seul crédit), et chaque appel est noté
// dans ia_consommations (qui, quelle fonctionnalité, modèle, tokens, coût) pour le
// tableau de bord « Consommation IA ». Le journal ne bloque jamais la réponse.
//
// Les fonctions écrites pour l'API Anthropic gardent leurs messages : les blocs
// « image » et « document » (PDF en base64) sont traduits au format OpenRouter.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

/** Les fonctionnalités, telles qu'elles apparaissent dans le tableau de bord. */
export type Fonctionnalite =
  | "liberty_ancien"
  | "coach_activite"
  | "recap_hebdo"
  | "contenus_personal_brand"
  | "lecture_rib"
  | "agent_setting";

/** Le modèle d'avant (Claude Sonnet 4.6 chez Anthropic), le même chez OpenRouter. */
export const MODELE_PAR_DEFAUT = "anthropic/claude-sonnet-4.6";

// Données envoyées sans conservation ni réutilisation par le fournisseur (comme le Studio).
const PRIVE = { zdr: true, data_collection: "deny" };

type BlocAnthropic =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: string; data: string } };

export interface MessageIA {
  role: "user" | "assistant";
  content: string | BlocAnthropic[];
}

export interface AppelIA {
  fonctionnalite: Fonctionnalite;
  /** l'utilisateur à qui imputer la dépense (null : tâche de fond sans personne) */
  userId: string | null;
  messages: MessageIA[];
  system?: string;
  /** garder le prompt système en cache chez le fournisseur (long et identique d'un appel à l'autre) */
  cacheSystem?: boolean;
  maxTokens: number;
  modele?: string;
  /** d'où vient l'appel (module Liberty, semaine du récap…) */
  reference?: string;
}

export class IAIndisponible extends Error {
  constructor(public panne: "credit" | "cle") {
    super(panne === "credit" ? "Crédit IA épuisé" : "Clé IA refusée");
  }
}

function versOpenRouter(c: MessageIA["content"]) {
  if (typeof c === "string") return c;
  return c.map((b) => {
    if (b.type === "text") return { type: "text", text: b.text };
    const url = `data:${b.source.media_type};base64,${b.source.data}`;
    if (b.type === "image") return { type: "image_url", image_url: { url } };
    return { type: "file", file: { filename: "document.pdf", file_data: url } };
  });
}

/** Les anciens noms de modèles Anthropic (« claude-sonnet-4-6 ») vers ceux d'OpenRouter. */
export function modeleOpenRouter(m?: string): string {
  if (!m) return MODELE_PAR_DEFAUT;
  if (m.includes("/")) return m;
  // claude-sonnet-4-20250514 (Sonnet 4) n'existe plus chez OpenRouter : le plus proche est le 4.6
  return MODELE_PAR_DEFAUT;
}

let admin: ReturnType<typeof createClient> | null = null;
function journal() {
  admin ??= createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  return admin;
}

async function noter(a: AppelIA, modele: string, usage: Record<string, number> | undefined, statut: "ok" | "erreur") {
  try {
    await journal().from("ia_consommations").insert({
      user_id: a.userId,
      fonctionnalite: a.fonctionnalite,
      modele,
      tokens_entree: usage?.prompt_tokens ?? null,
      tokens_sortie: usage?.completion_tokens ?? null,
      cout_usd: Math.min(Math.max(Number(usage?.cost ?? 0), 0), 5),
      reference: a.reference?.slice(0, 200) ?? null,
      statut,
    });
  } catch (e) {
    console.error("[ia] journal impossible", e);
  }
}

/** Appelle l'IA et rend le texte de la réponse. Lève IAIndisponible si OpenRouter refuse. */
export async function appelerIA(a: AppelIA): Promise<string> {
  const cle = Deno.env.get("OPENROUTER_API_KEY");
  if (!cle) throw new Error("OPENROUTER_API_KEY non configurée");
  const modele = modeleOpenRouter(a.modele);
  const messages = [
    ...(a.system
      ? [{
          role: "system",
          content: a.cacheSystem ? [{ type: "text", text: a.system, cache_control: { type: "ephemeral" } }] : a.system,
        }]
      : []),
    ...a.messages.map((m) => ({ role: m.role, content: versOpenRouter(m.content) })),
  ];
  const rep = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: modele, max_tokens: a.maxTokens, messages, provider: PRIVE, usage: { include: true } }),
  });
  if (!rep.ok) {
    const corps = await rep.text();
    console.error(`[ia] ${a.fonctionnalite} : ${rep.status} ${corps.slice(0, 300)}`);
    await noter(a, modele, undefined, "erreur");
    if (rep.status === 402) throw new IAIndisponible("credit");
    if (rep.status === 401 || rep.status === 403) throw new IAIndisponible("cle");
    throw new Error(`IA : erreur ${rep.status}`);
  }
  const d = await rep.json();
  await noter(a, modele, d.usage, "ok");
  return d.choices?.[0]?.message?.content ?? "";
}

/** L'utilisateur de la requête (jeton Supabase), ou null. */
export async function utilisateurDe(req: Request): Promise<string | null> {
  const jeton = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!jeton) return null;
  try {
    const { data } = await journal().auth.getUser(jeton);
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}
