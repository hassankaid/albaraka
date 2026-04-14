import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, PlayCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAvailableReplays, useLogReplayView } from "@/hooks/useCoachingTracking";

export function ReplaysSection() {
  const { data: replays, isLoading } = useAvailableReplays();
  const logView = useLogReplayView();
  const { toast } = useToast();

  if (isLoading) return null;
  if (!replays || replays.length === 0) return null;

  async function copyPassword(pwd: string) {
    try {
      await navigator.clipboard.writeText(pwd);
      toast({ title: "Mot de passe copié", description: "Colle-le dans Zoom." });
    } catch {
      toast({ title: "Copie impossible", description: "Copie-le à la main.", variant: "destructive" });
    }
  }

  function handleReplayClick(occurrenceId: string, url: string) {
    logView.mutate(occurrenceId);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <PlayCircle className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Replays disponibles</h2>
      </div>
      <div className="grid gap-3">
        {replays.map((r) => {
          const title = r.slot ? `${r.slot.emoji ?? ""} ${r.slot.title}`.trim() : r.slot_id;
          const startDate = new Date(r.started_at);
          const availableUntil = r.replay_available_until ? new Date(r.replay_available_until) : null;
          return (
            <Card key={r.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{title}</div>
                  <div className="text-sm text-muted-foreground">
                    Séance du {format(startDate, "EEEE d MMMM", { locale: fr })}
                    {availableUntil && (
                      <> — disponible jusqu'au {format(availableUntil, "d MMMM", { locale: fr })}</>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.replay_password && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyPassword(r.replay_password!)}
                    >
                      <Copy className="h-4 w-4 mr-1.5" />
                      Copier le code
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => r.replay_url && handleReplayClick(r.id, r.replay_url)}
                  >
                    Voir le replay
                    <ExternalLink className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
