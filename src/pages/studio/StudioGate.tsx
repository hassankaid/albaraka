// Studio : ouvert aux élèves du Pass AL BARAKA et de Liberty (Sidali, 13/10/2026).
// C'est la base qui décide (studio_ouvert) ; `ceo` réserve une page au CEO (banque,
// gestion de la bibliothèque).
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useStudioAcces } from "@/hooks/useStudioAcces";

export default function StudioGate({ children, ceo = false }: { children: ReactNode; ceo?: boolean }) {
  const { profile, isLoading } = useAuth();
  const { data: acces, isLoading: chargement } = useStudioAcces();
  if (isLoading || (!ceo && chargement)) return <Skeleton className="m-6 h-40" />;
  const estCeo = profile?.role === "ceo";
  if (ceo ? !estCeo : !(estCeo || acces?.ouvert)) {
    return <Navigate to={profile?.role === "apporteur" ? "/my-space" : "/dashboard"} replace />;
  }
  return <>{children}</>;
}
