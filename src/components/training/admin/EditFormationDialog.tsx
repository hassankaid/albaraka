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

interface EditFormationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formation: {
    id: string;
    titre: string;
    description: string | null;
    cover_url: string | null;
    status: string;
  };
  onUpdated?: () => void;
}

export function EditFormationDialog({
  open,
  onOpenChange,
  formation,
  onUpdated,
}: EditFormationDialogProps) {
  const [titre, setTitre] = useState(formation.titre);
  const [description, setDescription] = useState(formation.description ?? "");
  const [coverUrl, setCoverUrl] = useState(formation.cover_url ?? "");
  const [status, setStatus] = useState(formation.status);

  useEffect(() => {
    if (open) {
      setTitre(formation.titre);
      setDescription(formation.description ?? "");
      setCoverUrl(formation.cover_url ?? "");
      setStatus(formation.status);
    }
  }, [open, formation]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("formations")
        .update({
          titre,
          description: description || null,
          cover_url: coverUrl || null,
          status,
        })
        .eq("id", formation.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Formation mise à jour");
      onUpdated?.();
      onOpenChange(false);
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Éditer la formation</DialogTitle>
          <DialogDescription>
            Modifie les métadonnées de cette formation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-titre">Titre *</Label>
            <Input
              id="edit-titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-cover">URL de la cover (optionnel)</Label>
            <Input
              id="edit-cover"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-status">Statut</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="edit-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="published">Publiée</SelectItem>
                <SelectItem value="archived">Archivée</SelectItem>
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
