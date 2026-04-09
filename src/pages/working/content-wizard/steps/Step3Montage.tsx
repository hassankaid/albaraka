import { useContentWizard } from "../ContentWizardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";

const MONTAGE_STEPS: {
  label: string;
  description: string;
  emoji: string;
}[] = [
  {
    label: "Télécharger les vidéos Pexels",
    description:
      "Utilise les mots-clés de l'étape 2 pour télécharger les B-rolls depuis pexels.com",
    emoji: "⬇️",
  },
  {
    label: "Monter dans CapCut ou VN",
    description:
      "Assemble tes clips en 60-90 secondes. Coupe ce qui traîne, garde le rythme.",
    emoji: "📱",
  },
  {
    label: "Enregistrer la voix off",
    description:
      "Lis le script naturellement. Pas de ton robotique. Respire entre les phrases.",
    emoji: "🎙️",
  },
  {
    label: "Ajouter les sous-titres",
    description:
      "CapCut génère les sous-titres automatiquement en français. Vérifie les fautes.",
    emoji: "📝",
  },
];

export function Step3Montage() {
  const { goToStep } = useContentWizard();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📱 Étape 3 — Montage</CardTitle>
          <p className="text-sm text-muted-foreground">
            Suis ces 4 étapes pour tourner et monter ton contenu.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {MONTAGE_STEPS.map((step, index) => (
            <div
              key={step.label}
              className="flex items-start gap-3 p-4 rounded-lg border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span>{step.emoji}</span>
                  <span className="font-medium text-sm text-foreground">
                    {index + 1}. {step.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {step.description}
                </p>
              </div>
            </div>
          ))}

          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-foreground mb-2">🔗 Liens utiles</p>
            <div className="flex gap-3">
              <a
                href="https://www.pexels.com/videos/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                Pexels <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://www.capcut.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                CapCut <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => goToStep(2)} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Étape précédente
        </Button>
        <Button onClick={() => goToStep(4)} className="flex-1">
          Étape suivante
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
