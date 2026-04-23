import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ALL_DAYS, DayName } from "../lib/predefinedTasks";
import type { Answers, DayOverrides, DayOverride } from "../lib/generatePlanning";
import { ChevronDown, RotateCcw, Sparkles, CheckCircle2 } from "lucide-react";

/**
 * Éditeur d'exceptions horaires par jour.
 *
 * UX : chaque jour apparaît fermé avec un résumé "en un clin d'œil"
 * des horaires par défaut ou surchargés. Un clic sur la carte ouvre
 * l'éditeur du jour. L'élève peut :
 *  - modifier l'heure de réveil / coucher (ou laisser le défaut),
 *  - déclarer qu'il travaille ce jour (ou pas),
 *  - fixer des horaires de travail différents du défaut,
 *  - tout remettre au défaut (bouton reset par jour).
 *
 * Les valeurs par défaut sont toujours affichées en gris à côté du
 * champ, l'élève voit immédiatement ce qui est surchargé et ce qui
 * ne l'est pas.
 */

type Field = "wake" | "sleep" | "work_start" | "work_end" | "study_start" | "study_end";

const DAY_SHORT: Record<DayName, string> = {
  Lundi: "Lun",
  Mardi: "Mar",
  Mercredi: "Mer",
  Jeudi: "Jeu",
  Vendredi: "Ven",
  Samedi: "Sam",
  Dimanche: "Dim",
};

function isWeekend(d: DayName): boolean {
  return d === "Samedi" || d === "Dimanche";
}

function defaultWake(d: DayName, a: Answers): string {
  return (isWeekend(d) ? a.wake_weekend : a.wake_week) || "07:00";
}
function defaultSleep(d: DayName, a: Answers): string {
  return (isWeekend(d) ? a.sleep_weekend : a.sleep_week) || "23:00";
}
function defaultWork(a: Answers): { start: string; end: string } {
  return { start: a.work_start || "09:00", end: a.work_end || "17:00" };
}
function defaultStudy(a: Answers): { start: string; end: string } {
  return { start: a.study_start || "09:00", end: a.study_end || "17:00" };
}

function formatRange(start?: string, end?: string): string {
  if (!start || !end) return "—";
  return `${start} → ${end}`;
}

export interface DayOverridesEditorProps {
  value: DayOverrides | undefined;
  onChange: (next: DayOverrides) => void;
  answers: Answers;
  /** Profil actuel : on adapte ce qui est "travail" entre Salarié et Étudiant. */
  mode?: "work" | "study" | "none";
}

