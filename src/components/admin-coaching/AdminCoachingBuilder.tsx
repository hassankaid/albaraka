import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Settings, Trash2, Star, FileText, MessageSquare, ChevronRight, MousePointerClick } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function AdminCoachingBuilder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<any>(null);
  const [showNewTypeDialog, setShowNewTypeDialog] = useState(false);
  const [showNewStepDialog, setShowNewStepDialog] = useState(false);
  const [showEditTypeDialog, setShowEditTypeDialog] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [newStepTypeId, setNewStepTypeId] = useState("");
  const [newTypeData, setNewTypeData] = useState({ label: "", theme_color: "#7C3AED" });
  const [newStepData, setNewStepData] = useState({ label: "", title: "" });

  // Récupérer les types avec leurs étapes
  const { data: types, isLoading } = useQuery({
    queryKey: ["admin-builder-types"],
    queryFn: async () => {
      const { data: typesData, error: typesError } = await supabase
        .from("coach_types")
        .select("*")
        .order("display_order");
      if (typesError) throw typesError;

      const typesWithSteps = await Promise.all(
        (typesData || []).map(async (type) => {
          const { data: steps } = await supabase
            .from("coach_steps")
            .select("id, label, title, is_active, display_order")
            .eq("coach_type_id", type.id)
            .order("display_order");

          const { data: assignments } = await supabase
            .from("coach_type_assignments" as any)
            .select("coach_id")
            .eq("coach_type_id", type.id);

          const coaches = await Promise.all(
            (assignments || []).map(async (a: any) => {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", a.coach_id)
                .single();
              return profile;
            })
          );

          return { ...type, steps: steps || [], coaches: coaches.filter(Boolean) };
        })
      );

      return typesWithSteps;
    },
  });

  // Auto-select first type
  const activeTypeId = selectedTypeId || types?.[0]?.id || null;
  const activeType = types?.find((t) => t.id === activeTypeId);

  // Récupérer les détails d'une étape
  const { data: stepDetails, isLoading: stepLoading, refetch: refetchStep } = useQuery({
    queryKey: ["admin-step-details", selectedStep?.id],
    queryFn: async () => {
      if (!selectedStep?.id) return null;

      const [stepRes, criteriaRes, scriptsRes, debriefsRes] = await Promise.all([
        supabase.from("coach_steps").select("*").eq("id", selectedStep.id).single(),
        supabase.from("coach_criteria").select("*").eq("step_id", selectedStep.id).order("display_order"),
        supabase.from("coach_script_refs").select("*").eq("step_id", selectedStep.id).order("display_order"),
        supabase.from("coach_debrief_options").select("*").eq("step_id", selectedStep.id).order("display_order"),
      ]);

      return {
        ...stepRes.data,
        criteria: criteriaRes.data || [],
        scripts: scriptsRes.data || [],
        debriefs: debriefsRes.data || [],
      };
    },
    enabled: !!selectedStep?.id,
  });

  // === MUTATIONS ===

  const createType = useMutation({
    mutationFn: async (data: { label: string; theme_color: string }) => {
      const { data: existingTypes } = await supabase
        .from("coach_types")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1);
      const nextOrder = (existingTypes?.[0]?.display_order || 0) + 1;
      const name = data.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      const { error } = await supabase.from("coach_types").insert({
        name, label: data.label, theme_color: data.theme_color,
        theme_bg: data.theme_color + "20", display_order: nextOrder, is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-builder-types"] });
      toast({ title: "Type créé" });
      setShowNewTypeDialog(false);
      setNewTypeData({ label: "", theme_color: "#7C3AED" });
    },
  });

  const updateType = useMutation({
    mutationFn: async (data: { id: string; label: string; theme_color: string; is_active: boolean }) => {
      const { error } = await supabase.from("coach_types").update({
        label: data.label, theme_color: data.theme_color,
        theme_bg: data.theme_color + "20", is_active: data.is_active,
      }).eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-builder-types"] });
      toast({ title: "Type mis à jour" });
      setShowEditTypeDialog(false);
    },
  });

  const createStep = useMutation({
    mutationFn: async (data: { typeId: string; label: string; title: string }) => {
      const { data: existingSteps } = await supabase
        .from("coach_steps")
        .select("display_order, step_number")
        .eq("coach_type_id", data.typeId)
        .order("display_order", { ascending: false })
        .limit(1);
      const nextOrder = (existingSteps?.[0]?.display_order || 0) + 1;
      const nextNumber = (existingSteps?.[0]?.step_number || 0) + 1;
      const { error } = await supabase.from("coach_steps").insert({
        coach_type_id: data.typeId, step_number: nextNumber, step_id: `s${nextNumber}`,
        label: data.label, title: data.title, display_order: nextOrder, is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-builder-types"] });
      toast({ title: "Étape créée" });
      setShowNewStepDialog(false);
      setNewStepData({ label: "", title: "" });
    },
  });

  const updateStep = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("coach_steps").update({
        label: data.label, title: data.title, objective: data.objective,
        tips: data.tips, is_active: data.is_active,
      }).eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-builder-types"] });
      refetchStep();
      toast({ title: "Étape mise à jour" });
    },
  });

  const deleteStep = useMutation({
    mutationFn: async (stepId: string) => {
      await supabase.from("coach_criteria").delete().eq("step_id", stepId);
      await supabase.from("coach_script_refs").delete().eq("step_id", stepId);
      await supabase.from("coach_debrief_options").delete().eq("step_id", stepId);
      const { error } = await supabase.from("coach_steps").delete().eq("id", stepId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-builder-types"] });
      setSelectedStep(null);
      toast({ title: "Étape supprimée" });
    },
  });

  // Critères
  const addCriteria = useMutation({
    mutationFn: async (stepId: string) => {
      const { data: existing } = await supabase
        .from("coach_criteria").select("display_order")
        .eq("step_id", stepId).order("display_order", { ascending: false }).limit(1);
      const nextOrder = (existing?.[0]?.display_order || 0) + 1;
      const { error } = await supabase.from("coach_criteria").insert({
        step_id: stepId, criteria_text: "Nouveau critère", display_order: nextOrder, is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => refetchStep(),
  });

  const updateCriteria = useMutation({
    mutationFn: async ({ id, criteria_text }: { id: string; criteria_text: string }) => {
      const { error } = await supabase.from("coach_criteria").update({ criteria_text }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetchStep(),
  });

  const deleteCriteria = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coach_criteria").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetchStep(),
  });

  // Scripts
  const addScript = useMutation({
    mutationFn: async ({ stepId, subMode }: { stepId: string; subMode?: string }) => {
      const { data: existing } = await supabase
        .from("coach_script_refs").select("display_order")
        .eq("step_id", stepId).order("display_order", { ascending: false }).limit(1);
      const nextOrder = (existing?.[0]?.display_order || 0) + 1;
      const { error } = await supabase.from("coach_script_refs").insert({
        step_id: stepId, sub_mode: subMode || null, script_lines: ["Nouvelle ligne de script"],
        display_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => refetchStep(),
  });

  const updateScript = useMutation({
    mutationFn: async ({ id, script_content }: { id: string; script_content: string }) => {
      const { error } = await supabase.from("coach_script_refs").update({ script_content } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetchStep(),
  });

  const deleteScript = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coach_script_refs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetchStep(),
  });

  // Débriefs
  const addDebrief = useMutation({
    mutationFn: async (stepId: string) => {
      const { data: existing } = await supabase
        .from("coach_debrief_options").select("display_order")
        .eq("step_id", stepId).order("display_order", { ascending: false }).limit(1);
      const nextOrder = (existing?.[0]?.display_order || 0) + 1;
      const { error } = await supabase.from("coach_debrief_options").insert({
        step_id: stepId, debrief_label: "Nouveau débrief", options: ["Option 1", "Option 2"],
        display_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => refetchStep(),
  });

  const updateDebrief = useMutation({
    mutationFn: async ({ id, debrief_label, options }: { id: string; debrief_label: string; options: string[] }) => {
      const { error } = await supabase.from("coach_debrief_options").update({ debrief_label, options }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetchStep(),
  });

  const deleteDebrief = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coach_debrief_options").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetchStep(),
  });

  // === HANDLERS ===

  const openStep = (step: any) => {
    setSelectedStep(step);
  };

  const openEditTypeDialog = (type: any) => {
    setEditingType(type);
    setShowEditTypeDialog(true);
  };

  const openNewStepDialog = (typeId: string) => {
    setNewStepTypeId(typeId);
    setShowNewStepDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Sélectionnez un type puis cliquez sur une étape pour la modifier.
        </p>
        <Button onClick={() => setShowNewTypeDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau type
        </Button>
      </div>

      {/* Master-detail layout */}
      <div className="flex gap-6 min-h-[calc(100vh-280px)]">
        {/* LEFT COLUMN — Type selector + steps list */}
        <div className="w-80 shrink-0 flex flex-col gap-4 sticky top-4 self-start">
          {/* Type tabs */}
          <div className="space-y-1">
            {types?.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedTypeId(type.id);
                  setSelectedStep(null);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm",
                  activeTypeId === type.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: type.theme_color }}
                />
                <span className="flex-1 truncate">{type.label}</span>
                {!type.is_active && <Badge variant="secondary" className="text-[10px] px-1">Off</Badge>}
                <Badge variant="outline" className="text-[10px] px-1.5">{type.steps?.length || 0}</Badge>
              </button>
            ))}
          </div>

          <Separator />

          {/* Active type info + steps */}
          {activeType && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground truncate">{activeType.label}</h3>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openNewStepDialog(activeType.id)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTypeDialog(activeType)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {activeType.coaches?.length > 0 && (
                <p className="text-xs text-muted-foreground mb-3">
                  Coachs : {activeType.coaches.map((c: any) => c?.full_name || c?.email).filter(Boolean).join(", ")}
                </p>
              )}

              <ScrollArea className="flex-1">
                <div className="space-y-1.5 pr-2">
                  {activeType.steps?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucune étape.
                    </p>
                  )}
                  {activeType.steps?.map((step: any) => (
                    <button
                      key={step.id}
                      onClick={() => openStep(step)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors text-sm",
                        selectedStep?.id === step.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-foreground",
                        !step.is_active && "opacity-50"
                      )}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium text-xs">{step.label}</span>
                        <span className={cn(
                          "block text-xs truncate",
                          selectedStep?.id === step.id ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>{step.title}</span>
                      </span>
                      {!step.is_active && <Badge variant="secondary" className="text-[10px]">Off</Badge>}
                      <ChevronRight className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        selectedStep?.id === step.id ? "text-primary-foreground/70" : "text-muted-foreground"
                      )} />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — Step detail editor */}
        <div ref={editorRef} className="flex-1 min-w-0">
          {!selectedStep ? (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center space-y-3 text-muted-foreground">
                <MousePointerClick className="h-12 w-12 mx-auto opacity-30" />
                <div>
                  <p className="font-medium">Sélectionnez une étape</p>
                  <p className="text-sm">Cliquez sur une étape dans la liste pour modifier son contenu.</p>
                </div>
              </div>
            </Card>
          ) : stepLoading ? (
            <Card className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </Card>
          ) : stepDetails ? (
            <Card>
              <CardHeader className="pb-4 shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {stepDetails.label} — {stepDetails.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Actif</Label>
                    <Switch
                      checked={stepDetails.is_active}
                      onCheckedChange={(checked) => updateStep.mutate({ ...stepDetails, is_active: checked })}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 pb-8">
                {/* Infos de base */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Label</Label>
                      <Input
                        value={stepDetails.label}
                        onChange={(e) => updateStep.mutate({ ...stepDetails, label: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Titre</Label>
                      <Input
                        value={stepDetails.title}
                        onChange={(e) => updateStep.mutate({ ...stepDetails, title: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Objectif</Label>
                    <Textarea
                      value={stepDetails.objective || ""}
                      onChange={(e) => updateStep.mutate({ ...stepDetails, objective: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tips</Label>
                    <div className="space-y-2">
                      {(stepDetails.tips || []).map((tip: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            value={tip}
                            onChange={(e) => {
                              const newTips = [...(stepDetails.tips || [])];
                              newTips[i] = e.target.value;
                              updateStep.mutate({ ...stepDetails, tips: newTips });
                            }}
                            className="flex-1"
                            placeholder={`Tip ${i + 1}`}
                          />
                          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => {
                            const newTips = (stepDetails.tips || []).filter((_: any, idx: number) => idx !== i);
                            updateStep.mutate({ ...stepDetails, tips: newTips });
                          }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => {
                        updateStep.mutate({ ...stepDetails, tips: [...(stepDetails.tips || []), ""] });
                      }}>
                        <Plus className="h-4 w-4 mr-1" /> Ajouter un tip
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Critères */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">Critères d'évaluation ({stepDetails.criteria?.length || 0})</h3>
                  </div>
                  <div className="space-y-2">
                    {stepDetails.criteria?.map((c: any) => (
                      <div key={c.id} className="flex items-start gap-2">
                        <Textarea
                          value={c.criteria_text}
                          onChange={(e) => updateCriteria.mutate({ id: c.id, criteria_text: e.target.value })}
                          rows={2}
                          className="flex-1"
                        />
                        <Button variant="ghost" size="icon" onClick={() => deleteCriteria.mutate(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addCriteria.mutate(stepDetails.id)}>
                      <Plus className="h-4 w-4 mr-1" /> Ajouter
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Scripts */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">Scripts de référence ({stepDetails.scripts?.length || 0})</h3>
                  </div>
                  <div className="space-y-4">
                    {stepDetails.scripts?.map((s: any) => (
                      <div key={s.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          {s.sub_mode ? (
                            <Badge variant="secondary">{s.sub_mode}</Badge>
                          ) : (
                            <Badge variant="outline">Général</Badge>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => deleteScript.mutate(s.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <RichTextEditor
                          content={s.script_content || s.script_lines?.join("<br>") || ""}
                          onChange={(html) => updateScript.mutate({ id: s.id, script_content: html })}
                          placeholder="Script de référence…"
                        />
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addScript.mutate({ stepId: stepDetails.id })}>
                      <Plus className="h-4 w-4 mr-1" /> Ajouter un script
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Débriefs */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">Options de débrief ({stepDetails.debriefs?.length || 0})</h3>
                  </div>
                  <div className="space-y-4">
                    {stepDetails.debriefs?.map((d: any) => (
                      <div key={d.id} className="p-3 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <Input
                            value={d.debrief_label}
                            onChange={(e) => updateDebrief.mutate({
                              id: d.id, debrief_label: e.target.value, options: d.options,
                            })}
                            className="flex-1 mr-2"
                            placeholder="Titre du débrief"
                          />
                          <Button variant="ghost" size="icon" onClick={() => deleteDebrief.mutate(d.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Options de réponse</Label>
                          {(d.options || []).map((opt: string, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                              <Checkbox checked disabled className="shrink-0 opacity-50" />
                              <Input
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...(d.options || [])];
                                  newOpts[i] = e.target.value;
                                  updateDebrief.mutate({ id: d.id, debrief_label: d.debrief_label, options: newOpts });
                                }}
                                className="flex-1"
                                placeholder={`Option ${i + 1}`}
                              />
                              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => {
                                const newOpts = (d.options || []).filter((_: any, idx: number) => idx !== i);
                                updateDebrief.mutate({ id: d.id, debrief_label: d.debrief_label, options: newOpts });
                              }}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" onClick={() => {
                            updateDebrief.mutate({
                              id: d.id, debrief_label: d.debrief_label,
                              options: [...(d.options || []), ""],
                            });
                          }}>
                            <Plus className="h-4 w-4 mr-1" /> Ajouter une option
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addDebrief.mutate(stepDetails.id)}>
                      <Plus className="h-4 w-4 mr-1" /> Ajouter un débrief
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Supprimer */}
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Supprimer cette étape et tout son contenu ?")) {
                        deleteStep.mutate(stepDetails.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer l'étape
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Dialog nouveau type */}
      <Dialog open={showNewTypeDialog} onOpenChange={setShowNewTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau type de coaching</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du type</Label>
              <Input
                value={newTypeData.label}
                onChange={(e) => setNewTypeData({ ...newTypeData, label: e.target.value })}
                placeholder="Ex: Gestion des Objections"
              />
            </div>
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex gap-2">
                <Input type="color" value={newTypeData.theme_color}
                  onChange={(e) => setNewTypeData({ ...newTypeData, theme_color: e.target.value })}
                  className="w-20 h-10 p-1" />
                <Input value={newTypeData.theme_color}
                  onChange={(e) => setNewTypeData({ ...newTypeData, theme_color: e.target.value })}
                  className="flex-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTypeDialog(false)}>Annuler</Button>
            <Button onClick={() => createType.mutate(newTypeData)}
              disabled={!newTypeData.label || createType.isPending}>
              {createType.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog éditer type */}
      <Dialog open={showEditTypeDialog} onOpenChange={setShowEditTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le type</DialogTitle>
          </DialogHeader>
          {editingType && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={editingType.label}
                  onChange={(e) => setEditingType({ ...editingType, label: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Couleur</Label>
                <div className="flex gap-2">
                  <Input type="color" value={editingType.theme_color}
                    onChange={(e) => setEditingType({ ...editingType, theme_color: e.target.value })}
                    className="w-20 h-10 p-1" />
                  <Input value={editingType.theme_color}
                    onChange={(e) => setEditingType({ ...editingType, theme_color: e.target.value })}
                    className="flex-1" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Actif</Label>
                <Switch checked={editingType.is_active}
                  onCheckedChange={(checked) => setEditingType({ ...editingType, is_active: checked })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditTypeDialog(false)}>Annuler</Button>
            <Button onClick={() => updateType.mutate(editingType)} disabled={updateType.isPending}>
              {updateType.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog nouvelle étape */}
      <Dialog open={showNewStepDialog} onOpenChange={setShowNewStepDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle étape</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={newStepData.label}
                onChange={(e) => setNewStepData({ ...newStepData, label: e.target.value })}
                placeholder="Ex: Étape 07" />
            </div>
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={newStepData.title}
                onChange={(e) => setNewStepData({ ...newStepData, title: e.target.value })}
                placeholder="Ex: Gestion des relances" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewStepDialog(false)}>Annuler</Button>
            <Button onClick={() => createStep.mutate({ typeId: newStepTypeId, ...newStepData })}
              disabled={!newStepData.label || !newStepData.title || createStep.isPending}>
              {createStep.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
