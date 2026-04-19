import { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, CalendarIcon, RotateCcw } from "lucide-react";
import { fr } from "date-fns/locale";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ConferenceFilter } from "@/lib/marketing/conferenceFilter";
import {
  buildConferenceList,
  currentOrPrevSunday,
  formatConferenceLabelFull,
} from "@/lib/marketing/conferenceFilter";

type PresetKey = "conference" | "month" | "quarter" | "year" | "all" | "custom";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const QUARTERS = ["T1", "T2", "T3", "T4"];

function buildYears() {
  const cur = new Date().getFullYear();
  return Array.from({ length: 8 }, (_, i) => cur - 3 + i);
}

interface Props {
  value: ConferenceFilter;
  onChange: (filter: ConferenceFilter) => void;
}

/**
 * Filtre de période pour le dashboard marketing : filtre par conference_date.
 * - "Conférence" : une seule conf (dim 12h Paris) via sélecteur
 * - "Mois" / "Trimestre" / "Année" : plage de dates (somme de N confs)
 * - "Tout" : sans filtre
 * - "Personnalisé" : plage dates libre
 */
export default function ConferenceFilter({ value, onChange }: Props) {
  const initializedRef = useRef(false);
  const now = new Date();
  const currentConf = useMemo(() => currentOrPrevSunday(now), []);
  const confs = useMemo(() => buildConferenceList(now, 30, 6), []);

  const [preset, setPreset] = useState<PresetKey>("conference");
  const [selConf, setSelConf] = useState<string>(currentConf);
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [selMonthYear, setSelMonthYear] = useState(now.getFullYear());
  const [selQuarter, setSelQuarter] = useState(Math.floor(now.getMonth() / 3));
  const [selQuarterYear, setSelQuarterYear] = useState(now.getFullYear());
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [customOpen, setCustomOpen] = useState(false);

  const years = useMemo(() => buildYears(), []);

  // Init à la conf en cours
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      onChange({ mode: "single", date: currentConf });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyConf = (date: string) => {
    setSelConf(date);
    onChange({ mode: "single", date });
  };

  const applyMonth = (month: number, year: number) => {
    setSelMonth(month);
    setSelMonthYear(year);
    const first = new Date(Date.UTC(year, month, 1));
    const last = new Date(Date.UTC(year, month + 1, 0));
    onChange({
      mode: "range",
      from: first.toISOString().slice(0, 10),
      to: last.toISOString().slice(0, 10),
    });
  };

  const applyQuarter = (q: number, year: number) => {
    setSelQuarter(q);
    setSelQuarterYear(year);
    const first = new Date(Date.UTC(year, q * 3, 1));
    const last = new Date(Date.UTC(year, q * 3 + 3, 0));
    onChange({
      mode: "range",
      from: first.toISOString().slice(0, 10),
      to: last.toISOString().slice(0, 10),
    });
  };

  const applyYear = (year: number) => {
    setSelYear(year);
    onChange({
      mode: "range",
      from: `${year}-01-01`,
      to: `${year}-12-31`,
    });
  };

  const applyCustom = () => {
    if (customFrom && customTo) {
      onChange({
        mode: "range",
        from: customFrom.toISOString().slice(0, 10),
        to: customTo.toISOString().slice(0, 10),
      });
      setCustomOpen(false);
    }
  };

  const handlePreset = (key: PresetKey) => {
    setPreset(key);
    if (key === "all") onChange({ mode: "all" });
    else if (key === "conference") applyConf(selConf);
    else if (key === "month") applyMonth(selMonth, selMonthYear);
    else if (key === "quarter") applyQuarter(selQuarter, selQuarterYear);
    else if (key === "year") applyYear(selYear);
    else if (key === "custom") setCustomOpen(true);
  };

  const resetToCurrent = () => {
    if (preset === "conference") applyConf(currentConf);
    else if (preset === "month") applyMonth(now.getMonth(), now.getFullYear());
    else if (preset === "quarter")
      applyQuarter(Math.floor(now.getMonth() / 3), now.getFullYear());
    else if (preset === "year") applyYear(now.getFullYear());
  };

  const isCurrentPeriod = () => {
    if (preset === "conference") return selConf === currentConf;
    if (preset === "month")
      return selMonth === now.getMonth() && selMonthYear === now.getFullYear();
    if (preset === "quarter")
      return (
        selQuarter === Math.floor(now.getMonth() / 3) &&
        selQuarterYear === now.getFullYear()
      );
    if (preset === "year") return selYear === now.getFullYear();
    return true;
  };

  const navConf = (delta: number) => {
    const idx = confs.indexOf(selConf);
    if (idx < 0) return;
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= confs.length) return;
    applyConf(confs[newIdx]);
  };

  const presets: { key: PresetKey; label: string }[] = [
    { key: "conference", label: "Conférence" },
    { key: "month", label: "Mois" },
    { key: "quarter", label: "Trimestre" },
    { key: "year", label: "Année" },
    { key: "all", label: "Tout" },
    { key: "custom", label: "Personnalisé" },
  ];

  const showResetButton = preset !== "all" && preset !== "custom" && !isCurrentPeriod();

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
        {presets.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handlePreset(key)}
            className={cn(
              "px-2.5 py-1 text-xs rounded-md transition-all font-medium",
              preset === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {preset === "conference" && (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => navConf(-1)}
            disabled={confs.indexOf(selConf) <= 0}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Select value={selConf} onValueChange={applyConf}>
            <SelectTrigger className="h-7 text-xs w-[320px]">
              <SelectValue placeholder="Sélectionne une conférence" />
            </SelectTrigger>
            <SelectContent className="max-h-[320px]">
              {[...confs].reverse().map((c) => {
                const isCurrent = c === currentConf;
                const isFuture = c > currentConf;
                return (
                  <SelectItem key={c} value={c}>
                    <span className="flex items-center gap-2">
                      <span>{formatConferenceLabelFull(c)}</span>
                      {isCurrent && (
                        <span className="text-[10px] text-primary">(en cours)</span>
                      )}
                      {isFuture && (
                        <span className="text-[10px] text-muted-foreground">(à venir)</span>
                      )}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => navConf(1)}
            disabled={confs.indexOf(selConf) >= confs.length - 1}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {preset === "month" && (
        <div className="flex items-center gap-1.5">
          <Select
            value={String(selMonth)}
            onValueChange={(v) => applyMonth(Number(v), selMonthYear)}
          >
            <SelectTrigger className="h-7 text-xs w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(selMonthYear)}
            onValueChange={(v) => applyMonth(selMonth, Number(v))}
          >
            <SelectTrigger className="h-7 text-xs w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {preset === "quarter" && (
        <div className="flex items-center gap-1.5">
          <Select
            value={String(selQuarter)}
            onValueChange={(v) => applyQuarter(Number(v), selQuarterYear)}
          >
            <SelectTrigger className="h-7 text-xs w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUARTERS.map((q, i) => (
                <SelectItem key={i} value={String(i)}>
                  {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(selQuarterYear)}
            onValueChange={(v) => applyQuarter(selQuarter, Number(v))}
          >
            <SelectTrigger className="h-7 text-xs w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {preset === "year" && (
        <Select value={String(selYear)} onValueChange={(v) => applyYear(Number(v))}>
          <SelectTrigger className="h-7 text-xs w-[80px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showResetButton && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={resetToCurrent}
        >
          <RotateCcw className="h-3 w-3" />
          Aujourd'hui
        </Button>
      )}

      {preset === "custom" && (
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
              <CalendarIcon className="h-3 w-3" />
              {customFrom && customTo
                ? `${format(customFrom, "dd/MM/yy")} → ${format(customTo, "dd/MM/yy")}`
                : "Choisir la plage"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex">
              <div className="border-r border-border p-2">
                <p className="text-[11px] text-muted-foreground font-medium px-2 pb-1">
                  Début
                </p>
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={setCustomFrom}
                  locale={fr}
                  className="p-2 pointer-events-auto"
                />
              </div>
              <div className="p-2">
                <p className="text-[11px] text-muted-foreground font-medium px-2 pb-1">
                  Fin
                </p>
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={setCustomTo}
                  locale={fr}
                  disabled={(date) => (customFrom ? date < customFrom : false)}
                  className="p-2 pointer-events-auto"
                />
              </div>
            </div>
            <div className="border-t border-border p-2 flex justify-end">
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={applyCustom}
                disabled={!customFrom || !customTo}
              >
                Appliquer
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {value.mode === "single" && preset === "conference" && (
        <span className="text-[11px] text-muted-foreground hidden lg:inline">
          Cohorte démarre le {formatConferenceLabelFull(value.date).replace("Conférence du ", "")} à 12h00 Paris
        </span>
      )}
    </div>
  );
}
