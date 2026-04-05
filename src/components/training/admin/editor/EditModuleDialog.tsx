import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface EditModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: {
    id: string;
    titre: string;
    description: string | null;
    status: string;
  };
  onUpdated?: () => void;
}

export function EditModuleDialog({ open, onOpenChange, module, onUpdated }: EditModuleDialogProps) {
  const [titre, setTitre] = useState(module.titre);
  const [description, setDescription] = useState(module.description ?? "");
  const [status, setStatus] = useState(module.status);

  useEffect(() => {
    if (open) {
      setTitre(module.titre);
      setDescription(module.description ?? "");
      setStatus(module.status);
    }
  }, [open, module]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("formation_modules")
        .update({ titre, description: description || null, status })
        .eq("id", module.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Module mis à jour");
      onUpdated?.();
      onOpenChange(false);
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Éditer le module</DialogTitle>
          <DialogDescription>Modifie les métadonnées de ce module.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-mod-titre">Titre *</Label>
            <Input id="edit-mod-titre" value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-mod-desc">Description</Label>
            <Textarea
              id="edit-mod-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-mod-status">Statut</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="edit-mod-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="published">Publié</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!titre.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
