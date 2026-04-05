import { useState } from "react";
import { useContentWizard } from "../ContentWizardContext";
import { FORMATS } from "../constants";
import { buildScriptPrompt, extractJsonFromResponse } from "../lib/claude-prompts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Copy, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function Step2Script() {
  const { state, setScript, goToStep } = useContentWizard();
  const [loading, setLoading] = useState(false);

  if (!state.selectedIdea) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <p className="text-muted-foreground">
            ⚠️ Tu dois d'abord sélectionner une idée à l'étape 1.
          </p>
          <Button variant="outline" onClick={() => goToStep(1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'étape 1
          </Button>
        </CardContent>
      </Card>
    );
  }

  const format = FORMATS.find((f) => f.id === state.format);

  const generateScript = async () => {
    if (!state.selectedIdea) return;
    setLoading(true);
    try {
      const prompt = buildScriptPrompt(
        state.format,
        state.selectedIdea.titre,
        state.selectedIdea.accroche
      );
      const { data, error } = await supabase.functions.invoke(
        "claude-content-generator",
        { body: { prompt } }
      );

      if (error) throw error;
      if (!data?.response) throw new Error("Réponse vide");

      const parsed = extractJsonFromResponse(data.response);
      if (!parsed.script) throw new Error("Format invalide");

      setScript(parsed.script);
      toast.success("Script généré !");
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur : " + (e.message || "inconnue"));
    } finally {
      setLoading(false);
    }
  };

  const copyFullScript = () => {
    if (state.script?.full_text) {
      navigator.clipboard.writeText(state.script.full_text);
      toast.success("Script copié !");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">✍️ Étape 2 — Générer le script</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Contexte
            </p>
            <p className="text-sm text-foreground">
              Format : {format?.emoji}{" "}
              <span className="font-medium">{format?.label}</span>
            </p>
            <p className="text-sm text-foreground">
              Idée :{" "}
              <span className="font-medium">{state.selectedIdea.titre}</span>
            </p>
            <p className="text-sm text-muted-foreground italic">
              "{state.selectedIdea.accroche}"
            </p>
          </div>

          <Button onClick={generateScript} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Rédaction en cours…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {state.script ? "Regénérer le script" : "Générer le script"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {state.script && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">📄 Script généré</CardTitle>
            <Button variant="outline" size="sm" onClick={copyFullScript}>
              <Copy className="h-4 w-4 mr-2" />
              Copier tout
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScriptSection title="🎯 HOOK" content={state.script.hook} />
            <KeywordsPexels keywords={state.script.keywords_pexels_1} label="B-rolls Hook" />
            <ScriptSection title="💎 VALEUR" content={state.script.valeur} />
            <KeywordsPexels keywords={state.script.keywords_pexels_2} label="B-rolls Valeur" />
            <ScriptSection title="📢 CTA" content={state.script.cta} />
            <KeywordsPexels keywords={state.script.keywords_pexels_3} label="B-rolls CTA" />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => goToStep(1)} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Étape précédente
        </Button>
        {state.script && (
          <Button onClick={() => goToStep(3)} className="flex-1">
            Étape suivante
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ScriptSection({ title, content }: { title: string; content: string }) {
  const copy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Copié !");
  };
  return (
    <div className="p-4 rounded-lg bg-muted/50 border">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-sm text-foreground">{title}</p>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copy}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-sm text-foreground whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function KeywordsPexels({
  keywords,
  label,
}: {
  keywords: string[];
  label: string;
}) {
  const handleClick = (e: React.MouseEvent, keyword: string) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `https://www.pexels.com/search/videos/${encodeURIComponent(keyword)}/`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-2">
      <span className="text-xs text-muted-foreground">{label} :</span>
      {keywords.map((kw, i) => (
        <button
          key={i}
          onClick={(e) => handleClick(e, kw)}
          className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer border border-primary/20 hover:border-primary/40"
        >
          🔍 {kw}
        </button>
      ))}
    </div>
  );
}
