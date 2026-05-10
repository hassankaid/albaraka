import { Card } from "@/components/ui/card";
import { Briefcase, Sparkles } from "lucide-react";
import type { BrandMode } from "../lib/sections";

interface Props {
  onSelect: (mode: BrandMode) => void;
  canSwitchLater?: boolean;
}

/**
 * Page de sélection du mode quand l'utilisateur a accès aux deux passes
 * (cas CEO/collab, ou un membre qui a les 2 passes — rare).
 * Pour un membre Pass seul ou Liberty seul, ce composant n'est jamais
 * affiché : le mode est déduit automatiquement.
 */
export default function ModeSelector({ onSelect, canSwitchLater }: Props) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6">
      <div className="text-center space-y-2">
        <p className="text-xs tracking-[0.3em] uppercase text-primary">Personal Brand</p>
        <h1 className="font-heading text-3xl text-foreground">
          Sur quel parcours veux-tu créer ton contenu ?
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Tu as accès aux deux interfaces. Choisis celle sur laquelle tu veux
          travailler{canSwitchLater ? " — tu pourras toujours basculer plus tard" : ""}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          onClick={() => onSelect("pass")}
          className="cursor-pointer p-6 hover:border-primary transition-colors space-y-3 group"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-heading text-xl text-foreground">Apporteur d'affaires</h2>
          </div>
          <p className="text-sm font-medium text-foreground">Pass AL BARAKA</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Crée du contenu pour <strong className="text-foreground">promouvoir l'écosystème AL BARAKA</strong>.
            Scripts orientés recrutement et vente des offres AL BARAKA, CTA vers le tunnel.
          </p>
        </Card>

        <Card
          onClick={() => onSelect("liberty")}
          className="cursor-pointer p-6 hover:border-primary transition-colors space-y-3 group"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-heading text-xl text-foreground">Mon Offre</h2>
          </div>
          <p className="text-sm font-medium text-foreground">Parcours Liberty</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Crée du contenu pour vendre <strong className="text-foreground">ton propre produit ou service</strong>.
            Scripts orientés ta cible, ton offre, CTA vers ton mode d'accès choisi.
          </p>
        </Card>
      </div>
    </div>
  );
}
