import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  History, Ticket, GraduationCap, Send, Mail, Rocket, Loader2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAccessTimeline, type AccessTimelineEvent } from "@/hooks/useAccessAdmin";

interface Props {
  userId: string;
  userName: string;
  onClose: () => void;
}

export function AccessHistoryDialog({ userId, userName, onClose }: Props) {
  const { data: events, isLoading } = useAccessTimeline(userId);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique complet — {userName || "—"}
          </DialogTitle>
          <DialogDescription>
            Timeline unifiée : pass, formations, invitations, modifications d'email et early access.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !events || events.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8 italic">
              Aucun événement à afficher.
            </p>
          ) : (
            <ul className="space-y-2">
              {events.map((e, i) => (
                <TimelineItem key={i} event={e} />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TimelineItem({ event }: { event: AccessTimelineEvent }) {
  const { icon, color, label } = getEventMeta(event.event_type);
  const dateStr = event.event_at
    ? format(new Date(event.event_at), "d MMM yyyy · HH:mm", { locale: fr })
    : "—";

  return (
    <li className="flex gap-3 p-3 rounded-md border bg-card">
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium">{event.title}</p>
            {event.subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 break-all">
                {event.subtitle}
              </p>
            )}
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {label}
          </Badge>
        </div>
        <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
          <span>{dateStr}</span>
          {event.performed_by_name && (
            <>
              <span>·</span>
              <span>par {event.performed_by_name}</span>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function getEventMeta(type: string): { icon: React.ReactNode; color: string; label: string } {
  switch (type) {
    case "pass_granted":
      return {
        icon: <Ticket className="h-4 w-4 text-primary" />,
        color: "bg-primary/10",
        label: "Pass octroyé",
      };
    case "pass_revoked":
      return {
        icon: <Ticket className="h-4 w-4 text-muted-foreground" />,
        color: "bg-muted",
        label: "Pass révoqué",
      };
    case "enrollment_granted":
      return {
        icon: <GraduationCap className="h-4 w-4 text-primary" />,
        color: "bg-primary/10",
        label: "Formation ajoutée",
      };
    case "enrollment_revoked":
      return {
        icon: <GraduationCap className="h-4 w-4 text-muted-foreground" />,
        color: "bg-muted",
        label: "Formation retirée",
      };
    case "invitation_sent":
      return {
        icon: <Send className="h-4 w-4 text-emerald-500" />,
        color: "bg-emerald-500/10",
        label: "Invitation",
      };
    case "email_changed":
      return {
        icon: <Mail className="h-4 w-4 text-blue-500" />,
        color: "bg-blue-500/10",
        label: "Email",
      };
    case "early_access_granted":
      return {
        icon: <Rocket className="h-4 w-4 text-amber-500" />,
        color: "bg-amber-500/10",
        label: "Early access",
      };
    case "early_access_revoked":
      return {
        icon: <Rocket className="h-4 w-4 text-muted-foreground" />,
        color: "bg-muted",
        label: "Early access",
      };
    default:
      return {
        icon: <History className="h-4 w-4" />,
        color: "bg-muted",
        label: type,
      };
  }
}