export function DayOverridesEditor({
  value,
  onChange,
  answers,
  mode = "work",
}: DayOverridesEditorProps) {
  const [openDay, setOpenDay] = useState<DayName | null>(null);
  const overrides = value || {};

  const workDays = (answers.work_days || []) as DayName[];
  const studyDays = (answers.study_days || []) as DayName[];
  const baseDays = mode === "work" ? workDays : mode === "study" ? studyDays : [];

  const overriddenCount = useMemo(() => {
    return ALL_DAYS.filter((d) => {
      const o = overrides[d];
      if (!o) return false;
      return !!(o.wake || o.sleep || o.work || o.study);
    }).length;
  }, [overrides]);

  function updateDay(d: DayName, patch: Partial<DayOverride>) {
    const prev = overrides[d] || {};
    const next: DayOverride = { ...prev, ...patch };
    // Nettoie work si tout est vide dedans
    if (next.work && !next.work.disabled && !next.work.forced && !next.work.start && !next.work.end) {
      delete next.work;
    }
    if (next.study && !next.study.disabled && !next.study.forced && !next.study.start && !next.study.end) {
      delete next.study;
    }
    const isEmpty = !next.wake && !next.sleep && !next.work && !next.study;
    const nextOverrides = { ...overrides };
    if (isEmpty) delete nextOverrides[d];
    else nextOverrides[d] = next;
    onChange(nextOverrides);
  }

  function resetDay(d: DayName) {
    const nextOverrides = { ...overrides };
    delete nextOverrides[d];
    onChange(nextOverrides);
  }

  return (
    <div className="space-y-3">
      {/* En-tête explicatif UX */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex gap-3">
          <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm text-foreground font-medium">
              Horaires différents certains jours ?
            </p>
            <p className="text-xs text-muted-foreground">
              Tes horaires par défaut sont appliqués à tous les jours.
              Clique sur un jour ci-dessous pour y poser une exception.
              Les autres jours restent intacts.
            </p>
          </div>
        </div>
        {overriddenCount > 0 && (
          <div className="mt-3 pt-3 border-t border-amber-500/20">
            <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-600 dark:text-amber-400">
              <CheckCircle2 className="h-3 w-3" />
              {overriddenCount} {overriddenCount > 1 ? "jours personnalisés" : "jour personnalisé"}
            </Badge>
          </div>
        )}
      </div>

      {/* Cartes par jour */}
      <div className="space-y-2">
        {ALL_DAYS.map((day) => {
          const override = overrides[day];
          const isOpen = openDay === day;
          const customized = !!override;

          const wake = override?.wake || defaultWake(day, answers);
          const sleep = override?.sleep || defaultSleep(day, answers);

          const dayWorksByDefault = baseDays.includes(day);
          const workActive = mode === "work" && !override?.work?.disabled && (dayWorksByDefault || !!override?.work?.forced);
          const studyActive = mode === "study" && !override?.study?.disabled && (dayWorksByDefault || !!override?.study?.forced);

          const workStart = override?.work?.start || defaultWork(answers).start;
          const workEnd = override?.work?.end || defaultWork(answers).end;
          const studyStart = override?.study?.start || defaultStudy(answers).start;
          const studyEnd = override?.study?.end || defaultStudy(answers).end;

          return (
            <div
              key={day}
              className={cn(
                "rounded-lg border transition-colors",
                customized
                  ? "border-primary/45 bg-primary/5"
                  : "border-border bg-card/40"
              )}
            >
              {/* Ligne résumée — clickable */}
              <button
                type="button"
                onClick={() => setOpenDay(isOpen ? null : day)}
                className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-muted/30 transition-colors"
              >
                {/* Pastille jour */}
                <div
                  className={cn(
                    "flex items-center justify-center shrink-0 rounded-md w-11 h-11 text-xs font-semibold",
                    customized
                      ? "bg-primary/15 text-primary border border-primary/50"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {DAY_SHORT[day]}
                </div>

                {/* Résumé horaires */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="text-sm font-medium text-foreground flex items-baseline gap-2 flex-wrap">
                    <span>{day}</span>
                    {!customized && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Identique aux horaires par défaut
                      </span>
                    )}
                    {customized && (
                      <span className="text-[10px] uppercase tracking-wider text-primary">
                        Personnalisé
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                    <span>🌙 {wake} → {sleep}</span>
                    {mode === "work" && (
                      workActive ? (
                        <span>💼 {workStart}–{workEnd}</span>
                      ) : dayWorksByDefault ? (
                        <span className="text-rose-500">💼 Repos ce jour</span>
                      ) : override?.work?.forced ? (
                        <span>💼 {workStart}–{workEnd}</span>
                      ) : (
                        <span className="text-muted-foreground/70">Pas de travail</span>
                      )
                    )}
                    {mode === "study" && (
                      studyActive ? (
                        <span>📚 {studyStart}–{studyEnd}</span>
                      ) : dayWorksByDefault ? (
                        <span className="text-rose-500">📚 Pas de cours</span>
                      ) : (
                        <span className="text-muted-foreground/70">Pas de cours</span>
                      )
                    )}
                  </div>
                </div>

                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </button>

              {/* Éditeur détaillé */}
              {isOpen && (
                <div className="border-t border-border/60 p-4 space-y-5 bg-background/40">
                  {/* Bloc sommeil */}
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Sommeil
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FieldTime
                        label="Réveil"
                        defaultValue={defaultWake(day, answers)}
                        value={override?.wake}
                        onChange={(v) => updateDay(day, { wake: v })}
                      />
                      <FieldTime
                        label="Coucher"
                        defaultValue={defaultSleep(day, answers)}
                        value={override?.sleep}
                        onChange={(v) => updateDay(day, { sleep: v })}
                      />
                    </div>
                  </div>

                  {/* Bloc travail */}
                  {mode === "work" && (
                    <div className="space-y-3 pt-2 border-t border-border/40">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Travail
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`work-${day}`}
                            checked={workActive}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                // Activer : si pas dans work_days, on force
                                if (dayWorksByDefault) {
                                  updateDay(day, { work: { ...(override?.work || {}), disabled: false } });
                                } else {
                                  updateDay(day, { work: { ...(override?.work || {}), forced: true, disabled: false } });
                                }
                              } else {
                                // Désactiver : si dans work_days, on disable. Sinon on retire le forced.
                                if (dayWorksByDefault) {
                                  updateDay(day, { work: { ...(override?.work || {}), disabled: true, forced: false } });
                                } else {
                                  updateDay(day, { work: undefined as any });
                                }
                              }
                            }}
                          />
                          <label htmlFor={`work-${day}`} className="text-xs text-foreground cursor-pointer">
                            {workActive ? "Je travaille" : "Jour de repos"}
                          </label>
                        </div>
                      </div>

                      {workActive && (
                        <div className="grid grid-cols-2 gap-3">
                          <FieldTime
                            label="Début"
                            defaultValue={defaultWork(answers).start}
                            value={override?.work?.start}
                            onChange={(v) =>
                              updateDay(day, {
                                work: { ...(override?.work || {}), start: v },
                              })
                            }
                          />
                          <FieldTime
                            label="Fin"
                            defaultValue={defaultWork(answers).end}
                            value={override?.work?.end}
                            onChange={(v) =>
                              updateDay(day, {
                                work: { ...(override?.work || {}), end: v },
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bloc études */}
                  {mode === "study" && (
                    <div className="space-y-3 pt-2 border-t border-border/40">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Cours
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`study-${day}`}
                            checked={studyActive}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                if (dayWorksByDefault) {
                                  updateDay(day, { study: { ...(override?.study || {}), disabled: false } });
                                } else {
                                  updateDay(day, { study: { ...(override?.study || {}), forced: true, disabled: false } });
                                }
                              } else {
                                if (dayWorksByDefault) {
                                  updateDay(day, { study: { ...(override?.study || {}), disabled: true, forced: false } });
                                } else {
                                  updateDay(day, { study: undefined as any });
                                }
                              }
                            }}
                          />
                          <label htmlFor={`study-${day}`} className="text-xs text-foreground cursor-pointer">
                            {studyActive ? "J'ai cours" : "Pas de cours"}
                          </label>
                        </div>
                      </div>

                      {studyActive && (
                        <div className="grid grid-cols-2 gap-3">
                          <FieldTime
                            label="Début"
                            defaultValue={defaultStudy(answers).start}
                            value={override?.study?.start}
                            onChange={(v) =>
                              updateDay(day, {
                                study: { ...(override?.study || {}), start: v },
                              })
                            }
                          />
                          <FieldTime
                            label="Fin"
                            defaultValue={defaultStudy(answers).end}
                            value={override?.study?.end}
                            onChange={(v) =>
                              updateDay(day, {
                                study: { ...(override?.study || {}), end: v },
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {customized && (
                    <div className="flex items-center justify-between pt-3 border-t border-border/40">
                      <span className="text-xs text-muted-foreground">
                        Ce jour est personnalisé
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => resetDay(day)}
                        className="gap-2 text-xs h-8"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Remettre au défaut
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────── Champ horaire avec rappel du défaut en placeholder ───────── */
function FieldTime({
  label,
  defaultValue,
  value,
  onChange,
}: {
  label: string;
  defaultValue: string;
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  const isCustom = !!value && value !== defaultValue;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        {isCustom && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-[10px] text-primary hover:underline"
            aria-label="Remettre au défaut"
          >
            défaut
          </button>
        )}
      </div>
      <Input
        type="time"
        value={value || defaultValue}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === defaultValue ? undefined : v);
        }}
        className={cn("font-mono", isCustom && "border-primary/60 bg-primary/5")}
      />
      {!isCustom && (
        <div className="text-[10px] text-muted-foreground/70">
          défaut : {defaultValue}
        </div>
      )}
    </div>
  );
}
