// Face caméra : « Tu as utilisé un script de la bibliothèque ? » (facultatif, décision
// de Hassan du 13/10/2026). Le script choisi est rattaché à la vidéo et devient
// « déjà tourné » dans la bibliothèque ; s'il l'était déjà, l'élève est prévenu.
import { useState } from "react";
import { AlertTriangle, BookOpen, CheckCircle2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScriptStudio, useScriptsStudio, useScriptsTournes } from "@/hooks/useStudioScripts";
import { dateTournage, typographie } from "@/lib/studio/scripts";
import { useRechercheDifferee } from "@/hooks/useRechercheDifferee";

export function ChoixScriptBibliotheque({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const [saisie, setSaisie] = useState("");
  const recherche = useRechercheDifferee(saisie);
  const { data: tournes = new Map<string, string>() } = useScriptsTournes();
  const { data: choisi } = useScriptStudio(value);
  const { data: resultats } = useScriptsStudio({ recherche, theme: null });
  const liste = recherche.trim().length >= 2 ? (resultats?.pages[0]?.scripts ?? []).slice(0, 6) : [];

  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 p-4" data-testid="choix-script-bibliotheque">
      <div className="flex items-center gap-2 text-sm font-medium">
        <BookOpen className="h-4 w-4 text-primary" />
        Tu as utilisé un script de la bibliothèque ? <span className="font-normal text-muted-foreground">(facultatif)</span>
      </div>

      {value ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
            <span className="truncate font-medium">{choisi ? typographie(choisi.titre) : "…"}</span>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => onChange(null)}>
              <X className="h-3.5 w-3.5" /> Retirer
            </Button>
          </div>
          {tournes.has(value) && (
            <p className="flex items-center gap-1.5 text-xs text-amber-600" data-testid="avertissement-deja-tourne">
              <AlertTriangle className="h-3.5 w-3.5" /> Attention : tu as déjà fait une vidéo avec ce script le {dateTournage(tournes.get(value)!)}.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              placeholder="Tape quelques mots du script ou de son titre…"
              className="pl-9"
              aria-label="Chercher le script utilisé"
            />
          </div>
          {liste.length > 0 && (
            <ul className="divide-y rounded-lg border bg-background">
              {liste.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      onChange(s.id);
                      setSaisie("");
                    }}
                  >
                    <span className="flex-1 truncate">{typographie(s.titre)}</span>
                    {tournes.has(s.id) && (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> déjà tourné
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {recherche.trim().length >= 2 && resultats && liste.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucun script ne correspond.</p>
          )}
        </>
      )}
    </div>
  );
}
