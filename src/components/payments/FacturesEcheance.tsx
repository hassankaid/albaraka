// Factures d'une échéance et d'une vente (09/10/2026).
//
// Partagé entre l'échéancier de la page Paiements (« Voir toutes les
// mensualités du client ») et la fiche d'une vente (« Mes ventes ») :
//   - échéance payée : sa facture FAC ;
//   - échéance transmise au cabinet : sa facture REC (et sa FAC si payée depuis) ;
//   - échéance impayée et échue, sans facture : « Recouvrement », qui crée la
//     facture REC suivante, datée du jour de l'échéance, jamais envoyée au client.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Archive, FileText, Loader2, Scale } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDateOnly } from "@/lib/formatDate";
import { peutPartirEnRecouvrement } from "@/lib/recouvrement";
import {
  telechargerFactureFAC,
  telechargerFactureREC,
  telechargerZipVente,
  useCreerFactureRecouvrement,
  useFacturesDeVente,
  type FactureFAC,
  type FactureREC,
} from "@/hooks/useRecouvrement";

export interface EcheanceFacturable {
  id: string;
  payment_number: number;
  total_payments: number;
  amount: number;
  due_date: string;
  status: string;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Ce qui s'affiche dans la colonne « Facture » d'une échéance. */
export function CelluleFacture({
  p,
  rec,
  fac,
  onAskRecouvrement,
}: {
  p: Pick<EcheanceFacturable, "status" | "due_date">;
  rec?: FactureREC;
  fac?: FactureFAC;
  onAskRecouvrement: () => void;
}) {
  const [enCours, setEnCours] = useState(false);
  const telecharger = async (f: () => Promise<void>) => {
    setEnCours(true);
    try {
      await f();
    } catch (e) {
      toast({ title: "Téléchargement impossible", description: message(e), variant: "destructive" });
    } finally {
      setEnCours(false);
    }
  };
  const recouvrable = !rec && !fac && peutPartirEnRecouvrement(p);

  return (
    <div className="flex flex-col items-start gap-0.5" data-testid="cellule-facture">
      {rec && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 gap-1 font-mono text-[11px] text-amber-300 hover:text-amber-200"
          title="Facture de recouvrement : télécharger le PDF"
          disabled={enCours}
          onClick={() => telecharger(() => telechargerFactureREC(rec))}
        >
          <Scale className="h-3 w-3" />
          {rec.numero}
        </Button>
      )}
      {fac && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
          title="Facture de l'échéance payée : télécharger le PDF"
          disabled={enCours || !fac.html_path}
          onClick={() => telecharger(() => telechargerFactureFAC(fac))}
        >
          <FileText className="h-3 w-3" />
          {fac.invoice_number}
        </Button>
      )}
      {recouvrable && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 gap-1 text-[11px] border border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
          onClick={onAskRecouvrement}
          title="Créer la facture REC de cette échéance pour le cabinet d'avocats"
        >
          <Scale className="h-3 w-3" />
          Recouvrement
        </Button>
      )}
      {!rec && !fac && !recouvrable && <span className="text-xs text-muted-foreground">—</span>}
    </div>
  );
}

