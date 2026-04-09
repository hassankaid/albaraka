import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useScriptWithPhases,
  useUpdateScript,
  useCreatePhase,
  useUpdatePhase,
  useDeletePhase,
  useReorderPhases,
} from "@/hooks/useScripts";
import { VOIX_CONFIG, type ScriptCase } from "@/lib/scripts/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ChevronDown,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Sortable Phase Card ───

function SortablePhaseCard({ phase, index, onEdit, onDelete }: {
  phase: any;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: phase.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const voixKey = phase.voix || "raison";
  const voix = VOIX_CONFIG[voixKey] || VOIX_CONFIG.raison;
  const lineCount = (phase.lines || []).length;
  const caseCount = (phase.cases || []).length + (phase.cases2 || []).length;

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="group hover:border-primary/30 transition-colors">
        <CardContent className="flex items-center gap-3 p-4">
          <button className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none" {...attributes} {...listeners}>
            <GripVertical className="h-5 w-5" />
          </button>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{phase.label}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={`${voix.bgColor} ${voix.color} text-xs`}>
                {voix.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {lineCount} ligne{lineCount !== 1 ? "s" : ""}
                {caseCount > 0 && ` · ${caseCount} cas`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Auto-resize Textarea ───

function AutoTextarea({ value, onChange, placeholder, className }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0";
    el.style.height = el.scrollHeight + "px";
  };

  useEffect(() => { resize(); }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onInput={resize}
      placeholder={placeholder}
      rows={1}
      className={cn(
        "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden min-h-[38px]",
        className
      )}
    />
  );
}

// ─── Lines Editor (list-based with add/remove) ───

function LinesEditor({ lines, onChange, placeholder }: {
  lines: string[];
  onChange: (lines: string[]) => void;
  placeholder?: string;
}) {
  const addLine = () => onChange([...lines, ""]);
  const updateLine = (idx: number, value: string) => onChange(lines.map((l, i) => i === idx ? value : l));
  const removeLine = (idx: number) => onChange(lines.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <span className="text-xs text-muted-foreground mt-2.5 w-5 text-right shrink-0">{idx + 1}</span>
          <AutoTextarea
            value={line}
            onChange={(v) => updateLine(idx, v)}
            placeholder={placeholder || "Contenu de la ligne..."}
            className="flex-1"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(idx)} className="shrink-0 text-muted-foreground hover:text-destructive h-9 w-9">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Ajouter une ligne
      </Button>
    </div>
  );
}

// ─── Cases Editor ───

function CasesEditor({ cases, onChange }: { cases: ScriptCase[]; onChange: (cases: ScriptCase[]) => void }) {
  const updateCase = (idx: number, updates: Partial<ScriptCase>) => onChange(cases.map((c, i) => (i === idx ? { ...c, ...updates } : c)));
  const removeCase = (idx: number) => onChange(cases.filter((_, i) => i !== idx));
  const addCase = () => onChange([...cases, { type: "pos", label: "", lines: [] }]);

  return (
    <div className="space-y-3">
      {cases.map((c, idx) => (
        <Card key={idx} className={c.type === "pos" ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}>
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={c.type === "pos"
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "border-red-400 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }
                onClick={() => updateCase(idx, { type: c.type === "pos" ? "neg" : "pos" })}
              >
                {c.type === "pos" ? "Positif" : "Négatif"}
              </Button>
              <Input
                value={c.label}
                onChange={(e) => updateCase(idx, { label: e.target.value })}
                placeholder="Label du cas..."
                className="flex-1"
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeCase(idx)} className="text-destructive hover:text-destructive shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <LinesEditor
              lines={c.lines || []}
              onChange={(lines) => updateCase(idx, { lines })}
              placeholder="Ligne du cas..."
            />
          </CardContent>
        </Card>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addCase} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Ajouter un cas
      </Button>
    </div>
  );
}

// ─── Edit Phase Dialog ───

function EditPhaseDialog({ open, onOpenChange, phase, scriptId }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: any | null;
  scriptId: string;
}) {
  const isNew = !phase;
  const createPhase = useCreatePhase();
  const updatePhase = useUpdatePhase();

  const [label, setLabel] = useState("");
  const [voix, setVoix] = useState("raison");
  const [lines, setLines] = useState<string[]>([]);
  const [cases, setCases] = useState<ScriptCase[]>([]);
  const [lines2, setLines2] = useState<string[]>([]);
  const [cases2, setCases2] = useState<ScriptCase[]>([]);
  const [casesOpen, setCasesOpen] = useState(false);
  const [lines2Open, setLines2Open] = useState(false);
  const [cases2Open, setCases2Open] = useState(false);

  // Initialize form when dialog opens
  useEffect(() => {
    if (!open) return;
    if (phase) {
      setLabel(phase.label || "");
      setVoix(phase.voix || "raison");
      setLines(phase.lines || []);
      setCases(phase.cases || []);
      setLines2(phase.lines2 || []);
      setCases2(phase.cases2 || []);
      setCasesOpen((phase.cases || []).length > 0);
      setLines2Open((phase.lines2 || []).length > 0);
      setCases2Open((phase.cases2 || []).length > 0);
    } else {
      setLabel(""); setVoix("raison"); setLines([]); setCases([]); setLines2([]); setCases2([]);
      setCasesOpen(false); setLines2Open(false); setCases2Open(false);
    }
  }, [open, phase]);

  const saving = createPhase.isPending || updatePhase.isPending;

  const handleSave = async () => {
    if (!label.trim()) { toast.error("Le label est requis."); return; }
    const cleanLines = lines.filter((l) => l.trim() !== "");
    const cleanLines2 = lines2.filter((l) => l.trim() !== "");
    const payload: any = {
      script_id: scriptId,
      label: label.trim(),
      voix,
      lines: cleanLines,
      cases: cases.length > 0 ? cases : null,
      lines2: cleanLines2.length > 0 ? cleanLines2 : null,
      cases2: cases2.length > 0 ? cases2 : null,
    };
    try {
      if (isNew) {
        await createPhase.mutateAsync(payload);
        toast.success("Phase créée.");
      } else {
        await updatePhase.mutateAsync({ id: phase.id, ...payload });
        toast.success("Phase mise à jour.");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la sauvegarde.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="font-heading">
            {isNew ? "Nouvelle phase" : "Modifier la phase"}
          </DialogTitle>
          <DialogDescription>
            {isNew ? "Définissez le contenu de la nouvelle phase." : "Modifiez le contenu de cette phase."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Label + Voix on same row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nom de la phase..." />
              </div>
              <div className="space-y-1.5">
                <Label>Voix</Label>
                <Select value={voix} onValueChange={setVoix}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(VOIX_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lines */}
            <div className="space-y-1.5">
              <Label>Lignes</Label>
              <LinesEditor lines={lines} onChange={setLines} placeholder="Message, instruction, ou texte..." />
            </div>

            <Separator />

            {/* Cases */}
            <Collapsible open={casesOpen} onOpenChange={setCasesOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between gap-2 font-medium">
                  <span>Cas conditionnels {cases.length > 0 && <Badge variant="secondary" className="ml-2 text-xs">{cases.length}</Badge>}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${casesOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <CasesEditor cases={cases} onChange={setCases} />
              </CollapsibleContent>
            </Collapsible>

            {/* Lines2 */}
            <Collapsible open={lines2Open} onOpenChange={setLines2Open}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between gap-2 font-medium">
                  <span>Lignes secondaires {lines2.length > 0 && <Badge variant="secondary" className="ml-2 text-xs">{lines2.length}</Badge>}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${lines2Open ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <LinesEditor lines={lines2} onChange={setLines2} placeholder="Ligne secondaire..." />
              </CollapsibleContent>
            </Collapsible>

            {/* Cases2 */}
            <Collapsible open={cases2Open} onOpenChange={setCases2Open}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between gap-2 font-medium">
                  <span>Cas secondaires {cases2.length > 0 && <Badge variant="secondary" className="ml-2 text-xs">{cases2.length}</Badge>}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${cases2Open ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <CasesEditor cases={cases2} onChange={setCases2} />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isNew ? "Créer" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───

export default function ScriptEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const scriptId = id ?? null;

  const { data, isLoading } = useScriptWithPhases(scriptId);
  const updateScript = useUpdateScript();
  const deletePhase = useDeletePhase();
  const reorderPhases = useReorderPhases();

  const [editPhase, setEditPhase] = useState<any | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const script = data?.script;
  const phases = data?.phases ?? [];

  const handleNameSave = async () => {
    if (!script || !nameValue.trim()) return;
    try {
      await updateScript.mutateAsync({ id: script.id, nom: nameValue.trim() });
      toast.success("Nom mis à jour.");
    } catch { toast.error("Erreur lors de la mise à jour du nom."); }
    setEditingName(false);
  };

  const handleDeletePhase = async () => {
    if (!deleteTarget || !scriptId) return;
    try {
      await deletePhase.mutateAsync({ id: deleteTarget.id, script_id: scriptId });
      toast.success("Phase supprimée.");
    } catch { toast.error("Erreur lors de la suppression."); }
    setDeleteTarget(null);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !scriptId) return;
    const oldIndex = phases.findIndex((p: any) => p.id === active.id);
    const newIndex = phases.findIndex((p: any) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(phases, oldIndex, newIndex);
    try {
      await reorderPhases.mutateAsync({ script_id: scriptId, phase_ids: reordered.map((p: any) => p.id) });
    } catch { toast.error("Erreur lors du réordonnancement."); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!script) return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <p className="text-lg font-medium">Script introuvable</p>
      <Button variant="outline" onClick={() => navigate("/admin/scripts")}><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/scripts")} className="gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />Retour
          </Button>
          <div className="flex items-center gap-3">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input value={nameValue} onChange={(e) => setNameValue(e.target.value)} className="text-2xl font-bold h-auto py-1 px-2 w-64" autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleNameSave(); if (e.key === "Escape") setEditingName(false); }} />
                <Button size="sm" onClick={handleNameSave} disabled={updateScript.isPending}>OK</Button>
              </div>
            ) : (
              <button onClick={() => { setNameValue(script.nom); setEditingName(true); }}
                className="text-2xl font-bold font-heading text-foreground hover:text-primary transition-colors text-left">
                {script.nom}
              </button>
            )}
            <Badge variant="outline" className="capitalize">{script.type}</Badge>
            <Badge variant="secondary" className="capitalize">{script.cat}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{phases.length} phase{phases.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={() => { setEditPhase(null); setEditDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />Nouvelle phase
        </Button>
      </div>

      {phases.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-card py-16">
          <p className="text-lg font-medium">Aucune phase. Ajoutez la première phase.</p>
          <Button onClick={() => { setEditPhase(null); setEditDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />Ajouter une phase
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={phases.map((p: any) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {phases.map((phase: any, idx: number) => (
                <SortablePhaseCard key={phase.id} phase={phase} index={idx}
                  onEdit={() => { setEditPhase(phase); setEditDialogOpen(true); }}
                  onDelete={() => setDeleteTarget({ id: phase.id, label: phase.label })} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {scriptId && <EditPhaseDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} phase={editPhase} scriptId={scriptId} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette phase ?</AlertDialogTitle>
            <AlertDialogDescription>La phase « {deleteTarget?.label} » sera définitivement supprimée.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePhase} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
