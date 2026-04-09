import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Medal } from "lucide-react";

const medalIcons = [
  <Trophy key="gold" className="h-5 w-5 text-amber-500" />,
  <Medal key="silver" className="h-5 w-5 text-gray-400" />,
  <Medal key="bronze" className="h-5 w-5 text-orange-600" />,
];

type Ranked = {
  user_id: string;
  name: string;
  videos_published: number;
  messages_sent: number;
  replies_received: number;
  appointments: number;
  sales_made: number;
  score: number;
  days_filled?: number;
};

interface LeaderboardListProps {
  ranked: Ranked[];
  highlightUserId?: string;
  emptyMessage: string;
  showDiscipline?: boolean;
}

function LeaderboardList({ ranked, highlightUserId, emptyMessage, showDiscipline }: LeaderboardListProps) {
  if (ranked.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {ranked.map((r, i) => {
        const isMe = highlightUserId && r.user_id === highlightUserId;
        return (
          <div
            key={r.user_id}
            className={`flex items-center gap-3 p-3 rounded-lg ${
              isMe ? "bg-primary/10 ring-1 ring-primary/30" : "bg-secondary/50"
            }`}
          >
            <div className="w-8 text-center">
              {i < 3 ? medalIcons[i] : <span className="text-sm font-medium text-muted-foreground">{i + 1}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">
                  {isMe ? `${r.name} (moi)` : r.name}
                </p>
                {showDiscipline && typeof r.days_filled === "number" && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      r.days_filled >= 5
                        ? "bg-emerald-500/15 text-emerald-600"
                        : r.days_filled >= 3
                        ? "bg-amber-500/15 text-amber-600"
                        : "bg-rose-500/15 text-rose-600"
                    }`}
                  >
                    {r.days_filled}/7 j
                  </span>
                )}
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                <span>📹 {r.videos_published}</span>
                <span>💬 {r.messages_sent}</span>
                <span>📩 {r.replies_received}</span>
                <span>📅 {r.appointments}</span>
                <span>🛒 {r.sales_made}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-foreground">{r.score.toFixed(1)}</span>
              <p className="text-xs text-muted-foreground">pts</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ActivityLeaderboardsProps {
  dailyRanked: Ranked[];
  weeklyRanked: Ranked[];
  monthlyRanked: Ranked[];
  allTimeRanked: Ranked[];
  highlightUserId?: string;
}

export function ActivityLeaderboards({
  dailyRanked,
  weeklyRanked,
  monthlyRanked,
  allTimeRanked,
  highlightUserId,
}: ActivityLeaderboardsProps) {
  return (
    <Card>
      <Tabs defaultValue="week">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Classement
          </CardTitle>
          <TabsList className="h-8">
            <TabsTrigger value="day" className="text-xs px-3 h-7">Jour</TabsTrigger>
            <TabsTrigger value="week" className="text-xs px-3 h-7">Semaine</TabsTrigger>
            <TabsTrigger value="month" className="text-xs px-3 h-7">Mois</TabsTrigger>
            <TabsTrigger value="alltime" className="text-xs px-3 h-7">All Time</TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent>
          <TabsContent value="day" className="mt-0">
            <LeaderboardList
              ranked={dailyRanked}
              highlightUserId={highlightUserId}
              emptyMessage="Personne n'a saisi sa journée."
            />
          </TabsContent>
          <TabsContent value="week" className="mt-0">
            <LeaderboardList
              ranked={weeklyRanked}
              highlightUserId={highlightUserId}
              emptyMessage="Aucune saisie cette semaine."
              showDiscipline
            />
          </TabsContent>
          <TabsContent value="month" className="mt-0">
            <LeaderboardList
              ranked={monthlyRanked}
              highlightUserId={highlightUserId}
              emptyMessage="Aucune saisie ce mois."
            />
          </TabsContent>
          <TabsContent value="alltime" className="mt-0">
            <LeaderboardList
              ranked={allTimeRanked}
              highlightUserId={highlightUserId}
              emptyMessage="Pas encore d'historique."
            />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
