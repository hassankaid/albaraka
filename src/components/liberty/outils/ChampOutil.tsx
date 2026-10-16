/**
 * Un champ d'outil Liberty : texte court ou long, choix, liste, blocs répétés ou
 * cases à cocher. Sous chaque champ, une phrase d'aide ; dans le champ vide, un
 * exemple grisé. Aucun champ n'est obligatoire.
 */
import { Lock, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { brut, liste, lignes, texte, type Champ, type Colonne, type Ligne, type Profil, type Valeur } from "@/lib/liberty/outils";

interface Props {
  champ: Champ;
  profil: Profil;
  onChange: (cle: string, v: Valeur) => void;
}

function Aide({ texte: t }: { texte?: string }) {
  return t ? <p className="text-xs text-muted-foreground">{t}</p> : null;
}

function TexteLong({ valeur, exemple, onChange, lignesMin = 3, ...rest }: {
  valeur: string; exemple?: string; onChange: (v: string) => void; lignesMin?: number; id?: string; "aria-label"?: string;
}) {
  return (
    <Textarea
      {...rest}
      value={valeur}
      placeholder={exemple ? `Ex. : ${exemple}` : undefined}
      onChange={(e) => onChange(e.target.value)}
      rows={lignesMin}
      className="min-h-0 resize-y bg-background text-sm"
    />
  );
}

function SaisieListe({ champ, profil, onChange }: Props & { champ: Extract<Champ, { type: "liste" }> }) {
  const actuel = Array.isArray(profil[champ.cle]) ? (profil[champ.cle] as unknown[]).map((x) => (typeof x === "string" ? x : "")) : [];
  const n = champ.fixe ?? Math.max(1, actuel.length);
  const valeurs = Array.from({ length: champ.fixe ? n : Math.max(n, actuel.length) }, (_, i) => actuel[i] ?? "");
  const maj = (v: string[]) => onChange(champ.cle, v);
  return (
    <div className="space-y-2">
      {valeurs.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">{i + 1}.</span>
          <Input
            value={v}
            aria-label={`${champ.libelle} ${i + 1}`}
            placeholder={i === 0 && champ.exemple ? `Ex. : ${champ.exemple}` : undefined}
            onChange={(e) => maj(valeurs.map((x, k) => (k === i ? e.target.value : x)))}
            className="bg-background text-sm"
          />
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

function SaisieBlocs({ champ, profil, onChange }: Props & { champ: Extract<Champ, { type: "blocs" }> }) {
  const actuel = lignes(profil, champ.cle);
  const n = champ.fixe ?? Math.max(1, actuel.length);
  const blocs: Ligne[] = Array.from({ length: champ.fixe ? n : Math.max(n, actuel.length) }, (_, i) => actuel[i] ?? {});
  const maj = (v: Ligne[]) => onChange(champ.cle, v);
  const modifier = (i: number, c: Colonne, v: string) => maj(blocs.map((b, k) => (k === i ? { ...b, [c.cle]: v } : b)));
  const peutAjouter = !champ.fixe && (!champ.max || blocs.length < champ.max);
  return (
    <div className="space-y-3">
      {blocs.map((b, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">{champ.nomBloc} {i + 1}</p>
            {!champ.fixe && blocs.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Retirer"
                onClick={() => maj(blocs.filter((_, k) => k !== i))}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {champ.colonnes.map((c) => (
              <label key={c.cle} className={cn("space-y-1", c.type === "court" && "sm:col-span-2")}>
                <span className="text-xs font-medium text-foreground">{c.libelle}</span>
                {c.type === "court" ? (
                  <Input value={b[c.cle] ?? ""} placeholder={i === 0 && c.exemple ? `Ex. : ${c.exemple}` : undefined}
                    onChange={(e) => modifier(i, c, e.target.value)} className="bg-background text-sm" />
                ) : (
                  <TexteLong valeur={b[c.cle] ?? ""} exemple={i === 0 ? c.exemple : undefined} lignesMin={2}
                    onChange={(v) => modifier(i, c, v)} />
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
      {peutAjouter && (
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => maj([...blocs, {}])}>
          <Plus className="h-3.5 w-3.5" /> {champ.ajout ?? `Ajouter un ${champ.nomBloc.toLowerCase()}`}
        </Button>
      )}
    </div>
  );
}

export function ChampOutil({ champ, profil, onChange }: Props) {
  const id = `champ-${champ.cle}`;
  const entete = (
    <div className="space-y-0.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">{champ.libelle}</label>
      <Aide texte={champ.aide} />
    </div>
  );

  if (champ.lectureSeule) {
    const v = texte(profil, champ.cle);
    return (
      <div className="space-y-1.5" data-testid={id}>
        {entete}
        <div className="flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className={cn(!v && "italic text-muted-foreground")}>{v || "à compléter"}</span>
        </div>
      </div>
    );
  }

  let saisie: React.ReactNode;
  switch (champ.type) {
    case "court":
      saisie = <Input id={id} value={brut(profil, champ.cle)} placeholder={champ.exemple ? `Ex. : ${champ.exemple}` : undefined}
        onChange={(e) => onChange(champ.cle, e.target.value)} className="bg-background text-sm" />;
      break;
    case "long":
      saisie = <TexteLong id={id} valeur={brut(profil, champ.cle)} exemple={champ.exemple} onChange={(v) => onChange(champ.cle, v)} />;
      break;
    case "choix": {
      const v = texte(profil, champ.cle);
      saisie = (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={champ.libelle}>
          {champ.options.map((o) => (
            <Button key={o} type="button" size="sm" variant={v === o ? "default" : "outline"} role="radio" aria-checked={v === o}
              onClick={() => onChange(champ.cle, v === o ? "" : o)}>
              {o}
            </Button>
          ))}
        </div>
      );
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
          {champ.options.map((o) => (
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
