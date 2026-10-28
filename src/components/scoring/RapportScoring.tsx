// Rapport du lead scoring par conférence (décision 4 de Sidali, 28/10/2026) : pour
// chaque priorité et chaque tag, ce que deviennent les leads (inscrits, pas qualifiés,
// injoignables, RDV, ventes). C'est ce tableau qui dira si la grille tient, et qui
// servira à la revoir après 4 conférences. Export Excel : le rapport et la liste des
// leads avec leur score /100, leur priorité, leurs tags et l'ancien score /70.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { classeurXlsx } from "@/lib/classeurXlsx";
import { useNomsSources } from "@/lib/leadSources";
import { feuillesExport, libelleSegment, ordonner, pct, type LeadExporte, type LigneRapport } from "@/lib/scoringRapport";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const jour = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

function Pourcent({ n, total }: { n: number; total: number }) {
  const p = pct(n, total);
  return (
    <TableCell className="text-right tabular-nums">
      {n}
      {p !== null && <span className="ml-1 text-[11px] text-muted-foreground">({p} %)</span>}
    </TableCell>
  );
}

export function RapportScoring() {
  useNomsSources();
  const { data: conferences = [] } = useQuery({
    queryKey: ["scoring-conferences"],
    queryFn: async (): Promise<{ conference_date: string; leads: number }[]> => {
      const { data, error } = await db.rpc("scoring_conferences");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [export_, setExport] = useState(false);

  // Par défaut : la dernière conférence passée.
  useEffect(() => {
    if (debut || !conferences.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const derniere = conferences.find((c) => c.conference_date <= today)?.conference_date ?? conferences[0].conference_date;
    setDebut(derniere);
    setFin(derniere);
  }, [conferences, debut]);

  const { data: lignes, isFetching } = useQuery({
    queryKey: ["scoring-rapport", debut, fin],
    enabled: !!debut && !!fin,
    queryFn: async (): Promise<LigneRapport[]> => {
      const { data, error } = await db.rpc("scoring_rapport", { p_debut: debut, p_fin: fin, p_mode: "conference" });
      if (error) throw error;
      return ordonner(data ?? []);
    },
  });

  async function exporter() {
    setExport(true);
    try {
      // Par tranches de 1 000 : au-delà, la base tronque la réponse.
      const data: LeadExporte[] = [];
      for (let from = 0; ; from += 1000) {
        const { data: tranche, error } = await db.rpc("scoring_export", { p_debut: debut, p_fin: fin, p_mode: "conference" }).range(from, from + 999);
        if (error) throw error;
        data.push(...(tranche ?? []));
        if (!tranche || tranche.length < 1000) break;
      }
      const titre = debut === fin ? `Conférence du ${jour(debut)}` : `Conférences du ${jour(debut)} au ${jour(fin)}`;
      const blob = await classeurXlsx(feuillesExport(titre, lignes ?? [], data));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `AlBaraka_Rapport_scoring_${debut}${debut === fin ? "" : `_${fin}`}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export impossible");
    } finally {
      setExport(false);
    }
  }

  const sections: { titre: string; axe: LigneRapport["axe"] }[] = [
    { titre: "Par priorité", axe: "priorite" },
    { titre: "Par tag", axe: "tag" },
    { titre: "", axe: "total" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rapport par conférence</CardTitle>
        <CardDescription>
          Ce que deviennent les leads de chaque priorité et de chaque tag. La grille fera ses preuves sur 4 conférences : choisis
          une conférence, ou une plage, puis exporte en Excel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Du</span>
          <Select value={debut} onValueChange={(v) => { setDebut(v); if (v > fin) setFin(v); }}>
            <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Conférence" /></SelectTrigger>
            <SelectContent>
              {conferences.map((c) => <SelectItem key={c.conference_date} value={c.conference_date}>{jour(c.conference_date)} · {c.leads} leads</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">au</span>
          <Select value={fin} onValueChange={(v) => { setFin(v); if (v < debut) setDebut(v); }}>
            <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Conférence" /></SelectTrigger>
            <SelectContent>
              {conferences.map((c) => <SelectItem key={c.conference_date} value={c.conference_date}>{jour(c.conference_date)} · {c.leads} leads</SelectItem>)}
            </SelectContent>
          </Select>
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button variant="outline" size="sm" className="ml-auto gap-2" onClick={exporter} disabled={!lignes || export_} data-testid="exporter-rapport">
            {export_ ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Exporter en Excel
          </Button>
        </div>

        {lignes && (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Segment</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Inscrits conférence</TableHead>
                  <TableHead className="text-right">Pas qualifiés</TableHead>
                  <TableHead className="text-right">Injoignables</TableHead>
                  <TableHead className="text-right">RDV closing</TableHead>
                  <TableHead className="text-right">Ventes</TableHead>
                  <TableHead className="text-right">CA HT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((s) => {
                  const ls = lignes.filter((l) => l.axe === s.axe);
                  if (!ls.length) return null;
                  return [
                    s.titre && (
                      <TableRow key={s.axe} className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={8} className="py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.titre}</TableCell>
                      </TableRow>
                    ),
                    ...ls.map((l) => (
                      <TableRow key={`${l.axe}-${l.cle}`} className={l.axe === "total" ? "font-semibold" : ""}>
                        <TableCell>{libelleSegment(l.cle)}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.leads}</TableCell>
                        <Pourcent n={l.inscrits} total={l.leads} />
                        <Pourcent n={l.pas_qualifies} total={l.leads} />
                        <Pourcent n={l.injoignables} total={l.leads} />
                        <Pourcent n={l.rdv} total={l.leads} />
                        <TableCell className="text-right tabular-nums">{l.ventes}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(l.ca).toLocaleString("fr-FR")} €</TableCell>
                      </TableRow>
                    )),
                  ];
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Inscrits = inscrits à la conférence ou plus loin. Injoignables = pas de réponse ou faux numéro. RDV = appel réservé rattaché
          au lead, hors annulés. Ventes = ventes attribuées au lead. « Saisi par le setter » : réponses saisies au téléphone, gardées
          à part du recalage de la grille.
        </p>
      </CardContent>
    </Card>
  );
}
