// Badge « Hors zone » (24/11/2026) : téléphone avec un indicatif autre que +33
// et +32, la zone ciblée par les pubs. Simple signalement : le lead se traite
// comme les autres.
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { estHorsZone, indicatifAffiche } from "@/lib/zoneLead";

export function BadgeHorsZone({ tel, className }: { tel: string | null | undefined; className?: string }) {
  if (!estHorsZone(tel)) return null;
  const ind = indicatifAffiche(tel);
  return (
    <Badge
      variant="outline"
      className={cn("h-4 shrink-0 border-orange-500/40 bg-orange-500/10 px-1 text-[9px] font-medium leading-none text-orange-300", className)}
      title={`Indicatif ${ind ?? "étranger"} : hors de la zone ciblée par les pubs (France +33, Belgique +32)`}
      data-testid="badge-hors-zone"
    >
      Hors zone{ind ? ` ${ind}` : ""}
    </Badge>
  );
}
