// Les 4 blocs de réglages du Studio : Visage, Son, Sous-titres, Design.
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NIVEAUX_SON, STYLES_FLOU, type Reglages } from "@/lib/studio/reglages";
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

/** « Veux-tu flouter ton visage ? » puis, si oui, style, couleur et intensités. */
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
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Style</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {STYLES_FLOU.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => maj({ style: s.id })}
                  aria-pressed={v.style === s.id}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left transition-colors",
                    v.style === s.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                  )}
                >
                  <span className="block text-sm font-semibold text-foreground">{s.nom}</span>
                  <span className="block text-[11px] text-muted-foreground">{s.description}</span>
                </button>
              ))}
            </div>
          </div>
          <SelecteurCouleur label="Couleur du floutage" valeur={v.couleur} onChange={(couleur) => maj({ couleur })} />
          <Curseur label="Intensité du floutage" valeur={v.intensite} onChange={(intensite) => maj({ intensite })} />
          <Curseur
            label="Intensité de la couleur"
            valeur={v.intensite_couleur}
            onChange={(intensite_couleur) => maj({ intensite_couleur })}
          />
          <p className="text-xs text-muted-foreground">
            Même au niveau 1, ton visage reste méconnaissable.
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
    </div>
  );
}

export function BlocSousTitres({ reglages, onChange }: { reglages: Reglages; onChange: Maj }) {
  const c = reglages.sous_titres;
  const maj = (p: Partial<Reglages["sous_titres"]>) => onChange({ ...reglages, sous_titres: { ...c, ...p } });
  return (
    <div className="space-y-4">
      <SelecteurCouleur label="Couleur du texte" valeur={c.texte} onChange={(texte) => maj({ texte })} />
      <SelecteurCouleur label="Couleur du contour" valeur={c.contour} onChange={(contour) => maj({ contour })} />
      <SelecteurCouleur label="Couleur de l'ombre" valeur={c.ombre} onChange={(ombre) => maj({ ombre })} />
    </div>
  );
}

export function BlocDesign() {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-dashed border-border p-3">
      <div>
        <p className="text-sm font-medium text-foreground">Motion design</p>
        <p className="text-xs text-muted-foreground">
          Zooms, carte de présentation, icônes animées, bouton d'appel à l'action.
        </p>
      </div>
      <Badge variant="outline" className="shrink-0">
        Bientôt
      </Badge>
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
