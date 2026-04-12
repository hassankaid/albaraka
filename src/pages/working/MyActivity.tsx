import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useUserPass } from "@/hooks/useUserPass";
import { useActivityData, useActivityLeaderboards } from "@/hooks/useActivityData";
import { DailyEntryForm } from "@/components/activity/DailyEntryForm";
import { ActivityLeaderboards } from "@/components/activity/ActivityLeaderboards";
import { ScoreExplanation } from "@/components/activity/ScoreExplanation";
import { WeeklyRecapBanner } from "@/components/activity/WeeklyRecapBanner";
import { ActivityChart } from "@/components/activity/ActivityChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyActivityVenteView } from "@/components/activity-vente/MyActivityVenteView";
import { CoachVenteDashboard } from "@/components/admin-activity/CoachVenteDashboard";

// ─── Vue CEO (Sidali) — classements + onglet Vente ─────────────────────────
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

      <Tabs defaultValue="acquisition" className="space-y-4">
        <TabsList>
          <TabsTrigger value="acquisition">Acquisition</TabsTrigger>
          <TabsTrigger value="vente">Vente</TabsTrigger>
        </TabsList>

        <TabsContent value="acquisition" className="space-y-6">
          <ActivityLeaderboards
            dailyRanked={dailyRanked}
            weeklyRanked={weeklyRanked}
            monthlyRanked={monthlyRanked}
            allTimeRanked={allTimeRanked}
            highlightUserId={user?.id}
          />
          <ScoreExplanation />
        </TabsContent>

        <TabsContent value="vente" className="space-y-6">
          <CoachVenteDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Vue Collaborateur ────────────────────────────────────────────────────
function CollaborateurActivityView() {
  const { user } = useAuth();
  const data = useActivityData(user?.id);
  const { hasAnyPass } = useUserPass();
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

  const acquisitionContent = (
    <div className="space-y-6">
      {data.pendingRecap && (
        <WeeklyRecapBanner recap={data.pendingRecap} onDismiss={data.dismissRecap} />
      )}
      <DailyEntryForm
        weekStrip={data.weekStrip}
        todayEntry={data.todayEntry}
        objectivesDaily={data.objectivesDaily}
        onSave={(params) => data.saveDayMutation.mutateAsync(params)}
        isSaving={data.saveDayMutation.isPending}
      />
      <ActivityLeaderboards
        dailyRanked={dailyRanked}
        weeklyRanked={weeklyRanked}
        monthlyRanked={monthlyRanked}
        allTimeRanked={allTimeRanked}
        highlightUserId={user?.id}
      />
      <ScoreExplanation />
      <ActivityChart monthDays={data.monthDays} weeklyHistory={data.weeklyHistory} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Mon Activité</h2>
        <p className="text-muted-foreground">
          Saisie quotidienne — chaque jour compte pour ton score
        </p>
      </div>

      {hasAnyPass ? (
        <Tabs defaultValue="acquisition" className="space-y-4">
          <TabsList>
            <TabsTrigger value="acquisition">Acquisition</TabsTrigger>
            <TabsTrigger value="vente">Vente</TabsTrigger>
          </TabsList>
          <TabsContent value="acquisition">{acquisitionContent}</TabsContent>
          <TabsContent value="vente">
            <MyActivityVenteView />
          </TabsContent>
        </Tabs>
      ) : (
        acquisitionContent
      )}
    </div>
  );
}

// ─── Page shell ─────────────────────────────────────────────────────────────
export default function MyActivity() {
  const { profile } = useAuth();
  const isCeo = profile?.role === "ceo";

  return isCeo ? <CeoActivityView /> : <CollaborateurActivityView />;
}
