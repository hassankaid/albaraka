import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useParcoursChapitre,
  useUpdateParcoursChapitre,
  useUpsertParcoursVideo,
  useDeleteParcoursVideo,
  useUpsertParcoursRessource,
  useDeleteParcoursRessource,
  useFormationsForSelect,
  type ParcoursVideoRow,
  type ParcoursRessourceRow,
} from "@/hooks/useAdminParcours";
import { VimeoLinkInput } from "@/components/training/VimeoLinkInput";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Video as VideoIcon,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
} from "lucide-react";

export default function ParcoursChapitreEditor() {
  const { profile } = useAuth();
  if (profile?.role !== "ceo") return <Navigate to="/dashboard" replace />;

  const { slug, chapitreId } = useParams<{ slug: string; chapitreId: string }>();
  const { data, isLoading } = useParcoursChapitre(chapitreId);
  const updateChap = useUpdateParcoursChapitre();
  const { data: formations } = useFormationsForSelect();

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [duree, setDuree] = useState<string>("");
  const [status, setStatus] = useState<string>("published");
  const [formationId, setFormationId] = useState<string>("");
  const [milestoneMessage, setMilestoneMessage] = useState("");
  const [milestoneEmoji, setMilestoneEmoji] = useState("");

  useEffect(() => {
    if (!data) return;
    setTitre(data.chapitre.titre);
    setDescription(data.chapitre.description ?? "");
    setDuree(data.chapitre.duree_estimee_minutes?.toString() ?? "");
    setStatus(data.chapitre.status);
    setFormationId(data.chapitre.formation_id ?? "");
    setMilestoneMessage(data.chapitre.milestone_message ?? "");
    setMilestoneEmoji(data.chapitre.milestone_emoji ?? "");
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const chap = data.chapitre;

  async function saveMetadata() {
    try {
      await updateChap.mutateAsync({
        id: chap.id,
        titre: titre.trim(),
        description: description.trim() || null,
        duree_estimee_minutes: duree ? Number(duree) : null,
        status,
        formation_id: chap.type === "redirect_formation" ? formationId || null : null,
        milestone_message: chap.type === "milestone" ? milestoneMessage.trim() || null : null,
        milestone_emoji: chap.type === "milestone" ? milestoneEmoji.trim() || null : null,
      } as any);
      toast.success("Chapitre enregistré");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          to={`/admin/parcours/${slug}`}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour au parcours
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold font-heading text-foreground">
            Chapitre {chap.numero} — {chap.titre}
          </h1>
          <Badge variant="outline">{chap.type === "video" ? "Vidéo" : chap.type === "milestone" ? "Étape clé" : "→ Formation"}</Badge>
        </div>
      </div>

      {/* Métadonnées */}
      <Card>
        <CardHeader>
          <CardTitle>Métadonnées</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Titre *</Label>
              <Input value={titre} onChange={(e) => setTitre(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Durée estimée (minutes)</Label>
              <Input
                type="number"
                min={0}
                value={duree}
                onChange={(e) => setDuree(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-background">
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

          {chap.type === "redirect_formation" && (
            <div className="space-y-2">
              <Label>Formation cible *</Label>
              <Select value={formationId} onValueChange={setFormationId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Sélectionner une formation" />
                </SelectTrigger>
                <SelectContent>
                  {(formations ?? []).map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.titre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Quand l'élève atteint ce chapitre, le bouton "Accéder à la formation" débloque la formation choisie.
              </p>
            </div>
          )}

          {chap.type === "milestone" && (
            <div className="grid sm:grid-cols-[100px_1fr] gap-4">
              <div className="space-y-2">
                <Label>Emoji</Label>
                <Input
                  value={milestoneEmoji}
                  onChange={(e) => setMilestoneEmoji(e.target.value)}
                  placeholder="🎉"
                  className="bg-background text-center text-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Message de l'étape</Label>
                <Textarea
                  value={milestoneMessage}
                  onChange={(e) => setMilestoneMessage(e.target.value)}
                  rows={3}
                  className="bg-background"
                  placeholder="Message de célébration visible par l'élève…"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={saveMetadata} disabled={updateChap.isPending}>
              {updateChap.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vidéos — seulement pour type "video" */}
      {chap.type === "video" && <VideosSection chapitreId={chap.id} videos={data.videos} />}

      {/* Ressources — pour tous sauf milestone/redirect ? */}
      {chap.type === "video" && (
        <RessourcesSection chapitreId={chap.id} ressources={data.ressources} videos={data.videos} />
      )}
    </div>
  );
}

function VideosSection({ chapitreId, videos }: { chapitreId: string; videos: ParcoursVideoRow[] }) {
  const upsert = useUpsertParcoursVideo();
  const del = useDeleteParcoursVideo();

  async function addVideo() {
    try {
      await upsert.mutateAsync({
        chapitre_id: chapitreId,
        titre: `Vidéo ${videos.length + 1}`,
        url: null,
        vimeo_id: null,
        ordre: videos.length,
      });
      toast.success("Vidéo ajoutée");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <VideoIcon className="h-5 w-5" /> Vidéos ({videos.length})
        </CardTitle>
        <Button size="sm" variant="outline" onClick={addVideo} disabled={upsert.isPending}>
          <Plus className="h-4 w-4 mr-1.5" /> Ajouter une vidéo
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {videos.length === 0 && (
          <p className="text-sm text-muted-foreground italic">Aucune vidéo. Clique sur "Ajouter une vidéo" pour commencer.</p>
        )}
        {videos.map((v, idx) => (
          <VideoItem
            key={v.id}
            video={v}
            index={idx}
            onDelete={() =>
              del.mutate({ id: v.id, chapitre_id: chapitreId })
            }
          />
        ))}
      </CardContent>
    </Card>
  );
}

function VideoItem({
  video,
  index,
  onDelete,
}: {
  video: ParcoursVideoRow;
  index: number;
  onDelete: () => void;
}) {
  const upsert = useUpsertParcoursVideo();
  const [titre, setTitre] = useState(video.titre);
  const [url, setUrl] = useState(video.url ?? "");
  const [vimeoId, setVimeoId] = useState(video.vimeo_id ?? "");
  const [notes, setNotes] = useState(video.notes ?? "");
  const [duree, setDuree] = useState(video.duree_secondes?.toString() ?? "");

  async function save() {
    try {
      await upsert.mutateAsync({
        id: video.id,
        chapitre_id: video.chapitre_id,
        titre: titre.trim() || `Vidéo ${index + 1}`,
        url: url.trim() || null,
        vimeo_id: vimeoId.trim() || null,
        notes: notes.trim() || null,
        duree_secondes: duree ? Number(duree) : null,
        ordre: video.ordre,
      });
      toast.success("Vidéo enregistrée");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    }
  }

  return (
    <div className="space-y-3 p-4 rounded-lg border border-border/50 bg-muted/20">
      <div className="flex items-center justify-between">
        <Badge variant="outline">Vidéo {index + 1}</Badge>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label>Titre de la vidéo</Label>
          <Input value={titre} onChange={(e) => setTitre(e.target.value)} className="bg-background" />
        </div>
        <div className="sm:col-span-2">
          <VimeoLinkInput
            value={url || (vimeoId ? `https://vimeo.com/${vimeoId}` : "")}
            onChange={({ vimeoId: vid, url: nextUrl }) => {
              setVimeoId(vid ?? "");
              setUrl(nextUrl ?? "");
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Durée (secondes)</Label>
          <Input
            type="number"
            min={0}
            value={duree}
            onChange={(e) => setDuree(e.target.value)}
            className="bg-background"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="bg-background"
            placeholder="Notes affichées sous la vidéo (optionnel)…"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={upsert.isPending}>
          {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer cette vidéo
        </Button>
      </div>
    </div>
  );
}

function RessourcesSection({
  chapitreId,
  ressources,
  videos,
}: {
  chapitreId: string;
  ressources: ParcoursRessourceRow[];
  videos: ParcoursVideoRow[];
}) {
  const upsert = useUpsertParcoursRessource();
  const del = useDeleteParcoursRessource();
  const [newTitre, setNewTitre] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState<"pdf" | "image" | "link">("link");

  async function addRessource() {
    if (!newTitre.trim() || !newUrl.trim()) {
      toast.error("Titre et URL requis");
      return;
    }
    try {
      await upsert.mutateAsync({
        chapitre_id: chapitreId,
        titre: newTitre.trim(),
        url: newUrl.trim(),
        type: newType,
        ordre: ressources.length,
      });
      setNewTitre("");
      setNewUrl("");
      toast.success("Ressource ajoutée");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" /> Ressources ({ressources.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ressources.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-border/40"
          >
            {r.type === "pdf" ? (
              <FileText className="h-4 w-4 text-muted-foreground" />
            ) : r.type === "image" ? (
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{r.titre}</p>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
                {r.url}
              </a>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => del.mutate({ id: r.id, chapitre_id: chapitreId })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <div className="grid sm:grid-cols-[1fr_1fr_120px_auto] gap-2 items-end pt-3 border-t border-border/40">
          <div className="space-y-1.5">
            <Label className="text-xs">Titre</Label>
            <Input value={newTitre} onChange={(e) => setNewTitre(e.target.value)} placeholder="Guide PDF" className="bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">URL</Label>
            <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." className="bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">Lien</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="image">Image</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={addRessource} disabled={upsert.isPending}>
            <Plus className="h-4 w-4 mr-1.5" /> Ajouter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
