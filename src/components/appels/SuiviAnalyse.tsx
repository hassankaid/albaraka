// L'analyse en cours, étape par étape (environ 3 minutes) : dans la fenêtre de dépôt et
// sur la fiche d'un appel. Le coach peut fermer : l'appel l'attend dans « À valider ».
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ETAPES_MACHINE, rangEtape } from "@/lib/appels/retour";

export function SuiviAnalyse({ etape, envoi }: { etape: string | null; envoi?: number | null }) {
  const rang = envoi != null ? -1 : rangEtape(etape);
  const lignes = [{ cle: "envoi", nom: envoi != null ? `Envoi du fichier · ${envoi} %` : "Fichier envoyé" }, ...ETAPES_MACHINE.slice(1)];
  return (
    <ol className="space-y-1.5" data-testid="suivi-analyse">
      {lignes.map((l, i) => {
        const fait = envoi != null ? false : i === 0 || i < rang;
        const actif = envoi != null ? i === 0 : i === Math.max(1, rang);
        return (
          <li key={l.cle} className="flex items-center gap-2.5 text-sm">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                fait && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
                actif && !fait && "bg-primary/15 text-primary",
                !fait && !actif && "bg-muted text-muted-foreground",
              )}
            >
              {fait ? <Check className="h-3.5 w-3.5" /> : actif ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : i + 1}
            </span>
            <span className={cn(!fait && !actif && "text-muted-foreground", actif && "font-medium")}>{l.nom}</span>
          </li>
        );
      })}
      <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{lignes.length + 1}</span>
        Prêt à valider
      </li>
    </ol>
  );
}
