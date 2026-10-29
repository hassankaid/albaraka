// Studio : qui y a accès, le quota du jour et l'abonnement à 10 €/mois (Sidali, 13/10/2026).
// La base décide (studio_ouvert, studio_quota) ; l'edge function studio-abonnement relit
// l'abonnement chez Stripe et crée la page de paiement.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface QuotaStudio {
  ouvert: boolean;
  abonne: boolean;
  /** null : sans limite (CEO). */
  limite: number | null;
  utilisees: number;
  restantes: number | null;
  /** « gratuit » : motion design léger ; « complet » : abonné ou CEO (29/10/2026). */
  formule?: "gratuit" | "complet";
  /** Durée maximale en version gratuite (secondes) ; null = durées habituelles (vide depuis le 29/10 au soir). */
  duree_max_s?: number | null;
}

export interface EtatAbonnement {
  quota: QuotaStudio;
  abonnement: { statut: string | null; fin_periode: string | null; resiliation_prevue: boolean } | null;
  mode: "test" | "live";
}

const db = supabase as any;

export function useStudioAcces() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["studio", "acces", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<QuotaStudio> => {
      const { data, error } = await db.rpc("studio_mon_quota");
      if (error) throw error;
      return data as QuotaStudio;
    },
  });
}

async function appeler(action: string, extra: Record<string, unknown> = {}): Promise<any> {
  const { data, error } = await supabase.functions.invoke("studio-abonnement", { body: { action, ...extra } });
  if (error) {
    const corps = await (error as any).context?.json?.().catch(() => null);
    throw new Error(corps?.error ?? error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/** État de l'abonnement relu chez Stripe (et quota du jour à jour). */
export function useAbonnementStudio() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["studio", "abonnement", user?.id],
    enabled: !!user,
    queryFn: (): Promise<EtatAbonnement> => appeler("etat"),
  });
}

export function useActionsAbonnementStudio() {
  const queryClient = useQueryClient();
  const rafraichir = () => queryClient.invalidateQueries({ queryKey: ["studio"] });
  return {
    souscrire: useMutation({
      mutationFn: async () => {
        const { url } = await appeler("souscrire");
        window.location.assign(url);
      },
    }),
    confirmer: useMutation({ mutationFn: (session_id: string) => appeler("confirmer", { session_id }), onSuccess: rafraichir }),
    resilier: useMutation({ mutationFn: () => appeler("resilier"), onSuccess: rafraichir }),
    reprendre: useMutation({ mutationFn: () => appeler("reprendre"), onSuccess: rafraichir }),
  };
}
