import { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Film,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  Plus,
  Save,
  Trash2,
  GripVertical,
  Upload,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────

interface Video {
  id: string;
  titre: string;
  url: string | null;
  vimeo_id: string | null;
  notes: string | null;
  ordre: number;
  duree_secondes: number | null;
}

interface Ressource {
  id: string;
  titre: string;
  type: string;
  url: string;
  ordre: number;
  video_id: string | null;
}

// ── Detect video source helper ───────────────────────────────────

function detectVideoType(url: string | null, vimeoId: string | null): string {
  if (vimeoId) return "Vimeo";
  if (!url) return "—";
  if (/vimeo\.com/i.test(url)) return "Vimeo";
  if (/youtube\.com|youtu\.be/i.test(url)) return "YouTube";
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) return "Vidéo directe";
  return "Embed";
}

// ── Main component ───────────────────────────────────────────────

export default function ChapitreEditor() {
  const { slug, chapitreId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, isLoading: authLoading } = useAuth();
  const isCeo = profile?.role === "ceo";

  if (!authLoading && !isCeo) {
    return <Navigate to="/training" replace />;
  }

  // ── Load chapitre + videos + ressources ─────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["admin-training", "chapitre-editor", chapitreId],
    enabled: !!chapitreId && isCeo,
    queryFn: async () => {
      const { data: chapitre, error } = await (supabase as any)
        .from("formation_chapitres")
        .select(
          `id, titre, description, ordre, status, duree_estimee_minutes, notes_formateur,
          formation_modules!inner(id, titre, formation_id,
            formations!inner(id, slug, titre)
          ),
          chapitre_videos(id, titre, url, vimeo_id, notes, ordre, duree_secondes),
          chapitre_ressources(id, titre, type, url, ordre, video_id)`
        )
        .eq("id", chapitreId!)
        .maybeSingle();
      if (error) throw error;
      if (!chapitre) return null;

      const videos: Video[] = [...(chapitre.chapitre_videos ?? [])].sort(
        (a: any, b: any) => a.ordre - b.ordre
      );
      const ressources: Ressource[] = [...(chapitre.chapitre_ressources ?? [])].sort(
        (a: any, b: any) => a.ordre - b.ordre
      );
      return {
        chapitre,
        videos,
        ressources,
        module: chapitre.formation_modules,
        formation: (chapitre.formation_modules as any).formations,
      };
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-training", "chapitre-editor", chapitreId] });
    queryClient.invalidateQueries({ queryKey: ["admin-training"] });
    queryClient.invalidateQueries({ queryKey: ["training"] });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data || !data.chapitre) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <h2 className="text-xl font-semibold">Chapitre introuvable</h2>
        <Button variant="outline" onClick={() => navigate(`/admin/training/${slug}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>
    );
  }

  const { chapitre, videos, ressources, formation } = data;
  const chapterRessources = ressources.filter((r) => !r.video_id);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/admin/training/${slug}`)}
            className="gap-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {formation.titre}
          </Button>
          <h1 className="text-xl font-bold text-foreground">{chapitre.titre}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`/training/${slug}/chapitre/${chapitreId}`, "_blank")}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Prévisualiser
        </Button>
      </div>

      {/* Section 1: Métadonnées */}
      <MetadataSection chapitre={chapitre} onSaved={invalidate} />

      {/* Section 2: Vidéos */}
      <VideosSection
        videos={videos}
        ressources={ressources}
        chapitreId={chapitreId!}
        onChanged={invalidate}
      />

      {/* Section 3: Ressources du chapitre */}
      <ChapterRessourcesSection
        ressources={chapterRessources}
        chapitreId={chapitreId!}
        onChanged={invalidate}
      />
    </div>
  );
}

// ── Section 1: Métadonnées ────────────────────────────────────

