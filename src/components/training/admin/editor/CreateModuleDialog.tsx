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

interface CreateModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formationId: string;
  onCreated?: () => void;
}

export function CreateModuleDialog({ open, onOpenChange, formationId, onCreated }: CreateModuleDialogProps) {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: maxData } = await supabase
        .from("formation_modules")
        .select("ordre")
        .eq("formation_id", formationId)
        .order("ordre", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrdre = (maxData?.ordre ?? -1) + 1;

      const { error } = await supabase.from("formation_modules").insert({
        formation_id: formationId,
        titre,
        description: description || null,
        status: "draft",
        ordre: nextOrdre,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Module créé");
      setTitre("");
      setDescription("");
      onCreated?.();
      onOpenChange(false);
    },
    onError: () => toast.error("Erreur lors de la création"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau module</DialogTitle>
          <DialogDescription>Ajoute un module à cette formation.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mod-titre">Titre *</Label>
            <Input
              id="mod-titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex : Phase 1 — Les fondamentaux"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mod-desc">Description</Label>
            <Textarea
              id="mod-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Une courte description du module..."
              rows={3}
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
            {createMutation.isPending ? "Création..." : "Créer le module"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
