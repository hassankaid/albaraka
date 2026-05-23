import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

/**
 * Hook qui écoute les nouveaux grants de rôles Discord (D3) en temps réel et
 * affiche un toast quand un canal s'ouvre pour l'utilisateur.
 *
 * À monter UNE SEULE FOIS au niveau du ProtectedRoute (App.tsx).
 *
 * Pourquoi via Realtime ?
 *   - Quand l'élève finit une formation, le trigger SQL appelle l'edge function
 *     discord-grant-role en async via pg_net. L'INSERT dans discord_role_grants
 *     se fait dans le serveur, pas dans le browser → le frontend ne le sait pas.
 *   - On souscrit donc aux INSERTs filtrés par user_id pour réagir en direct.
 *
 * Comportement :
 *   - INSERT status='success' → toast "🎉 Canal X débloqué sur Discord !"
 *   - INSERT status='failed' avec erreur 404 → toast "Rejoins le serveur Discord"
 *   - Autres failed → silencieux (logs serveur suffisent)
 */
export function useDiscordGrantNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const handledIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`discord-grants-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "discord_role_grants",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            status: string;
            discord_role_id: string;
            formation_id: string;
            error_message: string | null;
          };

          // Évite les doublons si Realtime renvoie 2x le même event
          if (handledIdsRef.current.has(row.id)) return;
          handledIdsRef.current.add(row.id);

          if (row.status === "success") {
            // Enrichit avec le label du rôle
            const { data: mapping } = await (supabase as any)
              .from("formation_discord_roles")
              .select("discord_role_label")
              .eq("formation_id", row.formation_id)
              .maybeSingle();

            const roleLabel = mapping?.discord_role_label ?? "Nouveau rôle";

            toast({
              title: `🎉 ${roleLabel} débloqué sur Discord !`,
              description:
                "Le canal correspondant est maintenant accessible sur le serveur Discord ALBARAKA.",
              duration: 8000,
            });

            // Invalide les queries éventuelles liées
            qc.invalidateQueries({ queryKey: ["discord-grants"] });
          } else if (
            row.status === "failed" &&
            row.error_message?.includes("membre du serveur")
          ) {
            // L'élève a fini la formation mais n'est pas sur le serveur Discord
            toast({
              title: "Rejoins le serveur Discord",
              description:
                "Tu as terminé une formation mais ton compte Discord n'est pas membre du serveur. Rejoins-le pour débloquer ton canal.",
              variant: "destructive",
              duration: 10000,
            });
          }
          // Autres failed → silencieux
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);
}
