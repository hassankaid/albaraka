import { Phase } from "@/lib/closing/phases";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  phase: Phase;
  currentWeek: number;
}

export function PhaseHeader({ phase, currentWeek }: Props) {
  return (
    <Card className="border-[#C9A84C]/30 bg-gradient-to-br from-black/5 to-transparent">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#C9A84C] mb-1">
              Phase {phase.id} · {phase.range}
            </div>
            <h3 className="font-serif text-xl sm:text-2xl text-foreground">{phase.name}</h3>
          </div>
          <Badge variant="outline" className="border-[#C9A84C]/40 text-[#C9A84C]">
            Semaine {currentWeek}/12
          </Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="text-muted-foreground">Cible conversion :</span>
          <span className="text-foreground font-medium">{phase.target}</span>
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground list-disc list-inside">
          {phase.goals.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
