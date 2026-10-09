// Liste des factures de recouvrement REC (09/10/2026) : téléchargement à
// l'unité ou en ZIP, et fichier Excel au format du cabinet d'avocats.
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileSpreadsheet, Archive, Loader2, Scale } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDateOnly } from "@/lib/formatDate";
import {
  telechargerFactureREC,
  telechargerZipREC,
  useExporterCabinet,
  useFacturesRecouvrement,
  type FactureREC,
} from "@/hooks/useRecouvrement";

const eur = (n: number | string) => Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

function etatEcheance(f: Pick<FactureREC, "echeance_statut" | "echeance_payee_le">): { label: string; className: string } {
  if (f.echeance_statut === "paid") {
    return {
      label: `Payée${f.echeance_payee_le ? ` le ${formatDateOnly(f.echeance_payee_le)}` : ""}`,
      className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    };
  }
  return { label: "Impayée", className: "bg-red-500/15 text-red-300 border-red-500/30" };
}

export default function RecouvrementDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: factures = [], isLoading } = useFacturesRecouvrement(open);
  const exporter = useExporterCabinet();
  const [choix, setChoix] = useState<Set<string>>(new Set());
  const [zip, setZip] = useState<{ fait: number; total: number } | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);

  const selection = useMemo(() => factures.filter((f) => choix.has(f.id)), [factures, choix]);
  const toutes = factures.length > 0 && choix.size === factures.length;
  const nonTransmises = factures.filter((f) => !f.transmise_le);

  const basculer = (id: string) =>
    setChoix((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function unePdf(f: FactureREC) {
    setEnCours(f.id);
    try {
      await telechargerFactureREC(f);
    } catch (e) {
      toast({ title: "Téléchargement impossible", description: (e as Error).message, variant: "destructive" });
    } finally {
      setEnCours(null);
    }
  }

  async function lesPdf(liste: FactureREC[]) {
    setZip({ fait: 0, total: liste.length });
    try {
      const echecs = await telechargerZipREC(liste, (fait) => setZip({ fait, total: liste.length }));
      if (echecs.length) toast({ title: "Certaines factures manquent", description: echecs.join(", "), variant: "destructive" });
    } catch (e) {
      toast({ title: "ZIP impossible", description: (e as Error).message, variant: "destructive" });
    } finally {
      setZip(null);
    }
  }

  async function excel(liste: FactureREC[]) {
    try {
      const marquees = await exporter.mutateAsync(liste);
      toast({
        title: "Fichier du cabinet téléchargé",
        description: marquees ? `${marquees} facture(s) marquée(s) comme transmise(s) aujourd'hui.` : "Toutes étaient déjà marquées transmises.",
      });
    } catch (e) {
      toast({ title: "Export impossible", description: (e as Error).message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Factures de recouvrement
          </DialogTitle>
          <DialogDescription className="text-xs">
            Une facture REC par échéance transmise au cabinet, datée du jour de l'échéance, jamais envoyée au client.
            On en crée une depuis « Voir toutes les mensualités du client ».
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : factures.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Aucune facture de recouvrement.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={toutes}
                      onCheckedChange={() => setChoix(toutes ? new Set() : new Set(factures.map((f) => f.id)))}
                      aria-label="Tout sélectionner"
                    />
                  </TableHead>
                  <TableHead>N°</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead>Transmise</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {factures.map((f) => {
                  const etat = etatEcheance(f);
                  return (
                    <TableRow key={f.id} data-testid="ligne-rec">
                      <TableCell>
                        <Checkbox checked={choix.has(f.id)} onCheckedChange={() => basculer(f.id)} aria-label={`Sélectionner ${f.numero}`} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{f.numero}</TableCell>
                      <TableCell className="text-xs">{f.client_nom}</TableCell>
                      <TableCell className="text-xs">
                        {f.payment_number}/{f.total_payments}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">{eur(f.montant)}</TableCell>
                      <TableCell className="text-xs">{formatDateOnly(f.date_facture)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${etat.className}`}>
                          {etat.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {f.transmise_le ? formatDateOnly(f.transmise_le) : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title={`Télécharger ${f.numero}`}
                          onClick={() => unePdf(f)}
                          disabled={enCours === f.id}
                        >
                          {enCours === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <span className="self-center text-xs text-muted-foreground">
            {factures.length} facture(s) · {nonTransmises.length} pas encore transmise(s)
            {selection.length ? ` · ${selection.length} sélectionnée(s)` : ""}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!!zip || factures.length === 0}
              onClick={() => lesPdf(selection.length ? selection : factures)}
            >
              {zip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
              {zip ? `PDF ${zip.fait}/${zip.total}` : selection.length ? "Télécharger la sélection (ZIP)" : "Tout télécharger (ZIP)"}
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={exporter.isPending || (selection.length === 0 && nonTransmises.length === 0)}
              onClick={() => excel(selection.length ? selection : nonTransmises)}
              title="Fichier Excel au format du cabinet d'avocats"
            >
              {exporter.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
              {selection.length ? "Excel du cabinet (sélection)" : "Excel du cabinet (non transmises)"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
