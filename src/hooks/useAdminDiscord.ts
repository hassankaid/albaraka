import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hooks pour la page admin /admin/discord (D5).
 *
 * - useAdminDiscordOverview : récupère toutes les liaisons + breakdown par formation
 *   (1 row par couple user × formation gated, avec status, progress, role)
 * - useAdminDiscordGrants : audit log des grants récents
 * - useAdminDiscordAction : grant / revoke / resync via edge function
 *
 * Tous les hooks réservés au CEO (RLS gère côté BDD, edge function check role).
 */

export interface AdminDiscordRow {
  user_id: string;
  full_name: string | null;
  email: string;
  user_role: string;
  discord_user_id: string | null;
  discord_username: string | null;
  discord_global_name: string | null;
  discord_avatar: string | null;
  is_guild_member: boolean | null;
  formation_id: string;
  formation_titre: string;
  formation_slug: string;
  discord_role_id: string;
  discord_role_label: string;
  progress_pct: number;
  grant_status: "success" | "failed" | "pending" | "none";
  grant_id: string | null;
  grant_reason: string | null;
  grant_source: string | null;
  grant_error: string | null;
  granted_at: string | null;
}

/**
 * V2 — Récap par élève : 1 ligne par élève éligible (= pass actif),
 * avec booléens pour chacune des 3 formations + chacun des 3 rôles Discord.
 */
export interface AdminDiscordUserRecapRow {
  user_id: string;
  full_name: string | null;
  email: string;
  user_role: string;
  pass_type: "al_baraka" | "liberty";
  discord_linked: boolean;
  discord_username: string | null;
  discord_global_name: string | null;
  discord_avatar: string | null;
  is_guild_member: boolean | null;
  marketing_completed: boolean;
  setting_completed: boolean;
  closing_completed: boolean;
  has_marketing_role: boolean;
  has_setting_role: boolean;
  has_closing_role: boolean;
}

export function useAdminDiscordUserRecap() {
  return useQuery({
    queryKey: ["admin-discord", "user-recap"],
    queryFn: async (): Promise<AdminDiscordUserRecapRow[]> => {
      const { data, error } = await (supabase as any).rpc(
        "admin_discord_user_recap",
      );
      if (error) throw error;
      return (data ?? []) as AdminDiscordUserRecapRow[];
    },
    refetchOnWindowFocus: false,
  });
}

/**
 * Récupère un panorama complet : pour chaque (user lié × formation gated),
 * renvoie le statut du grant + progress + identité Discord.
 */
export function useAdminDiscordOverview() {
  return useQuery({
    queryKey: ["admin-discord", "overview"],
    queryFn: async (): Promise<AdminDiscordRow[]> => {
      // Cette requête fait beaucoup de jointures donc on l'écrit en RPC pour
      // garder le code propre. À défaut de RPC, on fait via les vues + joins
      // directement en SQL inline. On joue safe : 1 requête par formation pour
      // simplicité de debug, puis on combine côté JS.
      const { data, error } = await (supabase as any).rpc(
        "admin_discord_overview",
      );
      if (error) throw error;
      return (data ?? []) as AdminDiscordRow[];
    },
    refetchOnWindowFocus: false,
  });
}

export interface DiscordGrantAudit {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  discord_user_id: string;
  discord_role_id: string;
  formation_id: string | null;
  formation_titre: string | null;
  status: "success" | "failed" | "pending";
  reason: string;
  source: string;
  granted_at: string;
  revoked_at: string | null;
  error_message: string | null;
  granted_by_name: string | null;
}

/**
 * Audit log des 100 derniers grants (success, failed, pending).
 */
export function useAdminDiscordGrants(limit = 100) {
  return useQuery({
    queryKey: ["admin-discord", "grants", limit],
    queryFn: async (): Promise<DiscordGrantAudit[]> => {
      const { data, error } = await (supabase as any)
        .from("discord_role_grants")
        .select(
          `
          id,
          user_id,
          discord_user_id,
          discord_role_id,
          formation_id,
          status,
          reason,
          source,
          granted_at,
          revoked_at,
          error_message,
          profile:profiles!discord_role_grants_user_id_fkey(full_name, email),
          formation:formations(titre)
          `,
        )
        .order("granted_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        full_name: row.profile?.full_name ?? null,
        email: row.profile?.email ?? "",
        discord_user_id: row.discord_user_id,
        discord_role_id: row.discord_role_id,
        formation_id: row.formation_id,
        formation_titre: row.formation?.titre ?? null,
        status: row.status,
        reason: row.reason,
        source: row.source,
        granted_at: row.granted_at,
        revoked_at: row.revoked_at,
        error_message: row.error_message,
        granted_by_name: null,
      })) as DiscordGrantAudit[];
    },
  });
}

/**
 * Mutation pour grant / revoke / resync. Appelle l'edge function
 * discord-admin-action (CEO-gated).
 */
export function useDiscordAdminAction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      userId,
      formationId,
      reason,
    }: {
      action: "grant" | "revoke" | "resync";
      userId: string;
      formationId?: string;
      reason?: string;
    }): Promise<any> => {
      const { data, error } = await supabase.functions.invoke(
        "discord-admin-action",
        {
          body: {
            action,
            user_id: userId,
            formation_id: formationId,
            reason,
          },
        },
      );
      if (error) {
        let msg = error.message ?? "Action échouée";
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          } catch {
            // ignore
          }
        }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-discord"] });
    },
  });
}
