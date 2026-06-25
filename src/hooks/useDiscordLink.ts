import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Hooks Discord Integration (D2).
 *
 * - useDiscordLink() : statut de la liaison Discord du user courant
 *   (lié / non lié, identité Discord, membership sur le serveur)
 * - useDiscordOAuthExchange() : appelle l'edge function discord-oauth-callback
 *   pour finaliser la liaison après que Discord ait redirigé l'utilisateur.
 * - useUnlinkDiscord() : marque la liaison comme révoquée (unlinked_at)
 *
 * - DISCORD_CLIENT_ID est lu depuis la variable Supabase secrets via
 *   l'edge function (côté serveur), MAIS pour construire l'URL OAuth côté
 *   front on a besoin de l'avoir aussi exposé. On le hardcode ici en clair
 *   car Client ID n'est pas un secret OAuth (visible dans toute URL d'auth).
 */

// Client ID Discord publique (visible dans toute URL d'auth)
export const DISCORD_CLIENT_ID = "1507699204917825606";

// Scopes OAuth minimaux : identifier l'utilisateur + lire sa liste de guilds
// (utile plus tard pour des sync automatiques). guilds.members.read nécessite
// le bot installé sur le serveur — on a déjà fait ça en D1.3.
export const DISCORD_OAUTH_SCOPES = ["identify"].join(" ");

export interface DiscordLinkRow {
  user_id: string;
  discord_user_id: string;
  discord_username: string;
  discord_global_name: string | null;
  discord_avatar: string | null;
  is_guild_member: boolean;
  linked_at: string;
  unlinked_at: string | null;
  link_source: "oauth" | "manual_admin";
  updated_at: string;
}

/**
 * Construit l'URL Discord OAuth pour démarrer le flow.
 */
export function buildDiscordOAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DISCORD_OAUTH_SCOPES,
    state,
    prompt: "consent",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Construit l'URL de redirect_uri appropriée selon l'environnement.
 * Doit correspondre à l'un des redirects whitelistés sur le Developer Portal :
 *   - https://plateforme.albarakaecosysteme.com/discord/callback
 *   - http://localhost:8080/discord/callback
 */
export function getDiscordRedirectUri(): string {
  if (typeof window === "undefined") {
    return "https://plateforme.albarakaecosysteme.com/discord/callback";
  }
  const { origin } = window.location;
  return `${origin}/discord/callback`;
}

/**
 * Hook qui charge la liaison Discord active du user courant (ou null).
 */
export function useDiscordLink() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["discord-link", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async (): Promise<DiscordLinkRow | null> => {
      const { data, error } = await (supabase as any)
        .from("discord_links")
        .select("*")
        .eq("user_id", user!.id)
        .is("unlinked_at", null)
        .maybeSingle();
      if (error) throw error;
      return (data as DiscordLinkRow | null) ?? null;
    },
  });
}

/**
 * Mutation qui appelle l'edge function discord-oauth-callback avec le code
 * récupéré du retour OAuth Discord. À utiliser dans la page /discord/callback.
 */
export function useDiscordOAuthExchange() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      code,
      redirectUri,
    }: {
      code: string;
      redirectUri: string;
    }): Promise<{
      success: boolean;
      discord_user_id: string;
      discord_username: string;
      discord_global_name?: string | null;
      discord_avatar?: string | null;
      is_guild_member: boolean;
    }> => {
      const { data, error } = await supabase.functions.invoke(
        "discord-oauth-callback",
        { body: { code, redirect_uri: redirectUri } },
      );
      if (error) {
        let msg = error.message ?? "Liaison Discord échouée";
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
      qc.invalidateQueries({ queryKey: ["discord-link"] });
    },
  });
}

/**
 * Délie le compte Discord (set unlinked_at). Ne révoque PAS les rôles côté
 * Discord — la cron de sync s'en chargera (D4).
 */
export function useUnlinkDiscord() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non authentifié");
      // Passe par une RPC SECURITY DEFINER : un UPDATE client-side direct est
      // bloqué silencieusement par la RLS (discord_links n'a qu'une policy SELECT),
      // donc la liaison n'était jamais révoquée.
      const { error } = await (supabase as any).rpc("unlink_discord");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discord-link"] });
    },
  });
}

/**
 * URL d'avatar Discord à partir du hash. Discord CDN.
 * Returns null si pas d'avatar (Discord affiche un avatar par défaut).
 */
export function getDiscordAvatarUrl(
  discordUserId: string,
  avatarHash: string | null,
): string | null {
  if (!avatarHash) return null;
  const ext = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${discordUserId}/${avatarHash}.${ext}?size=128`;
}
