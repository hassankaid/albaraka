// Les blocs de réglages du Studio : Visage, Son, Sous-titres, Design, Coupes.
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, PenLine, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FONDS_SONORES, NIVEAUX_SON, PALETTES, RYTHMES_COUPES, STYLES_MONTAGE, type Reglages } from "@/lib/studio/reglages";
import { SelecteurCouleur } from "./SelecteurCouleur";

type Maj = (r: Reglages) => void;

function Curseur({ label, valeur, onChange }: { label: string; valeur: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{valeur} / 5</span>
      </div>
      <Slider min={1} max={5} step={1} value={[valeur]} onValueChange={([n]) => onChange(n)} aria-label={label} />
    </div>
  );
}

/** « Veux-tu flouter ton visage ? » puis, si oui, l'intensité du flou naturel. */
export function BlocVisage({ reglages, onChange, question = true }: { reglages: Reglages; onChange: Maj; question?: boolean }) {
  const v = reglages.visage;
  const maj = (p: Partial<Reglages["visage"]>) => onChange({ ...reglages, visage: { ...v, ...p } });
  return (
    <div className="space-y-5">
      {question && (
        <div className="space-y-3">
          <p className="text-base font-semibold text-foreground">Veux-tu flouter ton visage ?</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: true, nom: "Oui" },
              { val: false, nom: "Non" },
            ].map((o) => (
              <button
                key={o.nom}
                type="button"
                onClick={() => maj({ flouter: o.val })}
                aria-pressed={v.flouter === o.val}
                className={cn(
                  "rounded-xl border px-4 py-4 text-base font-semibold transition-colors",
                  v.flouter === o.val ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50",
                )}
              >
                {o.nom}
              </button>
            ))}
          </div>
        </div>
      )}
      {v.flouter && (
        <div className="space-y-5">
          <Curseur label="Intensité du floutage" valeur={v.intensite} onChange={(intensite) => maj({ intensite })} />
          <p className="text-xs text-muted-foreground">
            Seul ton visage est flouté, sans forme ni couleur autour. Même au niveau 1, il reste méconnaissable.
          </p>
        </div>
      )}
    </div>
  );
}

export function BlocSon({ reglages, onChange }: { reglages: Reglages; onChange: Maj }) {
  const s = reglages.son;
  const maj = (p: Partial<Reglages["son"]>) => onChange({ ...reglages, son: { ...s, ...p } });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="studio-son" className="text-sm font-medium">
          Améliorer le son
          <span className="block text-xs font-normal text-muted-foreground">Retire les bruits de fond, voix plus claire</span>
        </Label>
        <Switch id="studio-son" checked={s.ameliorer} onCheckedChange={(ameliorer) => maj({ ameliorer })} />
      </div>
      {s.ameliorer && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Force du débruitage</p>
          <div className="grid grid-cols-3 gap-2">
            {NIVEAUX_SON.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => maj({ niveau: n.id })}
                aria-pressed={s.niveau === n.id}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  s.niveau === n.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50",
                )}
              >
                {n.nom}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          Fond sonore
          <span className="block text-xs font-normal text-muted-foreground">Sous ta voix, baissé automatiquement quand tu parles</span>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="fond-sonore">
          {FONDS_SONORES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => maj({ fond: f.id })}
              aria-pressed={s.fond === f.id}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors",
                s.fond === f.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
              )}
            >
              <span className={cn("block text-sm font-medium", s.fond === f.id && "text-primary")}>{f.nom}</span>
              <span className="block text-[11px] text-muted-foreground">{f.detail}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Couleurs des sous-titres, et « Corriger les sous-titres » dès que la préparation est prête. */
