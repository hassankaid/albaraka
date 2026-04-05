import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, PlayCircle, EyeOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChapterSidebarProps {
  formationSlug: string;
  formationId: string;
  currentChapitreId: string;
  isCeo: boolean;
  onNavigate?: () => void;
}

export function ChapterSidebar({
  formationSlug,
  formationId,
  currentChapitreId,
  isCeo,
  onNavigate,
}: ChapterSidebarProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const userId = profile?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["training", "sidebar", formationId, userId],
    enabled: !!formationId && !!userId,
    queryFn: async () => {
      const [formRes, modRes] = await Promise.all([
        supabase.from("formations").select("id, titre").eq("id", formationId).maybeSingle(),
        supabase
          .from("formation_modules")
          .select("id, titre, ordre, status, formation_chapitres(id, titre, ordre, status)")
          .eq("formation_id", formationId)
          .order("ordre", { ascending: true }),
      ]);

      const sorted = (modRes.data ?? []).map((m: any) => ({
        ...m,
        chapitres: [...(m.formation_chapitres ?? [])].sort(
          (a: any, b: any) => a.ordre - b.ordre
        ),
      }));

      const allChapIds = sorted.flatMap((m: any) => m.chapitres.map((c: any) => c.id));
      const { data: progress } = await supabase
        .from("chapitre_progress")
        .select("chapitre_id")
        .eq("user_id", userId!)
        .in("chapitre_id", allChapIds.length > 0 ? allChapIds : ["00000000-0000-0000-0000-000000000000"]);

      return {
        formation: formRes.data,
        modules: sorted,
        completedSet: new Set((progress ?? []).map((p: any) => p.chapitre_id)),
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-6 w-3/4" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (!data || !data.formation) return null;

  const activeModuleId = data.modules.find((m: any) =>
    m.chapitres.some((c: any) => c.id === currentChapitreId)
  )?.id;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Plan de la formation
          </p>
          <p className="text-sm font-medium text-foreground leading-tight">
            {data.formation.titre}
          </p>
        </div>

        <Accordion
          type="multiple"
          defaultValue={activeModuleId ? [activeModuleId] : []}
          className="space-y-2"
        >
          {data.modules.map((module: any, idx: number) => {
            const visibleChapitres = module.chapitres.filter(
              (c: any) => c.status === "published" || isCeo
            );
            if (visibleChapitres.length === 0 && !isCeo) return null;

            const modDone = visibleChapitres.filter((c: any) =>
              data.completedSet.has(c.id)
            ).length;
            const modTotal = visibleChapitres.filter(
              (c: any) => c.status === "published"
            ).length;

            return (
              <AccordionItem
                key={module.id}
                value={module.id}
                className="border-none"
              >
                <AccordionTrigger className="hover:no-underline py-2 px-2 rounded-md hover:bg-secondary text-xs">
                  <div className="flex items-center gap-2 text-left">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-medium text-foreground line-clamp-1">
                        {module.titre}
                      </span>
                      <span className="text-muted-foreground block">
                        {modDone}/{modTotal}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-0 pt-1">
                  <div className="space-y-0.5 pl-3">
                    {visibleChapitres.map((chap: any) => {
                      const done = data.completedSet.has(chap.id);
                      const isActive = chap.id === currentChapitreId;
                      const chapDraft = chap.status === "draft";
                      return (
                        <button
                          key={chap.id}
                          onClick={() => {
                            navigate(`/training/${formationSlug}/chapitre/${chap.id}`);
                            onNavigate?.();
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : isActive ? (
                            <PlayCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 shrink-0" />
                          )}
                          <span className="flex-1 line-clamp-1">{chap.titre}</span>
                          {chapDraft && isCeo && (
                            <EyeOff className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </ScrollArea>
  );
}
