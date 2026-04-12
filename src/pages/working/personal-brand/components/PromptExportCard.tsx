import { Card, CardContent } from "@/components/ui/card";
import { Rocket } from "lucide-react";
import { CopyButton } from "./CopyButton";

interface Props {
  promptText: string;
}

export function PromptExportCard({ promptText }: Props) {
  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-card">
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-xl text-primary">Ton Prompt Personnalisé</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Copie ce prompt et colle-le dans Claude ou ChatGPT :
        </p>
        <ul className="text-xs leading-relaxed pl-5 list-disc text-foreground space-y-1">
          <li><strong>30 scripts de Reels complets</strong> — écrits avec TA voix, TON histoire</li>
          <li><strong>365 idées de stories</strong> — planning mois par mois sur 1 an</li>
        </ul>
        <p className="text-[11px] italic text-muted-foreground">
          💡 Réutilisable chaque mois pour 30 nouveaux scripts.
        </p>
        <div className="rounded-lg bg-background/70 border p-4 max-h-60 overflow-y-auto">
          <pre className="text-[11px] whitespace-pre-wrap leading-relaxed text-foreground/80 font-sans">
            {promptText}
          </pre>
        </div>
        <div className="flex justify-center pt-1">
          <CopyButton text={promptText} label="Copier le prompt complet" size="default" className="h-9 text-sm" />
        </div>
      </CardContent>
    </Card>
  );
}
