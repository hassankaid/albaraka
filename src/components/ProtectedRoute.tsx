import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { RefreshCw } from "lucide-react";
import {
  isApporteurScopedPath,
  isEffectiveApporteur,
  isLockedOut,
} from "@/lib/access-scope";
import { DeactivatedAccountScreen } from "@/components/DeactivatedAccountScreen";

export function ProtectedRoute() {
  const { session, profile, isLoading, unsignedContractsCount } = useAuth();
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

  // Phase 5 (19/05/2026) — Blocage strict tant que le contrat n'est pas signé.
  // Cohérent avec la clause "accès activé dès la signature" (Sidali 19/05).
  // Le user est redirigé vers /contracts (landing qui choisit automatiquement
  // le contrat à signer ou affiche la liste). On laisse passer toutes les
  // routes /contract* pour ne pas se prendre dans une boucle.
  if (
    unsignedContractsCount > 0 &&
    !location.pathname.startsWith("/contract")
  ) {
    return <Navigate to="/contracts" replace />;
  }

  // Sprint T (18/05/2026) : suppression du DiscordGate bloquant. Discord est
  // desormais propose via un bouton optionnel dans l'email de bienvenue
  // (cf. send-apporteur-access-email + stripe-webhook flag include_discord_button).
  // Le user arrive directement sur /onboarding apres definition du mot de passe.

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
    // Agence : landing sur son Dashboard dédié (Marketing + Commissions)
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
