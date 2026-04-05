import { useState } from "react";
import { useContentWizard } from "../ContentWizardContext";
import { THEMES, FORMATS } from "../constants";
import { buildIdeasPrompt, extractJsonFromResponse } from "../lib/claude-prompts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ContentIdea } from "../types";

export function Step1Idea() {
  const { state, setFormat, setTheme, setIdeas, selectIdea, goToStep } =
    useContentWizard();
  const [loading, setLoading] = useState(false);

  const generateIdeas = async () => {
    setLoading(true);
    try {
      const prompt = buildIdeasPrompt(state.format, state.theme);
      const { data, error } = await supabase.functions.invoke(
        "claude-content-generator",
        { body: { prompt } }
      );

      if (error) throw error;
      if (!data?.response) throw new Error("Réponse vide de l'API");

      const parsed = extractJsonFromResponse(data.response);
      if (!parsed.ideas || !Array.isArray(parsed.ideas)) {
        throw new Error("Format de réponse invalide");
      }

      setIdeas(parsed.ideas);
      toast.success("5 idées générées !");
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur : " + (e.message || "inconnue"));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIdea = (idea: ContentIdea) => {
    selectIdea(idea);
    toast.success("Idée sélectionnée !");
    setTimeout(() => goToStep(2), 500);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            💡 Étape 1 — Choisir une idée
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Sélectionne un format et un thème, génère 5 idées, puis clique sur
            celle qui te parle le plus.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Format de la vidéo</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-all",
                    state.format === f.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="text-lg">{f.emoji}</div>
                  <div className="font-medium text-sm text-foreground">{f.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Thème du contenu</Label>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "px-3 py-2 rounded-full border text-sm transition-all",
                    state.theme === t.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={generateIdeas} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Génération des idées…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {state.ideas.length > 0
                  ? "Regénérer 5 nouvelles idées"
                  : "Générer 5 idées"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {state.ideas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              ✨ Choisis ton idée préférée
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {state.ideas.map((idea, index) => {
                const isSelected = state.selectedIdea?.titre === idea.titre;
                return (
                  <button
                    key={index}
                    onClick={() => handleSelectIdea(idea)}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border-2 transition-all",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{idea.titre}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {idea.accroche}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0 mt-1">
                          <Check className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
