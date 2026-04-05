import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, Copy, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { AgentObjection } from "./objections";

export function ObjectionCard({ objection }: { objection: AgentObjection }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(objection.bonne_reponse);
    toast.success("Réponse copiée !");
  };

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="space-y-0.5">
          <p className="font-medium text-sm">{objection.situation}</p>
          {objection.question && (
            <p className="text-xs text-muted-foreground">{objection.question}</p>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <CardContent className="pt-0 pb-4 px-4 space-y-3 border-t">
          {/* Contexte */}
          <div className="bg-muted/50 rounded-lg p-3 mt-3">
            <p className="text-xs text-muted-foreground">{objection.contexte}</p>
          </div>

          {/* Erreurs fréquentes */}
          {objection.erreurs.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-xs font-semibold text-destructive uppercase tracking-wider">
                  Erreurs fréquentes
                </span>
              </div>
              <div className="space-y-1 pl-5">
                {objection.erreurs.map((erreur, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <span>•</span>
                    <span>{erreur}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bonne réponse */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                  Bonne réponse
                </span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleCopy}>
                <Copy className="h-3 w-3 mr-1" />
                Copier
              </Button>
            </div>
            <p className="text-sm text-foreground leading-relaxed pl-5">
              {objection.bonne_reponse}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
