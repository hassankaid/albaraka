// Qui a un tunnel (lien de prospection quiz /quiz/<slug>) : le CEO, les porteurs
// d'un pass AL BARAKA actif, et les élèves débloqués à la main (`quiz_lead_magnet`).
import { useAuth } from "@/hooks/useAuth";
import { useFeatureUnlocks } from "@/hooks/useFeatureUnlock";
import { useUserPass } from "@/hooks/useUserPass";

export function useAccesTunnel() {
  const { profile } = useAuth();
  const { isLoading: featureLoading, has } = useFeatureUnlocks();
  const { hasAlBaraka, isLoading: passLoading } = useUserPass();
  return {
    aAcces: profile?.role === "ceo" || hasAlBaraka || has("quiz_lead_magnet"),
    isLoading: featureLoading || passLoading,
  };
}
