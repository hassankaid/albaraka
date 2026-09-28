// ─────────────────────────────────────────────────────────────────────────
// Le panneau d'accès d'un élève, dans sa fiche.
//
// Trois états par accès : Auto, Ouvert, Fermé.
//
//  • Auto  — aucune dérogation. La ligne affiche ce que l'automatique décide,
//            en gris. C'est le cas de l'immense majorité, et c'est pour ça que
//            l'écran reste calme : par défaut, il ne fait qu'informer.
//  • Ouvert / Fermé — une dérogation. La ligne se colore et porte son motif.
//
// Seules les décisions humaines ressortent visuellement. C'est ce qui évite
// l'encombrement demandé : on voit d'un coup d'œil ce qui a été décidé à la
// main, sans lire les vingt autres lignes.
//
// Le motif est exigé avant d'écrire — la contrainte est aussi en base, ce
// formulaire n'est que la première barrière.
// ─────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from "react";
import { Lock, Unlock, Wand2, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useAccesDe, useDefinirAcces, useRetirerAcces,
  type LigneAcces, type DomaineAcces, type Decision,
} from "@/hooks/useAccesManuels";

const TITRES: Record<DomaineAcces, string> = {
  coaching: "Coachings",
  formation: "Formations",
  fonctionnalite: "Fonctionnalités",
  pass: "Pass",
};
const ORDRE: DomaineAcces[] = ["coaching", "fonctionnalite", "formation", "pass"];

/** Ce que l'origine raconte, en clair. « aucun » est traité à part
 *  ci-dessous : il se lit différemment selon que l'accès est ouvert ou non. */
const ORIGINES: Record<string, string> = {
  manuel: "décision manuelle",
  staff: "statut interne",
  libre: "sans condition",
  formation: "formation terminée",
  inscription: "inscrit",
  attribue: "attribué",
};

function texteOrigine(l: LigneAcces): string {
  if (l.origine === "manuel") return "décision manuelle";
  if (l.origine === "aucun") return l.actif ? "automatique" : "conditions non remplies";
  return ORIGINES[l.origine] ?? l.origine;
}

export default function PanneauAcces({ userId }: { userId: string }) {
  const { data, isLoading } = useAccesDe(userId);
  const definir = useDefinirAcces();
  const retirer = useRetirerAcces();
  const { toast } = useToast();

  const [enCours, setEnCours] = useState<{ ligne: LigneAcces; decision: Decision } | null>(null);
  const [motif, setMotif] = useState("");
  const [expire, setExpire] = useState("");

  const parDomaine = useMemo(() => {
    const m = new Map<DomaineAcces, LigneAcces[]>();
    for (const l of data ?? []) {
      if (!m.has(l.domaine)) m.set(l.domaine, []);
      m.get(l.domaine)!.push(l);
    }
    return m;
  }, [data]);

  const derogations = (data ?? []).filter((l) => l.origine === "manuel").length;

  async function valider() {
    if (!enCours) return;
    if (motif.trim().length < 3) {
      toast({ title: "Le motif est obligatoire", variant: "destructive" });
      return;
    }
    try {
      await definir.mutateAsync({
        userId,
        domaine: enCours.ligne.domaine,
        cible: enCours.ligne.cible,
        decision: enCours.decision,
        motif: motif.trim(),
        expireLe: expire || null,
      });
      toast({ title: enCours.decision === "autorise" ? "Accès ouvert" : "Accès fermé" });
      setEnCours(null); setMotif(""); setExpire("");
    } catch (e: any) {
      toast({ title: "Échec", description: e?.message, variant: "destructive" });
    }
  }

  async function repasserEnAuto(l: LigneAcces) {
    try {
      await retirer.mutateAsync({ userId, domaine: l.domaine, cible: l.cible });
      toast({ title: "Retour au régime automatique" });
    } catch (e: any) {
      toast({ title: "Échec", description: e?.message, variant: "destructive" });
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-lg">Accès</h2>
          <span className="text-xs text-muted-foreground">
            {derogations === 0
              ? "tout est automatique"
              : `${derogations} dérogation${derogations > 1 ? "s" : ""} en vigueur`}
          </span>
        </div>

        {ORDRE.filter((d) => parDomaine.has(d)).map((domaine) => (
          <div key={domaine} className="space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {TITRES[domaine]}
            </div>
            {parDomaine.get(domaine)!.map((l) => {
              const manuel = l.origine === "manuel";
              return (
                <div
                  key={l.cible}
                  className={`flex items-center gap-3 rounded-md px-2.5 py-1.5 text-sm ${
                    manuel ? "bg-amber-500/5 border border-amber-500/20" : ""
                  }`}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${l.actif ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{l.libelle}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {texteOrigine(l)}
                      {manuel && l.motif_manuel ? ` — ${l.motif_manuel}` : ""}
                      {manuel && l.expire_le
                        ? ` (jusqu'au ${new Date(l.expire_le).toLocaleDateString("fr-FR")})`
                        : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Bouton actif={!manuel} titre="Automatique" onClick={() => manuel && repasserEnAuto(l)}>
                      <Wand2 className="h-3.5 w-3.5" />
                    </Bouton>
                    <Bouton
                      actif={manuel && l.actif}
                      titre="Forcer l'ouverture"
                      onClick={() => { setEnCours({ ligne: l, decision: "autorise" }); setMotif(""); setExpire(""); }}
                    >
                      <Unlock className="h-3.5 w-3.5" />
                    </Bouton>
                    <Bouton
                      actif={manuel && !l.actif}
                      titre="Forcer la fermeture"
                      onClick={() => { setEnCours({ ligne: l, decision: "bloque" }); setMotif(""); setExpire(""); }}
                    >
                      <Lock className="h-3.5 w-3.5" />
                    </Bouton>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Une décision manuelle prévaut toujours sur le système automatique, et ne
          s'annule pas toute seule — sauf si une date de fin est renseignée.
        </p>
      </CardContent>

      <Dialog open={!!enCours} onOpenChange={(o) => !o && setEnCours(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {enCours?.decision === "autorise" ? "Ouvrir" : "Fermer"} « {enCours?.ligne.libelle} »
            </DialogTitle>
            <DialogDescription>
              Cette décision prévaudra sur le système automatique.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Motif <span className="text-destructive">*</span></label>
              <Textarea
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Pourquoi cette décision ? On la relira dans six mois."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                Date de fin <span className="font-normal text-muted-foreground">(facultatif — sans date, la dérogation ne s'arrête jamais)</span>
              </label>
              <Input type="date" value={expire} onChange={(e) => setExpire(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEnCours(null)}>Annuler</Button>
            <Button onClick={valider} disabled={definir.isPending || motif.trim().length < 3}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Bouton({
  actif, titre, onClick, children,
}: { actif: boolean; titre: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={titre}
      aria-label={titre}
      aria-pressed={actif}
      onClick={onClick}
      className={`rounded p-1.5 transition-colors ${
        actif
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
