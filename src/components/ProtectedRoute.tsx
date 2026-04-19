import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { RefreshCw } from "lucide-react";
import {
  isApporteurScopedPath,
  isEffectiveApporteur,
  isLockedOut,
} from "@/lib/access-scope";
import { DeactivatedAccountScreen } from "@/components/DeactivatedAccountScreen";
import { DiscordGate } from "@/components/DiscordGate";

export function ProtectedRoute() {
  const { session, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  // Hard lockout: deactivated collaborateur without any apporteur fallback
  // (is_active=false, is_also_apporteur=false). They cannot navigate the app.
  if (isLockedOut(profile)) {
    return <DeactivatedAccountScreen />;
  }

  // Discord gate — only for élèves arrivés via bon de commande qui n'ont pas
  // encore rejoint Discord. Les apporteurs early_access bypass ce gate.
  if (
    profile?.role === "apporteur" &&
    profile?.origin === "bon_commande" &&
    !profile?.discord_joined_at
  ) {
    return <DiscordGate />;
  }

  // Onboarding gate — only enforced for real apporteurs. Deactivated collabs
  // with is_also_apporteur keep their previous behaviour (no onboarding
  // required) to avoid locking existing users out of the app.
  if (
    profile?.role === "apporteur" &&
    !profile?.onboarding_completed &&
    location.pathname !== "/onboarding"
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  // Effective apporteurs can only navigate apporteur-scoped paths (my-space,
  // training, mon-coaching, coaching/calendar, working/activity, onboarding).
  // Anything else sends them back to their dashboard.
  if (
    isEffectiveApporteur(profile) &&
    profile?.role === "collaborateur" &&
    !isApporteurScopedPath(location.pathname)
  ) {
    return <Navigate to="/training" replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (session) {
    // Redirect apporteurs to their dedicated space
    if (profile?.role === "apporteur") return <Navigate to="/training" replace />;
    // Redirect agence to their profile
    if (profile?.role === "agence") return <Navigate to="/profile" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
