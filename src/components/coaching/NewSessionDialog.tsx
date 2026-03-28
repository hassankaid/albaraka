import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewSessionDialog({ open, onOpenChange }: NewSessionDialogProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [selectedSubMode, setSelectedSubMode] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const { data: coachTypes, isLoading: typesLoading } = useQuery({
    queryKey: ["coach-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_types")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["students-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("role", ["collaborateur", "apporteur"])
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: sessionCount } = useQuery({
    queryKey: ["session-count", selectedStudentId, selectedTypeId],
    queryFn: async () => {
      if (!selectedStudentId || !selectedTypeId) return 0;
      const { count, error } = await supabase
        .from("coaching_sessions")
        .select("*", { count: "exact", head: true })
        .eq("student_user_id", selectedStudentId)
        .eq("coach_type_id", selectedTypeId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!selectedStudentId && !!selectedTypeId,
  });

  const assignedType = coachTypes?.find((t) => t.assigned_coach_id === profile?.id);
  const hasFixedType = !!assignedType && profile?.role !== "ceo";

  // Pre-select assigned type
  useEffect(() => {
    if (assignedType && !selectedTypeId) {
      setSelectedTypeId(assignedType.id);
    }
  }, [assignedType, selectedTypeId]);

  const selectedType = coachTypes?.find((t) => t.id === selectedTypeId);

  const createSession = useMutation({
    mutationFn: async () => {
      // 1. Récupérer le type de coaching sélectionné
      const { data: selectedTypeData, error: typeError } = await supabase
        .from("coach_types")
        .select("id, name, label, theme_color")
        .eq("id", selectedTypeId)
        .single();
      if (typeError) throw typeError;

      // 2. Récupérer la structure complète pour le snapshot
      const { data: steps, error: stepsError } = await supabase
        .from("coach_steps")
        .select(`
          id, step_id, step_number, label, title, objective, tips, display_order,
          criteria:coach_criteria(id, criteria_text, display_order),
          scripts:coach_script_refs(id, sub_mode, script_lines, display_order),
          debriefs:coach_debrief_options(id, debrief_label, options, display_order)
        `)
        .eq("coach_type_id", selectedTypeId)
        .eq("is_active", true)
        .order("display_order");
      if (stepsError) throw stepsError;

      // 3. Filtrer les scripts par sous-mode si applicable
      const filteredSteps = steps?.map(step => ({
        ...step,
        criteria: (step.criteria || []).filter((c: any) => c.is_active !== false),
        scripts: (step.scripts || []).filter((s: any) =>
          !s.sub_mode || s.sub_mode === selectedSubMode || !selectedSubMode
        ),
        debriefs: step.debriefs || [],
      }));

      // 4. Construire le snapshot
      const structureSnapshot = {
        coach_type: {
          id: selectedTypeData.id,
          name: selectedTypeData.name,
          label: selectedTypeData.label,
          theme_color: selectedTypeData.theme_color,
        },
        sub_mode: selectedSubMode || null,
        steps: filteredSteps,
        snapshot_date: new Date().toISOString(),
      };

      // 5. Créer la session avec le snapshot
      const { data, error } = await supabase
        .from("coaching_sessions")
        .insert({
          coach_type_id: selectedTypeId,
          coach_user_id: profile!.id,
          student_user_id: selectedStudentId,
          sub_mode: selectedSubMode || null,
          session_number: (sessionCount || 0) + 1,
          session_date: sessionDate,
          status: "draft",
          structure_snapshot: structureSnapshot,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["coaching-sessions"] });
      toast({
        title: "Session créée",
        description: "Vous pouvez maintenant commencer l'évaluation.",
      });
      onOpenChange(false);
      navigate(`/coaching/session/${data.id}`);
    },
    onError: (error) => {
      console.error("Erreur création session:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la session.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTypeId || !selectedStudentId || !sessionDate) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }
    if (selectedType?.sub_modes && selectedType.sub_modes.length > 0 && !selectedSubMode) {
      toast({
        title: "Sous-mode requis",
        description: "Veuillez sélectionner un sous-mode.",
        variant: "destructive",
      });
      return;
    }
    createSession.mutate();
  };

  const resetForm = () => {
    setSelectedTypeId("");
    setSelectedSubMode("");
    setSelectedStudentId("");
    setSessionDate(new Date().toISOString().split("T")[0]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle session de coaching</DialogTitle>
          <DialogDescription>
            Créez une nouvelle session pour évaluer un élève.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type de coaching */}
          <div className="space-y-2">
            <Label>Type de coaching *</Label>
            {hasFixedType ? (
              <div className="flex items-center gap-2 p-3 border border-border rounded-md bg-muted/50">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: assignedType?.theme_color }}
                />
                <span className="font-medium text-foreground">{assignedType?.label}</span>
                <Badge variant="secondary" className="ml-auto">Assigné</Badge>
              </div>
            ) : (
              <Select
                value={selectedTypeId}
                onValueChange={(value) => {
                  setSelectedTypeId(value);
                  setSelectedSubMode("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un type" />
                </SelectTrigger>
                <SelectContent>
                  {typesLoading ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    coachTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: type.theme_color }}
                          />
                          {type.label}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Sous-mode */}
          {selectedType?.sub_modes && selectedType.sub_modes.length > 0 && (
            <div className="space-y-2">
              <Label>Mode *</Label>
              <Select value={selectedSubMode} onValueChange={setSelectedSubMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un mode" />
                </SelectTrigger>
                <SelectContent>
                  {selectedType.sub_modes.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Élève */}
          <div className="space-y-2">
            <Label>Élève à coacher *</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un élève" />
              </SelectTrigger>
              <SelectContent>
                {studentsLoading ? (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  students?.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date de la session *</Label>
            <Input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
            />
          </div>

          {/* Session number info */}
          {selectedStudentId && selectedTypeId && sessionCount !== undefined && (
            <p className="text-sm text-muted-foreground">
              Ce sera la session n°{(sessionCount || 0) + 1} pour cet élève sur ce type de coaching.
            </p>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createSession.isPending} className="gradient-primary">
              {createSession.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Créer la session
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
