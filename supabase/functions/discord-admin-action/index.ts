// Discord Integration — D5 v1 : actions admin (CEO seulement)
//
// Endpoint unique pour les opérations CEO :
//   - action: "grant"    → assigne un rôle Discord à un user (bypass complétion check)
//   - action: "revoke"   → retire un rôle Discord à un user + UPDATE audit row
//   - action: "resync"   → relance discord-sync pour un user spécifique
//
// Sécurité : verify_jwt=true + check explicite que le caller a role='ceo'.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AdminActionRequest {
  action: "grant" | "revoke" | "resync";
  user_id: string;
  formation_id?: string;
  reason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const discordGuildId = Deno.env.get("DISCORD_GUILD_ID");
    const discordBotToken = Deno.env.get("DISCORD_BOT_TOKEN");

    if (!discordGuildId || !discordBotToken) {
      return json({ error: "Discord config manquante" }, 500);
    }

    // ─── Auth + check role CEO ─────────────────────────────────
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) return json({ error: "Non authentifié" }, 401);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (callerProfile?.role !== "ceo") {
      return json({ error: "Accès refusé : CEO uniquement" }, 403);
    }

    const body = (await req.json()) as AdminActionRequest;
    const { action, user_id: targetUserId, formation_id, reason } = body;

    if (!action || !targetUserId) {
      return json({ error: "action et user_id requis" }, 400);
    }

    console.log(
      `[admin-action] action=${action} target=${targetUserId} formation=${formation_id} by=${user.id}`,
    );

    // ─── Lookup discord_link du target ─────────────────────────
    const { data: link } = await supabaseAdmin
      .from("discord_links")
      .select("discord_user_id, is_guild_member")
      .eq("user_id", targetUserId)
      .is("unlinked_at", null)
      .maybeSingle();

    // ─── ACTION : RESYNC ──────────────────────────────────────
    if (action === "resync") {
      const syncRes = await fetch(`${supabaseUrl}/functions/v1/discord-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ user_id: targetUserId }),
      });
      const syncData = await syncRes.json();
      return json({ ok: true, action: "resync", result: syncData });
    }

    // GRANT et REVOKE nécessitent un formation_id + discord_link
    if (!formation_id) {
      return json({ error: "formation_id requis pour grant/revoke" }, 400);
    }
    if (!link) {
      return json(
        { error: "Cet utilisateur n'a pas lié son compte Discord" },
        400,
      );
    }

    // Lookup mapping
    const { data: mapping } = await supabaseAdmin
      .from("formation_discord_roles")
      .select("discord_role_id, discord_role_label")
      .eq("formation_id", formation_id)
      .maybeSingle();
    if (!mapping) {
      return json({ error: "Pas de rôle Discord mappé pour cette formation" }, 400);
    }

    // ─── ACTION : GRANT ────────────────────────────────────────
    if (action === "grant") {
      const discordUrl = `https://discord.com/api/guilds/${discordGuildId}/members/${link.discord_user_id}/roles/${mapping.discord_role_id}`;
      const discordRes = await fetch(discordUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bot ${discordBotToken}`,
          "X-Audit-Log-Reason": `Grant manuel CEO : ${reason ?? "no reason"}`,
        },
      });

      if (!discordRes.ok) {
        const errText = await discordRes.text();
        const errMsg = `Discord ${discordRes.status}: ${errText.slice(0, 200)}`;
        await supabaseAdmin.from("discord_role_grants").insert({
          user_id: targetUserId,
          discord_user_id: link.discord_user_id,
          discord_role_id: mapping.discord_role_id,
          formation_id,
          reason: reason ?? "manual_admin_grant",
          source: "manual",
          granted_by: user.id,
          status: "failed",
          error_message: errMsg,
        });
        return json({ ok: false, status: "failed", error: errMsg }, 502);
      }

      const { data: grantRow } = await supabaseAdmin
        .from("discord_role_grants")
        .insert({
          user_id: targetUserId,
          discord_user_id: link.discord_user_id,
          discord_role_id: mapping.discord_role_id,
          formation_id,
          reason: reason ?? "manual_admin_grant",
          source: "manual",
          granted_by: user.id,
          status: "success",
        })
        .select("id")
        .maybeSingle();

      return json({
        ok: true,
        action: "grant",
        grant_id: grantRow?.id,
        role_label: mapping.discord_role_label,
      });
    }

    // ─── ACTION : REVOKE ───────────────────────────────────────
    if (action === "revoke") {
      const discordUrl = `https://discord.com/api/guilds/${discordGuildId}/members/${link.discord_user_id}/roles/${mapping.discord_role_id}`;
      const discordRes = await fetch(discordUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bot ${discordBotToken}`,
          "X-Audit-Log-Reason": `Revoke manuel CEO : ${reason ?? "no reason"}`,
        },
      });

      // Discord renvoie 204 No Content sur succès. 404 = role pas attribué, on accepte.
      if (!discordRes.ok && discordRes.status !== 404) {
        const errText = await discordRes.text();
        return json(
          { ok: false, error: `Discord ${discordRes.status}: ${errText.slice(0, 200)}` },
          502,
        );
      }

      // UPDATE toutes les rows active du couple (user, role) → revoked_at
      const { data: updatedRows } = await supabaseAdmin
        .from("discord_role_grants")
        .update({
          revoked_at: new Date().toISOString(),
          error_message: `Révoqué manuellement par CEO ${user.id} : ${reason ?? "no reason"}`,
        })
        .eq("user_id", targetUserId)
        .eq("discord_role_id", mapping.discord_role_id)
        .is("revoked_at", null)
        .select("id");

      return json({
        ok: true,
        action: "revoke",
        rows_revoked: updatedRows?.length ?? 0,
        role_label: mapping.discord_role_label,
      });
    }

    return json({ error: `Action inconnue : ${action}` }, 400);
  } catch (e) {
    console.error("[admin-action] uncaught", e);
    return json({ error: (e as Error)?.message ?? "Erreur inconnue" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
