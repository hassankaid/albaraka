import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, PlayCircle, TrendingUp } from "lucide-react";
import { useMyCoachingStats } from "@/hooks/useCoachingTracking";

export function MyCoachingStatsCard() {
  const { data: stats30 } = useMyCoachingStats(30);
  const { data: stats90 } = useMyCoachingStats(90);

  if (!stats30) return null;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Ton assiduité</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatBlock
            label="30 derniers jours"
            attended={stats30.attendedCount}
            eligible={stats30.eligibleCount}
            rate={stats30.attendanceRate}
            replays={stats30.replayViewsCount}
          />
          <StatBlock
            label="90 derniers jours"
            attended={stats90?.attendedCount ?? 0}
            eligible={stats90?.eligibleCount ?? 0}
            rate={stats90?.attendanceRate ?? 0}
            replays={stats90?.replayViewsCount ?? 0}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StatBlock({
  label,
  attended,
  eligible,
  rate,
  replays,
}: {
  label: string;
  attended: number;
  eligible: number;
  rate: number;
  replays: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{rate}%</span>
      </div>
      <Progress value={rate} className="h-2" />
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {attended}/{eligible} présents
        </span>
        <span className="flex items-center gap-1">
          <PlayCircle className="h-3 w-3" />
          {replays} replay{replays > 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
