import { useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EditFormationDialog } from "@/components/training/admin/EditFormationDialog";
import { ModuleCard } from "@/components/training/admin/editor/ModuleCard";
import { CreateModuleDialog } from "@/components/training/admin/editor/CreateModuleDialog";
import { ArrowLeft, BookOpen, ExternalLink, Plus } from "lucide-react";

export default function FormationEditor() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, isLoading: authLoading } = useAuth();
  const isCeo = profile?.role === "ceo";
  const [createModuleOpen, setCreateModuleOpen] = useState(false);
  const [editFormationOpen, setEditFormationOpen] = useState(false);

  if (!authLoading && !isCeo) {
    return <Navigate to="/training" replace />;
  }

  const { data: formation, isLoading: loadingFormation } = useQuery({
    queryKey: ["admin-training", "formation", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formations")
        .select("id, slug, titre, description, couleur, cover_url, status, ordre")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Formation introuvable");
      return data;
    },
    enabled: !!slug && isCeo,
  });

  const { data: modules, isLoading: loadingModules } = useQuery({
    queryKey: ["admin-training", "modules-tree", formation?.id],
    enabled: !!formation?.id,
    queryFn: async () => {
      const { data: mods, error } = await supabase
        .from("formation_modules")
        .select("id, titre, description, ordre, status")
        .eq("formation_id", formation!.id)
        .order("ordre", { ascending: true });
      if (error) throw error;

      const withChapters = await Promise.all(
        (mods ?? []).map(async (m) => {
          const { data: chaps } = await supabase
            .from("formation_chapitres")
            .select("id, titre, description, ordre, status, duree_estimee_minutes")
            .eq("module_id", m.id)
            .order("ordre", { ascending: true });
          return { ...m, chapitres: chaps ?? [] };
        })
      );
      return withChapters;
    },
  });

  const isLoading = loadingFormation || loadingModules;
  const totalModules = modules?.length ?? 0;
  const totalChapitres = modules?.reduce((sum, m) => sum + m.chapitres.length, 0) ?? 0;
  const publishedChapitres = modules?.reduce(
    (sum, m) => sum + m.chapitres.filter((c) => c.status === "published").length,
    0
  ) ?? 0;

  const statusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
    published: { label: "Publiée", className: "bg-primary/10 text-primary" },
    archived: { label: "Archivée", className: "bg-muted text-muted-foreground" },
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!formation) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <p className="text-lg font-medium text-foreground">Formation introuvable</p>
        <Button variant="outline" onClick={() => navigate("/admin/training")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à la liste
        </Button>
      </div>
    );
  }

  const sc = statusConfig[formation.status] ?? statusConfig.draft;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/training")}
            className="gap-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditFormationOpen(true)}
              className="text-2xl font-bold text-foreground hover:text-primary transition-colors text-left"
            >
              {formation.titre}
            </button>
            <Badge className={sc.className}>{sc.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {totalModules} module{totalModules !== 1 ? "s" : ""} · {totalChapitres} chapitre{totalChapitres !== 1 ? "s" : ""} · {publishedChapitres} publié{publishedChapitres !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/training/${formation.slug}`, "_blank")}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Prévisualiser
          </Button>
          <Button size="sm" onClick={() => setCreateModuleOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau module
          </Button>
        </div>
      </div>

      {/* Modules tree */}
      {totalModules === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-card py-16">
          <BookOpen className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground">Aucun module dans cette formation</p>
          <Button onClick={() => setCreateModuleOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Créer le premier module
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {modules!.map((mod, idx) => (
            <ModuleCard
              key={mod.id}
              module={mod}
              isFirst={idx === 0}
              isLast={idx === totalModules - 1}
              totalModules={totalModules}
              formationId={formation.id}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateModuleDialog
        open={createModuleOpen}
        onOpenChange={setCreateModuleOpen}
        formationId={formation.id}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-training", "modules-tree", formation.id] });
          queryClient.invalidateQueries({ queryKey: ["admin-training", "formations"] });
        }}
      />

      {editFormationOpen && (
        <EditFormationDialog
          open={editFormationOpen}
          onOpenChange={setEditFormationOpen}
          formation={formation}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-training", "formation", slug] });
            queryClient.invalidateQueries({ queryKey: ["admin-training", "formations"] });
            queryClient.invalidateQueries({ queryKey: ["training"] });
          }}
        />
      )}
    </div>
  );
}
