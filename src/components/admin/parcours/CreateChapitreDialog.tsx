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
import { useCreateChapitre, useFormationsForSelect } from "@/hooks/useAdminParcours";

type ChapitreType = "video" | "redirect_formation" | "milestone";

/**
 * Dialog création d'un chapitre dans une phase. Le type choisi conditionne les
 * champs requis (contrainte chapitre_type_coherent) :
 *   - redirect_formation → formation cible requise
 *   - milestone          → message d'étape requis
 * Le chapitre est créé en brouillon ; le contenu (vidéos, ressources…) s'édite
 * ensuite via l'éditeur de chapitre.
 */
export function CreateChapitreDialog({
  open,
  onOpenChange,
  phaseId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  phaseId: string;
  onCreated?: (chapitreId: string) => void;
}) {
  const create = useCreateChapitre();
  const { data: formations } = useFormationsForSelect();

  const [titre, setTitre] = useState("");
  const [type, setType] = useState<ChapitreType>("video");
  const [formationId, setFormationId] = useState("");
  const [message, setMessage] = useState("");
  const [emoji, setEmoji] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitre("");
    setType("video");
    setFormationId("");
    setMessage("");
    setEmoji("");
  }, [open]);

  async function submit() {
    if (!titre.trim()) {
      toast.error("Le titre du chapitre est requis");
      return;
    }
    if (type === "redirect_formation" && !formationId) {
      toast.error("Choisis la formation cible");
      return;
    }
    if (type === "milestone" && !message.trim()) {
      toast.error("Le message de l'étape est requis");
      return;
    }
    try {
      const id = await create.mutateAsync({
        phase_id: phaseId,
        titre: titre.trim(),
        type,
        formation_id: type === "redirect_formation" ? formationId : null,
        milestone_message: type === "milestone" ? message.trim() : null,
        milestone_emoji: type === "milestone" ? emoji.trim() || null : null,
      });
      toast.success("Chapitre créé (brouillon)");
      onOpenChange(false);
      onCreated?.(id);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau chapitre</DialogTitle>
          <DialogDescription>
            Crée un chapitre dans cette phase. Il sera en brouillon — édite ensuite son
            contenu depuis l'éditeur de chapitre.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Titre *</Label>
            <Input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Introduction"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Type *</Label>
            <Select value={type} onValueChange={(v) => setType(v as ChapitreType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Vidéo / leçon</SelectItem>
                <SelectItem value="redirect_formation">→ Renvoi vers une formation</SelectItem>
                <SelectItem value="milestone">Étape clé (milestone)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "redirect_formation" && (
            <div className="space-y-2">
              <Label>Formation cible *</Label>
              <Select value={formationId} onValueChange={setFormationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une formation" />
                </SelectTrigger>
                <SelectContent>
                  {(formations ?? []).map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Quand l'élève atteint ce chapitre, il pourra débloquer cette formation.
              </p>
            </div>
          )}

          {type === "milestone" && (
            <div className="grid grid-cols-[90px_1fr] gap-4">
              <div className="space-y-2">
                <Label>Emoji</Label>
                <Input
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="🎉"
                  className="text-center text-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Message de l'étape *</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="Message de célébration affiché à l'élève…"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
