// Discord : retire tous les rôles d'un élève dont l'accès est suspendu, puis le
// retire du serveur (règle de Sidali du 13/10/2026 : pass retiré ou vente
// « perdue » = plus rien ; retrait du serveur confirmé par Hassan le 13/10).
// Quand l'élève régularise, Sidali le réinvite.
//
// Appelée par la base (couper_acces_formations, via net.http_post) avec
// body = { user_id }. verify_jwt=false comme les autres fonctions Discord : la
// fonction ne fait rien si l'élève n'est PAS coupé (acces_formations_coupe), un
// appel malveillant ne peut donc retirer les rôles de personne d'autre.
//
// Les rôles retirés sont ceux tracés dans discord_role_grants (actifs) ; leurs
// lignes passent en revoked_at. discord-grant-role refuse ensuite de les
// redonner tant que l'accès reste suspendu.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const discordGuildId = Deno.env.get("DISCORD_GUILD_ID");
    const discordBotToken = Deno.env.get("DISCORD_BOT_TOKEN");
    if (!discordGuildId || !discordBotToken) {
      return json({ error: "Discord guild_id ou bot_token manquant côté serveur" }, 500);
    }

    const { user_id } = (await req.json()) as { user_id?: string };
    if (!user_id) return json({ error: "user_id requis" }, 400);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: coupe, error: coupeErr } = await supabaseAdmin.rpc("acces_formations_coupe", { p_user_id: user_id });
    if (coupeErr) return json({ error: `acces_formations_coupe : ${coupeErr.message}` }, 500);
    if (coupe !== true) return json({ ok: true, skipped: true, reason: "acces_non_suspendu" });

    const { data: link } = await supabaseAdmin
      .from("discord_links")
      .select("discord_user_id")
      .eq("user_id", user_id)
      .is("unlinked_at", null)
      .maybeSingle();
    if (!link?.discord_user_id) return json({ ok: true, skipped: true, reason: "pas_de_discord" });

    const { data: grants } = await supabaseAdmin
      .from("discord_role_grants")
      .select("discord_role_id")
      .eq("user_id", user_id)
      .is("revoked_at", null);
    const roles = Array.from(new Set((grants ?? []).map((g) => g.discord_role_id as string)));

    const resultats: { role: string; statut: number }[] = [];
    for (const role of roles) {
      const res = await fetch(
        `https://discord.com/api/guilds/${discordGuildId}/members/${link.discord_user_id}/roles/${role}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bot ${discordBotToken}`,
            "X-Audit-Log-Reason": "Accès AL BARAKA suspendu (pass retiré ou impayé)",
          },
        },
      );
      // 204 = retiré, 404 = déjà absent : dans les deux cas le rôle n'y est plus.
      resultats.push({ role, statut: res.status });
      if (res.ok || res.status === 404) {
        await supabaseAdmin
          .from("discord_role_grants")
          .update({ revoked_at: new Date().toISOString(), error_message: "Accès suspendu : pass retiré ou impayé" })
          .eq("user_id", user_id)
          .eq("discord_role_id", role)
          .is("revoked_at", null);
      }
    }
    // Retrait du serveur (« kick ») : 204 = retiré, 404 = n'y était déjà plus.
    const kick = await fetch(`https://discord.com/api/guilds/${discordGuildId}/members/${link.discord_user_id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bot ${discordBotToken}`,
        "X-Audit-Log-Reason": "Accès AL BARAKA suspendu (pass retiré ou impayé)",
      },
    });
    if (kick.ok || kick.status === 404) {
      await supabaseAdmin.from("discord_links").update({ is_guild_member: false }).eq("user_id", user_id);
    }
    console.log(`[retirer-roles] user=${user_id} roles=${JSON.stringify(resultats)} serveur=${kick.status}`);
    return json({ ok: true, roles: resultats, serveur: kick.status });
  } catch (e) {
    console.error("[retirer-roles] uncaught", e);
    return json({ error: (e as Error)?.message ?? "Erreur inconnue" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
