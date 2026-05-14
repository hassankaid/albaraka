// CeoOnlyGuard — redirige les non-CEO vers une page de repli quand on protège
// une route qui ne doit plus apparaître pour les collaborateurs/apporteurs.
//
// Utilisé pour masquer temporairement les pages "Générateur de Contenu" et
// "Mes Contenus" pour tous sauf CEO (demande Sidali — 14/05/2026). Les
// pages restent en place ; seul l'accès est restreint au rôle 'ceo'.

import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

interface CeoOnlyGuardProps {
  children: ReactNode;
  /** Où renvoyer un utilisateur non-CEO. Par défaut : Personal Brand. */
  fallbackPath?: string;
}

export function CeoOnlyGuard({ children, fallbackPath = "/working/personal-brand" }: CeoOnlyGuardProps) {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (profile?.role !== "ceo") {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
