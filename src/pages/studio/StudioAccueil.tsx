// Studio vidéo : accueil (les deux outils) et « Mes vidéos ».
import { Link } from "react-router-dom";
import { Camera, Clock, Film, Mic, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useMesMontages } from "@/hooks/useStudio";
import { enTraitement, LIBELLE_STATUT, lienDuMontage, type Montage } from "@/lib/studio/reglages";

const COULEUR_STATUT: Record<Montage["statut"], string> = {
  import: "bg-muted text-muted-foreground",
  preparation: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  pret: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  en_cours: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  termine: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  erreur: "bg-red-500/15 text-red-300 border-red-500/30",
};

function joursRestants(expire: string) {
  return Math.max(0, Math.ceil((new Date(expire).getTime() - Date.now()) / 86400000));
}

export default function StudioAccueil() {
  const { user } = useAuth();
  const { data: montages, isLoading } = useMesMontages(user?.id);
  const visibles = (montages ?? []).filter((m) => m.statut !== "import");

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="font-heading text-3xl text-foreground">Studio</h1>
        <p className="text-sm text-muted-foreground">
          Des vidéos 9:16 prêtes à publier, sans toucher au montage.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-primary/40">
          <CardContent className="flex h-full flex-col gap-4 p-6">
            <Camera className="h-8 w-8 text-primary" />
            <div className="flex-1 space-y-1">
              <h2 className="text-xl font-semibold text-foreground">Face caméra</h2>
              <p className="text-sm text-muted-foreground">
                Importe ta vidéo : l'IA coupe les blancs et les phrases ratées, nettoie le son, ajoute les sous-titres et
                floute ton visage si tu le veux.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link to="/studio/face-camera">Commencer</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="opacity-70">
          <CardContent className="flex h-full flex-col gap-4 p-6">
            <Mic className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1 space-y-1">
              <h2 className="text-xl font-semibold text-foreground">Voix off</h2>
              <p className="text-sm text-muted-foreground">
                Lis ton script au micro : l'IA monte des plans de la banque AL BARAKA choisis selon tes mots.
              </p>
            </div>
            <Button disabled variant="outline" className="w-full">
              Bientôt
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Film className="h-5 w-5" /> Mes vidéos
        </h2>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : visibles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune vidéo pour l'instant.</p>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border">
            {visibles.map((m) => (
              <Link
                key={m.id}
                to={lienDuMontage(m)}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                data-testid="ligne-montage"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{m.source_nom ?? "Vidéo"}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · supprimée
                    dans {joursRestants(m.expire_le)} j
                  </p>
                </div>
                <Badge variant="outline" className={COULEUR_STATUT[m.statut]}>
                  {enTraitement(m) ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : null}
                  {enTraitement(m) ? LIBELLE_STATUT.en_cours : LIBELLE_STATUT[m.statut]}
                </Badge>
              </Link>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Chaque vidéo reste 30 jours dans ton espace, puis elle est supprimée.</p>
      </section>
    </div>
  );
}
