import { type ReactNode } from "react";
import { Lock } from "lucide-react";
import { useUserPass } from "@/hooks/useUserPass";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PassGuardProps {
  children: ReactNode;
  /** Allow staff (CEO + coachs) without a pass — they need to manage sessions. */
  allowStaff?: boolean;
}

export function PassGuard({ children, allowStaff = true }: PassGuardProps) {
  const { profile, isLoading: authLoading } = useAuth();
  const { hasAnyPass, isLoading } = useUserPass();

  if (authLoading || isLoading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const isStaff =
    allowStaff && !!profile && (profile.role === "ceo" || profile.is_coach === true);

  if (!hasAnyPass && !isStaff) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Accès réservé</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground space-y-2">
            <p>
              Cet espace coaching est réservé aux membres disposant du{" "}
              <strong>Pass Al Baraka</strong> ou du <strong>Pass Liberty</strong>.
            </p>
            <p>
              Pour y accéder, contactez votre référent Ethicarena.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
