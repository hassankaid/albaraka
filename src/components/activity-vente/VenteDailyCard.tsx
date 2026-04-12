import { useEffect, useState } from "react";
import { ChevronDown, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ClosingDailyLog, DailyLogPatch } from "@/hooks/useClosingPlan";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EmotionPicker, EmotionBadges } from "./EmotionPicker";

interface Props {
  date: Date;
  log: ClosingDailyLog | null;
  readonly?: boolean;
  salesOfDay: number;
  onSave: (patch: DailyLogPatch) => Promise<unknown>;
  isSaving: boolean;
}

export function VenteDailyCard({ date, log, readonly, salesOfDay, onSave, isSaving }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [rpD, setRpD] = useState(log?.rp_d ?? 0);
  const [rpC, setRpC] = useState(log?.rp_c ?? 0);
  const [emotions, setEmotions] = useState<string[]>(log?.emotions ?? []);
  const [feeling, setFeeling] = useState(log?.feeling ?? "");
  const [learning, setLearning] = useState(log?.learning ?? "");

  useEffect(() => {
    setRpD(log?.rp_d ?? 0);
    setRpC(log?.rp_c ?? 0);
    setEmotions(log?.emotions ?? []);
    setFeeling(log?.feeling ?? "");
    setLearning(log?.learning ?? "");
  }, [log?.id, log?.updated_at]);

  const filled = (log?.rp_d ?? 0) > 0 || (log?.rp_c ?? 0) > 0 || (log?.emotions?.length ?? 0) > 0;
  const isFuture = date > new Date();
  const dayLabel = format(date, "EEE d MMM", { locale: fr });

  const handleSave = async () => {
    await onSave({ rp_d: rpD, rp_c: rpC, emotions, feeling, learning });
  };

  const dirty =
    rpD !== (log?.rp_d ?? 0) ||
    rpC !== (log?.rp_c ?? 0) ||
    feeling !== (log?.feeling ?? "") ||
    learning !== (log?.learning ?? "") ||
    JSON.stringify(emotions) !== JSON.stringify(log?.emotions ?? []);

  return (
    <div
      className={cn(
        "rounded-lg border transition overflow-hidden",
        filled ? "bg-muted/30 border-border" : "bg-card border-transparent",
        isFuture && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={() => !isFuture && setExpanded(!expanded)}
        disabled={isFuture}
        className="w-full px-3 sm:px-4 py-2.5 flex items-center gap-2.5 text-left"
      >
        <div
          className={cn(
            "w-8 h-8 shrink-0 rounded-md flex items-center justify-center text-[11px] font-semibold uppercase",
            filled ? "bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/40" : "border border-border text-muted-foreground",
          )}
        >
          {format(date, "EEE", { locale: fr }).slice(0, 3)}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">{dayLabel}</span>
          <EmotionBadges ids={emotions} />
          {(rpD > 0 || rpC > 0) && (
            <span className="text-[11px] text-[#C9A84C]">
              D:{rpD} C:{rpC}
            </span>
          )}
          {salesOfDay > 0 && (
            <span className="text-[11px] text-green-600 dark:text-green-400">🎉 {salesOfDay}</span>
          )}
          {learning && <span className="text-[10px] text-[#C9A84C]">💡</span>}
        </div>
        {!isFuture && (
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")}
          />
        )}
      </button>

      {expanded && !isFuture && (
        <div className="px-3 sm:px-4 pb-4 space-y-4 border-t border-border">
          <div className="pt-3">
            <label className="text-[11px] text-[#C9A84C] font-semibold uppercase tracking-wide mb-2 block">
              État émotionnel avant l'appel
            </label>
            <EmotionPicker selected={emotions} onChange={setEmotions} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-[#C9A84C] block mb-1">RP Découverte</label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={rpD}
                onChange={(e) => setRpD(Math.max(0, parseInt(e.target.value || "0", 10)))}
                className="text-center h-9"
                disabled={readonly}
              />
            </div>
            <div>
              <label className="text-[10px] text-[#C9A84C] block mb-1">RP Closing</label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={rpC}
                onChange={(e) => setRpC(Math.max(0, parseInt(e.target.value || "0", 10)))}
                className="text-center h-9"
                disabled={readonly}
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">Ventes</label>
              <div className="h-9 flex items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
                {salesOfDay}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-[#C9A84C] block mb-1">
              Comment tu te sentais avant de décrocher ?
            </label>
            <Textarea
              rows={2}
              value={feeling}
              onChange={(e) => setFeeling(e.target.value)}
              placeholder="Confiance, appréhension, énergie…"
              disabled={readonly}
            />
          </div>

          <div>
            <label className="text-[10px] text-[#C9A84C] block mb-1">
              💡 Ce que tu as appris aujourd'hui
            </label>
            <Textarea
              rows={2}
              value={learning}
              onChange={(e) => setLearning(e.target.value)}
              placeholder="Quelle leçon retiens-tu ?"
              disabled={readonly}
            />
          </div>

          {!readonly && (
            <div className="flex items-center justify-end gap-2">
              {!dirty && log && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Enregistré
                </span>
              )}
              <Button size="sm" onClick={handleSave} disabled={!dirty || isSaving}>
                {isSaving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
