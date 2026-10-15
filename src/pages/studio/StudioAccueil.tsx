// Studio vidéo : accueil (les deux outils) et « Mes vidéos ».
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { BookOpen, Camera, Clock, Database, FileDown, Film, Mic, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useMesMontages } from "@/hooks/useStudio";
import { BandeauQuota } from "@/components/studio/QuotaStudio";
import { enTraitement, LIBELLE_STATUT, lienDuMontage, type Montage } from "@/lib/studio/reglages";
import { supabase } from "@/integrations/supabase/client";
import { STOCKAGE_RESSOURCES } from "@/lib/ressourcesFormation";

// Guide élève du Studio (Sidali, 15/10/2026) : le même fichier que la ressource
// « Guide du Studio » du chapitre « Tes outils d'affilié » (parcours Setting/Closing).
// Si Sidali remplace ce fichier dans le chapitre, reporter ici le nouveau chemin.
const GUIDE_STUDIO = "ce381f21-5340-40f4-b51b-cf7d425e4579/6037b242-Guide-du-Studio.pdf";

function BoutonGuide() {
  const [envoi, setEnvoi] = useState(false);
  async function telecharger() {
    setEnvoi(true);
    try {
      const { data, error } = await supabase.storage
        .from(STOCKAGE_RESSOURCES)
        .createSignedUrl(GUIDE_STUDIO, 300, { download: "Guide du Studio AL BARAKA.pdf" });
      if (error || !data?.signedUrl) throw error ?? new Error("lien indisponible");
      window.location.assign(data.signedUrl);
    } catch {
      toast.error("Le guide n'a pas pu être téléchargé. Réessaie dans un instant.");
    } finally {
      setEnvoi(false);
    }
  }
  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={telecharger} disabled={envoi} data-testid="bouton-guide-studio">
      {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Guide du Studio
    </Button>
  );
}

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
  const { user, profile } = useAuth();
  const estCeo = profile?.role === "ceo";
  const { data: montages, isLoading } = useMesMontages(user?.id);
  const visibles = (montages ?? []).filter((m) => m.statut !== "import");

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl text-foreground">Studio</h1>
          <p className="text-sm text-muted-foreground">
            Des vidéos 9:16 prêtes à publier, sans toucher au montage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BoutonGuide />
          {estCeo && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/studio/banque">
                <Database className="h-4 w-4" /> Banque de vidéos
              </Link>
            </Button>
          )}
          {/* Sidali (13/10/2026) : la bibliothèque doit être bien visible, en haut à droite. */}
          <Button asChild size="sm" className="gap-2" data-testid="bouton-bibliotheque-scripts">
            <Link to="/studio/scripts">
              <BookOpen className="h-4 w-4" /> Bibliothèque de scripts
            </Link>
          </Button>
        </div>
      </header>

      <BandeauQuota />

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
        <Card className="border-primary/40">
          <CardContent className="flex h-full flex-col gap-4 p-6">
            <Mic className="h-8 w-8 text-primary" />
            <div className="flex-1 space-y-1">
              <h2 className="text-xl font-semibold text-foreground">Voix off</h2>
              <p className="text-sm text-muted-foreground">
                Lis ton script au micro : l'IA monte des plans de la banque AL BARAKA choisis selon tes mots.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link to="/studio/voix-off">Commencer</Link>
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
