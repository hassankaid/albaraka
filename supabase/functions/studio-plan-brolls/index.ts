// Studio Albaraka — Brique B4 v5 : planification globale des prompts visuels
//
// Au lieu de générer chaque prompt en silo (V1 = prompts décorrélés), on fait
// UN SEUL appel Claude qui voit tout le script + tous les segments + une
// description du protagoniste partagé. Résultat : 8 prompts cohérents avec :
//   - Même personnage principal (même âge, style, ethnicité)
//   - Même style visuel (palette, éclairage, ton)
//   - Transitions narratives douces
//
// Workflow :
//   1. Auth + ownership check
//   2. Charge project + segments
//   3. Claude haiku reçoit : script complet + N segments + contexte halal/Al Baraka
//   4. Claude renvoie un JSON { protagonist, visual_style, prompts: [N prompts] }
//   5. UPDATE atomique de chaque segment via la RPC (broll_prompt only)
//   6. Retourne le plan pour que l'UI affiche les prompts éditables

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface StudioSegment {
  idx: number;
  start_ms: number;
  end_ms: number;
  text: string;
  broll_path?: string | null;
  broll_prompt?: string | null;
}

const PLANNING_SYSTEM = `Tu es un directeur de la photographie. À partir d'une voix-off d'une vidéo Reel/TikTok (sujet : entrepreneur musulman français du programme AL BARAKA), tu construis une SÉRIE de N b-rolls visuels COHÉRENTS qui s'enchaînent naturellement.

OBJECTIF : que l'élève qui regarde sa vidéo finie ait l'impression d'une narration visuelle continue — même personnage principal, même style esthétique, transitions douces entre segments.

MÉTHODE :
1. Lis l'INTÉGRALITÉ du script (voix-off) avant de proposer quoi que ce soit.
2. Définis UN protagoniste partagé (genre, âge, type physique, tenue, ambiance) qui apparaîtra dans tous les clips où un humain est présent.
3. Définis UN style visuel partagé (palette de couleurs, éclairage dominant, grain/ambiance) qui sera répété sur tous les prompts.
4. Pour chaque segment, écris un prompt en anglais de 18-28 mots qui :
   - Illustre LITTÉRALEMENT le contenu du segment
   - Inclut le protagoniste partagé si la scène contient une personne
   - Réutilise le style visuel partagé
   - Précise l'éclairage et le cadrage (close-up / medium / wide / hands)

CONTRAINTES TECHNIQUES :
- Tous les prompts EN ANGLAIS, 18-28 mots, format vertical 9:16, photo-realistic, cinematic
- Aucun texte affiché (no text overlay, no captions, no signs)
- Halal : pas d'alcool, pas d'animaux haram, pas de tenues clairement non-modestes, pas de symboles politiques
- N'ajoute PAS d'éléments culturels (Maroc, mosquée, Atlas...) si la phrase ne les évoque pas

FORMAT DE RÉPONSE (JSON STRICT, rien d'autre, sans préfixe \`\`\`json):

{
  "protagonist": "Description en 15-25 mots du protagoniste partagé (âge, ethnicité, tenue, ambiance)",
  "visual_style": "Description en 15-25 mots du style visuel partagé (palette, éclairage, ton, qualité d'image)",
  "prompts": [
    "Prompt segment 0 en anglais 18-28 mots",
    "Prompt segment 1 en anglais 18-28 mots",
    "..."
  ]
}`;

async function generatePlan(
  segments: StudioSegment[],
  scriptText: string | null,
  openrouterKey: string,
): Promise<{
  protagonist: string;
  visual_style: string;
  prompts: string[];
}> {
  const segmentsList = segments
    .map(
      (s, i) =>
        `${i + 1}. (${(s.start_ms / 1000).toFixed(1)}s → ${(s.end_ms / 1000).toFixed(1)}s) "${s.text}"`,
    )
    .join("\n");

  const userMessage = `VOIX-OFF COMPLÈTE :
"${scriptText ?? segments.map((s) => s.text).join(" ")}"

${segments.length} SEGMENTS À ILLUSTRER (dans l'ordre) :
${segmentsList}

Génère le plan visuel JSON :`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openrouterKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://albarakaecosysteme.com",
      "X-Title": "Albaraka Studio",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3.5-haiku",
      max_tokens: 2000,
      temperature: 0.6,
      messages: [
        { role: "system", content: PLANNING_SYSTEM },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude planning a échoué (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  let content = data?.choices?.[0]?.message?.content?.trim() ?? "";
  if (!content) throw new Error("Claude a renvoyé une réponse vide");

  // Strip optional ```json fences
  content = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error(
      `Claude n'a pas renvoyé du JSON valide. Réponse: ${content.slice(0, 300)}`,
    );
  }

  if (!Array.isArray(parsed.prompts)) {
    throw new Error(`JSON Claude sans prompts[]: ${content.slice(0, 200)}`);
  }
  if (parsed.prompts.length !== segments.length) {
    throw new Error(
      `Claude a renvoyé ${parsed.prompts.length} prompts pour ${segments.length} segments`,
    );
  }

  return {
    protagonist: String(parsed.protagonist ?? "").trim(),
    visual_style: String(parsed.visual_style ?? "").trim(),
    prompts: parsed.prompts.map((p: any) => String(p).trim()),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");

    if (!openrouterKey) {
      return json({ error: "OPENROUTER_API_KEY non configurée." }, 500);
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser();
    if (userErr || !user) return json({ error: "Non authentifié" }, 401);

    const { project_id } = await req.json();
    if (!project_id || typeof project_id !== "string") {
      return json({ error: "project_id manquant" }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: project, error: projErr } = await supabaseAdmin
      .from("studio_projects")
      .select("id, user_id, script_text, segments_json")
      .eq("id", project_id)
      .maybeSingle();
    if (projErr) return json({ error: `Erreur BDD : ${projErr.message}` }, 500);
    if (!project) return json({ error: "Projet introuvable" }, 404);

    if (project.user_id !== user.id) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.role !== "ceo") return json({ error: "Accès refusé" }, 403);
    }

    const segments = (project.segments_json ?? []) as StudioSegment[];
    if (segments.length === 0) {
      return json({ error: "Aucun segment à planifier (lance la transcription d'abord)" }, 400);
    }

    console.log(
      `[plan-brolls] project=${project_id} planning ${segments.length} segments`,
    );

    const plan = await generatePlan(segments, project.script_text, openrouterKey);
    console.log(
      `[plan-brolls] protagonist="${plan.protagonist}" · style="${plan.visual_style}" · ${plan.prompts.length} prompts`,
    );

    // Persist tous les prompts via la RPC (un appel par segment, mais pas de race
    // car planning est lancé manuellement par l'utilisateur, pas en parallèle).
    for (let i = 0; i < segments.length; i++) {
      const { error: rpcErr } = await supabaseAdmin.rpc(
        "update_studio_segment_broll" as any,
        {
          p_project_id: project_id,
          p_segment_idx: segments[i].idx,
          p_broll_path: null,
          p_broll_prompt: plan.prompts[i],
        },
      );
      if (rpcErr) {
        console.error(`[plan-brolls] RPC échouée pour seg ${i}:`, rpcErr.message);
        throw new Error(`Sauvegarde plan échouée (segment ${i}): ${rpcErr.message}`);
      }
    }

    return json({
      success: true,
      protagonist: plan.protagonist,
      visual_style: plan.visual_style,
      prompts: plan.prompts,
      nb_segments: segments.length,
    });
  } catch (e) {
    console.error("[plan-brolls] uncaught", e);
    return json({ error: (e as Error)?.message ?? "Erreur inconnue" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
