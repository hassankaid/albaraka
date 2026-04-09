import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useActivityData, useActivityLeaderboards } from "@/hooks/useActivityData";
import { DailyEntryForm } from "@/components/activity/DailyEntryForm";
import { ActivityLeaderboards } from "@/components/activity/ActivityLeaderboards";
import { ScoreExplanation } from "@/components/activity/ScoreExplanation";
import { WeeklyRecapBanner } from "@/components/activity/WeeklyRecapBanner";
import { ActivityChart } from "@/components/activity/ActivityChart";

// ─── Vue CEO (Sidali) — accès aux classements + bilans hebdo ───────────────
function CeoActivityView() {
  const { user } = useAuth();
  const data = useActivityData(user?.id);
  const { dailyRanked, weeklyRanked, monthlyRanked, allTimeRanked } = useActivityLeaderboards(
    data.objectives,
    data.objectivesDaily
  );

  const today = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Classement Activité</h2>
        <p className="text-muted-foreground">{format(today, "EEEE d MMMM yyyy", { locale: fr })}</p>
      </div>

      <ActivityLeaderboards
        dailyRanked={dailyRanked}
        weeklyRanked={weeklyRanked}
        monthlyRanked={monthlyRanked}
        allTimeRanked={allTimeRanked}
        highlightUserId={user?.id}
      />

      <ScoreExplanation />
    </div>
  );
}

// ─── Vue Collaborateur — saisie quotidienne + classements + chart ──────────
function CollaborateurActivityView() {
  const { user } = useAuth();
  const data = useActivityData(user?.id);
  const { dailyRanked, weeklyRanked, monthlyRanked, allTimeRanked } = useActivityLeaderboards(
    data.objectives,
    data.objectivesDaily
  );

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Mon Activité</h2>
        <p className="text-muted-foreground">
          Saisie quotidienne — chaque jour compte pour ton score
        </p>
      </div>

      {/* Bannière récap hebdo (lundi matin) */}
      {data.pendingRecap && (
        <WeeklyRecapBanner recap={data.pendingRecap} onDismiss={data.dismissRecap} />
      )}

      {/* Formulaire jour + week strip + objectifs + coach IA */}
      <DailyEntryForm
        weekStrip={data.weekStrip}
        todayEntry={data.todayEntry}
        objectivesDaily={data.objectivesDaily}
        onSave={(params) => data.saveDayMutation.mutateAsync(params)}
        isSaving={data.saveDayMutation.isPending}
      />

      {/* Classements 4 périodes */}
      <ActivityLeaderboards
        dailyRanked={dailyRanked}
        weeklyRanked={weeklyRanked}
        monthlyRanked={monthlyRanked}
        allTimeRanked={allTimeRanked}
        highlightUserId={user?.id}
      />

      {/* Note explicative du score */}
      <ScoreExplanation />

      {/* Chart évolution avec toggle jour/semaine */}
      <ActivityChart monthDays={data.monthDays} weeklyHistory={data.weeklyHistory} />
    </div>
  );
}

// ─── Page shell — route entre vue CEO et vue collaborateur ─────────────────
export default function MyActivity() {
  const { profile } = useAuth();
  const isCeo = profile?.role === "ceo";

  return isCeo ? <CeoActivityView /> : <CollaborateurActivityView />;
}
