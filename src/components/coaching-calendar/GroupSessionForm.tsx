import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCreateGroupSession, type MeetingProvider, type RecurrenceFrequency } from "@/hooks/useGroupCoaching";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
}

interface CoachOption {
  id: string;
  full_name: string;
}

function useCoaches() {
  return useQuery({
    queryKey: ["coaches-list"],
    queryFn: async (): Promise<CoachOption[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .or("is_coach.eq.true,role.eq.ceo")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as CoachOption[];
    },
  });
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function GroupSessionForm({ open, onOpenChange, defaultDate }: Props) {
  const { user, profile } = useAuth();
  const { data: coaches } = useCoaches();
  const createMut = useCreateGroupSession();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coachId, setCoachId] = useState<string>("");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [duration, setDuration] = useState<number>(60);
  const [provider, setProvider] = useState<MeetingProvider>("zoom");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("none");
  const [endAt, setEndAt] = useState<string>("");

  useEffect(() => {
    if (open) {
      const d = defaultDate ?? new Date();
      d.setHours(10, 0, 0, 0);
      setScheduledAt(toLocalInputValue(d));
      if (user && profile?.is_coach) setCoachId(user.id);
    }
  }, [open, defaultDate, user, profile]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setCoachId("");
    setDuration(60);
    setProvider("zoom");
    setMeetingUrl("");
    setFrequency("none");
    setEndAt("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !coachId || !scheduledAt) {
      toast({ title: "Champs requis manquants", variant: "destructive" });
      return;
    }
    try {
      const result = await createMut.mutateAsync({
        title,
        description: description || null,
        coach_user_id: coachId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: duration,
        meeting_provider: provider,
        meeting_url: meetingUrl || null,
        recurrence: {
          frequency,
          end_at: endAt ? new Date(endAt).toISOString() : null,
        },
      });
      toast({
        title: "Session créée",
        description:
          frequency === "none"
            ? "La session a été planifiée."
            : `${result.inserted} occurrences générées.`,
      });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle session de coaching de groupe</DialogTitle>
          <DialogDescription>
            Planifiez un créneau et partagez le lien de visio aux membres avec un pass.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Titre *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Coach *</Label>
            <Select value={coachId} onValueChange={setCoachId}>
              <SelectTrigger><SelectValue placeholder="Choisir un coach" /></SelectTrigger>
              <SelectContent>
                {(coaches ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="scheduled">Date & heure *</Label>
              <Input
                id="scheduled"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duration">Durée (min)</Label>
              <Input
                id="duration"
                type="number"
                min={15}
                step={15}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as MeetingProvider)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="meet">Google Meet</SelectItem>
                  <SelectItem value="teams">Teams</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meeting_url">Lien visio</Label>
              <Input
                id="meeting_url"
                type="url"
                placeholder="https://..."
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-1.5">
              <Label>Récurrence</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurrenceFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune (unique)</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="biweekly">Toutes les 2 semaines</SelectItem>
                  <SelectItem value="monthly">Mensuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {frequency !== "none" && (
              <div className="space-y-1.5">
                <Label htmlFor="end_at">Date de fin (optionnel)</Label>
                <Input
                  id="end_at"
                  type="date"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createMut.isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
