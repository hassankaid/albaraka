import { Button } from "@/components/ui/button";
import { Save, Library, Check, Loader2, AlertCircle } from "lucide-react";
import { useContentWizard } from "../ContentWizardContext";
import { useWizardAutoSave } from "../hooks/useWizardAutoSave";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect, useState } from "react";

export function WizardHeader() {
  const { state } = useContentWizard();
  const { saveNow, isSaving } = useWizardAutoSave();
  const [relativeTime, setRelativeTime] = useState("");

  useEffect(() => {
    const updateRelativeTime = () => {
      if (state.lastSavedAt) {
        setRelativeTime(
          formatDistanceToNow(new Date(state.lastSavedAt), {
            addSuffix: true,
            locale: fr,
          })
        );
      }
    };
    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 30000);
    return () => clearInterval(interval);
  }, [state.lastSavedAt]);

  const renderSaveIndicator = () => {
    if (isSaving || state.saveState === "saving") {
      return (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin" />
          Sauvegarde…
        </span>
      );
    }
    if (state.saveState === "error") {
      return (
        <span className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          Erreur de sauvegarde
        </span>
      );
    }
    if (state.saveState === "saved" && state.lastSavedAt) {
      return (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="h-3 w-3 text-green-500" />
          Sauvegardé {relativeTime}
        </span>
      );
    }
    return null;
  };

  const canSave = !!state.selectedIdea;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">🎬 Générateur de Contenu</h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-muted-foreground">
            De l'idée à la publication en 5 étapes guidées
          </p>
          {renderSaveIndicator()}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/working/contents">
            <Library className="h-4 w-4 mr-2" />
            Mes contenus
          </Link>
        </Button>
        <Button size="sm" onClick={saveNow} disabled={!canSave || isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Sauvegarder
        </Button>
      </div>
    </div>
  );
}
