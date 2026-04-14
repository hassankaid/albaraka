import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Megaphone, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  published_at: string | null;
  created_at: string;
}

export default function AnnouncementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["announcement", id],
    enabled: !!id,
    queryFn: async (): Promise<AnnouncementRow | null> => {
      const { data, error } = await supabase
        .from("announcements" as any)
        .select("id, title, body, published_at, created_at")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as AnnouncementRow) ?? null;
    },
  });

  if (query.isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const a = query.data;
  if (!a) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-muted-foreground">
        Annonce introuvable ou plus accessible.
      </div>
    );
  }

  const when = a.published_at ?? a.created_at;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Button>
      <Card>
        <CardContent className="p-6 md:p-8 space-y-5">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
              <Megaphone className="h-5 w-5" />
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Annonce
            </div>
          </div>
          <h1 className="font-heading text-2xl md:text-3xl text-foreground leading-tight">
            {a.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            {format(new Date(when), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
          </p>
          <div className="text-sm md:text-base text-foreground whitespace-pre-wrap leading-relaxed">
            {a.body}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
