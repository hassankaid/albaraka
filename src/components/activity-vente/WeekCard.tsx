import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { ClosingDailyLog, DailyLogPatch, PlanSale } from "@/hooks/useClosingPlan";
import { EMOTIONS_BY_ID } from "@/lib/closing/emotions";
import { TARGETS } from "@/lib/closing/phases";
import { getPlanDayDate, getPlanWeekStart, ymd } from "@/lib/closing/dates";
import { buildWeekRecap, computeWeekStats } from "@/lib/closing/recap";
import { cn } from "@/lib/utils";
import { ProgressionRing } from "./ProgressionRing";
import { VenteDailyCard } from "./VenteDailyCard";

interface Props {
  startedAt: string;
  weekNumber: number;
  logs: ClosingDailyLog[];
  allLogs: ClosingDailyLog[];
  sales: PlanSale[];
  defaultOpen?: boolean;
  readonly?: boolean;
  onSaveDay: (entryDate: string, patch: DailyLogPatch) => Promise<unknown>;
  isSaving: boolean;
}

export function WeekCard({
  startedAt,
  weekNumber,
  logs,
  allLogs,
  sales,
  defaultOpen,
  readonly,
  onSaveDay,
  isSaving,
}: Props) {
  const [open, setOpen] = useState(!!defaultOpen);

  const weekStart = getPlanWeekStart(startedAt, weekNumber);
  const days = Array.from({ length: 7 }, (_, i) => getPlanDayDate(startedAt, weekNumber, i));
  const weekLogs = days.map((d) => logs.find((l) => l.entry_date === ymd(d)) ?? null);
  const salesByDay = days.map((d) => sales.filter((s) => isSameDay(new Date(s.sold_at), d)).length);

  const ventesWeek = salesByDay.reduce((a, b) => a + b, 0);
  const daysForStats = weekLogs.map((l, i) => ({
    rp_d: l?.rp_d ?? 0,
    rp_c: l?.rp_c ?? 0,
    ventes: salesByDay[i],
    emotions: l?.emotions ?? [],
  }));
  const stats = computeWeekStats(daysForStats);

  const prevWeekStart = getPlanWeekStart(startedAt, weekNumber - 1);
  const prevWeekLogs = allLogs
    .filter((l) => {
      const d = new Date(l.entry_date);
      return d >= prevWeekStart && d < weekStart;
    });
  const prevForStats = prevWeekLogs.length
    ? prevWeekLogs.map((l) => ({ rp_d: l.rp_d, rp_c: l.rp_c, ventes: 0, emotions: l.emotions }))
    : undefined;

  const recap = buildWeekRecap(
    daysForStats,
    weekLogs.map((l) => l?.learning ?? "").filter(Boolean) as string[],
    weekNumber,
    prevForStats,
  );

  const topEmojis = stats.topEmotions
    .slice(0, 2)
    .map(([id]) => EMOTIONS_BY_ID.get(id)?.emoji)
    .filter(Boolean)
    .join("");

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center font-serif font-bold text-sm",
              stats.act > 0
                ? "bg-[#C9A84C] text-background"
                : "bg-muted text-muted-foreground",
            )}
          >
            {weekNumber}
          </div>
          <div className="text-left">
            <div className="font-serif font-bold text-base">Semaine {weekNumber}</div>
            <div className="text-[11px] text-muted-foreground">
              du {format(weekStart, "d MMM")}
              {topEmojis && <span className="ml-2">{topEmojis}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          {stats.act > 0 && (
            <>
              <span className={stats.hitD ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                D {stats.rpD}/{TARGETS.rpDecouverte}
              </span>
              <span className={stats.hitC ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                C {stats.rpC}/{TARGETS.rpClosing}
              </span>
              {ventesWeek > 0 && <span className="text-[#C9A84C]">🎉{ventesWeek}</span>}
            </>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </div>
      </button>

      {open && (
        <div className="border-t-2 border-[#C9A84C]">
          <div className="flex justify-center gap-6 py-4 border-b border-border">
            <ProgressionRing current={stats.rpD} target={TARGETS.rpDecouverte} label="RP Découverte" />
            <ProgressionRing current={stats.rpC} target={TARGETS.rpClosing} label="RP Closing" />
            <div className="text-center">
              <div
                className={cn(
                  "w-16 h-16 rounded-full border-[3px] flex items-center justify-center",
                  ventesWeek > 0
                    ? "bg-[#C9A84C] border-[#C9A84C] text-background"
                    : "bg-muted border-border text-muted-foreground",
                )}
              >
                <span className="font-serif text-xl font-bold">{ventesWeek || "—"}</span>
              </div>
              <div className="text-[10px] mt-1" style={{ color: ventesWeek > 0 ? "#C9A84C" : undefined }}>
                Ventes
              </div>
            </div>
          </div>

          <div className="p-3 space-y-1.5">
            {days.map((d, i) => (
              <VenteDailyCard
                key={i}
                date={d}
                log={weekLogs[i]}
                salesOfDay={salesByDay[i]}
                readonly={readonly}
                onSave={(patch) => onSaveDay(ymd(d), patch)}
                isSaving={isSaving}
              />
            ))}
          </div>

          {recap && (
            <div className="m-3 mt-0 rounded-lg bg-muted/40 p-4 border-l-4 border-[#C9A84C]">
              <div className="text-[10px] text-[#C9A84C] font-bold uppercase tracking-widest mb-2">
                Récap Semaine {weekNumber}
              </div>
              <div className="font-serif text-lg mb-2 text-foreground">{recap.headline}</div>
              <div className="text-xs text-muted-foreground mb-3 leading-relaxed">{recap.detail}</div>
              {recap.emotionInsight && (
                <div className="text-xs text-foreground/80 whitespace-pre-line mb-3">
                  {recap.emotionInsight}
                </div>
              )}
              <div className="text-xs italic text-muted-foreground">{recap.tip}</div>
              {recap.learnings.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-[10px] uppercase text-muted-foreground mb-1">Apprentissages</div>
                  <ul className="space-y-1 text-xs text-foreground/90 list-disc list-inside">
                    {recap.learnings.map((l, idx) => (
                      <li key={idx}>{l}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
