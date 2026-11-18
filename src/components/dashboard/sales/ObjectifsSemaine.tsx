// Dashboard Sales, lot 3 (18/11/2026) : objectifs par semaine (par conférence)
// et avancement. Le CEO les fixe ; l'agence les voit.
//
// Un objectif par défaut vaut pour chaque semaine ; une semaine peut avoir le
// sien. Sur une plage, les objectifs des semaines s'additionnent.
import { useMemo, useState } from "react";
import { Flag, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtEuros, fmtNombre } from "@/lib/marketing/perf";
import { formatConferenceLabel, type ConferenceFilter } from "@/lib/marketing/conferenceFilter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSalesSources } from "@/hooks/useSalesSources";
import { useEnregistrerObjectif, useObjectifsSemaine } from "@/hooks/useSalesPilotage";
import { conferencesEntre, objectifPeriode, type CleObjectif, type ObjectifSemaine } from "@/lib/sales/pilotage";

const MESURES: { cle: CleObjectif; libelle: string; format: (v: number | null) => string; plafond?: boolean; aide: string }[] = [
  { cle: "ventes", libelle: "Ventes PASS", format: fmtNombre, aide: "Ventes rattachées à la conférence, perdues comprises." },
  { cle: "ca", libelle: "CA net HT", format: (v) => fmtEuros(v), aide: "Chiffre d'affaires signé hors ventes perdues." },
  { cle: "rdv", libelle: "RDV pris", format: fmtNombre, aide: "Leads de la conférence qui ont pris un rendez-vous." },
  { cle: "budget", libelle: "Dépense pub", format: (v) => fmtEuros(v), plafond: true, aide: "Plafond de dépense : au-delà, la barre passe au rouge." },
];

