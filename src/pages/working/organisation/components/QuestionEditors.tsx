import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_DAYS, DayName, PREDEFINED_TASKS } from "../lib/predefinedTasks";
import type { Answers, BlockedSlot, CoachingSlot, CustomTask, DayOverrides } from "../lib/generatePlanning";
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

// ═══════════════════════════════════════════════════════════
// CoachingSelector — choix des coachings à suivre
// ═══════════════════════════════════════════════════════════
export function CoachingSelector({
  value, onChange, coachings,
}: { value: string[]; onChange: (v: string[]) => void; coachings: CoachingSlot[] }) {
  const sel = value || [];
  const toggle = (id: string) =>
    onChange(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);

  if (coachings.length === 0) {
    return (
      <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
        Aucun coaching disponible pour le moment.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {coachings.map((c) => {
        const a = sel.includes(c.id);
        return (
          <Card
            key={c.id}
            className={cn(
              "cursor-pointer transition-colors",
              a ? "border-violet-500 bg-violet-500/10" : "hover:border-violet-500/40"
            )}
            onClick={() => toggle(c.id)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <GraduationCap className={cn("h-5 w-5", a ? "text-violet-500" : "text-muted-foreground")} />
              <div className="flex-1">
                <div className={cn("font-medium", a ? "text-violet-600 dark:text-violet-400" : "text-foreground")}>
                  {a ? "✓ " : ""}{c.label}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {c.day} · {String(c.h).padStart(2, "0")}h{String(c.m).padStart(2, "0")} · {c.dur} min
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TaskSelector — catalogue tâches prédéfinies groupées
// ═══════════════════════════════════════════════════════════
export function TaskSelector({
  value, onChange, filter,
}: {
  value: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
  filter: "baraka" | "liberty";
}) {
  const sel = value || {};
  const isActive = (id: string) => id in sel;
  const toggle = (id: string) => {
    if (isActive(id)) {
      const n = { ...sel }; delete n[id]; onChange(n);
    } else {
      onChange({ ...sel, [id]: 0 });
    }
  };
  const setDur = (id: string, dur: number) => onChange({ ...sel, [id]: dur });

  const BARAKA = [
    "task_tournage","task_creation_contenu","task_montage","task_sourcing_videos",
    "task_sourcing_infopreneur","task_setting_dm","task_setting_tel","task_closing",
    "task_formation_video","task_engagement","task_veille","task_sav","task_technique",
    "task_bilan","task_planif","task_prep_coaching","task_post_coaching","task_notes",
  ];
  const ids = filter === "liberty"
    ? [...BARAKA, "task_management","task_tunnel","task_email_seq","task_pub","task_comptabilite","task_strategie"]
    : BARAKA;

  const groups: Record<string, string[]> = {
    "Contenu & Vidéo": ["task_creation_contenu","task_tournage","task_montage","task_sourcing_videos"],
    "Prospection & Vente": ["task_sourcing_infopreneur","task_setting_dm","task_setting_tel","task_closing","task_pub","task_tunnel","task_email_seq"],
    "Formation": ["task_formation_video","task_notes","task_prep_coaching","task_post_coaching"],
    "Organisation": ["task_engagement","task_veille","task_sav","task_technique","task_bilan","task_planif","task_management","task_comptabilite","task_strategie"],
  };

  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([group, groupIds]) => {
        const visible = groupIds.filter((id) => ids.includes(id));
        if (!visible.length) return null;
        return (
          <div key={group}>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
              {group}
            </div>
            <div className="space-y-1.5">
              {visible.map((id) => {
                const t = PREDEFINED_TASKS.find((x) => x.id === id);
                if (!t) return null;
                const a = isActive(id);
                return (
                  <div key={id}>
                    <button
                      type="button"
                      onClick={() => toggle(id)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors",
                        a
                          ? "bg-primary/10 border-primary text-primary font-medium"
                          : "border-border text-muted-foreground hover:border-primary/40",
                        a && "rounded-b-none border-b-0"
                      )}
                    >
                      {a ? "✓ " : ""}{t.label}
                    </button>
                    {a && (
                      <div className="px-4 py-2 bg-primary/5 border border-t-0 border-primary rounded-b-lg flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Durée :</span>
                        <Select
                          value={String(sel[id] || 0)}
                          onValueChange={(v) => setDur(id, parseInt(v))}
                        >
                          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="— Choisis —" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">— Choisis —</SelectItem>
                            {[15, 20, 30, 45, 60, 90, 120].map((d) => (
                              <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {sel[id] === 0 && (
                          <span className="text-xs text-rose-500">⚠ Indique la durée</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
  question, value, onChange, coachings, answers,
}: {
  question: any;
  value: any;
  onChange: (v: any) => void;
  coachings: CoachingSlot[];
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

      {q.type === "coaching_select" && (
        <CoachingSelector value={value} onChange={onChange} coachings={coachings} />
      )}

      {q.type === "task_select" && (
        <TaskSelector value={value || {}} onChange={onChange} filter={q.taskFilter || "baraka"} />
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
