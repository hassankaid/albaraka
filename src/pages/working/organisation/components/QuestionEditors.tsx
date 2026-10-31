import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_DAYS, DayName, tachesDuParcours } from "../lib/predefinedTasks";
import { tachesParDefaut, type Answers, type BlockedSlot, type CustomTask, type DayOverrides, type TacheChoisie, type TachesChoisies } from "../lib/generatePlanning";
import { DayOverridesEditor } from "./DayOverridesEditor";

// ═══════════════════════════════════════════════════════════
// BlockedSlotsEditor — créneaux bloqués (cours, RDV, etc.)
// ═══════════════════════════════════════════════════════════
export function BlockedSlotsEditor({
  value, onChange,
}: { value: BlockedSlot[]; onChange: (v: BlockedSlot[]) => void }) {
  const slots = value || [];
  const add = () => onChange([...slots, { label: "", days: ["Lundi"], h: 18, m: 0, dur: 60 }]);
  const update = (i: number, patch: Partial<BlockedSlot>) => {
    const n = [...slots]; n[i] = { ...n[i], ...patch }; onChange(n);
  };
  const remove = (i: number) => onChange(slots.filter((_, j) => j !== i));
  const toggleDay = (i: number, d: DayName) => {
    const cur = (slots[i].days || []) as DayName[];
    update(i, { days: cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d] });
  };
  return (
    <div className="space-y-3">
      {slots.map((s, i) => (
        <Card key={i} className="border-rose-500/20 bg-rose-500/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={s.label || ""}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="Ex: Cours d'arabe, RDV..."
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={() => remove(i)}>
                <X className="h-4 w-4 text-rose-500" />
              </Button>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Jours</div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_DAYS.map((d) => {
                  const a = (s.days || []).includes(d);
                  return (
                    <button
                      key={d} type="button" onClick={() => toggleDay(i, d)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs border transition-colors",
                        a ? "bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400 font-medium"
                          : "border-border text-muted-foreground hover:border-rose-500/50"
                      )}
                    >{a ? "✓ " : ""}{d.slice(0, 3)}</button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Heure</div>
                <Input
                  type="time"
                  value={`${String(s.h).padStart(2, "0")}:${String(s.m || 0).padStart(2, "0")}`}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(":").map(Number);
                    update(i, { h, m });
                  }}
                  className="w-32"
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Durée</div>
                <Select value={String(s.dur)} onValueChange={(v) => update(i, { dur: parseInt(v) })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[30, 45, 60, 90, 120, 150, 180].map((d) => (
                      <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" onClick={add} className="w-full gap-2 border-dashed">
        <Plus className="h-4 w-4" />
        Ajouter un créneau bloqué
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════
// TachesParcoursEditor — les tâches du parcours : durée et jours préférés
// ═══════════════════════════════════════
const DUREES = [15, 30, 45, 60, 90, 120, 180];
const libelleDuree = (d: number) => (d < 60 ? `${d} min` : d % 60 ? `${Math.floor(d / 60)}h${d % 60}` : `${d / 60}h`);

export function TachesParcoursEditor({
  value, onChange, pack, parcours,
}: {
  value?: TachesChoisies;
  onChange: (v: TachesChoisies) => void;
  pack: "al_baraka" | "liberty";
  parcours?: string;
}) {
  const taches = tachesDuParcours(pack, parcours);
  const choix = value ?? tachesParDefaut(pack, parcours);
  const maj = (id: string, patch: Partial<TacheChoisie>) =>
    onChange({ ...choix, [id]: { ...choix[id], ...patch } });
  const basculer = (id: string, dureeDefaut: number) => {
    const n = { ...choix };
    if (n[id]) delete n[id];
    else n[id] = { dur: dureeDefaut, days: [] };
    onChange(n);
  };
  return (
    <div className="space-y-3">
      {taches.map((t) => {
        const c = choix[t.id];
        return (
          <div key={t.id} className={cn("rounded-lg border p-3", c ? "border-primary/40 bg-primary/5" : "border-border")}>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => basculer(t.id, t.dureeDefaut)}
                className="flex flex-1 items-center gap-2.5 text-left text-sm font-medium text-foreground"
              >
                <span className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs",
                  c ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}>{c ? "✓" : ""}</span>
                {t.label}
              </button>
              {c && (
                <Select value={String(c.dur)} onValueChange={(v) => maj(t.id, { dur: Number(v) })}>
                  <SelectTrigger className="h-8 w-24 text-xs" aria-label={`Durée de ${t.label}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[...new Set([...DUREES, c.dur])].sort((a, b) => a - b).map((d) => (
                      <SelectItem key={d} value={String(d)}>{libelleDuree(d)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {c && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {ALL_DAYS.map((d) => {
                  const actif = c.days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={actif}
                      onClick={() => maj(t.id, { days: actif ? c.days.filter((x) => x !== d) : [...c.days, d] })}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                        actif ? "border-primary bg-primary/15 font-medium text-foreground" : "border-border text-muted-foreground hover:border-primary/50",
                      )}
                    >{d.slice(0, 3)}</button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CustomTaskEditor — tâches libres avec jour/heure/durée
// ═══════════════════════════════════════════════════════════
export function CustomTaskEditor({
  value, onChange,
}: { value: CustomTask[]; onChange: (v: CustomTask[]) => void }) {
  const tasks = value || [];
  const add = () =>
    onChange([...tasks, { name: "", dur: 30, freq: "Quotidien", days: [], time: "" }]);
  const update = (i: number, patch: Partial<CustomTask>) => {
    const n = [...tasks]; n[i] = { ...n[i], ...patch }; onChange(n);
  };
  const remove = (i: number) => onChange(tasks.filter((_, j) => j !== i));
  const toggleDay = (i: number, d: DayName) => {
    const cur = (tasks[i].days || []) as DayName[];
    update(i, { days: cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d] });
  };
  return (
    <div className="space-y-3">
      {tasks.map((t, i) => (
        <Card key={i} className="border-cyan-500/20 bg-cyan-500/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={t.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Nom de la tâche..."
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={() => remove(i)}>
                <X className="h-4 w-4 text-rose-500" />
              </Button>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Jours (optionnel)</div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_DAYS.map((d) => {
                  const a = (t.days || []).includes(d);
                  return (
                    <button
                      key={d} type="button" onClick={() => toggleDay(i, d)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs border transition-colors",
                        a ? "bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-400 font-medium"
                          : "border-border text-muted-foreground hover:border-cyan-500/50"
                      )}
                    >{a ? "✓ " : ""}{d.slice(0, 3)}</button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Heure (opt.)</div>
                <Input
                  type="time"
                  value={t.time || ""}
                  onChange={(e) => update(i, { time: e.target.value })}
                  className="w-32"
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Durée</div>
                <Select value={String(t.dur)} onValueChange={(v) => update(i, { dur: parseInt(v) })}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[15, 20, 30, 45, 60, 90, 120].map((d) => (
                      <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Fréquence</div>
                <Select value={t.freq || "Quotidien"} onValueChange={(v) => update(i, { freq: v as CustomTask["freq"] })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Quotidien", "2-3x/semaine", "1x/semaine"].map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" onClick={add} className="w-full gap-2 border-dashed">
        <Plus className="h-4 w-4" />
        Ajouter une tâche
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// QuestionCard — dispatcher
// ═══════════════════════════════════════════════════════════
export function QuestionCard({
  question, value, onChange, pack, answers,
}: {
  question: any;
  value: any;
  onChange: (v: any) => void;
  pack: "al_baraka" | "liberty";
  answers: Answers;
}) {
  const q = question;
  const isMulti = q.type === "multi";
  const selected = isMulti ? (value || []) : value;
  const toggleMulti = (opt: string) => {
    const arr = (selected || []).filter((x: string) => x !== "Aucune");
    onChange(arr.includes(opt) ? arr.filter((x: string) => x !== opt) : [...arr, opt]);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading text-xl text-foreground">{q.label}</h3>
        {q.subtitle && <p className="text-sm text-muted-foreground mt-1">{q.subtitle}</p>}
      </div>

      {q.type === "select" && (
        <div className="space-y-2">
          {q.options?.map((o: string) => (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors",
                value === o
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >{value === o ? "✓ " : ""}{o}</button>
          ))}
        </div>
      )}

      {isMulti && (
        <div className="flex flex-wrap gap-2">
          {q.options?.map((o: string) => {
            const a = (selected || []).includes(o);
            return (
              <button
                key={o} type="button" onClick={() => toggleMulti(o)}
                className={cn(
                  "px-4 py-2 rounded-full border text-sm transition-colors",
                  a ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >{a ? "✓ " : ""}{o}</button>
            );
          })}
        </div>
      )}

      {q.type === "text" && (
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Ta réponse..." />
      )}

      {q.type === "number" && (
        <Input
          type="number" value={value || ""} onChange={(e) => onChange(e.target.value)}
          className="w-32 text-2xl font-bold text-center"
        />
      )}

      {q.type === "time" && (
        <Input
          type="time" value={value || ""} onChange={(e) => onChange(e.target.value)}
          className="w-40 text-lg font-semibold"
        />
      )}

      {q.type === "taches_parcours" && (
        <TachesParcoursEditor value={value} onChange={onChange} pack={pack} parcours={answers.parcours} />
      )}

      {q.type === "custom_tasks" && (
        <CustomTaskEditor value={value || []} onChange={onChange} />
      )}

      {q.type === "blocked_slots" && (
        <BlockedSlotsEditor value={value || []} onChange={onChange} />
      )}

      {q.type === "day_overrides" && (
        <DayOverridesEditor
          value={(value as DayOverrides) || undefined}
          onChange={onChange}
          answers={answers}
          mode={
            answers.profile === "Étudiant(e)"
              ? "study"
              : answers.profile === "Salarié(e)" ||
                (answers.has_job && answers.has_job !== "Non")
              ? "work"
              : "none"
          }
        />
      )}
    </div>
  );
}
