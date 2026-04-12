import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClaimableSale } from "@/hooks/useClosingPlan";

interface Props {
  sales: ClaimableSale[];
  onClaim: (saleId: string) => void;
  isClaiming: boolean;
}

export function ClaimableSales({ sales, onClaim, isClaiming }: Props) {
  if (sales.length === 0) return null;
  return (
    <Card className="border-dashed border-[#C9A84C]/50">
      <CardContent className="p-4">
        <div className="mb-3">
          <h4 className="font-serif font-semibold text-foreground">Ventes à revendiquer</h4>
          <p className="text-xs text-muted-foreground">
            Ventes dont tu as mené un appel, mais pour lesquelles le closer n'est pas assigné automatiquement.
          </p>
        </div>
        <ul className="divide-y divide-border">
          {sales.map((s) => (
            <li key={s.id} className="py-2 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground truncate">{s.product ?? "Vente"}</div>
                <div className="text-[11px] text-muted-foreground">
                  {format(new Date(s.sold_at), "d MMM yyyy", { locale: fr })} ·{" "}
                  {Math.round(Number(s.amount_ht)).toLocaleString("fr-FR")} €
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => onClaim(s.id)} disabled={isClaiming}>
                C'était moi
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
