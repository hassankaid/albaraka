import { useState } from "react";
import { useContentWizard } from "../ContentWizardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, RotateCcw, Copy, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { PublicationChecklist } from "../types";
import { ResetConfirmDialog } from "../components/ResetConfirmDialog";
import { cn } from "@/lib/utils";

const PLATFORMS: {
  key: keyof PublicationChecklist;
  label: string;
  emoji: string;
}[] = [
  { key: "instagram", label: "Instagram Reels", emoji: "📸" },
  { key: "tiktok", label: "TikTok", emoji: "🎵" },
  { key: "youtube_shorts", label: "YouTube Shorts", emoji: "📺" },
  { key: "facebook", label: "Facebook Reels", emoji: "👥" },
];

export function Step5Publication() {
  const { state, togglePublicationPlatform, goToStep, reset } =
    useContentWizard();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const copyDescription = () => {
    if (state.description?.full_text) {
      navigator.clipboard.writeText(state.description.full_text);
      toast.success("Description copiée !");
    }
  };

  const handleResetConfirm = () => {
    reset();
    setResetDialogOpen(false);
    toast.success("Wizard réinitialisé");
  };

  const publishedCount = Object.values(state.publicationChecklist).filter(
    Boolean
  ).length;
  const allPublished = publishedCount === PLATFORMS.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🚀 Étape 5 — Publication</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ton contenu est prêt. Coche chaque plateforme au fur et à mesure
            que tu publies.
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
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Plateformes</p>
              <p className="text-xs text-muted-foreground">
                {publishedCount} / {PLATFORMS.length} publié
                {publishedCount > 1 ? "es" : ""}
              </p>
            </div>
            <div className="space-y-2">
              {PLATFORMS.map((p) => {
                const isChecked = state.publicationChecklist[p.key];
                return (
                  <button
                    key={p.key}
                    onClick={() => togglePublicationPlatform(p.key)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                      isChecked
                        ? "bg-green-500/5 border-green-500/30"
                        : "bg-card border-border hover:bg-muted/50"
                    )}
                  >
                    <Checkbox checked={isChecked} />
                    <span>{p.emoji}</span>
                    <span className={`flex-1 text-sm ${isChecked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {allPublished && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-center space-y-2">
              <PartyPopper className="h-8 w-8 text-primary mx-auto" />
              <p className="font-semibold text-foreground">Bravo !</p>
              <p className="text-sm text-muted-foreground">
                Ton contenu est publié sur toutes les plateformes.
                BarakAllahou fik pour ton travail.
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
        <Button
          onClick={() => setResetDialogOpen(true)}
          variant="destructive"
          className="flex-1"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Nouveau contenu
        </Button>
      </div>

      <ResetConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        onConfirm={handleResetConfirm}
      />
    </div>
  );
}
