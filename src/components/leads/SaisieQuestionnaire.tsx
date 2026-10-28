// Saisie des 7 réponses du questionnaire par le setter, pendant l'appel, quand le
// lead ne l'a pas rempli (cahier des charges du lead scoring, 28/10/2026). Le score
// et la priorité se calculent en base (lead_scoring_saisir) ; la saisie est marquée
// « saisi par le setter » et reste hors du recalage de la grille.
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PRIORITE_LABELS, QUIZ_QUESTIONS, type Priorite } from "@/lib/leadScoring";

export function SaisieQuestionnaire({
  leadId,
  nom,
  reponsesInitiales,
  open,
  onOpenChange,
  onSaisi,
}: {
  leadId: string;
  nom: string | null;
  reponsesInitiales?: Record<string, string> | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaisi: () => void;
}) {
  const [reponses, setReponses] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (open) setReponses(reponsesInitiales ?? {});
  }, [open, reponsesInitiales]);

  const manquantes = QUIZ_QUESTIONS.filter((q) => !reponses[q.id]).length;

  async function enregistrer() {
    setEnvoi(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("lead_scoring_saisir", { p_lead_id: leadId, p_answers: reponses });
    setEnvoi(false);
    if (error) {
      toast.error(error.message.replace(/^[a-z_]+: /, ""));
      return;
    }
    const r = (data ?? [])[0] as { score: number; priorite: Priorite } | undefined;
    toast.success(r ? `Priorité ${r.priorite} — ${PRIORITE_LABELS[r.priorite]} (${r.score}/100)` : "Réponses enregistrées");
    onOpenChange(false);
    onSaisi();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Questionnaire de {nom || "ce lead"}</DialogTitle>
          <DialogDescription>
            Pose les 7 questions au téléphone et coche ses réponses. La priorité se calcule dès que tout est rempli ; elle sera
            marquée « saisi par le setter ».
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {QUIZ_QUESTIONS.map((q, i) => (
            <div key={q.id} className="space-y-2">
              <p className="text-sm font-medium">
                {i + 1}. {q.prompt}
              </p>
              <RadioGroup value={reponses[q.id] ?? ""} onValueChange={(v) => setReponses((r) => ({ ...r, [q.id]: v }))} className="gap-1.5">
                {q.options.map((o) => (
                  <div key={o.code} className="flex items-center gap-2">
                    <RadioGroupItem value={o.code} id={`${q.id}-${o.code}`} />
                    <Label htmlFor={`${q.id}-${o.code}`} className="cursor-pointer text-sm font-normal">
                      {o.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {manquantes ? `Encore ${manquantes} question${manquantes > 1 ? "s" : ""}` : "Tout est rempli"}
          </span>
          <Button onClick={enregistrer} disabled={manquantes > 0 || envoi} data-testid="enregistrer-questionnaire">
            {envoi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Calculer la priorité
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
