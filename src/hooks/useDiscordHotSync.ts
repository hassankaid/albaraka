import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Hot check au login : appelle discord-sync UNE FOIS PAR SESSION pour rattraper
 * les grants manquants pour l'utilisateur courant.
 *
 * Cas d'usage :
 *   - Élève qui a rejoint le serveur Discord APRÈS avoir lié son compte
 *     (au moment du link, is_guild_member était false donc aucun grant fait)
 *   - Élève qui a été kické/quitté Discord puis revenu → roles à re-grant
 *   - Triggers qui ont échoué pour raisons transitoires (Discord down, rate limit)
 *
 * Fonctionnement :
 *   - Au mount (dans ProtectedRoute, donc à chaque montage authentifié)
 *   - Si sessionStorage flag absent → call discord-sync avec user_id
 *   - Set flag → ne refait pas l'appel jusqu'à la prochaine session
 *
 * Cost : 1 appel HTTP léger par session. Pas de toast UI (Realtime
 * useDiscordGrantNotifications s'occupera des INSERTs déclenchés).
 */
export function useDiscordHotSync() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !user?.id) return;

    const flagKey = `discord_hot_sync_${user.id}`;
    if (sessionStorage.getItem(flagKey)) return;

    sessionStorage.setItem(flagKey, "1");

    // Fire-and-forget : on n'attend pas, et on ignore les erreurs.
    // Si la sync échoue, le cron quotidien rattrapera.
    supabase.functions
      .invoke("discord-sync", { body: { user_id: user.id } })
      .then((res) => {
        if (res.error) {
          console.warn("[discord-hot-sync] failed silently:", res.error);
        } else {
          const stats = (res.data as any)?.stats;
          if (stats?.granted > 0 || stats?.membership_updates > 0) {
            console.log("[discord-hot-sync] result:", stats);
          }
        }
      })
      .catch((e) => {
        console.warn("[discord-hot-sync] exception:", e);
      });
  }, [user?.id, isLoading]);
}
