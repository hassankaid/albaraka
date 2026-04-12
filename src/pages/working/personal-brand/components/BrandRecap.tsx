import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pencil, RefreshCw, Sparkles, AlertCircle } from "lucide-react";
import { BRAND_SECTIONS, type BrandAnswers } from "../lib/sections";
import { buildContentPrompt } from "../lib/buildPrompts";
import { useGenerateProfiles, type GeneratedProfile } from "../hooks/usePersonalBrand";
import { ProfileCard } from "./ProfileCard";
import { PromptExportCard } from "./PromptExportCard";
import { toast } from "sonner";

interface Props {
  answers: BrandAnswers;
  profiles: GeneratedProfile[] | null;
  onEditSection: (index: number) => void;
  onRestart: () => void;
}

export function BrandRecap({ answers, profiles, onEditSection, onRestart }: Props) {
  const [error, setError] = useState<string | null>(null);
  const generateMutation = useGenerateProfiles();

  const handleGenerate = async () => {
    setError(null);
    try {
      await generateMutation.mutateAsync(answers);
      toast.success("10 profils générés ✦");
    } catch (e: any) {
      setError("Erreur lors de la génération. Réessaie.");
    }
  };

  const g = (id: string) => {
    const v = answers[id];
    if (Array.isArray(v)) return v.join(", ");
    return (v as string) || "—";
  };

  const freq = ((answers.frequence as string) || "").split("(")[0].trim() || "—";
  const promptText = buildContentPrompt(answers);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <div className="text-center space-y-2">
        <p className="text-[11px] tracking-[0.3em] uppercase text-primary/70">AL BARAKA</p>
        <h1 className="font-heading text-3xl md:text-4xl text-foreground">
          Ta Fiche Personal Brand
        </h1>
        <div className="w-16 h-px bg-primary/50 mx-auto my-4" />
      </div>

      {/* 6 SECTIONS RÉCAP */}
      {BRAND_SECTIONS.map((section, idx) => (
        <Card key={section.id}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl text-primary">
                {section.icon} {section.title}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditSection(idx)}
                className="gap-1.5 h-7 text-xs"
              >
                <Pencil className="h-3.5 w-3.5" />
                Modifier
              </Button>
            </div>
            <Separator />
            <dl className="space-y-2.5">
              {section.questions.map((q) => {
                const value =
                  q.id === "frequence" ? freq : g(q.id);
                if (!value || value === "—") return null;
                return (
                  <div key={q.id}>
                    <dt className="text-[10px] uppercase tracking-wider text-primary/70">
                      {q.label.split(/[?(]/)[0].trim()}
                    </dt>
                    <dd className="text-sm text-foreground mt-0.5 whitespace-pre-wrap leading-relaxed">
                      {value}
                    </dd>
                  </div>
                );
              })}
              {section.id === "profil_prefs" && (
                <p className="text-xs italic text-muted-foreground pt-1">
                  ℹ️ Le lien en bio sera le tunnel de vente fourni par AL BARAKA.
                </p>
              )}
            </dl>
          </CardContent>
        </Card>
      ))}

      {/* PROFILS */}
      <div className="space-y-5">
        <div className="text-center space-y-1">
          <h2 className="font-heading text-2xl text-foreground">
            📱 Tes Profils Personnalisés
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {profiles && profiles.length > 0
              ? "10 profils uniques écrits par l'IA à partir de TON histoire."
              : "Clique pour générer 10 profils Instagram écrits sur mesure."}
          </p>
        </div>

        {!profiles || profiles.length === 0 ? (
          <div className="flex justify-center">
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="gap-2"
              size="lg"
            >
              <Sparkles className="h-4 w-4" />
              {generateMutation.isPending ? "L'IA écrit tes profils..." : "Générer mes 10 profils"}
            </Button>
          </div>
        ) : (
          <>
            {profiles.map((p, i) => (
              <ProfileCard key={i} profile={p} index={i} />
            ))}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Régénérer 10 nouveaux profils
              </Button>
            </div>
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-rose-500 justify-center">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>

      {/* PROMPT PERSONNALISÉ */}
      <PromptExportCard promptText={promptText} />

      <div className="text-center pt-4">
        <Button variant="ghost" size="sm" onClick={onRestart} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refaire le questionnaire
        </Button>
      </div>

      <div className="text-center pt-8 pb-4 space-y-1">
        <div className="w-12 h-px bg-primary/30 mx-auto mb-3" />
        <p className="text-[11px] tracking-[0.3em] uppercase text-primary/70">
          AL BARAKA — Écosystème by EthicArena
        </p>
        <p className="text-xs italic text-muted-foreground">
          « Gagne ta liberté. Garde ta foi. C'est ça la vraie baraka. »
        </p>
      </div>
    </div>
  );
}
