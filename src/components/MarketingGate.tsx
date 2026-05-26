import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useCanAccessPersonalBrand } from "@/hooks/useCanAccessPersonalBrand";

interface Props {
  children: ReactNode;
  /**
   * Route de redirection en cas d'accès refusé. Par défaut /training
   * (où l'élève peut voir/finir la formation Marketing Digital).
   */
  redirectTo?: string;
}

/**
 * Gate de route pour Personal Brand (26/05/2026) :
 *   - CEO / coach → OK
 *   - Pass Liberty → OK
 *   - Pass AL BARAKA + Marketing Digital validé → OK
 *   - Sinon → redirect silencieux vers /training (menu sidebar masqué en parallèle)
 *
 * Le menu nav est déjà masqué via useCanAccessPersonalBrand dans Dashboard/ApporteurLayout,
 * cette redirection couvre le cas où l'élève tente l'URL directe.
 */
export function MarketingGate({ children, redirectTo = "/training" }: Props) {
  const { canAccess, isLoading } = useCanAccessPersonalBrand();

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!canAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
