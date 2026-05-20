import { useCallback, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useUpdateStudioProject,
  useStudioSignedUrl,
} from "../hooks/useStudioProjects";
import type { StudioProject } from "../types";

interface Props {
  project: StudioProject;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function getExtension(file: File): string {
  const dot = file.name.lastIndexOf(".");
  if (dot < 0) return "";
  return file.name.slice(dot).toLowerCase();
}

function isAcceptable(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  return ACCEPTED_EXTENSIONS.includes(getExtension(file));
}

export default function ReferenceImageUpload({ project }: Props) {
  const updateMutation = useUpdateStudioProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signedUrlQuery = useStudioSignedUrl(project.reference_image_path);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!isAcceptable(file)) {
        setError(`Format non supporté. Acceptés : ${ACCEPTED_EXTENSIONS.join(", ")}`);
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError(`Image trop lourde (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`);
        return;
      }

      setUploading(true);
      try {
        const ext = getExtension(file) || ".jpg";
        const path = `${project.user_id}/projects/${project.id}/reference${ext}`;
        const { error: upErr } = await supabase.storage
          .from("studio")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: true,
            contentType: file.type || "image/jpeg",
          });
        if (upErr) throw upErr;

        await updateMutation.mutateAsync({
          id: project.id,
          updates: { reference_image_path: path } as any,
        });
        toast.success("Image de référence uploadée ✦");
      } catch (e: any) {
        console.error("[reference-image] upload failed", e);
        setError(e?.message ?? "Upload échoué");
      } finally {
        setUploading(false);
      }
    },
    [project.id, project.user_id, updateMutation],
  );

  const onPickFile = () => fileInputRef.current?.click();

  const onInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
    e.target.value = "";
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  };

  const handleRemove = async () => {
    if (!project.reference_image_path) return;
    if (!confirm("Supprimer l'image de référence ?")) return;
    try {
      await supabase.storage.from("studio").remove([project.reference_image_path]);
      await updateMutation.mutateAsync({
        id: project.id,
        updates: { reference_image_path: null } as any,
      });
      toast.success("Référence supprimée");
    } catch (e: any) {
      toast.error(e?.message ?? "Suppression échouée");
    }
  };

  const hasImage = !!project.reference_image_path;

  return (
    <Card
      className={
        hasImage
          ? "border-emerald-500/30 bg-emerald-500/[0.03]"
          : "border-primary/30 bg-primary/[0.02] border-dashed"
      }
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div
            className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
              hasImage
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-primary/15 text-primary"
            }`}
          >
            {hasImage ? <CheckCircle2 className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground">
                Image de référence (anchor)
              </p>
              <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                Optionnel
              </span>
              {hasImage && (
                <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 rounded">
                  ✓ Active
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {hasImage
                ? "Cette photo sert d'ancrage à chaque b-roll généré. Tous les clips garderont le même personnage et la même ambiance visuelle."
                : "Uploade une photo de toi (ou d'un personnage de référence) — elle sera utilisée comme premier frame de chaque b-roll pour garantir la persistance du personnage."}
            </p>
          </div>
        </div>

        {hasImage && signedUrlQuery.data ? (
          <div className="flex items-center gap-3">
            <img
              src={signedUrlQuery.data}
              alt="Reference"
              className="h-32 w-auto rounded-md object-cover border border-border"
            />
            <div className="flex-1 space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Mode <span className="font-mono text-primary">image-to-video</span> activé sur Seedance. Tous les b-rolls générés partiront de cette image comme premier frame.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer la référence
              </Button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={uploading ? undefined : onPickFile}
            role="button"
            tabIndex={0}
            className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 hover:bg-primary/[0.04]"
            } ${uploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(",")}
              onChange={onInputChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              {uploading ? (
                <Loader2 className="h-7 w-7 text-primary animate-spin" />
              ) : (
                <Upload className="h-7 w-7 text-primary/70" />
              )}
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  {uploading
                    ? "Upload en cours…"
                    : "Glisse une photo ou clique pour parcourir"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  JPG, PNG, WebP · max 10 MB
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/[0.08] border border-destructive/40 px-3 py-2 text-xs text-destructive flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-md bg-muted/40 border border-border px-3 py-2 text-[11px] text-muted-foreground flex items-start gap-2">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          <span>
            <strong className="text-foreground">Conseil</strong> : une photo bien éclairée avec ton visage visible donne les meilleurs résultats. Évite les visages multiples ou les paysages sans personne (sauf si tu veux justement un univers sans personnage).
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
