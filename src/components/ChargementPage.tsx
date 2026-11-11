import { Loader2 } from "lucide-react";

/**
 * Affiché pendant le téléchargement d'une page (les pages sont chargées à la
 * demande depuis le 11/11/2026). N'apparaît qu'au premier passage sur une
 * page : ensuite elle est déjà en mémoire.
 */
export function ChargementPage() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center" aria-busy="true" aria-label="Chargement">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
