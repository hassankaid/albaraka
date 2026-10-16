/**
 * Un champ d'outil Liberty : texte court ou long, nombre, date, choix, liste, blocs
 * répétés (cartes ou tableau), cases à cocher, ou encart calculé (phrase assemblée
 * en direct, rappel, alerte). Sous chaque champ, une phrase d'aide ; dans le champ
 * vide, un exemple grisé. Aucun champ n'est obligatoire. Une information reprise
 * d'un outil précédent le dit, et reste modifiable ici.
 */
import { AlertTriangle, ArrowDown, ArrowUp, Link2, Lock, Plus, Quote, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  brut, liste, lignes, multi, options as optionsDe, texte,
  type Champ, type Colonne, type Ligne, type Profil, type Valeur,
} from "@/lib/liberty/outils";

interface Props {
  champ: Champ;
  profil: Profil;
  onChange: (cle: string, v: Valeur) => void;
}

const ex = (e?: string) => (e ? `Ex. : ${e}` : undefined);

function TexteLong({ valeur, exemple, onChange, lignesMin = 3, ...rest }: {
  valeur: string; exemple?: string; onChange: (v: string) => void; lignesMin?: number; id?: string; "aria-label"?: string;
}) {
  return (
    <Textarea {...rest} value={valeur} placeholder={ex(exemple)} rows={lignesMin}
      onChange={(e) => onChange(e.target.value)} className="min-h-0 resize-y bg-background text-sm" />
  );
}

function Pastilles({ choix, valeur, onChange, plusieurs, label }: {
  choix: string[]; valeur: string[]; onChange: (v: string[]) => void; plusieurs: boolean; label: string;
}) {
  if (!choix.length) return <p className="text-xs italic text-muted-foreground">Rien à choisir pour l'instant : remplissez d'abord l'écran précédent.</p>;
  return (
    <div className="flex flex-wrap gap-1.5" role={plusieurs ? "group" : "radiogroup"} aria-label={label}>
      {choix.map((o) => {
        const actif = valeur.includes(o);
        return (
          <Button key={o} type="button" size="sm" variant={actif ? "default" : "outline"} className="h-auto min-h-8 whitespace-normal py-1 text-left text-xs"
            role={plusieurs ? "checkbox" : "radio"} aria-checked={actif}
            onClick={() => onChange(plusieurs ? (actif ? valeur.filter((x) => x !== o) : [...valeur, o]) : actif ? [] : [o])}>
            {o}
          </Button>
        );
      })}
    </div>
  );
}

