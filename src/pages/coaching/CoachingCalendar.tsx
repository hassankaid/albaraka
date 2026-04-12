import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { CoachingCalendarView } from "@/components/coaching-calendar/CoachingCalendarView";
import { GroupSessionDialog } from "@/components/coaching-calendar/GroupSessionDialog";
import { GroupSessionForm } from "@/components/coaching-calendar/GroupSessionForm";
import type { GroupSession } from "@/hooks/useGroupCoaching";

export default function CoachingCalendar() {
  const { profile } = useAuth();
  const canCreate = profile?.role === "ceo" || profile?.is_coach === true;

  const [selected, setSelected] = useState<GroupSession | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formDefaultDate, setFormDefaultDate] = useState<Date | undefined>(undefined);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Calendrier des coachings</h1>
        <p className="text-sm text-muted-foreground">
          Sessions de coaching de groupe accessibles avec un Pass Al Baraka ou Liberty.
        </p>
      </div>

      <CoachingCalendarView
        canCreate={canCreate}
        onCreateClick={(d) => {
          setFormDefaultDate(d);
          setFormOpen(true);
        }}
        onSelectSession={(s) => {
          setSelected(s);
          setDetailsOpen(true);
        }}
      />

      <GroupSessionDialog session={selected} open={detailsOpen} onOpenChange={setDetailsOpen} />
      <GroupSessionForm open={formOpen} onOpenChange={setFormOpen} defaultDate={formDefaultDate} />
    </div>
  );
}
