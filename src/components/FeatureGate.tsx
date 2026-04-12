import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, GraduationCap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureUnlocks, type FeatureKey } from "@/hooks/useFeatureUnlock";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  feature: FeatureKey;
  children: ReactNode;
  lockedTitle?: string;
  lockedDescription?: string;
  unlockCtaLabel?: string;
  unlockRoute?: string;
}

export function FeatureGate({
  feature,
  children,
  lockedTitle = "Cette section est verrouillée",
  lockedDescription = "Termine la formation Marketing Digital depuis ton parcours AL BARAKA pour débloquer cette section.",
  unlockCtaLabel = "Ouvrir mon parcours",
  unlockRoute = "/parcours/al-baraka",
}: Props) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isLoading, has } = useFeatureUnlocks();

  // Le CEO a tout débloqué par défaut (pour tester / admin)
  if (profile?.role === "ceo") return <>{children}</>;

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (has(feature)) return <>{children}</>;

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <Card>
        <CardContent className="p-10 flex flex-col items-center text-center gap-5">
          <div className="p-4 rounded-full bg-muted">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="font-heading text-2xl text-foreground">{lockedTitle}</h2>
            <p className="text-sm text-muted-foreground max-w-md">{lockedDescription}</p>
          </div>
          <Button onClick={() => navigate(unlockRoute)} className="gap-2">
            <GraduationCap className="h-4 w-4" />
            {unlockCtaLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
