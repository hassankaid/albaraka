// ─────────────────────────────────────────────────────────────────────────
// Charte de confidentialité du Setter DM (16/11/2026).
//
// Le Setter DM reçoit les coordonnées de prospects d'Al Baraka : il doit
// accepter cette charte avant de voir ses leads, et la base refuse de lui en
// attribuer tant qu'elle n'est pas acceptée (attribuer_leads_dm). L'acceptation
// est datée par le serveur (accepter_charte_dm) et ne se retire pas.
// ─────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck } from "lucide-react";

export const ENGAGEMENTS_CHARTE_DM = [
  "J'utilise les coordonnées des prospects uniquement pour les contacter au nom d'Al Baraka, dans le cadre de la mission qui m'est confiée.",
  "Je ne les copie, ne les exporte, ne les partage et ne les réutilise jamais, ni pour moi ni pour quelqu'un d'autre, pendant et après ma mission.",
  "Je contacte chaque prospect avec respect, sans insister lourdement, et j'arrête dès qu'il demande à ne plus être contacté (statut « Perdu définitivement »).",
  "Je préviens Sidali immédiatement en cas de perte ou de fuite de ces informations.",
];

export function CharteSetterDm({ onAcceptee }: { onAcceptee: () => void }) {
  const { toast } = useToast();
  const [lu, setLu] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const accepter = async () => {
    setEnvoi(true);
    const { error } = await (supabase as any).rpc("accepter_charte_dm");
    setEnvoi(false);
    if (error) {
      toast({ title: "Impossible d'enregistrer", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Charte acceptée", description: "Tes leads à contacter peuvent maintenant t'être attribués." });
    onAcceptee();
  };

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-foreground">Charte de confidentialité du Setter DM</h3>
            <p className="text-sm text-muted-foreground mt-1">
              En tant que Setter DM, tu reçois les coordonnées de prospects d'Al Baraka pour les relancer par message.
              Ces informations sont personnelles et protégées par la loi (RGPD). Avant de recevoir tes premiers leads, tu t'engages à :
            </p>
          </div>
        </div>
        <ol className="list-decimal pl-10 space-y-1.5 text-sm text-foreground">
          {ENGAGEMENTS_CHARTE_DM.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground pl-9">
          Tout manquement entraîne le retrait immédiat de ton accès aux leads.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pl-9">
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <Checkbox checked={lu} onCheckedChange={(v) => setLu(v === true)} />
            J'ai lu la charte et je m'engage à la respecter
          </label>
          <Button size="sm" className="gradient-primary text-primary-foreground sm:ml-auto" disabled={!lu || envoi} onClick={accepter}>
            J'accepte la charte
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
