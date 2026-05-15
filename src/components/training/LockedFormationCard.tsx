import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, GraduationCap, Sparkles } from "lucide-react";

/**
 * Raison du verrouillage de la formation côté liste :
 *   - 'parcours'     : formation à débloquer via le parcours AL BARAKA en
 *                      complétant les étapes/formations précédentes
 *   - 'liberty_only' : formation réservée aux membres pass Liberty
 */
export type LockReason = "parcours" | "liberty_only";

interface Props {
  titre: string;
  cover_url: string | null;
  lockReason: LockReason;
  /** Label de la phase de déblocage (ex. "Phase 4 · Ton contenu — Marketing"), uniquement pour 'parcours' */
  unlockPhaseLabel?: string;
  onClickLocked: () => void;
}

export function LockedFormationCard({
  titre,
  cover_url,
  lockReason,
  unlockPhaseLabel,
  onClickLocked,
}: Props) {
  const isLiberty = lockReason === "liberty_only";

  // Badge en haut à droite de la cover :
  //   - parcours : la phase de déblocage si elle est connue
  //   - liberty  : tag "Liberty" doré pour bien marquer la distinction
  const cornerBadge = isLiberty ? (
    <Badge
      variant="secondary"
      className="text-[10px] backdrop-blur bg-amber-500/20 text-amber-300 border-amber-500/40"
    >
      <Sparkles className="h-3 w-3 mr-1" />
      Liberty
    </Badge>
  ) : unlockPhaseLabel ? (
    <Badge variant="secondary" className="text-xs backdrop-blur">
      {unlockPhaseLabel}
    </Badge>
  ) : null;

  // Sous-titre court sur la carte (le détail complet est dans la modale au clic)
  const subtitle = isLiberty
    ? "Réservée aux membres Liberty"
    : "Termine les étapes précédentes pour la débloquer";

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
        {cornerBadge && <div className="absolute top-2 right-2">{cornerBadge}</div>}
      </div>
      <CardContent className="p-4 space-y-1">
        <h3 className="font-medium text-foreground">{titre}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
