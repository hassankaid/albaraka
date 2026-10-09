// Studio vidéo, phase 1 : réservé au CEO (Hassan et Sidali) le temps des essais.
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

export default function StudioGate({ children }: { children: ReactNode }) {
  const { profile, isLoading } = useAuth();
  if (isLoading) return <Skeleton className="m-6 h-40" />;
  if (profile?.role !== "ceo") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
