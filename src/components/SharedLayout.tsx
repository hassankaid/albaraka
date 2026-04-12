import { RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "./DashboardLayout";
import ApporteurLayout from "./ApporteurLayout";
import { isEffectiveApporteur, type ProfileLike } from "@/lib/access-scope";

/**
 * Picks the right layout for routes shared between the team side
 * (CEO / active collaborateur) and the apporteur side.
 *
 * An apporteur layout is rendered for any profile where
 * `isEffectiveApporteur` is true (pure apporteur OR deactivated collaborator
 * who retains the apporteur fallback). Everyone else gets the team layout.
 */
export function pickSharedLayout(profile: ProfileLike | null): "apporteur" | "dashboard" {
  if (!profile) return "dashboard";
  // A dual-role apporteur flagged `is_also_apporteur=true` is uncommon but we
  // preserve existing behaviour: treat them as team-side so they keep access
  // to the dashboard via the SpaceSwitcher.
  if (profile.role === "apporteur" && profile.is_also_apporteur) return "dashboard";
  return isEffectiveApporteur(profile) ? "apporteur" : "dashboard";
}

export default function SharedLayout() {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return pickSharedLayout(profile) === "apporteur" ? <ApporteurLayout /> : <DashboardLayout />;
}
