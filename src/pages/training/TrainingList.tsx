import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FormationCard } from "@/components/training/FormationCard";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, Lock } from "lucide-react";

export default function TrainingList() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const userId = profile?.id;
  const isCeo = profile?.role === "ceo";

  const { data: formations, isLoading } = useQuery({
    queryKey: ["training", "formations", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formations")
        .select("id, slug, titre, description, couleur, cover_url, status, ordre")
        .order("ordre", { ascending: true });
      if (error) throw error;
      if (!data) return [];

      return Promise.all(
        data.map(async (f) => {
          const [{ data: progress }, { data: chapters }] = await Promise.all([
            supabase.rpc("get_formation_progress", {
              p_user_id: userId!,
              p_formation_id: f.id,
            }),
            supabase
              .from("formation_chapitres")
              .select("id, status, formation_modules!inner(formation_id, status)")
              .eq("formation_modules.formation_id", f.id),
          ]);

          const published = (chapters ?? []).filter(
            (c: any) =>
              c.status === "published" && c.formation_modules?.status === "published"
          );
          const total = published.length;

          const { count: done } = await supabase
            .from("chapitre_progress")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId!)
            .in(
              "chapitre_id",
              published.map((c: any) => c.id)
            );

          return {
            ...f,
            progress: Number(progress ?? 0),
            nbChapitresDone: done ?? 0,
            nbChapitresTotal: total,
          };
        })
      );
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <GraduationCap className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Ethicarena Training</h2>
          <p className="text-sm text-muted-foreground">
            Tes formations et ton parcours d'apprentissage
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border bg-card overflow-hidden">
              <Skeleton className="h-40 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="px-4 pb-4 space-y-2">
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && formations && formations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Aucune formation disponible
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Tu n'as pas encore accès à une formation Ethicarena. Contacte l'équipe pour obtenir un accès.
          </p>
        </div>
      )}

      {!isLoading && formations && formations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {formations.map((f) => (
            <FormationCard
              key={f.id}
              formation={f}
              progress={f.progress}
              nbChapitresDone={f.nbChapitresDone}
              nbChapitresTotal={f.nbChapitresTotal}
              isCeoView={isCeo}
              onOpen={() => navigate(`/training/${f.slug}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