/** Confirmation, création de la facture REC, puis téléchargement. */
export function ConfirmRecouvrementDialog({
  echeance,
  contactName,
  onClose,
}: {
  echeance: EcheanceFacturable | null;
  contactName: string;
  onClose: () => void;
}) {
  const creer = useCreerFactureRecouvrement();

  async function confirmer() {
    if (!echeance) return;
    try {
      const f = await creer.mutateAsync(echeance.id);
      toast({ title: `Facture ${f.numero} créée`, description: "Elle n'a pas été envoyée au client. Téléchargement en cours." });
      onClose();
      await telechargerFactureREC(f);
    } catch (e) {
      toast({ title: "Facture de recouvrement impossible", description: message(e), variant: "destructive" });
    }
  }

  return (
    <Dialog open={!!echeance} onOpenChange={(v) => !v && !creer.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Envoyer en recouvrement
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm">
              {echeance && (
                <p>
                  Une facture <b>REC</b> va être créée pour l'échéance{" "}
                  <b>
                    {echeance.payment_number}/{echeance.total_payments}
                  </b>{" "}
                  de <b>{contactName}</b> : <b>{echeance.amount.toLocaleString("fr-FR")} €</b>, datée du{" "}
                  <b>{formatDateOnly(echeance.due_date)}</b>.
                </p>
              )}
              <p className="text-muted-foreground">
                Elle prend le numéro suivant et ne sera pas envoyée au client. Une fois créée, elle ne peut plus être
                annulée, et l'échéance ne peut plus être modifiée ni supprimée.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creer.isPending}>
            Annuler
          </Button>
          <Button onClick={confirmer} disabled={creer.isPending} className="gap-1.5">
            {creer.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scale className="h-3.5 w-3.5" />}
            Créer la facture REC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STATUT: Record<string, { label: string; className: string }> = {
  paid: { label: "Payée", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  late: { label: "En retard", className: "bg-red-500/15 text-red-300 border-red-500/30" },
  lost: { label: "Perdue", className: "bg-zinc-700/50 text-zinc-400 border-zinc-600/30" },
  cancelled: { label: "Annulée", className: "bg-zinc-700/50 text-zinc-400 border-zinc-600/30" },
  pending: { label: "À venir", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
};

/** Section « Factures » d'une vente : chaque échéance avec ses factures, et un ZIP de tout. */
export function FacturesVenteSection({
  saleId,
  contactName,
  echeances,
}: {
  saleId: string;
  contactName: string;
  echeances: EcheanceFacturable[];
}) {
  const { data, isLoading } = useFacturesDeVente(saleId);
  const [confirm, setConfirm] = useState<EcheanceFacturable | null>(null);
  const [zip, setZip] = useState(false);
  const recs = [...(data?.recParEcheance.values() ?? [])];
  const facs = [...(data?.facParEcheance.values() ?? [])];
  const nbFactures = recs.length + facs.length;
  const triees = [...echeances].sort((a, b) => a.payment_number - b.payment_number || a.due_date.localeCompare(b.due_date));

  async function toutTelecharger() {
    setZip(true);
    try {
      const echecs = await telechargerZipVente(contactName, recs, facs);
      if (echecs.length) toast({ title: "Certaines factures manquent", description: echecs.join(", "), variant: "destructive" });
    } catch (e) {
      toast({ title: "ZIP impossible", description: message(e), variant: "destructive" });
    } finally {
      setZip(false);
    }
  }

  return (
    <div className="space-y-3" data-testid="section-factures">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-sm font-semibold text-foreground">Factures</h4>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={toutTelecharger} disabled={zip || nbFactures === 0}>
          {zip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
          Toutes les factures (ZIP)
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="divide-y divide-border/60 rounded-md border border-border">
          {triees.map((p) => {
            const st = STATUT[p.status] ?? { label: p.status, className: "bg-muted text-muted-foreground" };
            return (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2" data-testid="facture-echeance">
                <span className="w-12 shrink-0 text-xs font-medium">
                  {p.payment_number}/{p.total_payments}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs">
                    {p.amount.toLocaleString("fr-FR")} € · {formatDateOnly(p.due_date)}
                  </div>
                  <Badge variant="outline" className={`mt-0.5 text-[10px] ${st.className}`}>
                    {st.label}
                  </Badge>
                </div>
                <CelluleFacture
                  p={p}
                  rec={data?.recParEcheance.get(p.id)}
                  fac={data?.facParEcheance.get(p.id)}
                  onAskRecouvrement={() => setConfirm(p)}
                />
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        FAC : facture d'une échéance payée. REC : facture transmise au cabinet de recouvrement, jamais envoyée au client.
      </p>
      <ConfirmRecouvrementDialog echeance={confirm} contactName={contactName} onClose={() => setConfirm(null)} />
    </div>
  );
}
