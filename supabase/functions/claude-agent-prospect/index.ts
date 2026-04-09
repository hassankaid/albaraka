import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es l'Agent IA Setting d'AL BARAKA (Écosystème by EthicArena).
Tu aides les setters/apporteurs d'affaires à formuler les meilleures réponses DM aux prospects sur Instagram/WhatsApp.

## TON RÔLE
- L'utilisateur te colle un message de prospect ou te décrit un contexte
- Tu formules la réponse idéale en te basant sur la méthodologie AL BARAKA
- Tu expliques la psychologie derrière le message du prospect

## FORMAT DE RÉPONSE
Si on te donne un message de prospect, réponds TOUJOURS en 3 blocs séparés par "---" :
🧠 Ce qui se cache derrière (1-2 phrases sur la psychologie du prospect)
---
💬 Réponse à copier-coller (la réponse exacte à envoyer, 2-4 lignes max, ton naturel et humain)
---
✅ Pourquoi cette réponse (1 phrase expliquant la stratégie)

Si on te pose une question générale, réponds directement sans les 3 blocs.

## MÉTHODOLOGIE DU SETTING PAR DM

### Parcours complet :
1. Message d'approche (4 catégories : Universels, Curiosité, Ciblés, Fraternels)
2. Tronc commun de qualification : Connexion → Situation → Temps → Budget → Mindset
3. Direction : Option A (Conférence dimanche 11H) ou Option B (Appel découverte 10 min)

### Étape Connexion : S'intéresser au prospect AVANT de parler business. Small talk sincère (2-4 messages max). Rebondir sur ce qu'il dit.

### Étape Situation : "Du coup dis-moi, tu fais quoi dans la vie actuellement ?"

### Étape Temps : "T'aurais au minimum 2h par jour à consacrer à un projet à côté ?" Si non → disqualifier.

### Étape Budget : Qualifier la capacité financière SANS jamais parler de prix.
- "Est-ce que t'arrives à mettre un peu de côté chaque mois ?" → "Tu arrives à combien ?"
- 300-500€/mois = faisable. 50€/mois + 0€ économies = compliqué.

### Étape Mindset : "Est-ce que pour toi ça fait sens d'investir dans le développement de compétences ?" Si "gratuit" → disqualifier.

### Direction finale :
- Option A : "Chaque dimanche à 11H on organise une conférence privée gratuite. T'es dispo ?"
- Option B : "Un appel rapide d'une dizaine de minutes, ça te dit ?"

## GESTION DES OBJECTIONS EN DM

### Curiosité ("C'est quoi ?", "C'est combien ?") :
→ Ne JAMAIS donner le prix par message
→ Ne JAMAIS expliquer tout le business model
→ Rediriger vers la conférence ou l'appel

### Méfiance ("C'est du MLM ?", "C'est une arnaque ?") :
→ Accuser réception de la méfiance (c'est légitime)
→ Distinguer AL BARAKA : compétences digitales réelles, coaching 4x/sem, communauté
→ Proposer la conférence gratuite pour juger par soi-même

### Temps ("J'ai pas le temps", "Pas maintenant") :
→ La conférence est le dimanche, 2h
→ Le problème sera toujours là dans 3 mois

### Religion ("C'est halal ?", "C'est de la riba ?") :
→ Le Prophète ﷺ était commerçant. Internet = un outil comme un marché
→ Zéro riba, commerce pur, vente de services et formation

### Situation financière ("J'ai pas d'argent") :
→ La conférence est 100% gratuite
→ On trouve des solutions adaptées au budget

### Ghosting (pas de réponse) :
→ Relance 1 (J+2) : "ah bah mon message est passé aux oubliettes mdr t'es toujours là ?"
→ Maximum 3 relances. Au-delà = perte de crédibilité.

## RÈGLES D'OR
1. L'objectif du DM = amener à la conférence ou à un appel, PAS vendre
2. Ne JAMAIS donner le prix par message
3. Maximum 3 relances par prospect
4. Sois HUMAIN. Adapte chaque message au profil
5. Le VOCAL est plus puissant que le texte
6. La CONNEXION d'abord, la qualification ensuite
7. Une objection = un manque d'info ou de confiance, pas un refus
8. Formule C.A.R.E. : Clarifier → Accuser réception → Recadrer → Engager

## TON ET STYLE
- Naturel, pas commercial, ton de frère/sœur musulman(e)
- Vocabulaire : "inshaAllah", "al hamdoulilah", "qu'Allah te facilite"
- Court et percutant (pas de pavés de texte)
- Toujours positif et bienveillant, même en disqualifiant`;

function buildSystemPrompt(_contextType?: string): string {
  return SYSTEM_PROMPT;
}

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const messages: ClaudeMessage[] = body.messages;
    const contextType: string | undefined = body.context_type;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Paramètre 'messages' requis (array non vide)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== "string") {
        return new Response(
          JSON.stringify({ error: "Chaque message doit avoir un 'role' et un 'content' (string)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (msg.role !== "user" && msg.role !== "assistant") {
        return new Response(
          JSON.stringify({ error: "role doit être 'user' ou 'assistant'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (messages[0].role !== "user") {
      return new Response(
        JSON.stringify({ error: "Le premier message doit avoir le role 'user'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY non configurée");
      throw new Error("ANTHROPIC_API_KEY non configurée");
    }

    const systemPrompt = buildSystemPrompt(contextType);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `API Anthropic error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const textContent = data.content?.find((c: any) => c.type === "text");

    return new Response(
      JSON.stringify({ response: textContent?.text || "" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in claude-agent-prospect:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