function MetadataSection({
  chapitre,
  onSaved,
}: {
  chapitre: any;
  onSaved: () => void;
}) {
  const [titre, setTitre] = useState(chapitre.titre);
  const [description, setDescription] = useState(chapitre.description ?? "");
  const [notesFormateur, setNotesFormateur] = useState(chapitre.notes_formateur ?? "");
  const [duree, setDuree] = useState(chapitre.duree_estimee_minutes?.toString() ?? "");
  const [status, setStatus] = useState(chapitre.status);

  useEffect(() => {
    setTitre(chapitre.titre);
    setDescription(chapitre.description ?? "");
    setNotesFormateur(chapitre.notes_formateur ?? "");
    setDuree(chapitre.duree_estimee_minutes?.toString() ?? "");
    setStatus(chapitre.status);
  }, [chapitre]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("formation_chapitres")
        .update({
          titre,
          description: description || null,
          notes_formateur: notesFormateur || null,
          duree_estimee_minutes: duree ? parseInt(duree, 10) : null,
          status,
        })
        .eq("id", chapitre.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Métadonnées enregistrées");
      onSaved();
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" />
          Métadonnées du chapitre
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Titre *</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Description du chapitre (visible par l'apprenant)..."
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Notes du formateur (À retenir)</Label>
            <Textarea
              value={notesFormateur}
              onChange={(e) => setNotesFormateur(e.target.value)}
              rows={4}
              placeholder="Synthèse, points clés, introduction du chapitre..."
            />
          </div>
          <div className="space-y-2">
            <Label>Durée estimée (minutes)</Label>
            <Input
              type="number"
              value={duree}
              onChange={(e) => setDuree(e.target.value)}
              min={1}
            />
          </div>
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
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!titre.trim() || saveMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Section 2: Vidéos ─────────────────────────────────────────

function VideosSection({
  videos,
  ressources,
  chapitreId,
  onChanged,
}: {
  videos: Video[];
  ressources: Ressource[];
  chapitreId: string;
  onChanged: () => void;
}) {
  const [deleteVideoId, setDeleteVideoId] = useState<string | null>(null);

  const addVideoMutation = useMutation({
    mutationFn: async () => {
      const maxOrdre = videos.length > 0 ? Math.max(...videos.map((v) => v.ordre)) + 1 : 0;
      const { error } = await supabase.from("chapitre_videos").insert({
        chapitre_id: chapitreId,
        titre: `Vidéo ${videos.length + 1}`,
        ordre: maxOrdre,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vidéo ajoutée");
      onChanged();
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase.from("chapitre_videos").delete().eq("id", videoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vidéo supprimée");
      setDeleteVideoId(null);
      onChanged();
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const moveVideoMutation = useMutation({
    mutationFn: async ({ videoId, direction }: { videoId: string; direction: "up" | "down" }) => {
      const idx = videos.findIndex((v) => v.id === videoId);
      if (idx === -1) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= videos.length) return;

      const a = videos[idx];
      const b = videos[swapIdx];
      await supabase.from("chapitre_videos").update({ ordre: b.ordre }).eq("id", a.id);
      await supabase.from("chapitre_videos").update({ ordre: a.ordre }).eq("id", b.id);
    },
    onSuccess: onChanged,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Film className="h-4 w-4 text-primary" />
            Vidéos ({videos.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addVideoMutation.mutate()}
            disabled={addVideoMutation.isPending}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Ajouter une vidéo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {videos.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Aucune vidéo dans ce chapitre.
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={videos.map((v) => v.id)} className="space-y-3">
            {videos.map((video, idx) => (
              <VideoItem
                key={video.id}
                video={video}
                ressources={ressources.filter((r) => r.video_id === video.id)}
                isFirst={idx === 0}
                isLast={idx === videos.length - 1}
                onMove={(dir) => moveVideoMutation.mutate({ videoId: video.id, direction: dir })}
                onDelete={() => setDeleteVideoId(video.id)}
                onChanged={onChanged}
              />
            ))}
          </Accordion>
        )}
      </CardContent>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteVideoId} onOpenChange={(o) => !o && setDeleteVideoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette vidéo ?</AlertDialogTitle>
            <AlertDialogDescription>
              La vidéo et ses ressources liées seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteVideoId && deleteVideoMutation.mutate(deleteVideoId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ── Video item (accordion) ────────────────────────────────────

function VideoItem({
  video,
  ressources,
  isFirst,
  isLast,
  onMove,
  onDelete,
  onChanged,
}: {
  video: Video;
  ressources: Ressource[];
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const [titre, setTitre] = useState(video.titre);
  const [url, setUrl] = useState(video.url ?? "");
  const [vimeoId, setVimeoId] = useState(video.vimeo_id ?? "");
  const [notes, setNotes] = useState(video.notes ?? "");
  const [duree, setDuree] = useState(video.duree_secondes?.toString() ?? "");

  useEffect(() => {
    setTitre(video.titre);
    setUrl(video.url ?? "");
    setVimeoId(video.vimeo_id ?? "");
    setNotes(video.notes ?? "");
    setDuree(video.duree_secondes?.toString() ?? "");
  }, [video]);

  const videoType = detectVideoType(url || null, vimeoId || null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("chapitre_videos")
        .update({
          titre,
          url: url || null,
          vimeo_id: vimeoId || null,
          notes: notes || null,
          duree_secondes: duree ? parseInt(duree, 10) : null,
        })
        .eq("id", video.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vidéo enregistrée");
      onChanged();
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  return (
    <AccordionItem value={video.id} className="border rounded-lg px-4">
      <AccordionTrigger className="hover:no-underline py-3">
        <div className="flex items-center gap-3 text-left flex-1">
          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm">{video.titre}</span>
          <Badge variant="outline" className="text-[10px]">
            {videoType}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pb-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Titre de la vidéo *</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>URL de la vidéo</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://vimeo.com/..., youtube.com/..., fichier.mp4..."
            />
          </div>
          <div className="space-y-2">
            <Label>ID Vimeo (optionnel)</Label>
            <Input
              value={vimeoId}
              onChange={(e) => setVimeoId(e.target.value)}
              placeholder="123456789"
            />
          </div>
          <div className="space-y-2">
            <Label>Durée (secondes)</Label>
            <Input
              type="number"
              value={duree}
              onChange={(e) => setDuree(e.target.value)}
              min={1}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Notes du formateur</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notes affichées sous cette vidéo..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isFirst}
              onClick={() => onMove("up")}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isLast}
              onClick={() => onMove("down")}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!titre.trim() || saveMutation.isPending}
            size="sm"
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "..." : "Enregistrer"}
          </Button>
        </div>

        {/* Ressources liées à cette vidéo */}
        <Separator />
        <VideoRessourcesSection
          ressources={ressources}
          videoId={video.id}
          chapitreId=""
          onChanged={onChanged}
        />
      </AccordionContent>
    </AccordionItem>
  );
}

// ── Ressources liées à une vidéo ──────────────────────────────

function VideoRessourcesSection({
  ressources,
  videoId,
  onChanged,
}: {
  ressources: Ressource[];
  videoId: string;
  chapitreId: string;
  onChanged: () => void;
}) {
  return (
    <RessourcesList
      ressources={ressources}
      label="Ressources liées à cette vidéo"
      onAdd={async () => {
        const maxOrdre = ressources.length > 0 ? Math.max(...ressources.map((r) => r.ordre)) + 1 : 0;
        // We need chapitre_id — get it from the video
        const { data: vid } = await supabase
          .from("chapitre_videos")
          .select("chapitre_id")
          .eq("id", videoId)
          .single();
        if (!vid) return;
        const { error } = await supabase.from("chapitre_ressources").insert({
          chapitre_id: vid.chapitre_id,
          video_id: videoId,
          titre: "Nouvelle ressource",
          type: "link",
          url: "",
          ordre: maxOrdre,
        });
        if (error) throw error;
      }}
      onChanged={onChanged}
    />
  );
}

// ── Section 3: Ressources du chapitre ─────────────────────────

function ChapterRessourcesSection({
  ressources,
  chapitreId,
  onChanged,
}: {
  ressources: Ressource[];
  chapitreId: string;
  onChanged: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LinkIcon className="h-4 w-4 text-primary" />
          Ressources du chapitre ({ressources.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RessourcesList
          ressources={ressources}
          label="Ressources de synthèse (non liées à une vidéo)"
          onAdd={async () => {
            const maxOrdre = ressources.length > 0 ? Math.max(...ressources.map((r) => r.ordre)) + 1 : 0;
            const { error } = await supabase.from("chapitre_ressources").insert({
              chapitre_id: chapitreId,
              titre: "Nouvelle ressource",
              type: "link",
              url: "",
              ordre: maxOrdre,
            });
            if (error) throw error;
          }}
          onChanged={onChanged}
        />
      </CardContent>
    </Card>
  );
}

// ── Generic ressources list (reused for video & chapter) ──────

function RessourcesList({
  ressources,
  label,
  onAdd,
  onChanged,
}: {
  ressources: Ressource[];
  label: string;
  onAdd: () => Promise<void>;
  onChanged: () => void;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const addMutation = useMutation({
    mutationFn: onAdd,
    onSuccess: () => {
      toast.success("Ressource ajoutée");
      onChanged();
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chapitre_ressources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ressource supprimée");
      setDeleteId(null);
      onChanged();
    },
  });

  return (
    <div className="space-y-3">
      {ressources.length === 0 && (
        <p className="text-sm text-muted-foreground">{label} — aucune pour l'instant.</p>
      )}
      {ressources.map((r) => (
        <RessourceItem key={r.id} ressource={r} onDelete={() => setDeleteId(r.id)} onChanged={onChanged} />
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => addMutation.mutate()}
        disabled={addMutation.isPending}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Ajouter une ressource
      </Button>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette ressource ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Single ressource item ─────────────────────────────────────

function RessourceItem({
  ressource,
  onDelete,
  onChanged,
}: {
  ressource: Ressource;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const [titre, setTitre] = useState(ressource.titre);
  const [type, setType] = useState(ressource.type);
  const [url, setUrl] = useState(ressource.url);

  useEffect(() => {
    setTitre(ressource.titre);
    setType(ressource.type);
    setUrl(ressource.url);
  }, [ressource]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("chapitre_ressources")
        .update({ titre, type, url })
        .eq("id", ressource.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ressource enregistrée");
      onChanged();
    },
    onError: () => toast.error("Erreur"),
  });

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useState<HTMLInputElement | null>(null)[0];

  const Icon = type === "pdf" ? FileText : type === "image" ? ImageIcon : LinkIcon;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      toast.error("Format non supporté. Utilise PDF ou image.");
      return;
    }

    // Validate size (10 MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux. Maximum 10 MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || (isPdf ? "pdf" : "jpg");
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${ressource.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("formation-resources")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("formation-resources")
        .getPublicUrl(filePath);

      // Update local state
      const newType = isPdf ? "pdf" : "image";
      const newTitre = titre || file.name.replace(/\.[^.]+$/, "");
      setUrl(publicUrl.publicUrl);
      setType(newType);
      if (!titre) setTitre(newTitre);

      // Save to DB immediately
      const { error: dbError } = await supabase
        .from("chapitre_ressources")
        .update({
          titre: newTitre,
          type: newType,
          url: publicUrl.publicUrl,
        })
        .eq("id", ressource.id);

      if (dbError) throw dbError;
      toast.success("Fichier uploadé !");
      onChanged();
    } catch (err: any) {
      toast.error("Erreur upload : " + (err.message || "inconnue"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
      <Icon className="h-4 w-4 text-primary mt-2.5 shrink-0" />
      <div className="flex-1 grid gap-2 sm:grid-cols-3">
        <Input
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Titre"
          className="sm:col-span-1"
        />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="link">Lien</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="image">Image</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://... ou upload"
          className="sm:col-span-1"
        />
      </div>
      <div className="flex items-center gap-1 shrink-0 mt-1">
        <input
          type="file"
          accept="application/pdf,image/*"
          id={`upload-${ressource.id}`}
          className="hidden"
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => document.getElementById(`upload-${ressource.id}`)?.click()}
          disabled={uploading}
          title="Uploader un fichier (PDF/image, max 10 MB)"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
