import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, Target, Zap, Award } from "lucide-react";

export function ScoreExplanation() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          Comment est calculé mon score ?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Base</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Moyenne de tes % d'atteinte sur les 3 objectifs : vidéos, messages et RDV.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/10">
                <Zap className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-sm font-semibold text-foreground">Dépassement</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pas de plafond à 100 % — dépasser un objectif rapporte plus de points.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/10">
                <Award className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-foreground">Bonus régularité</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              +10 % par objectif atteint ou dépassé (max +30 %).
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