export default function ObjectifsSemaine({ filtre }: { filtre: ConferenceFilter | null }) {
  const { profile } = useAuth();
  const estCeo = profile?.role === "ceo";
  const { data: objectifs = [] } = useObjectifsSemaine();
  const { data } = useSalesSources(filtre);
  const [edition, setEdition] = useState(false);

  const conferences = useMemo(() => {
    if (!filtre || filtre.mode === "all") return [];
    if (filtre.mode === "single") return [filtre.date];
    return conferencesEntre(filtre.from, filtre.to);
  }, [filtre]);

  const realise = useMemo(() => {
    if (!data) return null;
    return {
      ventes: data.ventes.length,
      ca: data.ventes.reduce((a, v) => a + (v.perdue ? 0 : v.montant_ht), 0),
      rdv: data.entonnoir.reduce((a, e) => a + e.rdv, 0),
      budget: data.entonnoir.reduce((a, e) => a + e.depense_campagne, 0),
    } as Record<CleObjectif, number>;
  }, [data]);

  if (!filtre || filtre.mode === "all") return null;
  const cibles = Object.fromEntries(MESURES.map((m) => [m.cle, objectifPeriode(conferences, objectifs, m.cle)])) as Record<CleObjectif, number | null>;
  const aucun = MESURES.every((m) => cibles[m.cle] === null);
  if (aucun && !estCeo) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Flag className="h-4 w-4 text-primary" /> Objectifs {filtre.mode === "single" ? "de la semaine" : `(${conferences.length} semaines)`}
          </CardTitle>
          {estCeo && (
            <Button variant="outline" size="sm" onClick={() => setEdition(true)}>
              <Pencil className="h-4 w-4 mr-1.5" /> Fixer les objectifs
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {aucun ? (
          <p className="text-sm text-muted-foreground">
            Aucun objectif fixé. « Fixer les objectifs » : un objectif par défaut pour chaque semaine, et au besoin un objectif propre à une conférence.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MESURES.map((m) => {
              const cible = cibles[m.cle];
              const fait = realise?.[m.cle] ?? 0;
              const part = cible ? fait / cible : null;
              const mauvais = m.plafond ? part !== null && part > 1 : false;
              const atteint = !m.plafond && part !== null && part >= 1;
              return (
                <div key={m.cle} title={m.aide}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{m.libelle}</p>
                    <p className="text-[11px] text-muted-foreground">{part === null ? "" : `${Math.round(part * 100)} %`}</p>
                  </div>
                  <p className={cn("font-heading text-xl", atteint && "text-emerald-400", mauvais && "text-red-400")}>
                    {m.format(fait)}
                    <span className="text-sm text-muted-foreground"> / {cible === null ? "—" : m.format(cible)}</span>
                  </p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", mauvais ? "bg-red-500" : atteint ? "bg-emerald-500" : "bg-primary/70")}
                      style={{ width: `${Math.min(100, (part ?? 0) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      {estCeo && edition && (
        <DialogueObjectifs
          conference={filtre.mode === "single" ? filtre.date : null}
          objectifs={objectifs}
          onClose={() => setEdition(false)}
        />
      )}
    </Card>
  );
}

type Saisie = Record<CleObjectif, string>;

const versSaisie = (o?: ObjectifSemaine): Saisie => ({
  ventes: o?.ventes?.toString() ?? "", ca: o?.ca?.toString() ?? "", rdv: o?.rdv?.toString() ?? "", budget: o?.budget?.toString() ?? "",
});

function DialogueObjectifs({ conference, objectifs, onClose }: {
  conference: string | null; objectifs: ObjectifSemaine[]; onClose: () => void;
}) {
  const enregistrer = useEnregistrerObjectif();
  const [defaut, setDefaut] = useState<Saisie>(() => versSaisie(objectifs.find((o) => o.conference_date === null)));
  const [semaine, setSemaine] = useState<Saisie>(() => versSaisie(objectifs.find((o) => o.conference_date === conference)));

  const lire = (s: string) => (s.trim() === "" ? null : Number(s.replace(/\s/g, "").replace(",", ".")));
  const versObjectif = (date: string | null, s: Saisie): ObjectifSemaine | null => {
    const o = { conference_date: date, ventes: lire(s.ventes), ca: lire(s.ca), rdv: lire(s.rdv), budget: lire(s.budget) };
    const valeurs = [o.ventes, o.ca, o.rdv, o.budget].filter((x) => x !== null) as number[];
    return valeurs.every((x) => Number.isFinite(x) && x >= 0) ? o : null;
  };

  const valider = async () => {
    const d = versObjectif(null, defaut);
    const s = conference ? versObjectif(conference, semaine) : undefined;
    if (!d || s === null) {
      toast.error("Valeurs invalides : des nombres positifs, ou vide.");
      return;
    }
    try {
      await enregistrer.mutateAsync(d);
      if (s) await enregistrer.mutateAsync(s);
      toast.success("Objectifs enregistrés");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Enregistrement impossible");
    }
  };

  const bloc = (titre: string, aide: string, s: Saisie, set: (s: Saisie) => void) => (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{titre}</p>
        <p className="text-[11px] text-muted-foreground">{aide}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {MESURES.map((m) => (
          <div key={m.cle} className="space-y-1">
            <Label className="text-xs">{m.libelle}{m.cle === "ca" || m.cle === "budget" ? " (€)" : ""}</Label>
            <Input inputMode="decimal" value={s[m.cle]} onChange={(e) => set({ ...s, [m.cle]: e.target.value })} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Objectifs par semaine</DialogTitle>
          <DialogDescription>Un champ vide = pas d'objectif sur cette mesure. Visibles aussi par l'agence.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {bloc("Chaque semaine (par défaut)", "S'applique à toutes les conférences qui n'ont pas leur propre objectif.", defaut, setDefaut)}
          {conference && bloc(
            `Conférence du ${formatConferenceLabel(conference)}`,
            "Remplace l'objectif par défaut pour cette semaine seulement, mesure par mesure.",
            semaine, setSemaine,
          )}
          {!conference && (
            <p className="text-[11px] text-muted-foreground">Pour fixer l'objectif d'une semaine précise, choisir d'abord cette conférence dans le sélecteur.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={valider} disabled={enregistrer.isPending}>
            {enregistrer.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
