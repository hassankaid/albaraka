// Système de relances (demande de Hassan, 15/10/2026) : badge « Relance 2/3 »,
// bouton « Relance faite » (ligne du tableau) et bloc « Suivi des relances »
// (fiche du lead). La logique est dans lib/relances.ts.
import { useState } from "react";
import { Check, Loader2, Recycle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from "@/lib/leadConfig";
import {
  derniereRelance,
  etapeFinale,
  etapeRelance,
  libelleBouton,
  marquerRelanceFaite,
  messageRelance,
  RELANCES_MAX,
  type LeadRelance,
} from "@/lib/relances";

function Points({ etape }: { etape: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {Array.from({ length: RELANCES_MAX }, (_, i) => (
        <span key={i} className={cn("h-1.5 w-1.5 rounded-full", i < etape ? "bg-yellow-300" : "bg-yellow-300/25")} />
      ))}
    </span>
  );
}

/** Badge du statut ; pour « À relancer », l'étape en cours (Relance 2/3) et la dernière relance. */
export function StatutLead({ lead, className }: { lead: LeadRelance; className?: string }) {
  if (!lead.status) return null;
  const etape = etapeRelance(lead);
  const badge = (
    <Badge variant="outline" className={cn("leading-tight", LEAD_STATUS_COLORS[lead.status] || "", className)}>
      {LEAD_STATUS_LABELS[lead.status] || lead.status}
    </Badge>
  );
  if (!etape) return badge;
  const derniere = derniereRelance(lead.relance_derniere_le);
  return (
    <span className="inline-flex flex-col items-start gap-0.5" data-testid="statut-relance">
      {badge}
      <span
        className="inline-flex items-center gap-1 text-[10px] text-yellow-300/90"
        title={`Relance ${etape} sur ${RELANCES_MAX}${derniere ? ` · dernière ${derniere.replace("faite ", "")}` : ""}`}
      >
        <Points etape={etape} /> Relance {etape}/{RELANCES_MAX}
        {derniere && <span className="text-muted-foreground">· {derniere}</span>}
      </span>
    </span>
  );
}

/** Confirmation avant la dernière relance, qui recycle le lead. */
function ConfirmerRecyclage({
  open,
  onOpenChange,
  onConfirmer,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirmer: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dernière relance</AlertDialogTitle>
          <AlertDialogDescription>
            C'est la 3ᵉ relance sans réponse : en la validant, ce lead quitte ta liste et part dans « À recycler », avec le
            statut « Pas de réponse ».
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmer}>Valider et recycler</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function useValiderRelance(lead: LeadRelance, onFait: () => void) {
  const { toast } = useToast();
  const [envoi, setEnvoi] = useState(false);
  const etape = etapeRelance(lead);
  async function valider(note?: string) {
    if (!lead.id || !etape) return;
    setEnvoi(true);
    try {
      const r = await marquerRelanceFaite(lead.id, etape, note);
      toast({ title: messageRelance(r, etape) });
      onFait();
    } catch (e) {
      toast({ title: "Relance impossible", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setEnvoi(false);
    }
  }
  return { etape, envoi, valider };
}

/** Bouton compact « ✓ Relance N » pour la ligne du tableau. */
export function BoutonRelanceFaite({ lead, onFait }: { lead: LeadRelance; onFait: () => void }) {
  const { etape, envoi, valider } = useValiderRelance(lead, onFait);
  const [confirmer, setConfirmer] = useState(false);
  if (!etape) return null;
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-6 gap-1 border-yellow-500/40 px-1.5 text-[10px] text-yellow-200 hover:bg-yellow-500/10"
        disabled={envoi}
        onClick={(e) => {
          e.stopPropagation();
          if (etapeFinale(etape)) setConfirmer(true);
          else valider();
        }}
        title={`Marquer la relance ${etape} comme faite`}
        data-testid="bouton-relance-faite"
      >
        {envoi ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        {libelleBouton(etape)}
      </Button>
      <ConfirmerRecyclage open={confirmer} onOpenChange={setConfirmer} onConfirmer={() => valider()} />
    </>
  );
}

/** Bloc « Suivi des relances » de la fiche du lead : les 3 étapes, une note facultative, le bouton. */
export function SuiviRelances({ lead, onFait, modifiable }: { lead: LeadRelance; onFait: () => void; modifiable: boolean }) {
  const { etape, envoi, valider } = useValiderRelance(lead, onFait);
  const [note, setNote] = useState("");
  const [confirmer, setConfirmer] = useState(false);
  if (!etape) return null;
  const derniere = derniereRelance(lead.relance_derniere_le);
  return (
    <div className="space-y-3 rounded-lg border border-yellow-500/30 bg-yellow-500/[0.05] p-3" data-testid="suivi-relances">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">Suivi des relances</h4>
        {derniere && <span className="text-xs text-muted-foreground">Dernière relance {derniere.replace("faite ", "")}</span>}
      </div>
      <ol className="grid grid-cols-3 gap-2">
        {Array.from({ length: RELANCES_MAX }, (_, i) => i + 1).map((n) => {
          const fait = n < etape;
          const courant = n === etape;
          return (
            <li
              key={n}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs",
                fait && "border-emerald-500/40 text-emerald-300",
                courant && "border-yellow-400/70 bg-yellow-500/10 font-medium text-yellow-200",
                !fait && !courant && "border-border text-muted-foreground",
              )}
            >
              {fait ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px]">{n}</span>
              )}
              Relance {n}
            </li>
          );
        })}
      </ol>
      {modifiable ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note facultative (ex. : message WhatsApp envoyé)"
            className="h-9 bg-background text-sm"
            maxLength={300}
          />
          <Button
            type="button"
            className="h-9 shrink-0 gap-1.5"
            disabled={envoi}
            onClick={() => (etapeFinale(etape) ? setConfirmer(true) : valider(note))}
          >
            {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {libelleBouton(etape)}
          </Button>
        </div>
      ) : null}
      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <Recycle className="mt-0.5 h-3 w-3 shrink-0" />
        {etapeFinale(etape)
          ? "Dernière relance : sans réponse, le lead partira dans « À recycler »."
          : "Le prospect a répondu ? Change simplement son statut : le suivi des relances s'arrête."}
      </p>
      <ConfirmerRecyclage open={confirmer} onOpenChange={setConfirmer} onConfirmer={() => valider(note)} />
    </div>
  );
}
