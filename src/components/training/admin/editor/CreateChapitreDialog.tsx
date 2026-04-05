import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CreateChapitreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  onCreated?: () => void;
}

export function CreateChapitreDialog({ open, onOpenChange, moduleId, onCreated }: CreateChapitreDialogProps) {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [duree, setDuree] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: maxData } = await supabase
        .from("formation_chapitres")
        .select("ordre")
        .eq("module_id", moduleId)
        .order("ordre", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrdre = (maxData?.ordre ?? -1) + 1;

      const { error } = await supabase.from("formation_chapitres").insert({
        module_id: moduleId,
        titre,
        description: description || null,
        duree_estimee_minutes: duree ? parseInt(duree, 10) : null,
        status: "draft",
        ordre: nextOrdre,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chapitre créé");
      setTitre("");
      setDescription("");
      setDuree("");
      onCreated?.();
      onOpenChange(false);
    },
    onError: () => toast.error("Erreur lors de la création"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau chapitre</DialogTitle>
          <DialogDescription>Ajoute un chapitre à ce module.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chap-titre">Titre *</Label>
            <Input
              id="chap-titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex : Introduction au mindset"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chap-desc">Description</Label>
            <Textarea
              id="chap-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Résumé du chapitre..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chap-duree">Durée estimée (minutes)</Label>
            <Input
              id="chap-duree"
              type="number"
              value={duree}
              onChange={(e) => setDuree(e.target.value)}
              placeholder="15"
              min={1}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!titre.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? "Création..." : "Créer le chapitre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
