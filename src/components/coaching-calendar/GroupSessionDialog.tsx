import { useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Video, Repeat2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useCancelGroupSession, type GroupSession } from "@/hooks/useGroupCoaching";
import { toast } from "@/hooks/use-toast";
import { computeJoinPhase, windowOpensAt, JOIN_EARLY_MINUTES, JOIN_GRACE_MINUTES } from "@/lib/coaching-window";

interface Props {
  session: GroupSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupSessionDialog({ session, open, onOpenChange }: Props) {
  const { profile, user } = useAuth();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelScope, setCancelScope] = useState<"single" | "all_future">("single");
  const cancelMut = useCancelGroupSession();

  const canManage = useMemo(() => {
    if (!session || !profile || !user) return false;
    return profile.role === "ceo" || session.coach_user_id === user.id;
  }, [session, profile, user]);

  if (!session) return null;

  const start = new Date(session.scheduled_at);
  const phase = computeJoinPhase(session);
  const joinable = phase === "open";
  const opensAt = windowOpensAt(session);

  const handleCancel = async () => {
    try {
      await cancelMut.mutateAsync({ id: session.id, scope: cancelScope });
      toast({ title: "Session annulée" });
      setConfirmCancel(false);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {session.title}
              {session.recurrence_id && (
                <Badge variant="outline" className="gap-1">
                  <Repeat2 className="h-3 w-3" /> Série
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {format(start, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })} · {session.duration_minutes} min
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            {session.description && <p className="text-muted-foreground">{session.description}</p>}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coach</span>
              <span className="font-medium">{session.coach?.full_name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Visioconférence</span>
              <span className="font-medium capitalize">{session.meeting_provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Statut</span>
              <span className="font-medium capitalize">{session.status}</span>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            {phase === "no_link" && (
              <p className="text-xs text-muted-foreground text-center">Aucun lien de visio fourni.</p>
            )}
            {phase === "cancelled" && (
              <p className="text-xs text-muted-foreground text-center">Session annulée.</p>
            )}
            {phase === "open" && (
              <Button asChild>
                <a href={session.meeting_url!} target="_blank" rel="noreferrer">
                  <Video className="h-4 w-4 mr-2" />
                  Rejoindre la visio
                </a>
              </Button>
            )}
            {phase === "too_early" && (
              <Button disabled variant="outline">
                <Video className="h-4 w-4 mr-2" />
                Disponible à partir du {format(opensAt, "d MMM 'à' HH:mm", { locale: fr })}
              </Button>
            )}
            {phase === "ended" && (
              <Button disabled variant="outline">
                <Video className="h-4 w-4 mr-2" />
                Lien expiré
              </Button>
            )}
            {session.meeting_url && phase !== "cancelled" && (
              <p className="text-[11px] text-muted-foreground text-center">
                Accès ouvert {JOIN_EARLY_MINUTES} min avant le début et jusqu'à {JOIN_GRACE_MINUTES} min après la fin.
              </p>
            )}
          </div>

          {canManage && session.status !== "cancelled" && (
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setConfirmCancel(true)}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Annuler la session
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la session</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action marquera la session comme annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {session.recurrence_id && (
            <RadioGroup value={cancelScope} onValueChange={(v) => setCancelScope(v as "single" | "all_future")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="scope-single" />
                <Label htmlFor="scope-single">Cette occurrence uniquement</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all_future" id="scope-all" />
                <Label htmlFor="scope-all">Cette occurrence et toutes les suivantes</Label>
              </div>
            </RadioGroup>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMut.isPending}>Retour</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={cancelMut.isPending}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
