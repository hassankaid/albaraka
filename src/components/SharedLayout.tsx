import { RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "./DashboardLayout";
import ApporteurLayout from "./ApporteurLayout";

/**
 * Picks the right layout for routes that are shared between the team side
 * (CEO/collaborateur) and the apporteur side.
 *
 * Rules :
 *   - pure apporteur (role = apporteur, is_also_apporteur = false) → ApporteurLayout
 *   - inactive collaborateur with is_also_apporteur → ApporteurLayout (already handled
 *     by ProtectedRoute redirect to /my-space, but kept here as a safety net)
 *   - everyone else (CEO, active collab, collab + is_also_apporteur with active) → DashboardLayout
 */
export function pickSharedLayout(profile: {
  role?: string | null;
  is_also_apporteur?: boolean | null;
  is_active?: boolean | null;
} | null): "apporteur" | "dashboard" {
  if (!profile) return "dashboard";
  if (profile.role === "apporteur") {
    return profile.is_also_apporteur ? "dashboard" : "apporteur";
  }
  if (profile.role === "collaborateur" && profile.is_active === false && profile.is_also_apporteur) {
    return "apporteur";
  }
  return "dashboard";
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
