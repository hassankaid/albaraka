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

interface CreateFormationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CreateFormationDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateFormationDialogProps) {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const slug = slugify(titre);
      if (!slug) throw new Error("Le titre est requis");

      const { data: existing } = await supabase
        .from("formations")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (existing) throw new Error("Une formation avec un titre similaire existe déjà");

      const { data: maxData } = await supabase
        .from("formations")
        .select("ordre")
        .order("ordre", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrdre = (maxData?.ordre ?? -1) + 1;

      const { data, error } = await supabase
        .from("formations")
        .insert({
          slug,
          titre,
          description: description || null,
          status: "draft",
          ordre: nextOrdre,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Formation créée");
      setTitre("");
      setDescription("");
      onCreated?.();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle formation</DialogTitle>
          <DialogDescription>
            Crée une formation vide. Tu pourras ensuite ajouter des modules, chapitres et vidéos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="create-titre">Titre *</Label>
            <Input
              id="create-titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex : Mindset Entrepreneur"
            />
            {titre && (
              <p className="text-xs text-muted-foreground">
                URL : /training/{slugify(titre)}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-desc">Description</Label>
            <Textarea
              id="create-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Une courte description de la formation..."
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
            {createMutation.isPending ? "Création..." : "Créer la formation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
