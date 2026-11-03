// La pub qui a amené un lead (03/11/2026) : « Pub : Vidéo 6 · Snapchat ».
// Rien ne s'affiche pour un lead qui ne vient pas d'une pub Meta ou Snap.
import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NOM_PLATEFORME, nomPub, type Plateforme } from "@/lib/marketing/creas";

export default function PubOrigine({ leadId, prefixe = "Pub" }: { leadId: string | null | undefined; prefixe?: string }) {
  const { data } = useQuery({
    queryKey: ["pub-origine-lead", leadId],
    enabled: !!leadId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("pub_origine_lead", { p_lead_id: leadId });
      if (error) throw error;
      return (data?.[0] ?? null) as { plateforme: Plateforme; pub_id: string | null; pub_nom: string | null; campagne_nom: string | null } | null;
    },
  });
  if (!data) return null;
  return (
    <p className="text-xs text-muted-foreground flex items-center gap-1" title={data.campagne_nom ?? undefined}>
      <Megaphone className="h-3 w-3" />
      {prefixe} : <span className="font-medium text-foreground">{nomPub(data)}</span> · {NOM_PLATEFORME[data.plateforme]}
    </p>
  );
}
