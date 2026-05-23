// Discord Integration — D4 v1 : synchronisation Discord (cron + hot check au login)
//
// Une seule edge function qui gère 2 modes :
//   - "all users" : appelé par pg_cron 1×/jour à 4h du matin
//     body = {} ou rien → process tous les users avec discord_links actifs
//   - "single user" : appelé par le hook useDiscordHotSync au login
//     body = { user_id: "..." } → process uniquement ce user
//
// Logique par user :
//   1. Re-vérifie guild membership via Bot token (rafraîchit is_guild_member en BDD)
//   2. Si pas membre → skip grants
//   3. Sinon, pour chaque formation gated :
//        - Check si progress >= 100%
//        - Si oui et pas déjà granted, appelle discord-grant-role
//
// Sécurité : verify_jwt=false (appelé par cron sans JWT). Les opérations sont
// safe car discord-grant-role refait elle-même le check de completion. Le
// worst case d'un appel malveillant = trigger des grants qui auraient eu lieu
// de toute façon → pas un attack vector.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

interface DiscordLink {
  user_id: string;
  discord_user_id: string;
  is_guild_member: boolean;
}

interface FormationMapping {
  formation_id: string;
  discord_role_id: string;
  discord_role_label: string;
}

interface SyncStats {
  processed_users: number;
  membership_updates: number;
  granted: number;
  already_granted: number;
  skipped_not_member: number;
  skipped_not_complete: number;
  errors: number;
  details: Array<{
    user_id: string;
    discord_user_id: string;
    is_guild_member: boolean;
    grants_made: string[];
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const discordGuildId = Deno.env.get("DISCORD_GUILD_ID");
    const discordBotToken = Deno.env.get("DISCORD_BOT_TOKEN");

    if (!discordGuildId || !discordBotToken) {
      return json({ error: "Discord guild_id ou bot_token manquant" }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse body — optionnel
    let targetUserId: string | undefined;
    try {
      const body = await req.json();
      if (body?.user_id && typeof body.user_id === "string") {
        targetUserId = body.user_id;
      }
    } catch {
      // body vide = mode "all users"
    }

    const mode = targetUserId ? "single_user" : "all_users";
    console.log(`[discord-sync] mode=${mode} target=${targetUserId ?? "all"}`);

    // ─── Charge les liaisons à traiter ───────────────────────────
    let linksQuery = supabaseAdmin
      .from("discord_links")
      .select("user_id, discord_user_id, is_guild_member")
      .is("unlinked_at", null);
    if (targetUserId) {
      linksQuery = linksQuery.eq("user_id", targetUserId);
    }
    const { data: links, error: linksErr } = await linksQuery;
    if (linksErr) {
      console.error(`[discord-sync] Erreur lookup discord_links: ${linksErr.message}`);
      return json({ error: linksErr.message }, 500);
    }

    if (!links || links.length === 0) {
      return json({ ok: true, message: "Aucun user à processer", stats: emptyStats() });
    }

    // ─── Charge les mappings une seule fois ─────────────────────
    const { data: mappings } = await supabaseAdmin
      .from("formation_discord_roles")
      .select("formation_id, discord_role_id, discord_role_label")
      .eq("is_active", true);
    if (!mappings || mappings.length === 0) {
      return json({ ok: true, message: "Aucun mapping formation→role", stats: emptyStats() });
    }

    const stats = emptyStats();

    // ─── Boucle sur les users ──────────────────────────────────
    for (const link of links as DiscordLink[]) {
      stats.processed_users++;
      const detail = {
        user_id: link.user_id,
        discord_user_id: link.discord_user_id,
        is_guild_member: link.is_guild_member,
        grants_made: [] as string[],
      };

      // 1. Re-check guild membership
      let isMember = link.is_guild_member;
      try {
        const memberRes = await fetch(
          `https://discord.com/api/guilds/${discordGuildId}/members/${link.discord_user_id}`,
          { headers: { Authorization: `Bot ${discordBotToken}` } },
        );
        const newIsMember = memberRes.ok;
        if (newIsMember !== link.is_guild_member) {
          await supabaseAdmin
            .from("discord_links")
            .update({ is_guild_member: newIsMember, updated_at: new Date().toISOString() })
            .eq("user_id", link.user_id);
          stats.membership_updates++;
          console.log(
            `[discord-sync] user=${link.user_id} membership ${link.is_guild_member} → ${newIsMember}`,
          );
        }
        isMember = newIsMember;
        detail.is_guild_member = newIsMember;
      } catch (e) {
        console.warn(`[discord-sync] guild check error for ${link.user_id}:`, e);
      }

      if (!isMember) {
        stats.skipped_not_member++;
        stats.details.push(detail);
        continue;
      }

      // 2. Pour chaque formation gated, check progress + grant si besoin
      for (const mapping of mappings as FormationMapping[]) {
        const { data: progressData } = await supabaseAdmin.rpc(
          "get_formation_progress",
          { p_user_id: link.user_id, p_formation_id: mapping.formation_id },
        );
        const progress = Number(progressData ?? 0);
        if (progress < 100) {
          stats.skipped_not_complete++;
          continue;
        }

        // Check idempotence
        const { data: existing } = await supabaseAdmin
          .from("discord_role_grants")
          .select("id")
          .eq("user_id", link.user_id)
          .eq("discord_role_id", mapping.discord_role_id)
          .is("revoked_at", null)
          .eq("status", "success")
          .maybeSingle();
        if (existing) {
          stats.already_granted++;
          continue;
        }

        // Call discord-grant-role
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
                user_id: link.user_id,
                formation_id: mapping.formation_id,
                reason: targetUserId ? "hot_check_at_login" : "cron_daily_sync",
                source: targetUserId ? "hot_check" : "sync",
              }),
            },
          );
          const grantData = (await grantRes.json()) as {
            status?: string;
            already_granted?: boolean;
            error?: string;
          };
          if (grantData.status === "success") {
            stats.granted++;
            detail.grants_made.push(mapping.discord_role_label);
            console.log(
              `[discord-sync] GRANTED user=${link.user_id} role=${mapping.discord_role_label}`,
            );
          } else if (grantData.already_granted) {
            stats.already_granted++;
          } else {
            stats.errors++;
            console.warn(
              `[discord-sync] grant error user=${link.user_id} role=${mapping.discord_role_label}: ${grantData.error}`,
            );
          }
        } catch (e) {
          stats.errors++;
          console.error(`[discord-sync] grant exception:`, e);
        }
      }

      stats.details.push(detail);
    }

    console.log(`[discord-sync] DONE mode=${mode} stats=${JSON.stringify(stats)}`);
    return json({ ok: true, mode, stats });
  } catch (e) {
    console.error("[discord-sync] uncaught", e);
    return json({ error: (e as Error)?.message ?? "Erreur inconnue" }, 500);
  }
});

function emptyStats(): SyncStats {
  return {
    processed_users: 0,
    membership_updates: 0,
    granted: 0,
    already_granted: 0,
    skipped_not_member: 0,
    skipped_not_complete: 0,
    errors: 0,
    details: [],
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
