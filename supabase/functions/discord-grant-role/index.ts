// Discord Integration — D3 v1 : grant automatique d'un rôle Discord
// à un élève quand il termine la formation correspondante.
//
// Architecture sécurité (verify_jwt=false, callable depuis trigger SQL via pg_net) :
//   - Authentification : la fonction vérifie d'elle-même que la formation
//     est réellement terminée pour l'utilisateur via get_formation_progress.
//     Sans cette condition, AUCUN grant n'est effectué — même un attaquant
//     avec l'anon key ne peut pas forcer un grant prématuré.
//   - Le seul moyen de bypass (pour backfill ou admin manual) est d'avoir
//     le `DISCORD_GRANT_INTERNAL_SECRET` valide dans le header x-internal-secret.
//
// Workflow :
//   1. Reçoit { user_id, formation_id, reason, source, bypass_completion_check? }
//   2. Si bypass demandé → vérifie x-internal-secret. Sinon → vérifie progress ≥ 100%
//   3. Lookup discord_links → discord_user_id
//   4. Lookup formation_discord_roles → discord_role_id
//   5. PUT https://discord.com/api/guilds/{guild_id}/members/{discord_user_id}/roles/{discord_role_id}
//   6. INSERT discord_role_grants (status success ou failed)
//   7. Return status

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

interface GrantRequest {
  user_id: string;
  formation_id: string;
  reason?: string;
  source?: "auto" | "manual" | "sync" | "hot_check" | "rejoin";
  bypass_completion_check?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const discordGuildId = Deno.env.get("DISCORD_GUILD_ID");
    const discordBotToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const internalSecret = Deno.env.get("DISCORD_GRANT_INTERNAL_SECRET");

