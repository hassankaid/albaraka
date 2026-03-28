import { useState } from "react";
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

  const selectedType = coachTypes?.find((t) => t.id === selectedTypeId);

  const createSession = useMutation({
    mutationFn: async () => {
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
      toast({
        title: "Erreur",
        description: "Impossible de créer la session.",
        variant: "destructive",
      });
      console.error(error);
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
