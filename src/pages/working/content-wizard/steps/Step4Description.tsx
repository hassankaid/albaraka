import { useState } from "react";
import { useContentWizard } from "../ContentWizardContext";
import {
  buildDescriptionPrompt,
  extractJsonFromResponse,
} from "../lib/claude-prompts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Copy, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function Step4Description() {
  const { state, setDescription, goToStep } = useContentWizard();
  const [loading, setLoading] = useState(false);

  if (!state.selectedIdea || !state.script) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <p className="text-muted-foreground">
            ⚠️ Tu dois d'abord générer un script à l'étape 2.
          </p>
          <Button variant="outline" onClick={() => goToStep(2)}>Aller à l'étape 2</Button>
        </CardContent>
      </Card>
    );
  }

  const generateDescription = async () => {
    if (!state.selectedIdea || !state.script) return;
    setLoading(true);
    try {
      const prompt = buildDescriptionPrompt(
        state.selectedIdea.titre,
        state.script.hook,
        state.script.cta
      );
      const { data, error } = await supabase.functions.invoke(
        "claude-content-generator",
        { body: { prompt } }
      );

      if (error) throw error;
      if (!data?.response) throw new Error("Réponse vide");

      const parsed = extractJsonFromResponse(data.response);
      if (!parsed.description) throw new Error("Format invalide");

      setDescription(parsed.description);
      toast.success("Description générée !");
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur : " + (e.message || "inconnue"));
    } finally {
      setLoading(false);
    }
  };

  const copyAll = () => {
    if (state.description?.full_text) {
      navigator.clipboard.writeText(state.description.full_text);
      toast.success("Copié !");
    }
  };

  const copyHashtags = () => {
    if (state.description?.hashtags) {
      navigator.clipboard.writeText(state.description.hashtags.join(" "));
      toast.success("Hashtags copiés !");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📄 Étape 4 — Description</CardTitle>
          <p className="text-sm text-muted-foreground">
            La description sera générée en cohérence avec ton idée et ton
            script.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs font-medium text-muted-foreground">Contexte utilisé</p>
            <p className="text-sm text-foreground mt-1">
              Idée : <span className="font-medium">{state.selectedIdea.titre}</span>
            </p>
          </div>

          <Button onClick={generateDescription} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Rédaction…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {state.description ? "Regénérer" : "Générer la description"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {state.description && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">📝 Description prête</CardTitle>
            <Button variant="outline" size="sm" onClick={copyAll}>
              <Copy className="h-4 w-4 mr-2" />
              Tout copier
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                ACCROCHE
              </p>
              <p className="text-sm font-medium text-foreground">{state.description.accroche}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                VALEUR
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {state.description.valeur}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">CTA</p>
              <p className="text-sm text-foreground">{state.description.cta}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  HASHTAGS
                </p>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={copyHashtags}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copier
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {state.description.hashtags.map((h, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => goToStep(3)} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Étape précédente
        </Button>
        {state.description && (
          <Button onClick={() => goToStep(5)} className="flex-1">
            Étape suivante
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