    if (!discordGuildId || !discordBotToken) {
      return json({ error: "Discord guild_id ou bot_token manquant côté serveur" }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = (await req.json()) as GrantRequest;
    const { user_id, formation_id } = body;
    const reason = body.reason ?? "formation_completed";
    const source = body.source ?? "auto";
    const bypass = body.bypass_completion_check === true;

    if (!user_id || !formation_id) {
      return json({ error: "user_id et formation_id sont requis" }, 400);
    }

    // ─── Auth : check internal secret OU completion check ────────
    if (bypass) {
      const providedSecret = req.headers.get("x-internal-secret");
      if (!internalSecret || providedSecret !== internalSecret) {
        return json(
          { error: "bypass_completion_check requires x-internal-secret header" },
          403,
        );
      }
    } else {
      // Vérifie que la formation est réellement terminée pour cet user.
      // get_formation_progress() existe déjà (voir migration parcours).
      const { data: progressData, error: progressErr } = await supabaseAdmin.rpc(
        "get_formation_progress",
        { p_user_id: user_id, p_formation_id: formation_id },
      );
      if (progressErr) {
        console.error(`[grant-role] get_formation_progress error: ${progressErr.message}`);
        return json({ error: `Erreur progression : ${progressErr.message}` }, 500);
      }
      const progress = Number(progressData ?? 0);
      if (progress < 100) {
        console.log(
          `[grant-role] user=${user_id} formation=${formation_id} progress=${progress}% — pas encore complet, skip`,
        );
        return json({
          ok: true,
          skipped: true,
          reason: "formation_not_complete",
          progress,
        });
      }
    }

    // ─── Lookup discord_link ────────────────────────────────────
    const { data: link, error: linkErr } = await supabaseAdmin
      .from("discord_links")
      .select("discord_user_id, is_guild_member")
      .eq("user_id", user_id)
      .is("unlinked_at", null)
      .maybeSingle();
    if (linkErr) {
      return json({ error: `Erreur lookup discord_links: ${linkErr.message}` }, 500);
    }
    if (!link) {
      // Pas de Discord lié → on INSERT en pending (le user verra le toast quand il liera son Discord)
      const { data: pendingRow } = await supabaseAdmin
        .from("discord_role_grants")
        .insert({
          user_id,
          discord_user_id: "PENDING",
          discord_role_id: "PENDING",
          formation_id,
          reason,
          source,
          status: "pending",
          error_message: "User n'a pas lié son compte Discord",
        })
        .select("id")
        .maybeSingle();
      console.log(
        `[grant-role] user=${user_id} pas de Discord lié, INSERT pending row=${pendingRow?.id}`,
      );
      return json({
        ok: true,
        pending: true,
        reason: "no_discord_link",
      });
    }

    // ─── Lookup formation → role mapping ────────────────────────
    const { data: mapping, error: mapErr } = await supabaseAdmin
      .from("formation_discord_roles")
      .select("discord_role_id, discord_role_label")
      .eq("formation_id", formation_id)
      .eq("is_active", true)
      .maybeSingle();
    if (mapErr) {
      return json({ error: `Erreur lookup mapping: ${mapErr.message}` }, 500);
    }
    if (!mapping) {
      console.log(
        `[grant-role] formation=${formation_id} n'a pas de role Discord mappé`,
      );
      return json({
        ok: true,
        skipped: true,
        reason: "no_role_mapped",
      });
    }

    // ─── Idempotence : déjà granté SUR LE COMPTE ACTUELLEMENT LIÉ ? ──
    // On filtre AUSSI par discord_user_id : si l'élève a changé de compte
    // Discord (délié puis relié un autre compte), les grants de l'ancien
    // compte ne comptent pas → le rôle est ré-attribué au nouveau compte.
    const { data: existing } = await supabaseAdmin
      .from("discord_role_grants")
      .select("id")
      .eq("user_id", user_id)
      .eq("discord_user_id", link.discord_user_id)
      .eq("discord_role_id", mapping.discord_role_id)
      .is("revoked_at", null)
      .eq("status", "success")
      .maybeSingle();
    if (existing) {
      console.log(
        `[grant-role] user=${user_id} role=${mapping.discord_role_id} déjà granté (row=${existing.id})`,
      );
      return json({
        ok: true,
        already_granted: true,
        grant_id: existing.id,
      });
    }

    // ─── Appel API Discord : PUT role ─────────────────────────────
    const discordUrl = `https://discord.com/api/guilds/${discordGuildId}/members/${link.discord_user_id}/roles/${mapping.discord_role_id}`;
    console.log(
      `[grant-role] PUT ${discordUrl} (user=${user_id}, formation=${formation_id})`,
    );

    const discordRes = await fetch(discordUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${discordBotToken}`,
        "Content-Type": "application/json",
        "X-Audit-Log-Reason": `Formation terminée : ${reason}`,
      },
    });

    if (!discordRes.ok) {
      const errText = await discordRes.text();
      const errMsg = `Discord API ${discordRes.status}: ${errText.slice(0, 300)}`;
      console.error(`[grant-role] ${errMsg}`);

      // INSERT en failed pour audit + permettre retry par cron
      await supabaseAdmin.from("discord_role_grants").insert({
        user_id,
        discord_user_id: link.discord_user_id,
        discord_role_id: mapping.discord_role_id,
        formation_id,
        reason,
        source,
        status: "failed",
        error_message: errMsg.slice(0, 500),
      });

      // Si 404 → user pas dans le serveur, on log clairement
      const isNotGuildMember = discordRes.status === 404;
      return json(
        {
          ok: false,
          status: "failed",
          discord_status: discordRes.status,
          error: isNotGuildMember
            ? "L'élève n'est pas membre du serveur Discord — il doit rejoindre"
            : errMsg,
        },
        isNotGuildMember ? 200 : 502,
      );
    }

    // ─── Succès : INSERT discord_role_grants ─────────────────────
    const { data: grantRow, error: insertErr } = await supabaseAdmin
      .from("discord_role_grants")
      .insert({
        user_id,
        discord_user_id: link.discord_user_id,
        discord_role_id: mapping.discord_role_id,
        formation_id,
        reason,
        source,
        status: "success",
      })
      .select("id")
      .single();
    if (insertErr) {
      // Insert race condition possible (idempotence) → on récupère le row existant
      console.warn(
        `[grant-role] INSERT discord_role_grants race condition: ${insertErr.message}`,
      );
    }

    console.log(
      `[grant-role] OK · user=${user_id} role=${mapping.discord_role_id} (${mapping.discord_role_label}) granted via Discord`,
    );

    return json({
      ok: true,
      status: "success",
      grant_id: grantRow?.id,
      discord_role_id: mapping.discord_role_id,
      discord_role_label: mapping.discord_role_label,
    });
  } catch (e) {
    console.error("[grant-role] uncaught", e);
    return json({ error: (e as Error)?.message ?? "Erreur inconnue" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
