// L'écran de validation (maquette validée le 25/10/2026) : la note et ses alertes, les notes
// par étape à corriger d'un clic (− / +), chaque texte modifiable sur place, chaque citation
// réécoutable, puis « Valider ». Les corrections sont enregistrées au fil de l'eau : le coach
// peut quitter et revenir. Si l'IA a juste, c'est un clic sur « Valider ».
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, ChevronDown, Copy, Loader2, Minus, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CitationEcoute } from "@/components/appels/PanneauEcoute";
import { compterCorrections, recalculer, texteEleve, type Analyse, type Axe, type PointFort } from "@/lib/appels/retour";
import { enregistrerCorrections, validerAppel } from "@/hooks/useAppels";

/** Un texte qu'on corrige sur place : crayon → zone de saisie → OK. */
function TexteModifiable({
  valeur,
  onChange,
  className,
  vide = "—",
}: {
  valeur: string;
  onChange: (v: string) => void;
  className?: string;
  vide?: string;
}) {
  const [edition, setEdition] = useState(false);
  const [brouillon, setBrouillon] = useState(valeur);
  if (edition)
    return (
      <div className="space-y-1.5">
        <Textarea autoFocus value={brouillon} onChange={(e) => setBrouillon(e.target.value)} className="min-h-[72px] text-sm" />
        <div className="flex gap-1.5">
          <Button
            size="sm"
            className="h-7 gap-1"
            onClick={() => {
              onChange(brouillon.trim());
              setEdition(false);
            }}
          >
            <Check className="h-3.5 w-3.5" /> OK
          </Button>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => setEdition(false)}>
            Annuler
          </Button>
        </div>
      </div>
    );
  return (
    <div className={cn("group flex items-start gap-1.5", className)}>
      <span className="min-w-0 flex-1 whitespace-pre-line">{valeur || <span className="text-muted-foreground">{vide}</span>}</span>
      <button
        type="button"
        onClick={() => {
          setBrouillon(valeur);
          setEdition(true);
        }}
        className="shrink-0 rounded p-1 text-muted-foreground opacity-60 hover:bg-muted hover:opacity-100 group-hover:opacity-100"
        aria-label="Modifier"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Pastille({ ton, children }: { ton: "vert" | "ambre" | "rouge"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        ton === "vert" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        ton === "ambre" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
        ton === "rouge" && "bg-red-500/15 text-red-700 dark:text-red-300",
      )}
    >
      {children}
    </span>
  );
}

function Section({ titre, aide, children }: { titre: string; aide?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">
        {titre} {aide && <span className="font-normal text-muted-foreground">· {aide}</span>}
      </h2>
      {children}
    </section>
  );
}

