import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { RefreshCw } from "lucide-react";

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

  // Redirect apporteurs who haven't completed onboarding
  if (
    profile?.role === "apporteur" &&
    !profile?.onboarding_completed &&
    location.pathname !== "/onboarding"
  ) {
    return <Navigate to="/onboarding" replace />;
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
    if (profile?.role === "apporteur") return <Navigate to="/my-space" replace />;
    // Redirect agence to their profile
    if (profile?.role === "agence") return <Navigate to="/profile" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
