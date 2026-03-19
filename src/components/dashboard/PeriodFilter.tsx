import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, addWeeks, subWeeks, getISOWeek } from "date-fns";
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

const MONTHS_SHORT = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const QUARTERS = ["T1", "T2", "T3", "T4"];

function buildYears() {
  const cur = new Date().getFullYear();
  return Array.from({ length: 8 }, (_, i) => cur - 3 + i);
}

export default function PeriodFilter({ value, onChange }: Props) {
  const [activePreset, setActivePreset] = useState<PresetKey>("all");

  // Sub-picker states
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth()); // 0-based
  const [selMonthYear, setSelMonthYear] = useState(now.getFullYear());
  const [selWeekRef, setSelWeekRef] = useState(now); // reference date for week
  const [selQuarter, setSelQuarter] = useState(Math.floor(now.getMonth() / 3)); // 0-based
  const [selQuarterYear, setSelQuarterYear] = useState(now.getFullYear());
  const [selYear, setSelYear] = useState(now.getFullYear());

  // Custom
  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const years = useMemo(() => buildYears(), []);

  // ── Apply range based on preset + sub-picker values ──
  const applyMonth = (month: number, year: number) => {
    setSelMonth(month);
    setSelMonthYear(year);
    const d = new Date(year, month, 1);
    onChange({ from: startOfMonth(d), to: endOfMonth(d) });
  };

  const applyWeek = (ref: Date) => {
    setSelWeekRef(ref);
    onChange({ from: startOfWeek(ref, { weekStartsOn: 1 }), to: endOfWeek(ref, { weekStartsOn: 1 }) });
  };

  const applyQuarter = (q: number, year: number) => {
    setSelQuarter(q);
    setSelQuarterYear(year);
    const d = new Date(year, q * 3, 1);
    onChange({ from: startOfQuarter(d), to: endOfQuarter(d) });
  };

  const applyYear = (year: number) => {
    setSelYear(year);
    const d = new Date(year, 0, 1);
    onChange({ from: startOfYear(d), to: endOfYear(d) });
  };

  const handlePreset = (key: PresetKey) => {
    setActivePreset(key);
    if (key === "all") { onChange(null); return; }
    if (key === "month") { applyMonth(selMonth, selMonthYear); return; }
    if (key === "week") { applyWeek(selWeekRef); return; }
    if (key === "quarter") { applyQuarter(selQuarter, selQuarterYear); return; }
    if (key === "year") { applyYear(selYear); return; }
    if (key === "custom") { setCustomOpen(true); return; }
  };

  const applyCustom = () => {
    if (customFrom && customTo) {
      onChange({ from: customFrom, to: customTo });
      setCustomOpen(false);
    }
  };

  // Week display helpers
  const weekStart = startOfWeek(selWeekRef, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selWeekRef, { weekStartsOn: 1 });
  const weekNum = getISOWeek(selWeekRef);

  const presets: { key: PresetKey; label: string }[] = [
    { key: "week", label: "Semaine" },
    { key: "month", label: "Mois" },
    { key: "quarter", label: "Trimestre" },
    { key: "year", label: "Année" },
    { key: "all", label: "Tout" },
    { key: "custom", label: "Personnalisé" },
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
        {presets.map(({ key, label }) => (
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

      {/* ── WEEK sub-picker ── */}
      {activePreset === "week" && (
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyWeek(subWeeks(selWeekRef, 1))}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-medium text-foreground min-w-[180px] text-center">
            S{weekNum} — {format(weekStart, "d MMM", { locale: fr })} → {format(weekEnd, "d MMM yyyy", { locale: fr })}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyWeek(addWeeks(selWeekRef, 1))}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* ── MONTH sub-picker ── */}
      {activePreset === "month" && (
        <div className="flex items-center gap-1.5">
          <Select value={String(selMonth)} onValueChange={(v) => applyMonth(Number(v), selMonthYear)}>
            <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS_SHORT.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(selMonthYear)} onValueChange={(v) => applyMonth(selMonth, Number(v))}>
            <SelectTrigger className="h-7 text-xs w-[80px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── QUARTER sub-picker ── */}
      {activePreset === "quarter" && (
        <div className="flex items-center gap-1.5">
          <Select value={String(selQuarter)} onValueChange={(v) => applyQuarter(Number(v), selQuarterYear)}>
            <SelectTrigger className="h-7 text-xs w-[70px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {QUARTERS.map((q, i) => <SelectItem key={i} value={String(i)}>{q}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(selQuarterYear)} onValueChange={(v) => applyQuarter(selQuarter, Number(v))}>
            <SelectTrigger className="h-7 text-xs w-[80px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── YEAR sub-picker ── */}
      {activePreset === "year" && (
        <Select value={String(selYear)} onValueChange={(v) => applyYear(Number(v))}>
          <SelectTrigger className="h-7 text-xs w-[80px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {/* ── CUSTOM date picker ── */}
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

      {/* ── Range label for custom ── */}
      {value && activePreset === "custom" && customFrom && customTo && (
        <span className="text-[11px] text-muted-foreground">
          {format(value.from, "d MMM yyyy", { locale: fr })} → {format(value.to, "d MMM yyyy", { locale: fr })}
        </span>
      )}
    </div>
  );
}
