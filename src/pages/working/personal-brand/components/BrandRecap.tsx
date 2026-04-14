import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pencil, RefreshCw, Sparkles, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { BRAND_SECTIONS, type BrandAnswers } from "../lib/sections";
import { buildContentPrompt } from "../lib/buildPrompts";
import { useGenerateProfiles, type GeneratedProfile } from "../hooks/usePersonalBrand";
import { ProfileCard } from "./ProfileCard";
import { PromptExportCard } from "./PromptExportCard";
import { GeneratingOverlay } from "./GeneratingOverlay";
import { toast } from "sonner";

interface Props {
  answers: BrandAnswers;
  profiles: GeneratedProfile[] | null;
  profilesGeneratedAt: string | null;
  onEditSection: (index: number) => void;
  onEditAll: () => void;
  onRestart: () => void;
}

export function BrandRecap({
  answers,
  profiles,
  profilesGeneratedAt,
  onEditSection,
  onEditAll,
  onRestart,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const generateMutation = useGenerateProfiles();

  const hasProfiles = !!(profiles && profiles.length > 0);

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

  const generatedLabel = profilesGeneratedAt
    ? formatDistanceToNow(new Date(profilesGeneratedAt), { locale: fr, addSuffix: true })
    : null;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-[11px] tracking-[0.3em] uppercase text-primary/70">Ta fiche</p>
        <h2 className="font-heading text-2xl md:text-3xl text-foreground">
          Personal Brand
        </h2>
        <div className="w-12 h-px bg-primary/50 mx-auto my-3" />
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>
            Sauvegardée automatiquement
            {generatedLabel && <> · Générée {generatedLabel}</>}
          </span>
        </div>
      </div>

      {/* BARRE D'ACTIONS */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={onEditAll} className="gap-2">
          <Pencil className="h-4 w-4" />
          Modifier mes réponses
        </Button>
        {hasProfiles && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Régénérer les profils
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <Trash2 className="h-4 w-4" />
              Recommencer à zéro
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Recommencer à zéro ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action efface toutes tes réponses et tes 10 profils générés.
                Tu devras repartir du questionnaire vide. Tes réponses actuelles
                seront remplacées dès que tu sauvegarderas la nouvelle version.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={onRestart}>
                Oui, recommencer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
      <div id="profiles" className="space-y-5 scroll-mt-20">
        <div className="text-center space-y-1">
          <h2 className="font-heading text-2xl text-foreground">
            📱 Tes Profils Personnalisés
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {hasProfiles
              ? "10 profils uniques écrits par l'IA à partir de TON histoire."
              : "Clique pour générer 10 profils Instagram écrits sur mesure."}
          </p>
        </div>

        {!hasProfiles ? (
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
            {profiles!.map((p, i) => (
              <ProfileCard key={i} profile={p} index={i} />
            ))}
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

      {generateMutation.isPending && <GeneratingOverlay />}

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
