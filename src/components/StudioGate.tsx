import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { isStudioAllowed } from "@/lib/studio-access";

interface Props {
  children: ReactNode;
}

/**
 * Gate de route pour Studio Albaraka (Brique B1).
 *
 * Seuls CEO + Sidali Test ont accès pour l'instant. Tout autre utilisateur
 * est silencieusement redirigé vers son espace de travail habituel.
 */
export function StudioGate({ children }: Props) {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isStudioAllowed(profile)) {
    // Redirige sans message — la feature n'est juste pas visible pour eux.
    // Apporteurs → /training (leur landing), staff → /dashboard.
    const fallback =
      profile?.role === "apporteur" ? "/training" : "/dashboard";
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