/** Un point fort ou un axe : ses textes se corrigent sur place, et il peut être retiré. */
function ElementListe<T extends PointFort | Axe>({
  x,
  onChanger,
  onEcouter,
  rendu,
}: {
  x: T;
  onChanger: (c: Partial<T>) => void;
  onEcouter: (t: number) => void;
  rendu: (x: T, changer: (c: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card px-4 py-3", x.retire && "opacity-50")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 text-sm">{rendu(x, onChanger)}</div>
        <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 text-xs text-muted-foreground" onClick={() => onChanger({ retire: !x.retire } as Partial<T>)}>
          {x.retire ? (
            <>
              <RotateCcw className="h-3.5 w-3.5" /> Remettre
            </>
          ) : (
            <>
              <Trash2 className="h-3.5 w-3.5" /> Retirer
            </>
          )}
        </Button>
      </div>
      {!x.retire && <CitationEcoute texte={x.citation} horodatage={x.horodatage} onEcouter={onEcouter} />}
    </div>
  );
}

export function ValidationAppel({
  appelId,
  ia,
  initial,
  exempleInitial,
  prenomEleve,
  onEcouter,
  onValide,
}: {
  appelId: string;
  ia: Analyse;
  initial: Analyse | null;
  exempleInitial: boolean;
  prenomEleve: string;
  onEcouter: (t: number) => void;
  onValide: () => void;
}) {
  const [a, setA] = useState<Analyse>(() => recalculer(initial ?? ia));
  const [exemple, setExemple] = useState(exempleInitial);
  const [sauve, setSauve] = useState<"ok" | "en_cours" | "erreur">("ok");
  const [validation, setValidation] = useState(false);
  const [apercu, setApercu] = useState(false);
  const premier = useRef(true);
  const corrections = useMemo(() => compterCorrections(ia, a), [ia, a]);
  const penaliteIA = ia.penalite || 0;

  // les corrections sont enregistrées au fil de l'eau (1 s après la dernière)
  useEffect(() => {
    if (premier.current) {
      premier.current = false;
      return;
    }
    setSauve("en_cours");
    const t = setTimeout(() => {
      enregistrerCorrections(appelId, a, corrections)
        .then(() => setSauve("ok"))
        .catch(() => setSauve("erreur"));
    }, 1000);
    return () => clearTimeout(t);
  }, [a, appelId, corrections]);

  const maj = (f: (x: Analyse) => Analyse) => setA((x) => recalculer(f(structuredClone(x))));
  const noter = (i: number, delta: number) =>
    maj((x) => {
      x.etapes[i].note = Math.max(0, Math.min(10, Math.round((x.etapes[i].note + delta) * 2) / 2));
      return x;
    });

  async function valider() {
    setValidation(true);
    try {
      await validerAppel(appelId, a, corrections, exemple);
      toast.success("Retour validé : il est prêt à être envoyé à l'élève.");
      onValide();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "La validation a échoué.");
    } finally {
      setValidation(false);
    }
  }

  const texte = texteEleve(a, prenomEleve || "toi");

  return (
    <div className="space-y-6" data-testid="validation-appel">
      {/* la note et les alertes */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-extrabold tabular-nums" data-testid="note-globale">
            {Math.round(a.note_globale)}
          </span>
          <span className="text-lg text-muted-foreground">/100</span>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {a.erreurs_critiques.length === 0 ? (
              <Pastille ton="vert">Aucune erreur critique</Pastille>
            ) : (
              a.erreurs_critiques.map((e, i) => (
                <Pastille key={i} ton="rouge">
                  <AlertTriangle className="h-3 w-3" /> {e.titre}
                </Pastille>
              ))
            )}
            {a.penalite > 0 && <Pastille ton="ambre">−{a.penalite} enregistrement non annoncé</Pastille>}
            {a.alerte_duree && <Pastille ton="ambre">{a.alerte_duree}</Pastille>}
            {a.type_coherent === false && <Pastille ton="rouge">Type d'appel à vérifier</Pastille>}
          </div>
          <TexteModifiable
            valeur={a.analyse_globale}
            onChange={(v) => maj((x) => ({ ...x, analyse_globale: v }))}
            className="text-sm text-foreground/90"
          />
          {a.type_coherent === false && a.remarque_type && <p className="text-xs text-red-600 dark:text-red-300">{a.remarque_type}</p>}
          {penaliteIA > 0 && (
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => maj((x) => ({ ...x, penalite: x.penalite ? 0 : penaliteIA }))}
            >
              {a.penalite ? "Le prospect avait été prévenu ? Retirer les points en moins" : `Remettre les ${penaliteIA} points en moins`}
            </button>
          )}
        </div>
      </div>

      {a.erreurs_critiques.length > 0 && (
        <div className="space-y-2 rounded-xl border border-red-500/40 bg-red-500/5 p-4">
          {a.erreurs_critiques.map((e, i) => (
            <div key={i} className="text-sm">
              <p className="font-semibold text-red-700 dark:text-red-300">{e.titre}</p>
              <p className="text-foreground/90">{e.explication}</p>
              <CitationEcoute texte={e.citation} horodatage={e.horodatage} onEcouter={onEcouter} />
            </div>
          ))}
        </div>
      )}

      <Section titre="Notes par étape" aide="− / + pour corriger, la note globale se recalcule">
        <div className="divide-y divide-border rounded-xl border border-border bg-card" data-testid="notes-etapes">
          {a.etapes.map((e, i) => {
            const noteIA = ia.etapes[i]?.note;
            return (
              <div key={e.code} className={cn("grid gap-3 px-4 py-3 sm:grid-cols-[170px_130px_1fr]", noteIA !== e.note && "bg-primary/5")}>
                <div>
                  <p className="text-sm font-semibold">
                    {e.code} {e.nom}
                  </p>
                  <p className="text-xs text-muted-foreground">{e.poids} %</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="inline-flex items-center overflow-hidden rounded-lg border border-border">
                    <button type="button" className="px-2 py-1.5 text-muted-foreground hover:bg-muted" onClick={() => noter(i, -0.5)} aria-label={`Baisser ${e.code}`}>
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[2.6rem] bg-primary/10 px-1 py-1 text-center text-sm font-bold tabular-nums text-primary">
                      {e.note.toLocaleString("fr-FR")}
                    </span>
                    <button type="button" className="px-2 py-1.5 text-muted-foreground hover:bg-muted" onClick={() => noter(i, 0.5)} aria-label={`Monter ${e.code}`}>
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {noteIA !== undefined && noteIA !== e.note && (
                    <Badge variant="outline" className="mt-1 h-5 px-1.5 text-[10px]">
                      IA : {noteIA.toLocaleString("fr-FR")}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-foreground/90">
                  <TexteModifiable
                    valeur={e.justification}
                    onChange={(v) =>
                      maj((x) => {
                        x.etapes[i].justification = v;
                        return x;
                      })
                    }
                  />
                  {e.citations?.[0] && <CitationEcoute texte={e.citations[0].texte} horodatage={e.citations[0].horodatage} onEcouter={onEcouter} />}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section titre="Ce qui est bien fait" aide="chaque texte est modifiable">
        <div className="space-y-2">
          {a.points_forts.map((p, i) => (
            <ElementListe<PointFort>
              key={i}
              x={p}
              onEcouter={onEcouter}
              onChanger={(c) =>
                maj((y) => {
                  Object.assign(y.points_forts[i], c);
                  return y;
                })
              }
              rendu={(p, changer) => (
                <div className="space-y-1">
                  <TexteModifiable valeur={p.titre} onChange={(v) => changer({ titre: v })} className="font-semibold" />
                  <TexteModifiable valeur={p.pourquoi} onChange={(v) => changer({ pourquoi: v })} className="text-foreground/85" />
                </div>
              )}
            />
          ))}
        </div>
      </Section>

      <Section titre="Axes d'amélioration" aide="chaque texte est modifiable, un axe peut être retiré">
        <div className="space-y-2">
          {a.axes.map((ax, i) => (
            <ElementListe<Axe>
              key={i}
              x={ax}
              onEcouter={onEcouter}
              onChanger={(c) =>
                maj((y) => {
                  Object.assign(y.axes[i], c);
                  return y;
                })
              }
              rendu={(x, changer) => (
                <div className="space-y-1">
                  <TexteModifiable valeur={`${x.titre}`} onChange={(v) => changer({ titre: v })} className="font-semibold" />
                  <TexteModifiable valeur={x.probleme} onChange={(v) => changer({ probleme: v })} className="text-foreground/85" />
                  <div className="rounded-md bg-emerald-500/10 px-2.5 py-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">À dire la prochaine fois</p>
                    <TexteModifiable valeur={x.formulation_ideale} onChange={(v) => changer({ formulation_ideale: v })} />
                  </div>
                </div>
              )}
            />
          ))}
        </div>
      </Section>

      <Section titre="Conseil prioritaire et encouragement">
        <div className="space-y-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Conseil prioritaire {a.conseil_prioritaire?.etape ? `(${a.conseil_prioritaire.etape})` : ""}</p>
            <TexteModifiable
              valeur={a.conseil_prioritaire?.texte ?? ""}
              onChange={(v) => maj((x) => ({ ...x, conseil_prioritaire: { ...x.conseil_prioritaire, texte: v } }))}
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Encouragement</p>
            <TexteModifiable valeur={a.encouragement} onChange={(v) => maj((x) => ({ ...x, encouragement: v }))} />
          </div>
        </div>
      </Section>

      <Collapsible>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold">
          Les 7 règles, les objections et la fiche pour le closer
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3">
          <div className="divide-y divide-border rounded-xl border border-border bg-card text-sm">
            {a.regles.map((r) => (
              <div key={r.code} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[50px_110px_1fr]">
                <span className="font-semibold">{r.code}</span>
                <span
                  className={cn(
                    "text-xs font-semibold uppercase",
                    /^respect/i.test(r.statut) ? "text-emerald-600 dark:text-emerald-300" : /^viol/i.test(r.statut) ? "text-red-600 dark:text-red-300" : "text-amber-600 dark:text-amber-300",
                  )}
                >
                  {r.statut}
                </span>
                <span className="text-foreground/85">
                  {r.mesure && <b>{r.mesure}. </b>}
                  {r.commentaire}
                </span>
              </div>
            ))}
          </div>
          {a.objections.length > 0 && (
            <div className="space-y-2">
              {a.objections.map((o, i) => (
                <div key={i} className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
                  <p className="font-semibold">
                    {o.nom} <span className="text-xs font-normal text-muted-foreground">· C.A.R.E. {o.care_applique}</span>
                  </p>
                  <p className="text-foreground/85">{o.commentaire}</p>
                  <CitationEcoute texte={o.citation} horodatage={o.horodatage} onEcouter={onEcouter} />
                </div>
              ))}
            </div>
          )}
          {a.fiche_closer && (
            <div className="grid gap-x-4 gap-y-1.5 rounded-xl border border-border bg-card px-4 py-3 text-sm sm:grid-cols-[140px_1fr]">
              {(
                [
                  ["Situation", a.fiche_closer.situation],
                  ["Budget", a.fiche_closer.budget],
                  ["Score", a.fiche_closer.score_couleur],
                  ["Motivations", a.fiche_closer.motivations],
                  ["Conjoint", a.fiche_closer.conjoint],
                  ["Notes pour le closer", a.fiche_closer.notes_closer],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="contents">
                  <span className="text-muted-foreground">{k}</span>
                  <span>{v || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* la barre d'actions reste en bas de l'écran */}
      <div className="sticky bottom-0 z-30 -mx-1 rounded-t-xl border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={exemple} onCheckedChange={(v) => setExemple(v === true)} /> Exemple de référence
          </label>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {sauve === "en_cours" ? "Enregistrement…" : sauve === "erreur" ? "Corrections non enregistrées, vérifie ta connexion" : corrections ? "Corrections enregistrées" : ""}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setApercu(true)}>
              Voir le texte pour l'élève
            </Button>
            <Button onClick={valider} disabled={validation || sauve === "en_cours"} className="gap-2" data-testid="valider-appel">
              {validation && <Loader2 className="h-4 w-4 animate-spin" />}
              {corrections ? `Valider avec mes corrections (${corrections})` : "Valider"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={apercu} onOpenChange={setApercu}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Le texte pour {prenomEleve || "l'élève"}</DialogTitle>
            <DialogDescription>Il se met à jour avec tes corrections. Tu pourras le copier ou le télécharger en PDF après validation.</DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 font-sans text-sm leading-relaxed">{texte}</pre>
          <div className="flex justify-end">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigator.clipboard.writeText(texte).then(() => toast.success("Texte copié"))}
            >
              <Copy className="h-4 w-4" /> Copier
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
