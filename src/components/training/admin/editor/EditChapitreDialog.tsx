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

interface EditChapitreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapitre: {
    id: string;
    titre: string;
    description: string | null;
    status: string;
    duree_estimee_minutes: number | null;
    notes_formateur?: string | null;
  };
  onUpdated?: () => void;
}

export function EditChapitreDialog({ open, onOpenChange, chapitre, onUpdated }: EditChapitreDialogProps) {
  const [titre, setTitre] = useState(chapitre.titre);
  const [description, setDescription] = useState(chapitre.description ?? "");
  const [duree, setDuree] = useState(chapitre.duree_estimee_minutes?.toString() ?? "");
  const [status, setStatus] = useState(chapitre.status);
  const [notesFormateur, setNotesFormateur] = useState(chapitre.notes_formateur ?? "");

  useEffect(() => {
    if (open) {
      setTitre(chapitre.titre);
      setDescription(chapitre.description ?? "");
      setDuree(chapitre.duree_estimee_minutes?.toString() ?? "");
      setStatus(chapitre.status);
      setNotesFormateur(chapitre.notes_formateur ?? "");
    }
  }, [open, chapitre]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("formation_chapitres")
        .update({
          titre,
          description: description || null,
          duree_estimee_minutes: duree ? parseInt(duree, 10) : null,
          status,
          notes_formateur: notesFormateur || null,
        })
        .eq("id", chapitre.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chapitre mis à jour");
      onUpdated?.();
      onOpenChange(false);
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Éditer le chapitre</DialogTitle>
          <DialogDescription>Modifie les métadonnées de ce chapitre.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-chap-titre">Titre *</Label>
            <Input id="edit-chap-titre" value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-chap-desc">Description</Label>
            <Textarea
              id="edit-chap-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-chap-duree">Durée estimée (minutes)</Label>
            <Input
              id="edit-chap-duree"
              type="number"
              value={duree}
              onChange={(e) => setDuree(e.target.value)}
              min={1}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-chap-notes">Notes du formateur (À retenir)</Label>
            <Textarea
              id="edit-chap-notes"
              value={notesFormateur}
              onChange={(e) => setNotesFormateur(e.target.value)}
              rows={4}
              placeholder="Synthèse, points clés, introduction du chapitre..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-chap-status">Statut</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="edit-chap-status">
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
