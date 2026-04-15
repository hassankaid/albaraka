import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, User } from "lucide-react";
import { COACHING_SLOTS, ZOOM_COACHING, type CoachingSlot, type DayName } from "@/config/coachingSlots";
import {
  currentWeekOccurrences,
  formatParisTime,
  formatParisDayMonth,
  formatParisDayMonthYear,
} from "@/lib/coaching-slots";
import { computeJoinPhase } from "@/lib/coaching-window";
import { useLogAttendance } from "@/hooks/useCoachingTracking";
import { ReplaysSection } from "@/components/coaching-calendar/ReplaysSection";
import { MyCoachingStatsCard } from "@/components/coaching-calendar/MyCoachingStatsCard";

// Lundi → Dimanche
const WEEK_DAYS: DayName[] = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

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

  // Map slot.day → occurrence
  const sessionByDay = useMemo(() => {
    const map = new Map<DayName, { slot: CoachingSlot; nextStart: Date }>();
    sessions.forEach((s) => map.set(s.slot.day, s));
    return map;
  }, [sessions]);

  // Calcul des dates de chaque jour de la semaine en se calant sur un jour connu
  const weekDates = useMemo(() => {
    const anchor = sessions[0];
    if (!anchor) {
      // Fallback : Lundi courant en se basant sur maintenant (approximatif)
      const today = new Date(now);
      const dow = (today.getDay() + 6) % 7; // 0=Lundi
      const monday = new Date(today.getTime() - dow * 86_400_000);
      return WEEK_DAYS.map((_, i) => new Date(monday.getTime() + i * 86_400_000));
    }
    const anchorIdx = WEEK_DAYS.indexOf(anchor.slot.day);
    const monday = new Date(anchor.nextStart.getTime() - anchorIdx * 86_400_000);
    return WEEK_DAYS.map((_, i) => new Date(monday.getTime() + i * 86_400_000));
  }, [sessions, now]);

  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
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

      {/* Vue hebdomadaire horizontale */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {WEEK_DAYS.map((dayName, i) => {
          const dateForDay = weekDates[i];
          const session = sessionByDay.get(dayName);

          return (
            <DayColumn
              key={dayName}
              dayName={dayName}
              date={dateForDay}
              session={session}
              now={now}
              onConnect={handleConnect}
            />
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

interface DayColumnProps {
  dayName: DayName;
  date: Date;
  session?: { slot: CoachingSlot; nextStart: Date };
  now: Date;
  onConnect: (slot: CoachingSlot, startedAt: Date) => void;
}

function DayColumn({ dayName, date, session, now, onConnect }: DayColumnProps) {
  return (
    <div className="flex flex-col">
      <div className="mb-2 text-center">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {dayName}
        </div>
        <div className="text-sm font-medium">{formatParisDayMonth(date)}</div>
      </div>

      {session ? (
        <SessionCard session={session} now={now} onConnect={onConnect} />
      ) : (
        <Card className="flex-1 border-dashed bg-muted/20 min-h-[220px]">
          <CardContent className="p-4 h-full flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Pas de coaching</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface SessionCardProps {
  session: { slot: CoachingSlot; nextStart: Date };
  now: Date;
  onConnect: (slot: CoachingSlot, startedAt: Date) => void;
}

function SessionCard({ session, now, onConnect }: SessionCardProps) {
  const { slot, nextStart } = session;

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
    <Card className={`flex-1 min-h-[220px] ${isEnded ? "opacity-60" : ""}`}>
      <CardContent className="p-4 flex flex-col h-full gap-3">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xl">{slot.emoji}</span>
            <h3 className="text-sm font-semibold leading-tight">{slot.title}</h3>
          </div>
          <Badge variant={statusVariant} className="mt-2 text-[10px]">
            {statusLabel}
          </Badge>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{slot.coach}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{formatParisTime(nextStart)}</span>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-1">
          <Button
            asChild={isOpen}
            disabled={!isOpen}
            className="w-full"
            size="sm"
          >
            {isOpen ? (
              <a
                href={ZOOM_COACHING.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onConnect(slot, nextStart)}
              >
                Se connecter
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            ) : (
              <span>Se connecter</span>
            )}
          </Button>
          {isOpen && (
            <p className="text-[10px] text-muted-foreground text-center">
              Jusqu'à {formatParisTime(endsAt)}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
