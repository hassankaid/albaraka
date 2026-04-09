import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, Video, MessageCircle, Mail, CalendarCheck, ShoppingCart, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import type { DailyKpi, Objectives, WeekStripDay } from "@/hooks/useActivityData";
import { ymd } from "@/hooks/useActivityData";
import { WeekStrip } from "./WeekStrip";

const KPI_CONFIG = [
  { key: "videos_published" as const, label: "Vidéos publiées", icon: Video, color: "hsl(var(--primary))" },
  { key: "messages_sent" as const, label: "Messages envoyés", icon: MessageCircle, color: "hsl(262 80% 55%)" },
  { key: "replies_received" as const, label: "Réponses reçues", icon: Mail, color: "hsl(150 60% 45%)" },
  { key: "appointments" as const, label: "RDV obtenus", icon: CalendarCheck, color: "hsl(35 90% 55%)" },
  { key: "sales_made" as const, label: "Ventes réalisées", icon: ShoppingCart, color: "hsl(350 70% 55%)" },
];

const OBJECTIVE_KEYS = ["videos_published", "messages_sent", "appointments"] as const;
const OBJ_MAP: Record<string, keyof Objectives> = {
  videos_published: "videos",
  messages_sent: "messages",
  appointments: "appointments",
};

type FormState = Pick<DailyKpi, "videos_published" | "messages_sent" | "replies_received" | "appointments" | "sales_made">;

const EMPTY_FORM: FormState = {
  videos_published: 0,
  messages_sent: 0,
  replies_received: 0,
  appointments: 0,
  sales_made: 0,
};

interface DailyEntryFormProps {
  weekStrip: WeekStripDay[];
  todayEntry: DailyKpi | null;
  objectivesDaily: Objectives;
  onSave: (params: { entryDate: string; values: FormState }) => Promise<void>;
  isSaving: boolean;
}

export function DailyEntryForm({
  weekStrip,
  todayEntry,
  objectivesDaily,
  onSave,
  isSaving,
}: DailyEntryFormProps) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Synchronise le formulaire avec la date sélectionnée
  useEffect(() => {
    const day = weekStrip.find((d) => isSameDay(d.date, selectedDate));
    if (day?.entry) {
      setForm({
        videos_published: day.entry.videos_published,
        messages_sent: day.entry.messages_sent,
        replies_received: day.entry.replies_received,
        appointments: day.entry.appointments,
        sales_made: day.entry.sales_made,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [selectedDate, weekStrip]);

  const handleSubmit = async () => {
    try {
      await onSave({ entryDate: ymd(selectedDate), values: form });
      toast.success(
        isSameDay(selectedDate, today) ? "Journée enregistrée !" : "Journée mise à jour !"
      );
    } catch (e: any) {
      const msg = e?.message || "Erreur lors de la sauvegarde";
      // Erreur RLS = backfill hors semaine en cours
      if (msg.includes("row-level security")) {
        toast.error("Tu ne peux saisir que la semaine en cours.");
      } else {
        toast.error(msg);
      }
    }
  };

  const selectedDay = weekStrip.find((d) => isSameDay(d.date, selectedDate));
  const isToday = isSameDay(selectedDate, today);
  const existingEntry = selectedDay?.entry || null;

  // Objectifs quotidiens (3 KPIs avec progress bars)
  const objectiveKpis = KPI_CONFIG.filter((k) => (OBJECTIVE_KEYS as readonly string[]).includes(k.key));

  return (
    <div className="space-y-4">
      {/* Strip 7 jours */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Ma semaine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WeekStrip days={weekStrip} selectedDate={selectedDate} onSelect={setSelectedDate} />
          <p className="text-xs text-muted-foreground mt-3">
            Clique sur un jour pour le saisir ou le modifier. La saisie est limitée à la semaine en cours.
          </p>
        </CardContent>
      </Card>

      {/* Objectifs du jour */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Objectifs du jour</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {objectiveKpis.map(({ key, label, icon: Icon, color }) => {
            const value = form[key];
            const target = objectivesDaily[OBJ_MAP[key]] || 1;
            const pct = target > 0 ? Math.round((value / target) * 100) : 0;
            const capped = Math.min(pct, 100);

            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color }} />
                    <span className="font-medium">{label}</span>
                  </div>
                  <span className={`font-semibold ${pct >= 100 ? "text-emerald-500" : "text-foreground"}`}>
                    {value}/{target} ({pct}%)
                  </span>
                </div>
                <Progress value={capped} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Formulaire de saisie */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {isToday ? "Saisie d'aujourd'hui" : `Saisie du ${format(selectedDate, "EEEE d MMMM", { locale: fr })}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {KPI_CONFIG.map(({ key, label, icon: Icon }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {label}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form[key]}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            ))}
          </div>
          <Button
            className="mt-4 w-full sm:w-auto"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {existingEntry ? "Mettre à jour" : "Enregistrer ma journée"}
          </Button>
          {existingEntry?.updated_at && (
            <p className="text-xs text-muted-foreground mt-2">
              Dernière saisie : {format(new Date(existingEntry.updated_at), "d MMMM 'à' HH:mm", { locale: fr })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Coach IA — feedback du jour saisi */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Coach IA — {isToday ? "aujourd'hui" : format(selectedDate, "d MMMM", { locale: fr })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {existingEntry?.ai_feedback ? (
            <div className="text-sm space-y-2">
              {existingEntry.ai_feedback.split("\n").filter(Boolean).map((line, i) => {
                const html = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
                return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />;
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isToday
                ? "Saisis ta journée pour recevoir ton mot du coach personnalisé."
                : "Aucun feedback enregistré pour cette journée."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
