import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, User, Lock } from "lucide-react";
import { ZOOM_COACHING, type CoachingSlot, type DayName } from "@/config/coachingSlots";
import {
  currentWeekOccurrences,
  formatParisTime,
  formatParisDayMonth,
  formatParisDayMonthYear,
} from "@/lib/coaching-slots";
import { computeJoinPhase } from "@/lib/coaching-window";
import { useLogAttendance } from "@/hooks/useCoachingTracking";
import { useCoachingSlots } from "@/hooks/useCoachingSlots";
import { useCoachingUnlocks, type CoachingUnlocks } from "@/hooks/useCoachingUnlocks";
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
  const { data: coachingSlots, isLoading: slotsLoading } = useCoachingSlots();
  const unlocks = useCoachingUnlocks();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const sessions = useMemo(
    () => currentWeekOccurrences(coachingSlots ?? [], now),
    [coachingSlots, now],
  );

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

  // Chargement des créneaux depuis la DB — court (staleTime 5 min) mais on
  // évite d'afficher une grille vide pendant le premier fetch.
  if (slotsLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="h-8 w-64 bg-muted/40 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="h-[240px] bg-muted/20 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

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
              unlocks={unlocks}
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
  unlocks: CoachingUnlocks;
}

function DayColumn({ dayName, date, session, now, onConnect, unlocks }: DayColumnProps) {
  return (
    <div className="flex flex-col">
      <div className="mb-2 text-center">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {dayName}
        </div>
        <div className="text-sm font-medium">{formatParisDayMonth(date)}</div>
      </div>

      {session ? (
        <SessionCard session={session} now={now} onConnect={onConnect} unlocks={unlocks} />
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
  unlocks: CoachingUnlocks;
}

function SessionCard({ session, now, onConnect, unlocks }: SessionCardProps) {
  const { slot, nextStart } = session;

  // Verrou par formation (demande CEO 20/05/2026). Si le coaching est
  // verrouillé, on n'affiche pas le bouton « Se connecter » mais un message
  // invitant à terminer la formation associée.
  const locked = unlocks.isLocked(slot.id);
  const rule = unlocks.getRule(slot.id);

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
  if (locked) {
    statusLabel = "Verrouillé";
    statusVariant = "secondary";
  } else if (isOpen) {
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
    <Card
      className={`flex-1 min-h-[220px] ${isEnded && !locked ? "opacity-60" : ""}`}
    >
      <CardContent className="p-4 flex flex-col h-full gap-3">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-xl ${locked ? "grayscale opacity-70" : ""}`}>
              {slot.emoji}
            </span>
            <h3 className="text-sm font-semibold leading-tight">{slot.title}</h3>
          </div>
          <Badge
            variant={statusVariant}
            className="mt-2 text-[10px] gap-1"
          >
            {locked && <Lock className="h-2.5 w-2.5" />}
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

        {locked ? (
          <div className="mt-auto flex flex-col gap-2">
            <div className="rounded-md border border-dashed border-border bg-muted/40 p-2.5">
              <div className="flex items-start gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Termine la formation{" "}
                  <span className="font-medium text-foreground">
                    {rule?.formationLabel}
                  </span>{" "}
                  pour débloquer ce coaching.
                </p>
              </div>
            </div>
            {rule && (
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to={`/training/${rule.formationSlug}`}>
                  Voir la formation
                </Link>
              </Button>
            )}
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
