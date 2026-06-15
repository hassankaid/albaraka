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
  useCreateParcours,
  useUpdateParcours,
  type ParcoursRow,
} from "@/hooks/useAdminParcours";

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Dialog création / édition d'un parcours.
 * - Sans `parcours` → création (statut forcé "brouillon").
 * - Avec `parcours` → édition (titre, slug, type de pass, sous-titre, statut).
 */
export function ParcoursFormDialog({
  open,
  onOpenChange,
  parcours,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parcours?: ParcoursRow | null;
  onCreated?: (slug: string) => void;
}) {
  const isEdit = !!parcours;
  const create = useCreateParcours();
  const update = useUpdateParcours();

  const [titre, setTitre] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [passType, setPassType] = useState("al_baraka");
  const [subtitle, setSubtitle] = useState("");
  const [status, setStatus] = useState("draft");
  const [ordre, setOrdre] = useState(0);

  useEffect(() => {
    if (!open) return;
    if (parcours) {
      setTitre(parcours.titre);
      setSlug(parcours.slug);
      setSlugEdited(true); // ne pas écraser le slug existant
      setPassType(parcours.pass_type);
      setSubtitle(parcours.subtitle ?? "");
      setStatus(parcours.status);
      setOrdre(parcours.ordre);
    } else {
      setTitre("");
      setSlug("");
      setSlugEdited(false);
      setPassType("al_baraka");
      setSubtitle("");
      setStatus("draft");
      setOrdre(0);
    }
  }, [open, parcours]);

  // Auto-slug en création tant que l'utilisateur n'a pas modifié le slug.
  useEffect(() => {
    if (!isEdit && !slugEdited) setSlug(slugify(titre));
  }, [titre, slugEdited, isEdit]);

  const pending = create.isPending || update.isPending;

  async function submit() {
    if (!titre.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    if (!slug.trim()) {
      toast.error("Le slug est requis");
      return;
    }
    try {
      if (isEdit && parcours) {
        await update.mutateAsync({
          id: parcours.id,
          titre: titre.trim(),
          slug: slugify(slug),
          pass_type: passType,
          subtitle: subtitle.trim() || null,
          status,
          ordre,
        });
        toast.success("Parcours mis à jour");
        onOpenChange(false);
      } else {
        const createdSlug = await create.mutateAsync({
          titre: titre.trim(),
          slug: slugify(slug),
          pass_type: passType,
          subtitle: subtitle.trim() || null,
        });
        toast.success("Parcours créé (brouillon)");
        onOpenChange(false);
        onCreated?.(createdSlug);
      }
    } catch (e: any) {
      if (e?.code === "23505" || /duplicate|unique/i.test(e?.message ?? "")) {
        toast.error("Ce slug est déjà utilisé, choisis-en un autre.");
      } else {
        toast.error(e?.message ?? "Erreur");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le parcours" : "Nouveau parcours"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifie les réglages du parcours."
              : "Crée un parcours. Il restera en brouillon jusqu'à ce que tu le publies."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Titre *</Label>
            <Input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="PARCOURS AL BARAKA"
              autoFocus={!isEdit}
            />
          </div>

          <div className="space-y-2">
            <Label>Slug (URL) *</Label>
            <Input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              onBlur={() => setSlug(slugify(slug))}
              placeholder="al-baraka"
            />
            <p className="text-xs text-muted-foreground">
              Identifiant unique dans l'URL : /parcours/{slug || "..."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type de pass *</Label>
              <Select value={passType} onValueChange={setPassType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="al_baraka">Al Baraka</SelectItem>
                  <SelectItem value="liberty">Liberty</SelectItem>
                </SelectContent>
              </Select>
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

          <div className="space-y-2">
            <Label>Sous-titre</Label>
            <Textarea
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              rows={2}
              placeholder="Description courte (optionnel)"
            />
          </div>

          {isEdit && (
            <div className="space-y-2">
              <Label>Ordre d'affichage</Label>
              <Input
                type="number"
                value={ordre}
                onChange={(e) => setOrdre(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Position dans les listes (plus petit = affiché en premier).
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
