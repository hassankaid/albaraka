import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, GraduationCap } from "lucide-react";

interface Props {
  titre: string;
  cover_url: string | null;
  unlockPhaseLabel?: string;
  onClickLocked: () => void;
}

export function LockedFormationCard({ titre, cover_url, unlockPhaseLabel, onClickLocked }: Props) {
  return (
    <Card
      className="overflow-hidden flex flex-col cursor-pointer transition-colors opacity-70 hover:opacity-95"
      onClick={onClickLocked}
    >
      <div className="relative h-40 bg-muted">
        {cover_url ? (
          <img src={cover_url} alt={titre} className="w-full h-full object-cover grayscale" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
          <div className="p-3 rounded-full bg-background/90 border">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
        {unlockPhaseLabel && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-xs backdrop-blur">
              {unlockPhaseLabel}
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-1">
        <h3 className="font-medium text-foreground">{titre}</h3>
        <p className="text-xs text-muted-foreground">
          Se débloque depuis ton parcours.
        </p>
      </CardContent>
    </Card>
  );
}
