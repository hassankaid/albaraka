import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ALL_DAYS, DayName, CAT_LABELS, CAT_CLASSES } from "../lib/predefinedTasks";
import type { WeekPlan, PlanSlot } from "../lib/generatePlanning";
import { Settings } from "lucide-react";

function formatMinutes(m: number) {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h${String(r).padStart(2, "0")}`;
}
function fmtTime(h: number, m: number) {
  return `${String(Math.max(0, h)).padStart(2, "0")}:${String(Math.max(0, m)).padStart(2, "0")}`;
}

export function WeeklyAgenda({
  plan, version, onOpenRefinement,
}: {
  plan: WeekPlan;
  version: number;
  onOpenRefinement: () => void;
}) {
  const [day, setDay] = useState<DayName>("Lundi");
  const slots = plan[day] || [];

  // Stats par catégorie sur la semaine
  const weekStats = Object.entries(CAT_LABELS)
    .map(([cat, label]) => {
      const total = (Object.values(plan) as PlanSlot[][])
        .flat()
        .filter((s) => s.cat === cat)
        .reduce((a, s) => a + s.dur, 0);
      return { cat, label, total };
    })
    .filter((x) => x.total > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Badge variant="outline" className="mb-1 text-xs tracking-widest uppercase">
            Planning {version > 1 ? `v${version}` : ""}
          </Badge>
          <h2 className="font-heading text-2xl text-foreground">Ta semaine type</h2>
        </div>
      </div>

      {/* Stats catégories */}
      <div className="flex flex-wrap gap-2">
        {weekStats.map(({ cat, label, total }) => {
          const c = CAT_CLASSES[cat as keyof typeof CAT_CLASSES];
          return (
            <div key={cat} className={cn("px-3 py-1.5 rounded-lg text-xs flex items-baseline gap-1.5", c.bg)}>
              <span className={cn("font-semibold uppercase tracking-wider", c.text)}>{label}</span>
              <span className={cn("font-bold", c.text)}>{formatMinutes(total)}</span>
            </div>
          );
        })}
      </div>

      {/* Onglets jours */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {ALL_DAYS.map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              day === d
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Timeline jour */}
      <div className="relative pl-16">
        {slots.map((s, i) => {
          const c = CAT_CLASSES[s.cat];
          const endMin = s.h * 60 + Math.max(0, s.m) + s.dur;
          return (
            <div
              key={`${day}-${i}-${version}`}
              className="relative mb-2 flex"
              style={{ animation: `fadeUp .3s ease ${i * 0.02}s both` }}
            >
              <div className="absolute -left-16 top-2 w-14 text-right text-xs text-muted-foreground">
                {fmtTime(s.h, s.m)}
              </div>
              <div className={cn("absolute -left-2.5 top-3 w-2 h-2 rounded-full", c.dot)} />
              {i < slots.length - 1 && (
                <div className="absolute -left-[7px] top-5 w-px h-[calc(100%-4px)] bg-border" />
              )}
              <div className={cn("flex-1 rounded-lg border-l-[3px] px-3 py-2 ml-2", c.bg, c.border)}>
                <div className="flex items-baseline justify-between gap-2">
                  <div className={cn("text-sm font-medium", c.text)}>{s.label}</div>
                  <div className="text-[11px] text-muted-foreground shrink-0">{s.dur} min</div>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {fmtTime(s.h, s.m)} → {fmtTime(Math.floor(endMin / 60), endMin % 60)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          {Object.entries(CAT_LABELS).map(([cat, label]) => {
            const c = CAT_CLASSES[cat as keyof typeof CAT_CLASSES];
            return (
              <div key={cat} className="flex items-center gap-1.5">
                <div className={cn("w-2.5 h-2.5 rounded", c.dot)} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="text-center">
        <Button variant="outline" onClick={onOpenRefinement} className="gap-2">
          <Settings className="h-4 w-4" />
          Ajuster mon planning
        </Button>
      </div>

      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
