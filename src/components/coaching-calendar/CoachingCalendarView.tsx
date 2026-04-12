import { useMemo, useState } from "react";
import { format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, Video, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGroupSessions, type GroupSession } from "@/hooks/useGroupCoaching";

type ViewMode = "month" | "week";

interface Props {
  canCreate: boolean;
  onCreateClick: (defaultDate?: Date) => void;
  onSelectSession: (session: GroupSession) => void;
}

function statusBadge(status: GroupSession["status"]) {
  const map: Record<GroupSession["status"], { label: string; className: string }> = {
    scheduled: { label: "Planifiée", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
    live: { label: "En direct", className: "bg-green-500/10 text-green-600 border-green-500/30" },
    completed: { label: "Terminée", className: "bg-muted text-muted-foreground" },
    cancelled: { label: "Annulée", className: "bg-red-500/10 text-red-600 border-red-500/30 line-through" },
  };
  const s = map[status];
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

export function CoachingCalendarView({ canCreate, onCreateClick, onSelectSession }: Props) {
  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  const range = useMemo(() => {
    if (view === "month") {
      return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    }
    return { from: startOfWeek(anchor, { locale: fr }), to: endOfWeek(anchor, { locale: fr }) };
  }, [anchor, view]);

  const { data: sessions, isLoading } = useGroupSessions(range);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, GroupSession[]>();
    for (const s of sessions ?? []) {
      const key = format(new Date(s.scheduled_at), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [sessions]);

  const daysWithSessions = useMemo(() => {
    return Array.from(sessionsByDay.keys()).map((k) => new Date(k + "T00:00:00"));
  }, [sessionsByDay]);

  const selectedKey = format(selectedDay, "yyyy-MM-dd");
  const daySessions = sessionsByDay.get(selectedKey) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="month">Mois</TabsTrigger>
            <TabsTrigger value="week">Semaine</TabsTrigger>
          </TabsList>
        </Tabs>
        {canCreate && (
          <Button onClick={() => onCreateClick(selectedDay)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle session
          </Button>
        )}
      </div>

      {view === "month" ? (
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
          <Card>
            <CardContent className="p-2">
              <Calendar
                mode="single"
                locale={fr}
                selected={selectedDay}
                onSelect={(d) => d && setSelectedDay(d)}
                month={anchor}
                onMonthChange={setAnchor}
                modifiers={{ hasSession: daysWithSessions }}
                modifiersClassNames={{
                  hasSession: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
                }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : daySessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune session ce jour.</p>
              ) : (
                daySessions.map((s) => (
                  <SessionRow key={s.id} session={s} onClick={() => onSelectSession(s)} />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <WeekAgenda
          range={range}
          sessions={sessions ?? []}
          isLoading={isLoading}
          onSelectSession={onSelectSession}
        />
      )}
    </div>
  );
}

function SessionRow({ session, onClick }: { session: GroupSession; onClick: () => void }) {
  const start = new Date(session.scheduled_at);
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-md border hover:bg-muted/50 transition flex items-start gap-3"
    >
      <div className="flex flex-col items-center justify-center min-w-[48px] text-sm">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold mt-1">{format(start, "HH:mm")}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{session.title}</span>
          {statusBadge(session.status)}
          {session.recurrence_id && (
            <Badge variant="outline" className="text-xs">Récurrente</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {session.coach?.full_name ?? "Coach"} · {session.duration_minutes} min
        </p>
      </div>
      {session.meeting_url && <Video className="h-4 w-4 text-muted-foreground mt-1" />}
    </button>
  );
}

function WeekAgenda({
  range,
  sessions,
  isLoading,
  onSelectSession,
}: {
  range: { from: Date; to: Date };
  sessions: GroupSession[];
  isLoading: boolean;
  onSelectSession: (s: GroupSession) => void;
}) {
  const days: Date[] = [];
  for (let d = startOfDay(range.from); d <= endOfDay(range.to); d = addDays(d, 1)) {
    days.push(d);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
      {days.map((day) => {
        const dayKey = format(day, "yyyy-MM-dd");
        const daySessions = sessions.filter(
          (s) => isSameDay(new Date(s.scheduled_at), day)
        );
        return (
          <Card key={dayKey} className="min-h-[160px]">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm font-medium">
                {format(day, "EEE d", { locale: fr })}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0 space-y-1.5">
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : daySessions.length === 0 ? (
                <p className="text-xs text-muted-foreground">—</p>
              ) : (
                daySessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onSelectSession(s)}
                    className="w-full text-left text-xs p-2 rounded border hover:bg-muted/50"
                  >
                    <div className="font-medium truncate">
                      {format(new Date(s.scheduled_at), "HH:mm")} · {s.title}
                    </div>
                    <div className="text-muted-foreground truncate">
                      {s.coach?.full_name}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
