import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";

interface Props {
  tresoIn: number;
  tresoOut: number;
  tresoRemaining: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default function TreasuryCard({ tresoIn, tresoOut, tresoRemaining }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Trésorerie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
            <span className="text-muted-foreground">Entrées</span>
          </div>
          <span className="font-bold text-emerald-500">{fmt(tresoIn)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <ArrowUpRight className="h-4 w-4 text-destructive" />
            <span className="text-muted-foreground">Sorties</span>
          </div>
          <span className="font-bold text-destructive">{fmt(tresoOut)}</span>
        </div>
        <div className="border-t border-border pt-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Scale className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">Solde</span>
          </div>
          <span className={`font-bold text-lg ${tresoRemaining >= 0 ? "text-emerald-500" : "text-destructive"}`}>
            {fmt(tresoRemaining)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
