// Discord Integration — D2 v1 + D3 backfill : OAuth callback pour lier identité Discord.
//
// Workflow :
//   1. Le frontend redirige l'élève sur Discord OAuth avec scope identify + state CSRF
//   2. Discord redirige sur /discord/callback?code=XXX&state=YYY
//   3. La page frontend récupère code+state, valide le state, puis appelle cette function
//   4. Cette function :
//        - Exchange code → access_token via Discord OAuth token endpoint
//        - Fetch identity via /users/@me
//        - Vérifie membership sur le serveur ALBARAKA via Bot token
//        - UPSERT discord_links
//        - D3 BACKFILL : pour chaque formation gated où l'user a déjà 100% de progress,
//          déclenche un grant role en arrière-plan (appel à discord-grant-role)
//        - Renvoie les métadonnées Discord + résumé des grants

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const DISCORD_USER_URL = "https://discord.com/api/users/@me";

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  discriminator?: string;
  email?: string;
}

interface BackfillResult {
  formation_id: string;
  role_label: string;
  status: "success" | "already_granted" | "failed" | "skipped";
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const discordClientId = Deno.env.get("DISCORD_CLIENT_ID");
    const discordClientSecret = Deno.env.get("DISCORD_CLIENT_SECRET");
    const discordGuildId = Deno.env.get("DISCORD_GUILD_ID");
    const discordBotToken = Deno.env.get("DISCORD_BOT_TOKEN");

