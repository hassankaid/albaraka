// ─────────────────────────────────────────────────────────────────────────
// discord-liens-importants — le message épinglé du salon « liens-importants »
// (demande de Sidali, 03/11/2026 : lien du coaching individuel).
//
//   POST { action: "lire" }                        → les derniers messages du salon
//   POST { action: "publier", contenu, dry_run? }  → remplace le message
//
// « publier » MODIFIE le dernier message du bot s'il y en a un (le lien du
// message ne change pas) ; sinon il en poste un nouveau et l'épingle. Le bot ne
// peut pas modifier un message écrit par quelqu'un d'autre : celui-là reste,
// à supprimer à la main si besoin. `dry_run` rend ce qui serait fait.
//
// Sécurité : verify_jwt + rôle CEO vérifié ici.
// ─────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SALON = "liens-importants";

async function dapi(chemin: string, jeton: string, init: RequestInit = {}) {
  const r = await fetch(`https://discord.com/api/v10${chemin}`, {
    ...init,
    headers: { Authorization: `Bot ${jeton}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const texte = await r.text();
  if (!r.ok) throw new Error(`Discord ${r.status} ${chemin} : ${texte.slice(0, 300)}`);
  return texte ? JSON.parse(texte) : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const auth = req.headers.get("Authorization") ?? "";
    const utilisateur = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await utilisateur.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profil } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profil?.role !== "ceo") return json({ error: "forbidden" }, 403);

    const jeton = Deno.env.get("DISCORD_BOT_TOKEN")!;
    const guilde = Deno.env.get("DISCORD_GUILD_ID")!;
    const corps = await req.json().catch(() => ({}));

    const salons = await dapi(`/guilds/${guilde}/channels`, jeton);
    const salon = (salons as any[]).find((c) => c.type === 0 && String(c.name).includes(SALON));
    if (!salon) return json({ error: "salon_introuvable", salons: (salons as any[]).filter((c) => c.type === 0).map((c) => c.name) }, 404);

    const moi = await dapi(`/users/@me`, jeton);
    const messages = await dapi(`/channels/${salon.id}/messages?limit=20`, jeton);
    const epingles = await dapi(`/channels/${salon.id}/pins`, jeton).catch(() => []);
    const resume = (m: any) => ({
      id: m.id, auteur: m.author?.username, du_bot: m.author?.id === moi.id, le: m.timestamp,
      epingle: (epingles as any[]).some((p) => p.id === m.id), contenu: m.content,
      webhook_id: m.webhook_id ?? null, embeds: m.embeds ?? [], components: m.components ?? [],
    });

    if (corps.action === "lire") {
      // Les webhooks du salon (permission « Gérer les webhooks » requise) : sans eux,
      // un message posté par un webhook ne peut pas être modifié en place.
      const webhooks = await dapi(`/channels/${salon.id}/webhooks`, jeton)
        .then((w: any[]) => w.map((x) => ({ id: x.id, nom: x.name, a_un_jeton: !!x.token })))
        .catch((e) => ({ erreur: String(e.message ?? e).slice(0, 120) }));
      return json({ salon: salon.name, salon_id: salon.id, messages: (messages as any[]).map(resume), webhooks });
    }

    if (corps.action === "publier") {
      const contenu = typeof corps.contenu === "string" ? corps.contenu.trim() : "";
      if (!contenu || contenu.length > 2000) return json({ error: "contenu_invalide" }, 400);
      const duBot = (messages as any[]).find((m) => m.author?.id === moi.id);
      if (corps.dry_run) return json({ dry_run: true, ferait: duBot ? `modifier le message ${duBot.id}` : "poster un nouveau message et l'épingler", contenu });
      if (duBot) {
        const m = await dapi(`/channels/${salon.id}/messages/${duBot.id}`, jeton, { method: "PATCH", body: JSON.stringify({ content: contenu }) });
        return json({ fait: "modifie", message: resume(m) });
      }
      const m = await dapi(`/channels/${salon.id}/messages`, jeton, { method: "POST", body: JSON.stringify({ content: contenu, allowed_mentions: { parse: [] } }) });
      await dapi(`/channels/${salon.id}/pins/${m.id}`, jeton, { method: "PUT" }).catch((e) => console.warn("[liens-importants] épinglage :", e));
      return json({ fait: "poste", message: resume(m) });
    }
    return json({ error: "action_inconnue" }, 400);
  } catch (e) {
    console.error("[discord-liens-importants]", e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
