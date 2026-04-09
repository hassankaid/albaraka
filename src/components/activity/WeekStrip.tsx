import { Check, Minus, Calendar } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import type { WeekStripDay } from "@/hooks/useActivityData";

interface WeekStripProps {
  days: WeekStripDay[];
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function WeekStrip({ days, selectedDate, onSelect }: WeekStripProps) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day, i) => {
        const isSelected = isSameDay(day.date, selectedDate);
        const disabled = day.isFuture;

        let stateClasses = "";
        if (disabled) {
          stateClasses = "bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50";
        } else if (day.filled) {
          stateClasses = "bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/20";
        } else {
          stateClasses = "bg-rose-500/5 border-rose-500/30 hover:bg-rose-500/10";
        }

        const ringClass = isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "";

        return (
          <button
            key={day.dateStr}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(day.date)}
            className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-3 transition-colors ${stateClasses} ${ringClass}`}
          >
            <span className="text-[10px] font-medium uppercase tracking-wider">
              {DAY_LABELS[i]}
            </span>
            <span className="text-lg font-bold">{format(day.date, "d", { locale: fr })}</span>
            <div className="h-4 flex items-center">
              {day.isFuture ? (
                <Calendar className="h-3 w-3" />
              ) : day.filled ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Minus className="h-3.5 w-3.5 text-rose-500" />
              )}
            </div>
            {day.isToday && (
              <span className="text-[9px] font-semibold text-primary uppercase">Auj.</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
