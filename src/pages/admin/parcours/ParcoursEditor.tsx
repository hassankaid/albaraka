import { useAuth } from "@/hooks/useAuth";
import { Navigate, useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useParcoursBySlug } from "@/hooks/useAdminParcours";
import { Loader2, ArrowLeft, ChevronRight, Video, BookOpen, Flag } from "lucide-react";

const TYPE_META: Record<string, { icon: any; label: string }> = {
  video: { icon: Video, label: "Vidéo" },
  redirect_formation: { icon: BookOpen, label: "→ Formation" },
  milestone: { icon: Flag, label: "Étape clé" },
};

export default function ParcoursEditor() {
  const { profile } = useAuth();
  if (profile?.role !== "ceo") return <Navigate to="/dashboard" replace />;

  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useParcoursBySlug(slug);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data) return <Navigate to="/admin/parcours" replace />;

  const { parcours, phases, chapitres } = data;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link
          to="/admin/parcours"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour aux parcours
        </Link>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          {parcours.titre}
        </h1>
        {parcours.description && (
          <p className="text-muted-foreground mt-1">{parcours.description}</p>
        )}
      </div>

      <div className="space-y-6">
        {phases.map((phase) => {
          const phaseChapitres = chapitres
            .filter((c) => c.phase_id === phase.id)
            .sort((a, b) => a.ordre - b.ordre);
          return (
            <Card key={phase.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Phase {phase.numero} — {phase.titre}
                    </h2>
                    {phase.description && (
                      <p className="text-sm text-muted-foreground mt-1">{phase.description}</p>
                    )}
                  </div>
                  <Badge variant="outline">{phaseChapitres.length} chapitre{phaseChapitres.length > 1 ? "s" : ""}</Badge>
                </div>

                <div className="space-y-2">
                  {phaseChapitres.map((chap) => {
                    const meta = TYPE_META[chap.type] ?? TYPE_META.video;
                    const Icon = meta.icon;
                    return (
                      <Link
                        key={chap.id}
                        to={`/admin/parcours/${slug}/chapitre/${chap.id}`}
                      >
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-accent/30 transition-colors cursor-pointer">
                          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">
                                Chapitre {chap.numero} — {chap.titre}
                              </span>
                              <Badge variant="outline" className="text-xs">{meta.label}</Badge>
                              {chap.status !== "published" && (
                                <Badge variant="secondary" className="text-xs">{chap.status}</Badge>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                  {phaseChapitres.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Aucun chapitre dans cette phase.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
