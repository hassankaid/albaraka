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
  Calendar,
  CheckCircle2,
  Clock,
  Library,
  Pencil,
  Send,
  LayoutGrid,
  List,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { THEMES, FORMATS } from "./content-wizard/constants";

type ViewMode = "grid" | "list";

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

function ContentPieceCard({
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
    <Card className="hover:shadow-md transition-shadow min-h-[280px] flex flex-col">
      <CardContent className="p-5 space-y-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-base text-foreground line-clamp-2">
              {content.title || "Contenu sans titre"}
            </p>
            {content.selected_idea?.accroche && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {content.selected_idea.accroche}
              </p>
            )}
          </div>
          <Badge variant="outline" className={statusConfig.badgeClass}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          {theme && (
            <span>
              {theme.emoji} {theme.label}
            </span>
          )}
          <span>•</span>
          {fmt && (
            <span>
              {fmt.emoji} {fmt.label}
            </span>
          )}
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(content.updated_at), {
              addSuffix: true,
              locale: fr,
            })}
          </span>
        </div>

        {content.scheduled_for && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Publication prévue le{" "}
            {format(new Date(content.scheduled_for), "d MMM yyyy", {
              locale: fr,
            })}
          </p>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Étape {content.current_step}/5</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 mt-auto">
          <Button
            size="sm"
            onClick={() => onResume(content.id)}
            className="flex-1"
          >
            <Play className="h-3.5 w-3.5 mr-1" />
            Reprendre
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(content.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ContentPieceRow({
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
      className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors group"
    >
      {/* Title + accroche */}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm text-foreground truncate">
          {content.title || "Contenu sans titre"}
        </p>
        {content.selected_idea?.accroche && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {content.selected_idea.accroche}
          </p>
        )}
      </div>

      {/* Theme + Format */}
      <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 w-40">
        {theme && <span>{theme.emoji} {theme.label}</span>}
        {theme && fmt && <span>•</span>}
        {fmt && <span>{fmt.emoji} {fmt.label}</span>}
      </div>

      {/* Status badge */}
      <div className="shrink-0">
        <Badge variant="outline" className={`${statusConfig.badgeClass} text-[11px]`}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </div>

      {/* Progress */}
      <div className="hidden sm:flex items-center gap-2 shrink-0 w-28">
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden flex-1">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground w-6 text-right">{progressPercent}%</span>
      </div>

      {/* Date */}
      <div className="hidden lg:block text-xs text-muted-foreground shrink-0 w-28 text-right">
        {formatDistanceToNow(new Date(content.updated_at), {
          addSuffix: true,
          locale: fr,
        })}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="ghost" className="h-8 px-2">
          <Play className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(content.id);
          }}
          className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
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

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex items-center border rounded-md overflow-hidden">
      <button
        onClick={() => onChange("grid")}
        className={`p-2 transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
        aria-label="Vue grille"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange("list")}
        className={`p-2 transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
        aria-label="Vue liste"
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function MyContents() {
  const navigate = useNavigate();
  const { data: contents, isLoading } = useContentPiecesList();
  const deleteMutation = useDeleteContentPiece();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | ContentPieceStatus>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem("mycontents-view") as ViewMode) || "grid";
  });

  const handleViewChange = (v: ViewMode) => {
    setViewMode(v);
    localStorage.setItem("mycontents-view", v);
  };

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
    const c: Record<string, number> = {
      all: contents?.length || 0,
      en_cours: 0,
      pret: 0,
      publie: 0,
    };
    contents?.forEach((item) => {
      c[item.status] = (c[item.status] || 0) + 1;
    });
    return c;
  }, [contents]);

  const handleResume = (id: string) => {
    navigate(`/working/content?id=${id}`);
  };

  const handleCreate = () => {
    navigate("/working/content");
  };

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Mes Contenus</h2>
          <p className="text-sm text-muted-foreground">
            Retrouve et gère tous tes contenus créés avec le générateur
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasAnyContent && (
            <ViewToggle view={viewMode} onChange={handleViewChange} />
          )}
          <Button onClick={handleCreate}>
            <Sparkles className="h-4 w-4 mr-2" />
            Nouveau contenu
          </Button>
        </div>
      </div>

      {!hasAnyContent ? (
        <EmptyState onCreate={handleCreate} />
      ) : (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre ou accroche…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
          >
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="all">Tous ({counts.all})</TabsTrigger>
              <TabsTrigger value="en_cours">
                En cours ({counts.en_cours})
              </TabsTrigger>
              <TabsTrigger value="pret">Prêts ({counts.pret})</TabsTrigger>
              <TabsTrigger value="publie">
                Publiés ({counts.publie})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {filteredContents.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">
                      {searchQuery
                        ? "Aucun contenu ne correspond à ta recherche."
                        : "Aucun contenu dans cette catégorie."}
                    </p>
                  </CardContent>
                </Card>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {filteredContents.map((content) => (
                    <ContentPieceCard
                      key={content.id}
                      content={content}
                      onResume={handleResume}
                      onDelete={setDeleteId}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <div className="divide-y">
                    {filteredContents.map((content) => (
                      <ContentPieceRow
                        key={content.id}
                        content={content}
                        onResume={handleResume}
                        onDelete={setDeleteId}
                      />
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
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
              associées (idée, script, description, checklists) seront
              définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Oui, supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
