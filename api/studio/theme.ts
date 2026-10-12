// Studio, Voix off : thème principal du script, détecté par l'IA (cahier des charges,
// section 3 : « Thème détecté : argent et liberté financière », modifiable par l'élève).
//
// POST /api/studio/theme   Authorization: Bearer <jeton Supabase>   { script }
//   → { theme: "<identifiant>" }  (un thème actif de studio_banque_themes)
import { createClient } from "@supabase/supabase-js";

const MODELE = "anthropic/claude-sonnet-5.5";

const repondre = (status: number, corps: unknown) =>
  new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });

export async function POST(request: Request): Promise<Response> {
  const jwt = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return repondre(401, { error: "Non connecté" });
  let script = "";
  try {
    script = String((await request.json()).script ?? "").slice(0, 5000);
  } catch {
    return repondre(400, { error: "Requête illisible" });
  }
  if (script.trim().length < 20) return repondre(400, { error: "Script trop court" });

  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: user } = await sb.auth.getUser(jwt);
  if (!user.user) return repondre(401, { error: "Session expirée" });
  // Studio réservé au CEO pendant les essais (comme /api/studio/demarrer)
  const { data: profil } = await sb.from("profiles").select("role").eq("id", user.user.id).maybeSingle();
  if (profil?.role !== "ceo") return repondre(403, { error: "Studio pas encore ouvert" });

  const { data: themes } = await sb.from("studio_banque_themes").select("id, nom").eq("actif", true).order("ordre");
  if (!themes?.length) return repondre(500, { error: "Aucun thème" });

  const prompt = `Voici le script d'une vidéo « voix off » AL BARAKA. Quel est son thème principal ?
Choisis UN identifiant dans cette liste :
${themes.map((t) => `- ${t.id} : ${t.nom}`).join("\n")}

Script :
"""
${script}
"""

Réponds UNIQUEMENT en JSON : {"theme": "identifiant"}`;
  try {
    const rep = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODELE,
        max_tokens: 100,
        messages: [{ role: "user", content: prompt }],
        provider: { zdr: true, data_collection: "deny" },
      }),
    });
    const d = await rep.json();
    const texte: string = d?.choices?.[0]?.message?.content ?? "";
    const id = /"theme"\s*:\s*"([a-z_]+)"/.exec(texte)?.[1];
    const theme = themes.find((t) => t.id === id)?.id ?? themes[0].id;
    return repondre(200, { theme });
  } catch {
    return repondre(502, { error: "Détection du thème impossible" });
  }
}