function SaisieListe({ champ, profil, onChange }: Props & { champ: Extract<Champ, { type: "liste" }> }) {
  const actuel = Array.isArray(profil[champ.cle]) ? (profil[champ.cle] as unknown[]).map((x) => (typeof x === "string" ? x : "")) : [];
  const valeurs = Array.from({ length: champ.fixe ?? Math.max(1, actuel.length) }, (_, i) => actuel[i] ?? "");
  const maj = (v: string[]) => onChange(champ.cle, v);
  return (
    <div className="space-y-2">
      {valeurs.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">{i + 1}.</span>
          <Input value={v} aria-label={`${champ.libelle} ${i + 1}`} placeholder={i === 0 ? ex(champ.exemple) : undefined}
            onChange={(e) => maj(valeurs.map((x, k) => (k === i ? e.target.value : x)))} className="bg-background text-sm" />
          {!champ.fixe && valeurs.length > 1 && (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Retirer"
              onClick={() => maj(valeurs.filter((_, k) => k !== i))}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {!champ.fixe && (
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => maj([...valeurs, ""])}>
          <Plus className="h-3.5 w-3.5" /> {champ.ajout ?? "Ajouter"}
        </Button>
      )}
    </div>
  );
}

function CelluleBloc({ c, valeur, profil, premier, onChange }: {
  c: Colonne; valeur: string; profil: Profil; premier: boolean; onChange: (v: string) => void;
}) {
  switch (c.type) {
    case "court":
      return <Input value={valeur} placeholder={premier ? ex(c.exemple) : undefined} onChange={(e) => onChange(e.target.value)} className="bg-background text-sm" />;
    case "nombre":
      return <Input type="number" inputMode="numeric" value={valeur} placeholder={premier ? ex(c.exemple) : undefined} onChange={(e) => onChange(e.target.value)} className="bg-background text-sm" />;
    case "date":
      return <Input type="date" value={valeur} onChange={(e) => onChange(e.target.value)} className="bg-background text-sm" />;
    case "long":
      return <TexteLong valeur={valeur} exemple={premier ? c.exemple : undefined} lignesMin={2} onChange={onChange} />;
    case "choix":
      return <Pastilles choix={optionsDe(c.options, profil)} valeur={valeur ? [valeur] : []} plusieurs={false} label={c.libelle}
        onChange={(v) => onChange(v[0] ?? "")} />;
    case "multi":
      return <Pastilles choix={optionsDe(c.options, profil)} valeur={multi(valeur)} plusieurs label={c.libelle}
        onChange={(v) => onChange(v.join(" ; "))} />;
  }
}

function SaisieBlocs({ champ, profil, onChange }: Props & { champ: Extract<Champ, { type: "blocs" }> }) {
  const actuel = lignes(profil, champ.cle);
  const n = champ.fixe ?? Math.max(champ.initial ?? 1, actuel.length);
  const blocs: Ligne[] = Array.from({ length: n }, (_, i) => actuel[i] ?? {});
  const maj = (v: Ligne[]) => onChange(champ.cle, v);
  const modifier = (i: number, c: Colonne, v: string) => maj(blocs.map((b, k) => (k === i ? { ...b, [c.cle]: v } : b)));
  const deplacer = (i: number, d: -1 | 1) => {
    const v = [...blocs];
    [v[i], v[i + d]] = [v[i + d], v[i]];
    maj(v);
  };
  const peutAjouter = !champ.fixe && (!champ.max || blocs.length < champ.max);
  const remplis = blocs.filter((b) => Object.values(b).some((x) => (x ?? "").trim())).length;
  const large = (c: Colonne) => c.type === "long" || c.type === "choix" || c.type === "multi";
  return (
    <div className="space-y-3">
      {champ.compteur && (
        <p className={cn("text-xs font-medium", remplis >= champ.compteur.objectif ? "text-emerald-600" : "text-amber-600")} data-testid="compteur">
          {remplis} {champ.compteur.mot}{remplis > 1 ? "s" : ""}, objectif {champ.compteur.objectif}
        </p>
      )}
      {blocs.map((b, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">{champ.nomBloc} {i + 1}</p>
            {!champ.fixe && (
              <div className="flex items-center">
                {champ.tableau && i > 0 && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Monter" onClick={() => deplacer(i, -1)}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                )}
                {champ.tableau && i < blocs.length - 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Descendre" onClick={() => deplacer(i, 1)}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                )}
                {blocs.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Retirer" onClick={() => maj(blocs.filter((_, k) => k !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {champ.colonnes.map((c) => (
              <div key={c.cle} className={cn("space-y-1", (large(c) || champ.colonnes.length === 1) && "sm:col-span-2")}>
                <span className="text-xs font-medium text-foreground">{c.libelle}</span>
                <CelluleBloc c={c} valeur={b[c.cle] ?? ""} profil={profil} premier={i === 0} onChange={(v) => modifier(i, c, v)} />
              </div>
            ))}
          </div>
        </div>
      ))}
      {peutAjouter && (
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => maj([...blocs, {}])}>
          <Plus className="h-3.5 w-3.5" /> {champ.ajout ?? `Ajouter : ${champ.nomBloc.toLowerCase()}`}
        </Button>
      )}
    </div>
  );
}

function EncartCalcule({ champ, profil }: { champ: Extract<Champ, { type: "info" }>; profil: Profil }) {
  const e = champ.rendu(profil);
  if (!e) return null;
  const ton = e.ton ?? "phrase";
  return (
    <div data-testid={`encart-${champ.cle}`}
      className={cn("flex items-start gap-2 rounded-lg border p-3 text-sm",
        ton === "alerte" ? "border-amber-500/50 bg-amber-500/10" : ton === "rappel" ? "border-border bg-muted/30" : "border-amber-500/40 bg-amber-500/5")}>
      {ton === "alerte" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> : <Quote className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
      <div className="space-y-0.5">
        {(e.titre ?? champ.libelle) && <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">{e.titre ?? champ.libelle}</p>}
        <p className={cn("whitespace-pre-line", ton === "phrase" && "font-medium text-foreground")}>{e.texte}</p>
      </div>
    </div>
  );
}

export function ChampOutil({ champ, profil, onChange }: Props) {
  if (champ.type === "info") return <EncartCalcule champ={champ} profil={profil} />;
  const id = `champ-${champ.cle}`;
  const entete = (
    <div className="space-y-0.5">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="text-sm font-medium text-foreground">{champ.libelle}</label>
        {champ.repris && !champ.lectureSeule && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-600">
            <Link2 className="h-3 w-3" /> Repris de {champ.repris} · modifiable ici
          </span>
        )}
      </div>
      {champ.aide && <p className="text-xs text-muted-foreground">{champ.aide}</p>}
    </div>
  );

  if (champ.lectureSeule) {
    const v = texte(profil, champ.cle);
    return (
      <div className="space-y-1.5" data-testid={id}>
        {entete}
        <div className="flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className={cn("whitespace-pre-line", !v && "italic text-muted-foreground")}>{v || "à compléter"}</span>
        </div>
        {champ.repris && <p className="text-[11px] text-muted-foreground">Se modifie dans {champ.repris}.</p>}
      </div>
    );
  }

  let saisie: React.ReactNode;
  switch (champ.type) {
    case "court":
      saisie = <Input id={id} value={brut(profil, champ.cle)} placeholder={ex(champ.exemple)}
        onChange={(e) => onChange(champ.cle, e.target.value)} className="bg-background text-sm" />;
      break;
    case "nombre":
      saisie = (
        <div className="flex items-center gap-2">
          <Input id={id} type="number" inputMode="numeric" value={brut(profil, champ.cle)} placeholder={ex(champ.exemple)}
            onChange={(e) => onChange(champ.cle, e.target.value)} className="max-w-[10rem] bg-background text-sm" />
          {champ.unite && <span className="text-sm text-muted-foreground">{champ.unite}</span>}
        </div>
      );
      break;
    case "date":
      saisie = <Input id={id} type="date" value={brut(profil, champ.cle)} onChange={(e) => onChange(champ.cle, e.target.value)} className="max-w-[12rem] bg-background text-sm" />;
      break;
    case "long":
      saisie = <TexteLong id={id} valeur={brut(profil, champ.cle)} exemple={champ.exemple} onChange={(v) => onChange(champ.cle, v)} />;
      break;
    case "choix": {
      const v = texte(profil, champ.cle);
      saisie = <Pastilles choix={optionsDe(champ.options, profil)} valeur={v ? [v] : []} plusieurs={false} label={champ.libelle}
        onChange={(x) => onChange(champ.cle, x[0] ?? "")} />;
      break;
    }
    case "liste":
      saisie = <SaisieListe champ={champ} profil={profil} onChange={onChange} />;
      break;
    case "blocs":
      saisie = <SaisieBlocs champ={champ} profil={profil} onChange={onChange} />;
      break;
    case "cases": {
      const coches = liste(profil, champ.cle);
      saisie = (
        <div className="space-y-2">
          {optionsDe(champ.options, profil).map((o) => (
            <label key={o} className="flex items-start gap-2 text-sm">
              <Checkbox checked={coches.includes(o)} className="mt-0.5"
                onCheckedChange={(c) => onChange(champ.cle, c ? [...coches, o] : coches.filter((x) => x !== o))} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      );
      break;
    }
  }

  return (
    <div className="space-y-1.5" data-testid={id}>
      {entete}
      {saisie}
    </div>
  );
}
