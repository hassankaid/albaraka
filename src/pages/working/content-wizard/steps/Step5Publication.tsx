import { useContentWizard } from "../ContentWizardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, RotateCcw, Copy, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { PublicationChecklist } from "../types";

const PLATFORMS: {
  key: keyof PublicationChecklist;
  label: string;
  emoji: string;
  url: string;
}[] = [
  {
    key: "instagram",
    label: "Instagram Reels",
    emoji: "📸",
    url: "https://instagram.com",
  },
  { key: "tiktok", label: "TikTok", emoji: "🎵", url: "https://tiktok.com" },
  {
    key: "youtube_shorts",
    label: "YouTube Shorts",
    emoji: "📺",
    url: "https://youtube.com",
  },
  {
    key: "facebook",
    label: "Facebook Reels",
    emoji: "👥",
    url: "https://facebook.com",
  },
];

export function Step5Publication() {
  const { state, togglePublicationPlatform, goToStep, reset } =
    useContentWizard();

  const copyDescription = () => {
    if (state.description?.full_text) {
      navigator.clipboard.writeText(state.description.full_text);
      toast.success("Description copiée !");
    }
  };

  const handleReset = () => {
    if (
      confirm(
        "Reset complet du wizard ? Tu perdras toutes les données de cette session."
      )
    ) {
      reset();
      toast.success("Wizard réinitialisé");
    }
  };

  const publishedCount = Object.values(state.publicationChecklist).filter(
    Boolean
  ).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🚀 Étape 5 — Publication</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ton contenu est prêt. Coche les plateformes au fur et à mesure.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.selectedIdea && (
            <div className="p-4 rounded-lg bg-muted/50 border space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Ton contenu
              </p>
              <p className="font-medium text-foreground">{state.selectedIdea.titre}</p>
              <p className="text-sm text-muted-foreground italic">
                {state.selectedIdea.accroche}
              </p>
            </div>
          )}

          {state.description && (
            <Button variant="outline" className="w-full" onClick={copyDescription}>
              <Copy className="h-4 w-4 mr-2" />
              Copier la description complète
            </Button>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Publier sur :</p>
            {PLATFORMS.map((p) => {
              const isChecked = state.publicationChecklist[p.key];
              return (
                <div
                  key={p.key}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => togglePublicationPlatform(p.key)}
                >
                  <Checkbox checked={isChecked} />
                  <span>{p.emoji}</span>
                  <span className={`flex-1 text-sm ${isChecked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {p.label}
                  </span>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ouvrir →
                  </a>
                </div>
              );
            })}
          </div>

          {publishedCount === PLATFORMS.length && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-center space-y-2">
              <PartyPopper className="h-8 w-8 text-primary mx-auto" />
              <p className="font-semibold text-foreground">Bravo !</p>
              <p className="text-sm text-muted-foreground">
                Ton contenu est publié sur toutes les plateformes.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => goToStep(4)} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Étape précédente
        </Button>
        <Button variant="secondary" onClick={handleReset} className="flex-1">
          <RotateCcw className="h-4 w-4 mr-2" />
          Nouveau contenu
        </Button>
      </div>
    </div>
  );
}
