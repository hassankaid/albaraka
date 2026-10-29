// Studio : abonnement à 10 €/mois TTC pour 5 nouvelles vidéos par jour (Sidali, 13/10/2026).
// Paiement sur la page Stripe ; au retour (?session_id=…) l'abonnement est confirmé.
import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Check, Crown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAbonnementStudio, useActionsAbonnementStudio } from "@/hooks/useStudioAcces";

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const AVANTAGES = [
  "5 nouvelles vidéos par jour au lieu d'une",
  "Le motion design complet : mot géant derrière toi, styles, bruitages",
  "Face caméra et voix off, avec toute la bibliothèque de scripts",
  "Retouches et nouveaux rendus toujours illimités",
  "Sans engagement : tu résilies en un clic",
];

export default function StudioAbonnement() {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const { data, isLoading, refetch } = useAbonnementStudio();
  const { souscrire, confirmer, resilier, reprendre } = useActionsAbonnementStudio();
  const sessionTraitee = useRef(false);

  // Retour de la page de paiement Stripe.
  useEffect(() => {
    const session = params.get("session_id");
    if (!session || sessionTraitee.current) return;
    sessionTraitee.current = true;
    confirmer
      .mutateAsync(session)
      .then(() => {
        toast({ title: "Bienvenue dans l'abonnement Studio", description: "Tu as maintenant 5 nouvelles vidéos par jour." });
        refetch();
      })
      .catch((e) => toast({ title: "Abonnement non confirmé", description: message(e), variant: "destructive" }))
      .finally(() => setParams({}, { replace: true }));
  }, [params, confirmer, refetch, setParams, toast]);

  const agir = async (action: typeof souscrire | typeof resilier, succes?: string) => {
    try {
      await action.mutateAsync();
      if (succes) toast({ title: succes });
      refetch();
    } catch (e) {
      toast({ title: "Action impossible", description: message(e), variant: "destructive" });
    }
  };

  const abo = data?.abonnement;
  const actif = !!data?.quota.abonne;
  const fin = abo?.fin_periode ? format(new Date(abo.fin_periode), "d MMMM yyyy", { locale: fr }) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <Link to="/studio" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Studio
      </Link>
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-3xl text-foreground">Abonnement Studio</h1>
        {data?.mode === "test" && <Badge variant="outline" className="border-amber-500/50 text-amber-600">mode test</Badge>}
      </div>

      {isLoading || confirmer.isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <Card className={actif ? "border-emerald-500/40" : "border-amber-500/40"} data-testid="carte-abonnement">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Crown className="h-5 w-5 text-amber-500" /> Studio AL BARAKA
                </div>
                <p className="text-sm text-muted-foreground">5 nouvelles vidéos par jour</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">10 €</div>
                <div className="text-xs text-muted-foreground">par mois, TTC</div>
              </div>
            </div>
            <ul className="space-y-1.5">
              {AVANTAGES.map((a) => (
                <li key={a} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" /> {a}
                </li>
              ))}
            </ul>

            {actif ? (
              <div className="space-y-3 rounded-lg bg-muted/40 p-4 text-sm">
                <p>
                  <b className="text-emerald-600">Tu es abonné.</b>{" "}
                  {abo?.resiliation_prevue
                    ? `Ton abonnement s'arrête le ${fin} : tu gardes tes 5 vidéos par jour jusque-là.`
                    : `Prochain renouvellement le ${fin}.`}
                </p>
                {abo?.resiliation_prevue ? (
                  <Button variant="outline" onClick={() => agir(reprendre, "Abonnement repris")} disabled={reprendre.isPending} className="gap-2">
                    {reprendre.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Garder mon abonnement
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => agir(resilier, "Résiliation enregistrée")} disabled={resilier.isPending} className="gap-2">
                    {resilier.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Résilier
                  </Button>
                )}
              </div>
            ) : (
              <Button size="lg" className="w-full gap-2" onClick={() => agir(souscrire)} disabled={souscrire.isPending} data-testid="bouton-souscrire">
                {souscrire.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                M'abonner pour 10 €/mois
              </Button>
            )}
            {!actif && <p className="text-center text-xs text-muted-foreground">Paiement sécurisé par Stripe. Sans abonnement : 1 nouvelle vidéo par jour, gratuitement, avec un motion design léger.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
