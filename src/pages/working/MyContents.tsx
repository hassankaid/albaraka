import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  useContentPiecesList,
  useDeleteContentPiece,
  type ContentPiece,
  type ContentPieceStatus,
} from "@/hooks/useContentPiece";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2,
  Search,
  Sparkles,
  Trash2,
  Play,
  CheckCircle2,
  Library,
  Pencil,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { THEMES, FORMATS } from "./content-wizard/constants";

const STATUS_CONFIG: Record<
  ContentPieceStatus,
  { label: string; icon: React.ElementType; badgeClass: string }
> = {
  en_cours: {
    label: "En cours",
    icon: Pencil,
    badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  },
  pret: {
    label: "Prêt",
    icon: CheckCircle2,
    badgeClass: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  },
  publie: {
    label: "Publié",
    icon: Send,
    badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  },
};

function ContentRow({
  content,
  onResume,
  onDelete,
}: {
  content: ContentPiece;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const statusConfig = STATUS_CONFIG[content.status] || STATUS_CONFIG.en_cours;
  const StatusIcon = statusConfig.icon;
  const theme = THEMES.find((t) => t.id === content.theme);
  const fmt = FORMATS.find((f) => f.id === content.format);
  const progressPercent = Math.round((content.current_step / 5) * 100);

  return (
    <div
      onClick={() => onResume(content.id)}
      className="grid items-center px-4 h-12 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors group"
      style={{ gridTemplateColumns: "2.5fr 1.5fr 100px 140px 120px 60px" }}
    >
      {/* Title */}
      <p className="font-medium text-sm text-foreground truncate pr-4">
        {content.title || "Sans titre"}
      </p>

      {/* Theme · Format — full label, no truncation issues */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pr-4">
        {theme && <span className="truncate">{theme.emoji} {theme.label}</span>}
        {theme && fmt && <span className="shrink-0">·</span>}
        {fmt && <span className="truncate">{fmt.emoji} {fmt.label}</span>}
      </div>

      {/* Status */}
      <div>
        <Badge variant="outline" className={`${statusConfig.badgeClass} text-[11px]`}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </div>

      {/* Progress — bar + percentage */}
      <div className="flex items-center gap-2.5">
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden w-16">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{progressPercent}%</span>
      </div>

      {/* Date */}
      <span className="text-xs text-muted-foreground truncate">
        {formatDistanceToNow(new Date(content.updated_at), {
          addSuffix: true,
          locale: fr,
        })}
      </span>

      {/* Actions — always visible */}
      <div className="flex items-center justify-end gap-0.5">
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
          <Play className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(content.id);
          }}
          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Library className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            Aucun contenu pour l'instant
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Commence par créer ton premier contenu avec le générateur. Il
            apparaîtra automatiquement ici après ta première sauvegarde.
          </p>
        </div>
        <Button className="mt-6" onClick={onCreate}>
          <Sparkles className="h-4 w-4 mr-2" />
          Créer mon premier contenu
        </Button>
      </CardContent>
    </Card>
  );
}

export default function MyContents() {
  const navigate = useNavigate();
  const { data: contents, isLoading } = useContentPiecesList();
  const deleteMutation = useDeleteContentPiece();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | ContentPieceStatus>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredContents = useMemo(() => {
    if (!contents) return [];
    let filtered = contents;
    if (activeTab !== "all") {
      filtered = filtered.filter((c) => c.status === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => {
        const title = (c.title || "").toLowerCase();
        const accroche = (c.selected_idea?.accroche || "").toLowerCase();
        return title.includes(q) || accroche.includes(q);
      });
    }
    return filtered;
  }, [contents, activeTab, searchQuery]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: contents?.length || 0, en_cours: 0, pret: 0, publie: 0 };
    contents?.forEach((item) => { c[item.status] = (c[item.status] || 0) + 1; });
    return c;
  }, [contents]);

  const handleResume = (id: string) => navigate(`/working/content?id=${id}`);
  const handleCreate = () => navigate("/working/content");

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success("Contenu supprimé");
      setDeleteId(null);
    } catch (error: any) {
      toast.error("Erreur : " + (error?.message || "inconnue"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasAnyContent = (contents?.length || 0) > 0;

  return (
    <div className="space-y-4">
      {/* Header compact : titre + recherche + filtres + bouton sur une/deux lignes */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Mes Contenus</h2>
        <div className="flex items-center gap-2">
          {hasAnyContent && (
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          )}
          <Button size="sm" onClick={handleCreate}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Nouveau
          </Button>
        </div>
      </div>

      {!hasAnyContent ? (
        <EmptyState onCreate={handleCreate} />
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="h-8 gap-0.5">
            <TabsTrigger value="all" className="text-xs h-7 px-2.5">Tous ({counts.all})</TabsTrigger>
            <TabsTrigger value="en_cours" className="text-xs h-7 px-2.5">En cours ({counts.en_cours})</TabsTrigger>
            <TabsTrigger value="pret" className="text-xs h-7 px-2.5">Prêts ({counts.pret})</TabsTrigger>
            <TabsTrigger value="publie" className="text-xs h-7 px-2.5">Publiés ({counts.publie})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-3">
            {filteredContents.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "Aucun résultat." : "Aucun contenu dans cette catégorie."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                {/* Header row */}
                <div
                  className="grid items-center px-4 h-9 border-b text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
                  style={{ gridTemplateColumns: "2.5fr 1.5fr 100px 140px 120px 60px" }}
                >
                  <span>Titre</span>
                  <span>Thème · Format</span>
                  <span>Statut</span>
                  <span>Progression</span>
                  <span>Modifié</span>
                  <span />
                </div>
                {filteredContents.map((content) => (
                  <ContentRow
                    key={content.id}
                    content={content}
                    onResume={handleResume}
                    onDelete={setDeleteId}
                  />
                ))}
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="rounded-full bg-destructive/10 p-2">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              Supprimer ce contenu ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le contenu et toutes les données
              associées seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Oui, supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
