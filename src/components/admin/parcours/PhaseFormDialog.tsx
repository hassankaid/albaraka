import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCreatePhase,
  useUpdatePhase,
  type ParcoursPhaseRow,
} from "@/hooks/useAdminParcours";

/**
 * Dialog création / édition d'une phase de parcours.
 * - Sans `phase` → création (statut "brouillon").
 * - Avec `phase` → édition (titre, emoji, description, statut).
 */
export function PhaseFormDialog({
  open,
  onOpenChange,
  parcoursId,
  phase,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parcoursId: string;
  phase?: ParcoursPhaseRow | null;
}) {
  const isEdit = !!phase;
  const create = useCreatePhase();
  const update = useUpdatePhase();

  const [titre, setTitre] = useState("");
  const [emoji, setEmoji] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");

  useEffect(() => {
    if (!open) return;
    if (phase) {
      setTitre(phase.titre);
      setEmoji(phase.emoji ?? "");
      setDescription(phase.description ?? "");
      setStatus(phase.status);
    } else {
      setTitre("");
      setEmoji("");
      setDescription("");
      setStatus("draft");
    }
  }, [open, phase]);

  const pending = create.isPending || update.isPending;

  async function submit() {
    if (!titre.trim()) {
      toast.error("Le titre de la phase est requis");
      return;
    }
    try {
      if (isEdit && phase) {
        await update.mutateAsync({
          id: phase.id,
          titre: titre.trim(),
          emoji: emoji.trim() || null,
          description: description.trim() || null,
          status,
        });
        toast.success("Phase mise à jour");
      } else {
        await create.mutateAsync({
          parcours_id: parcoursId,
          titre: titre.trim(),
          emoji: emoji.trim() || null,
          description: description.trim() || null,
        });
        toast.success("Phase ajoutée (brouillon)");
      }
      onOpenChange(false);
    } catch (e: any) {
      if (e?.code === "23505" || /duplicate|unique/i.test(e?.message ?? "")) {
        toast.error("Conflit de numérotation de phase, réessaie.");
      } else {
        toast.error(e?.message ?? "Erreur");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la phase" : "Nouvelle phase"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifie le titre, l'emoji, la description ou le statut de la phase."
              : "Ajoute une phase. Elle restera en brouillon (invisible des élèves) jusqu'à publication."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-[90px_1fr] gap-4">
            <div className="space-y-2">
              <Label>Emoji</Label>
              <Input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="🚀"
                className="text-center text-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="FONDATIONS"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Description de la phase (optionnel)"
            />
          </div>

          {isEdit && (
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="published">Publié</SelectItem>
                  <SelectItem value="archived">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Enregistrer" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
