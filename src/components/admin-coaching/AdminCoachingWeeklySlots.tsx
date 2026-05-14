// AdminCoachingWeeklySlots — éditeur des 4 coachings hebdomadaires.
//
// Permet au CEO de modifier, pour chaque créneau récurrent :
//   - le coach assigné
//   - le jour de la semaine
//   - l'heure et les minutes de début
//   - la durée
//   - le titre et l'emoji
//   - l'activation (afficher/masquer le créneau dans le calendrier)
//
// Source de vérité : table coaching_weekly_slots. Toute modification est
// immédiatement répercutée sur le calendrier de tous les utilisateurs
// (le calendrier lit la même table via useCoachingSlots).

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Pencil, Loader2, User, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminCoachingSlots,
  useUpdateCoachingSlot,
  type AdminCoachingSlot,
} from "@/hooks/useCoachingSlots";
import type { DayName } from "@/config/coachingSlots";

const DAYS: DayName[] = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

const DURATION_OPTIONS = [30, 45, 60, 75, 90, 105, 120, 150, 180];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export default function AdminCoachingWeeklySlots() {
  const { data: slots, isLoading } = useAdminCoachingSlots();
  const [editing, setEditing] = useState<AdminCoachingSlot | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          Coachings de la semaine
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Modifie le coach, le jour ou l'horaire d'un créneau. Les changements
          sont appliqués immédiatement sur le calendrier de tous les membres.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(slots ?? []).map((slot) => (
          <Card
            key={slot.id}
            className={`border-border/60 ${slot.isActive ? "" : "opacity-60"}`}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl">{slot.emoji}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{slot.title}</p>
                    {!slot.isActive && (
                      <Badge variant="outline" className="mt-0.5 text-[10px] bg-muted text-muted-foreground">
                        Masqué du calendrier
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 shrink-0"
                  onClick={() => setEditing(slot)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Modifier
                </Button>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-foreground font-medium">{slot.coach}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-foreground">
                    {slot.day} à {slot.hour}h{pad2(slot.minute)}
                  </span>
                  <span className="text-muted-foreground">· {slot.durationMinutes} min</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && (
        <EditSlotModal
          slot={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

interface EditSlotModalProps {
  slot: AdminCoachingSlot;
  onClose: () => void;
}

function EditSlotModal({ slot, onClose }: EditSlotModalProps) {
  const { toast } = useToast();
  const updateSlot = useUpdateCoachingSlot();

  const [day, setDay] = useState<DayName>(slot.day);
  const [hour, setHour] = useState<string>(String(slot.hour));
  const [minute, setMinute] = useState<string>(String(slot.minute));
  const [durationMinutes, setDurationMinutes] = useState<string>(String(slot.durationMinutes));
  const [title, setTitle] = useState(slot.title);
  const [coach, setCoach] = useState(slot.coach);
  const [emoji, setEmoji] = useState(slot.emoji ?? "");
  const [isActive, setIsActive] = useState(slot.isActive);

  const hourNum = parseInt(hour, 10);
  const minuteNum = parseInt(minute, 10);
  const durationNum = parseInt(durationMinutes, 10);

  const valid =
    Number.isInteger(hourNum) && hourNum >= 0 && hourNum <= 23 &&
    Number.isInteger(minuteNum) && minuteNum >= 0 && minuteNum <= 59 &&
    Number.isInteger(durationNum) && durationNum > 0 &&
    title.trim().length > 0 &&
    coach.trim().length > 0;

  async function handleSave() {
    if (!valid) return;
    try {
      await updateSlot.mutateAsync({
        id: slot.id,
        day,
        hour: hourNum,
        minute: minuteNum,
        durationMinutes: durationNum,
        title: title.trim(),
        coach: coach.trim(),
        emoji: emoji.trim() || null,
        isActive,
      });
      toast({
        title: "Créneau mis à jour",
        description: `${title.trim()} — ${day} à ${hourNum}h${pad2(minuteNum)}, coach ${coach.trim()}.`,
      });
      onClose();
    } catch (e: any) {
      toast({
        title: "Échec de la mise à jour",
        description: e?.message || "Réessaie ou contacte le support.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Modifier le créneau</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Titre + emoji */}
          <div className="grid grid-cols-[1fr_72px] gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Titre</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Emoji</Label>
              <Input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="📞"
                className="bg-background text-center"
                maxLength={4}
              />
            </div>
          </div>

          {/* Coach */}
          <div className="space-y-1.5">
            <Label className="text-xs">Coach</Label>
            <Input
              value={coach}
              onChange={(e) => setCoach(e.target.value)}
              placeholder="Ex : Sabrina"
              className="bg-background"
            />
          </div>

          {/* Jour */}
          <div className="space-y-1.5">
            <Label className="text-xs">Jour</Label>
            <Select value={day} onValueChange={(v) => setDay(v as DayName)}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Heure + minute + durée */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Heure</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={23}
                value={hour}
                onChange={(e) => setHour(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Minute</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Durée (min)</Label>
              <Select value={durationMinutes} onValueChange={setDurationMinutes}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actif */}
          <div className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/30 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Visible dans le calendrier</p>
              <p className="text-xs text-muted-foreground">
                Désactive pour masquer ce créneau sans le supprimer.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {!valid && (
            <p className="text-xs text-destructive">
              Vérifie les champs : heure 0-23, minute 0-59, titre et coach obligatoires.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={updateSlot.isPending}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={!valid || updateSlot.isPending}
            className="gap-2"
          >
            {updateSlot.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
