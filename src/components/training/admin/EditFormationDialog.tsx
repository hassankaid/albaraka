import { useState, useEffect, useRef } from "react";
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
import { Upload, AlertTriangle, Loader2, Image as ImageIcon } from "lucide-react";

/**
 * Détecte les URL d'images non directes (partage OneDrive, Google Drive, Dropbox…)
 * qui pointent vers une page de visualisation au lieu du binaire.
 */
function isIndirectImageUrl(url: string): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return (
    u.includes("1drv.ms") ||
    u.includes("onedrive.live.com") ||
    u.includes("drive.google.com") ||
    (u.includes("dropbox.com") && !u.includes("dl=1") && !u.includes("raw=1"))
  );
}

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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Format non supporté", {
        description: "Sélectionne une image (PNG, JPG, WebP…).",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop lourde", { description: "Maximum 5 Mo." });
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
      const path = `covers/${formation.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("training")
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("training").getPublicUrl(path);
      setCoverUrl(pub.publicUrl);
      toast.success("Image uploadée");
    } catch (e) {
      toast.error("Upload échoué", {
        description: e instanceof Error ? e.message : "Erreur inconnue",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
            <Label htmlFor="edit-cover">Image de couverture</Label>
            <div className="space-y-2">
              {/* Aperçu */}
              {coverUrl && !isIndirectImageUrl(coverUrl) && (
                <div className="rounded-md border border-border overflow-hidden bg-muted/30">
                  <img
                    src={coverUrl}
                    alt="Aperçu"
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
              {/* Bouton upload */}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Upload…
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      {coverUrl ? "Remplacer l'image" : "Uploader une image"}
                    </>
                  )}
                </Button>
                {coverUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCoverUrl("")}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Retirer
                  </Button>
                )}
              </div>
              {/* Champ URL (fallback) */}
              <details className="text-[11px]">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Ou coller une URL d'image directe
                </summary>
                <Input
                  id="edit-cover"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://…/image.jpg"
                  className="mt-2"
                />
              </details>
              {/* Warning URL indirecte (OneDrive, Google Drive, Dropbox partagé) */}
              {isIndirectImageUrl(coverUrl) && (
                <div className="flex items-start gap-2 p-2.5 rounded-md border border-amber-500/40 bg-amber-500/5 text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      Ce lien ne pointe pas directement vers l'image
                    </p>
                    <p className="text-muted-foreground">
                      Les liens OneDrive, Google Drive ou Dropbox partagés pointent vers
                      une page de visualisation, pas vers le fichier. Le navigateur ne
                      peut pas afficher l'image. <strong>Uploade l'image via le bouton ci-dessus</strong>
                      {" "}pour qu'elle s'affiche correctement sur la formation.
                    </p>
                  </div>
                </div>
              )}
              {coverUrl && !isIndirectImageUrl(coverUrl) && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  Cover prête à l'emploi
                </p>
              )}
            </div>
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
