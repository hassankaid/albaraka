import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useClosingPlan, DailyLogPatch } from "@/hooks/useClosingPlan";
import { getCurrentPlanWeek } from "@/lib/closing/dates";
import { TOTAL_WEEKS, getPhaseForWeek } from "@/lib/closing/phases";
import { Card, CardContent } from "@/components/ui/card";
import { PhaseHeader } from "./PhaseHeader";
import { WeekCard } from "./WeekCard";
import { ClaimableSales } from "./ClaimableSales";

export function MyActivityVenteView() {
  const { plan, logs, sales, claimableSales, isLoading, upsertLog, claimSale } = useClosingPlan();

  const currentWeek = useMemo(() => {
    if (!plan) return 1;
    return getCurrentPlanWeek(plan.started_at);
  }, [plan]);

  const phase = getPhaseForWeek(currentWeek);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!plan) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h4 className="font-serif text-lg mb-2">Aucun plan actif</h4>
          <p className="text-sm text-muted-foreground">
            Ton plan 90 jours se déclenche à l'activation d'un Pass Al Baraka ou Liberty.
            Contacte l'équipe si tu penses que c'est une erreur.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSave = async (entryDate: string, patch: DailyLogPatch) => {
    try {
      await upsertLog.mutateAsync({ entryDate, patch });
      toast.success("Jour enregistré");
    } catch (e) {
      toast.error((e as Error)?.message ?? "Erreur à l'enregistrement");
    }
  };

  const handleClaim = async (saleId: string) => {
    try {
      await claimSale.mutateAsync(saleId);
      toast.success("Vente attribuée");
    } catch (e) {
      toast.error((e as Error)?.message ?? "Erreur lors de l'attribution");
    }
  };

  const readonly = plan.status !== "active";

  return (
    <div className="space-y-4">
      {readonly && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 text-xs text-amber-700 dark:text-amber-400">
            Plan en lecture seule (pass révoqué ou plan terminé).
          </CardContent>
        </Card>
      )}

      <PhaseHeader phase={phase} currentWeek={currentWeek} />

      <ClaimableSales sales={claimableSales} onClaim={handleClaim} isClaiming={claimSale.isPending} />

      <div className="space-y-2.5">
        {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map((w) => (
          <WeekCard
            key={w}
            startedAt={plan.started_at}
            weekNumber={w}
            logs={logs}
            allLogs={logs}
            sales={sales}
            defaultOpen={w === currentWeek}
            readonly={readonly}
            onSaveDay={handleSave}
            isSaving={upsertLog.isPending}
          />
        ))}
      </div>
    </div>
  );
}
