// La carte « Crédit IA » de l'accueil du Studio, réservée au CEO (panne du 19/10/2026) :
// le crédit OpenRouter restant (mesuré à chaque montage), combien de montages il permet
// encore, ce que le Studio a coûté depuis le début du suivi complet. Une alerte arrive dans les notifications
// quand le crédit passe sous le seuil.
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { COUT_ESTIME, dollars, etatCredit, montagesRestants, type SuiviIA } from "@/lib/studio/creditIA";

// studio_suivi_ia est absente des types générés (migration 20261019200000)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const RECHARGER = "https://openrouter.ai/settings/credits";

export function CreditIA() {
  const { data } = useQuery({
    queryKey: ["studio-suivi-ia"],
    staleTime: 60_000,
    queryFn: async (): Promise<SuiviIA | null> => {
      const { data, error } = await db.rpc("studio_suivi_ia");
      if (error) throw error;
      return data as SuiviIA | null;
    },
  });
  if (!data) return null;
  const etat = etatCredit(data);
  const restants = montagesRestants(data);
  const depuis = data.depuis ? new Date(data.depuis).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—";
  const mesure = data.credit?.mesure_le
    ? new Date(data.credit.mesure_le).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Card
      className={cn(
        etat === "ok" && "border-border",
        etat === "bas" && "border-amber-500/60 bg-amber-500/5",
        etat === "epuise" && "border-red-500/60 bg-red-500/10",
      )}
      data-testid="credit-ia"
    >
      <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 p-4">
        <div className="flex items-center gap-3">
          {etat === "ok" || etat === "inconnu" ? (
            <Sparkles className="h-5 w-5 text-primary" />
          ) : (
            <AlertTriangle className={cn("h-5 w-5", etat === "bas" ? "text-amber-400" : "text-red-400")} />
          )}
          <div>
            <p className="text-xs text-muted-foreground">Crédit IA (OpenRouter) · visible par l'équipe seulement</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {dollars(data.credit?.reste)}
              {restants && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ≈ {restants.n} montages{restants.estime ? " (estimation)" : ""}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="text-sm">
          <p className="text-xs text-muted-foreground">Dépensé depuis le {depuis}</p>
          <p className="tabular-nums text-foreground">
            {dollars(data.depense)} · {data.montages} montage{data.montages > 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-sm">
          <p className="text-xs text-muted-foreground">Coût moyen d'un montage</p>
          <p className="tabular-nums text-foreground">
            {data.cout_moyen ? dollars(data.cout_moyen) : `≈ ${dollars(COUT_ESTIME)} (estimation)`}
          </p>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1">
          <Button asChild size="sm" variant={etat === "ok" ? "outline" : "default"} className="gap-1.5">
            <a href={RECHARGER} target="_blank" rel="noreferrer">
              Recharger <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
          <p className="text-[11px] text-muted-foreground">
            {etat === "epuise"
              ? "Épuisé : les montages échouent."
              : etat === "bas"
                ? `Sous le seuil d'alerte (${dollars(data.seuil)}).`
                : `Alerte sous ${dollars(data.seuil)}${mesure ? ` · mesuré le ${mesure}` : ""}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