export function BlocSousTitres({
  reglages,
  onChange,
  onCorriger,
}: {
  reglages: Reglages;
  onChange: Maj;
  onCorriger?: () => void;
}) {
  const c = reglages.sous_titres;
  const maj = (p: Partial<Reglages["sous_titres"]>) => onChange({ ...reglages, sous_titres: { ...c, ...p } });
  const nb = c.corrections?.length ?? 0;
  return (
    <div className="space-y-4">
      <SelecteurCouleur label="Couleur du texte" valeur={c.texte} onChange={(texte) => maj({ texte })} />
      <SelecteurCouleur label="Couleur du contour" valeur={c.contour} onChange={(contour) => maj({ contour })} />
      <SelecteurCouleur label="Couleur de l'ombre" valeur={c.ombre} onChange={(ombre) => maj({ ombre })} />
      {onCorriger ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={onCorriger} className="w-full gap-2 sm:w-auto">
            <PenLine className="h-4 w-4" /> Corriger les sous-titres
          </Button>
          {nb > 0 && (
            <span className="text-xs text-emerald-500" data-testid="nb-corrections">
              {nb} sous-titre{nb > 1 ? "s" : ""} corrigé{nb > 1 ? "s" : ""}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground" data-testid="sous-titres-preparation">
          Dès que ta vidéo est préparée, tu pourras relire et corriger chaque sous-titre.
        </p>
      )}
    </div>
  );
}

/** Motion design : oui / non, code couleur (6 palettes ou personnalisé), carte de présentation. */
export function BlocDesign({ reglages, onChange }: { reglages: Reglages; onChange: Maj }) {
  const d = reglages.design;
  const maj = (p: Partial<Reglages["design"]>) => onChange({ ...reglages, design: { ...d, ...p } });
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="studio-design" className="text-sm font-medium">
          Motion design
          <span className="block text-xs font-normal text-muted-foreground">
            Mot géant derrière toi, zooms, icônes et listes animées, bruitages, carte de présentation
          </span>
        </Label>
        <Switch id="studio-design" checked={d.actif} onCheckedChange={(actif) => maj({ actif })} />
      </div>
      {d.actif && (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Style</p>
            <div className="grid grid-cols-2 gap-2">
              {STYLES_MONTAGE.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => maj({ style: st.id })}
                  aria-pressed={d.style === st.id}
                  className={cn(
                    "rounded-lg border px-2.5 py-2 text-left transition-colors",
                    d.style === st.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                  )}
                >
                  <span className="block text-xs font-medium text-foreground">{st.nom}</span>
                  <span className="block text-[11px] text-muted-foreground">{st.description}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Code couleur</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => maj({ palette: p.id })}
                  aria-pressed={d.palette === p.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors",
                    d.palette === p.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                  )}
                >
                  <span className="flex shrink-0 overflow-hidden rounded-full border border-border">
                    {[p.principale, p.fond, p.texte].map((c, k) => (
                      <span key={k} className="h-5 w-3" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                  {p.nom}
                </button>
              ))}
              <button
                type="button"
                onClick={() => maj({ palette: "personnalise" })}
                aria-pressed={d.palette === "personnalise"}
                className={cn(
                  "rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors",
                  d.palette === "personnalise" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                )}
              >
                Personnalisé
              </button>
            </div>
          </div>
          {d.palette === "personnalise" && (
            <div className="space-y-4">
              <SelecteurCouleur label="Couleur principale" valeur={d.principale} onChange={(principale) => maj({ principale })} />
              <SelecteurCouleur label="Fond des encadrés" valeur={d.fond} onChange={(fond) => maj({ fond })} />
              <SelecteurCouleur label="Texte des encadrés" valeur={d.texte} onChange={(texte) => maj({ texte })} />
            </div>
          )}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Carte de présentation <span className="font-normal text-muted-foreground">(facultatif)</span>
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={d.prenom}
                onChange={(e) => maj({ prenom: e.target.value.slice(0, 24) })}
                placeholder="Ton prénom"
                aria-label="Prénom"
              />
              <Input
                value={d.titre}
                onChange={(e) => maj({ titre: e.target.value.slice(0, 40) })}
                placeholder="Ton titre (ex. Coach business)"
                aria-label="Titre"
              />
            </div>
            <p className="text-xs text-muted-foreground">Sans prénom, la vidéo n'a pas de carte de présentation.</p>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Rythme des coupes, et accès à « Vérifier les coupes » quand la préparation est faite.
 * Des coupes ajustées à la main remplacent le rythme : changer de rythme les efface.
 */
export function BlocCoupes({
  reglages,
  onChange,
  onVerifier,
}: {
  reglages: Reglages;
  onChange: Maj;
  onVerifier?: () => void;
}) {
  const c = reglages.coupes;
  const aLaMain = !!c.plages?.length;
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Rythme des coupes</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {RYTHMES_COUPES.map((o) => {
            const actif = !aLaMain && c.rythme === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onChange({ ...reglages, coupes: { rythme: o.id, plages: null } })}
                aria-pressed={actif}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left transition-colors",
                  actif ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                )}
              >
                <span className={cn("block text-sm font-semibold", actif ? "text-primary" : "text-foreground")}>{o.nom}</span>
                <span className="block text-xs text-muted-foreground">{o.description}</span>
              </button>
            );
          })}
        </div>
      </div>
      {aLaMain && (
        <p className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs text-foreground">
          Coupes ajustées à la main. Choisir un rythme ci-dessus revient aux coupes automatiques.
        </p>
      )}
      {onVerifier ? (
        <Button type="button" variant="outline" onClick={onVerifier} className="w-full gap-2 sm:w-auto">
          <Scissors className="h-4 w-4" /> Vérifier les coupes
        </Button>
      ) : (
        <p className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="coupes-preparation">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
          Préparation de ta vidéo… Dans quelques secondes, tu pourras vérifier chaque coupe et prolonger un passage.
        </p>
      )}
    </div>
  );
}

export function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{titre}</h3>
      {children}
    </section>
  );
}