    if (!discordClientId || !discordClientSecret || !discordGuildId) {
      console.error("[discord-oauth] Configuration Discord manquante côté secrets");
      return json(
        { error: "Configuration Discord manquante côté serveur. Contacte un admin." },
        500,
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) return json({ error: "Non authentifié" }, 401);

    const { code, redirect_uri } = await req.json();
    if (!code || typeof code !== "string") {
      return json({ error: "code manquant" }, 400);
    }
    if (!redirect_uri || typeof redirect_uri !== "string") {
      return json({ error: "redirect_uri manquant" }, 400);
    }

    // ─── Exchange code → access_token ──────────────────────────
    const tokenRes = await fetch(DISCORD_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: discordClientId,
        client_secret: discordClientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri,
      }).toString(),
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error(
        `[discord-oauth] Token exchange échoué (${tokenRes.status}): ${errText.slice(0, 300)}`,
      );
      return json(
        {
          error: `Échec d'échange OAuth (${tokenRes.status}). Réessaye en cliquant à nouveau sur 'Lier mon Discord'.`,
        },
        400,
      );
    }
    const tokenData = (await tokenRes.json()) as DiscordTokenResponse;

    // ─── Fetch Discord identity ────────────────────────────────
    const userRes = await fetch(DISCORD_USER_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) {
      const errText = await userRes.text();
      console.error(`[discord-oauth] User fetch échoué: ${errText.slice(0, 200)}`);
      return json({ error: "Impossible de récupérer ton identité Discord" }, 502);
    }
    const discordUser = (await userRes.json()) as DiscordUser;

    // ─── Vérifie membership sur le serveur via Bot token ──────
    let isGuildMember = false;
    if (discordBotToken) {
      try {
        const memberRes = await fetch(
          `https://discord.com/api/guilds/${discordGuildId}/members/${discordUser.id}`,
          { headers: { Authorization: `Bot ${discordBotToken}` } },
        );
        isGuildMember = memberRes.ok;
        if (!memberRes.ok && memberRes.status !== 404) {
          console.warn(
            `[discord-oauth] Guild member check failed: ${memberRes.status}`,
          );
        }
      } catch (e) {
        console.warn(`[discord-oauth] Guild member check error:`, e);
      }
    }

    // ─── UPSERT discord_links ──────────────────────────────────
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingLink } = await supabaseAdmin
      .from("discord_links")
      .select("user_id")
      .eq("discord_user_id", discordUser.id)
      .is("unlinked_at", null)
      .neq("user_id", user.id)
      .maybeSingle();

    if (existingLink) {
      return json(
        {
          error:
            "Ce compte Discord est déjà lié à un autre compte plateforme. Délie-le avant de le relier ici.",
        },
        409,
      );
    }

    const { error: upsertErr } = await supabaseAdmin
      .from("discord_links")
      .upsert(
        {
          user_id: user.id,
          discord_user_id: discordUser.id,
          discord_username: discordUser.username,
          discord_global_name: discordUser.global_name ?? null,
          discord_avatar: discordUser.avatar ?? null,
          is_guild_member: isGuildMember,
          linked_at: new Date().toISOString(),
          unlinked_at: null,
          link_source: "oauth",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (upsertErr) {
      console.error(`[discord-oauth] UPSERT failed: ${upsertErr.message}`);
      return json({ error: `Erreur BDD: ${upsertErr.message}` }, 500);
    }

    console.log(
      `[discord-oauth] OK · user=${user.id} · discord=${discordUser.id} (@${discordUser.username}) · member=${isGuildMember}`,
    );

    // ─── D3 BACKFILL : grant roles pour formations déjà 100% ───
    // L'élève peut avoir terminé Marketing/Setting/Closing AVANT de lier
    // son Discord. On rattrape ici.
    const backfillResults: BackfillResult[] = [];
    if (isGuildMember) {
      const { data: mappings } = await supabaseAdmin
        .from("formation_discord_roles")
        .select("formation_id, discord_role_label")
        .eq("is_active", true);

      if (mappings) {
        for (const mapping of mappings) {
          // Check progress
          const { data: progressData, error: progressErr } = await supabaseAdmin.rpc(
            "get_formation_progress",
            { p_user_id: user.id, p_formation_id: mapping.formation_id },
          );
          if (progressErr) {
            console.warn(
              `[discord-oauth backfill] progress error for ${mapping.formation_id}: ${progressErr.message}`,
            );
            continue;
          }
          const progress = Number(progressData ?? 0);
          if (progress < 100) continue; // pas complet, skip

          // Call discord-grant-role internal
          try {
            const grantRes = await fetch(
              `${supabaseUrl}/functions/v1/discord-grant-role`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  user_id: user.id,
                  formation_id: mapping.formation_id,
                  reason: "oauth_link_backfill",
                  source: "sync",
                }),
              },
            );
            const grantData = (await grantRes.json()) as {
              ok?: boolean;
              status?: string;
              already_granted?: boolean;
              error?: string;
            };
            if (grantData?.already_granted) {
              backfillResults.push({
                formation_id: mapping.formation_id,
                role_label: mapping.discord_role_label,
                status: "already_granted",
              });
            } else if (grantData?.status === "success") {
              backfillResults.push({
                formation_id: mapping.formation_id,
                role_label: mapping.discord_role_label,
                status: "success",
              });
            } else if (grantData?.status === "failed") {
              backfillResults.push({
                formation_id: mapping.formation_id,
                role_label: mapping.discord_role_label,
                status: "failed",
                error: grantData.error,
              });
            } else {
              backfillResults.push({
                formation_id: mapping.formation_id,
                role_label: mapping.discord_role_label,
                status: "skipped",
                error: grantData?.error,
              });
            }
          } catch (e) {
            console.error(
              `[discord-oauth backfill] grant error for ${mapping.formation_id}:`,
              e,
            );
            backfillResults.push({
              formation_id: mapping.formation_id,
              role_label: mapping.discord_role_label,
              status: "failed",
              error: (e as Error)?.message ?? "erreur inconnue",
            });
          }
        }
      }
      console.log(
        `[discord-oauth backfill] processed ${backfillResults.length} formations for user=${user.id}`,
      );
    } else {
      console.log(
        `[discord-oauth backfill] skipped — user pas membre du serveur, aucun grant possible`,
      );
    }

    return json({
      success: true,
      discord_user_id: discordUser.id,
      discord_username: discordUser.username,
      discord_global_name: discordUser.global_name,
      discord_avatar: discordUser.avatar,
      is_guild_member: isGuildMember,
      backfill_results: backfillResults,
    });
  } catch (e) {
    console.error("[discord-oauth] uncaught", e);
    return json({ error: (e as Error)?.message ?? "Erreur inconnue" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
