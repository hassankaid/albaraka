import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { CopyButton } from "./CopyButton";

interface Props {
  promptText: string;
  unlocked: boolean;
  confirmedForCurrentCycle: boolean;
  isNewCycle: boolean;
  onConfirm: () => void;
  confirming: boolean;
}

export default function Step2Prompt({
  promptText,
  unlocked,
  confirmedForCurrentCycle,
  isNewCycle,
  onConfirm,
  confirming,
}: Props) {
  const [checked, setChecked] = useState(confirmedForCurrentCycle);
  const isConfirmed = confirmedForCurrentCycle;

  if (!unlocked) {
    return (
      <Card id="step-2" className="opacity-50">
        <CardContent className="p-6 space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">
              2
            </span>
            <h2 className="font-heading text-xl text-muted-foreground">
              Ton brief personnalisé
            </h2>
          </div>
          <p className="text-xs text-muted-foreground pl-7">
            Valide d'abord l'étape 1 pour débloquer ton brief sur mesure.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="step-2" className="border-primary/30 bg-primary/[0.03]">
      <CardContent className="p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              2
            </span>
            <h2 className="font-heading text-xl text-foreground">Ton brief personnalisé</h2>
            {isConfirmed && (
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" /> Validé
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Voici ce que la plateforme a compris de toi. Elle s'en sert
            automatiquement pour générer tout ton contenu à l'étape 3 —
            aucun outil externe (Claude, ChatGPT…) nécessaire.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background/50 p-4 max-h-[400px] overflow-y-auto">
          <pre className="font-mono text-[11px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {promptText}
          </pre>
        </div>

        <div className="flex justify-center">
          <CopyButton
            text={promptText}
            label="Copier mon brief (optionnel)"
            variant="ghost"
          />
        </div>

        {!isConfirmed && (
          <div className="rounded-lg border border-primary/30 bg-primary/[0.05] p-4 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => setChecked(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground leading-relaxed">
                {isNewCycle
                  ? "Mon brief est toujours d'actualité pour ce nouveau cycle."
                  : "Mon brief me correspond."}
              </span>
            </label>
            <Button
              onClick={onConfirm}
              disabled={!checked || confirming}
              className="w-full gap-2"
            >
              {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
              {isNewCycle ? "Confirmer pour ce cycle" : "Valider et débloquer l'étape 3"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
