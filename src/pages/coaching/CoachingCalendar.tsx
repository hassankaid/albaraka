import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, User } from "lucide-react";
import { COACHING_SLOTS, ZOOM_COACHING, type CoachingSlot } from "@/config/coachingSlots";
import {
  currentWeekOccurrences,
  formatParisFull,
  formatParisTime,
  formatParisDayMonth,
  formatParisDayMonthYear,
} from "@/lib/coaching-slots";
import { computeJoinPhase } from "@/lib/coaching-window";
import { useLogAttendance } from "@/hooks/useCoachingTracking";
import { ReplaysSection } from "@/components/coaching-calendar/ReplaysSection";
import { MyCoachingStatsCard } from "@/components/coaching-calendar/MyCoachingStatsCard";

export default function CoachingCalendar() {
  const [now, setNow] = useState(() => new Date());
  const logAttendance = useLogAttendance();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const sessions = currentWeekOccurrences(COACHING_SLOTS, now);

  function handleConnect(slot: CoachingSlot, startedAt: Date) {
    logAttendance.mutate({ slot, startedAt });
  }
  const baseForWeek = sessions[0]?.nextStart ?? now;
  // Début de semaine = lundi du même numéro de semaine que baseForWeek (en Paris)
  const weekStart = new Date(baseForWeek.getTime() - ((((baseForWeek.getUTCDay() + 6) % 7)) * 86_400_000));
  const weekEnd = new Date(weekStart.getTime() + 6 * 86_400_000);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Tes coachings de la semaine</h1>
          <Badge variant="outline" className="gap-1.5 border-primary/40 bg-primary/5 text-primary font-medium">
            🇫🇷 Horaires heure de France (Paris)
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Semaine du {formatParisDayMonth(weekStart)} au{" "}
          {formatParisDayMonthYear(weekEnd)}
        </p>
      </div>

      <MyCoachingStatsCard />

      <div className="grid gap-4">
        {sessions.map(({ slot, nextStart }) => {
          const phase = computeJoinPhase(
            {
              scheduled_at: nextStart.toISOString(),
              duration_minutes: slot.durationMinutes,
              meeting_url: ZOOM_COACHING.url,
              status: "scheduled",
            },
            now,
          );

          const isOpen = phase === "open";
          const isEnded = phase === "ended";
          const endsAt = new Date(nextStart.getTime() + slot.durationMinutes * 60_000);

          let statusLabel = "";
          let statusVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
          if (isOpen) {
            const started = nextStart.getTime() <= now.getTime();
            statusLabel = started ? "En cours" : "Ouvre maintenant";
            statusVariant = "default";
          } else if (isEnded) {
            statusLabel = "Terminée";
            statusVariant = "secondary";
          } else {
            statusLabel = `Dans ${formatDistanceToNow(nextStart, { locale: fr })}`;
            statusVariant = "outline";
          }

          return (
            <Card key={slot.id} className={isEnded ? "opacity-60" : ""}>
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl">{slot.emoji}</span>
                    <h3 className="text-lg font-semibold">{slot.title}</h3>
                    <Badge variant={statusVariant}>{statusLabel}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      {slot.coach}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatParisFull(nextStart)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-1.5 sm:min-w-[180px]">
                  <Button
                    asChild={isOpen}
                    disabled={!isOpen}
                    className="w-full sm:w-auto"
                    size="lg"
                  >
                    {isOpen ? (
                      <a
                        href={ZOOM_COACHING.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleConnect(slot, nextStart)}
                      >
                        Se connecter
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    ) : (
                      <span>Se connecter</span>
                    )}
                  </Button>
                  {isOpen && (
                    <p className="text-xs text-muted-foreground">
                      Jusqu'à {formatParisTime(endsAt)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ReplaysSection />

      <Card className="bg-muted/30">
        <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Infos Zoom (lien unique pour tous les coachings)</p>
          <p>ID de réunion : <span className="font-mono">{ZOOM_COACHING.meetingId}</span></p>
          <p>Code secret : <span className="font-mono">{ZOOM_COACHING.passcode}</span></p>
        </CardContent>
      </Card>
    </div>
  );
}
