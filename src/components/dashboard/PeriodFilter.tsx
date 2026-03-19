import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date;
  to: Date;
}

type PresetKey = "week" | "month" | "quarter" | "year" | "all" | "custom";

interface Props {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
  { key: "quarter", label: "Trimestre" },
  { key: "year", label: "Année" },
  { key: "all", label: "Tout" },
  { key: "custom", label: "Personnalisé" },
];

function getPresetRange(key: PresetKey): DateRange | null {
  const now = new Date();
  switch (key) {
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "quarter":
      return { from: startOfQuarter(now), to: endOfQuarter(now) };
    case "year":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "all":
      return null;
    default:
      return null;
  }
}

export default function PeriodFilter({ value, onChange }: Props) {
  const [activePreset, setActivePreset] = useState<PresetKey>("all");
  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const handlePreset = (key: PresetKey) => {
    setActivePreset(key);
    if (key === "custom") {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    onChange(getPresetRange(key));
  };

  const applyCustom = () => {
    if (customFrom && customTo) {
      onChange({ from: customFrom, to: customTo });
      setCustomOpen(false);
    }
  };

  const formatRange = () => {
    if (!value) return null;
    const f = format(value.from, "d MMM yyyy", { locale: fr });
    const t = format(value.to, "d MMM yyyy", { locale: fr });
    return `${f} → ${t}`;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground font-medium">Période :</span>
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handlePreset(key)}
            className={cn(
              "px-2.5 py-1 text-xs rounded-md transition-all font-medium",
              activePreset === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activePreset === "custom" && (
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
              <CalendarIcon className="h-3 w-3" />
              {customFrom && customTo
                ? `${format(customFrom, "dd/MM/yy")} - ${format(customTo, "dd/MM/yy")}`
                : "Choisir les dates"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex">
              <div className="border-r border-border p-2">
                <p className="text-[11px] text-muted-foreground font-medium px-2 pb-1">Début</p>
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={setCustomFrom}
                  locale={fr}
                  className={cn("p-2 pointer-events-auto")}
                />
              </div>
              <div className="p-2">
                <p className="text-[11px] text-muted-foreground font-medium px-2 pb-1">Fin</p>
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={setCustomTo}
                  locale={fr}
                  disabled={(date) => customFrom ? date < customFrom : false}
                  className={cn("p-2 pointer-events-auto")}
                />
              </div>
            </div>
            <div className="border-t border-border p-2 flex justify-end">
              <Button size="sm" className="h-7 text-xs" onClick={applyCustom} disabled={!customFrom || !customTo}>
                Appliquer
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {value && activePreset !== "all" && (
        <span className="text-[11px] text-muted-foreground">{formatRange()}</span>
      )}
    </div>
  );
}
