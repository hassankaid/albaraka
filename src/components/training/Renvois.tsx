// L'encart « Pour aller plus loin » d'un chapitre ou d'une vidéo.
//
// Chaque renvoi mène à un autre chapitre, éventuellement à une vidéo précise.
// Si l'élève n'a pas la formation cible, le renvoi reste visible mais
// verrouillé (choix de Hassan le 28/09/2026) : il voit où aller, pas le
// contenu — la base, de toute façon, ne le lui servirait pas.
import { Link } from "react-router-dom";
import { ArrowRight, CornerDownRight, EyeOff, Lock } from "lucide-react";
import { lienRenvoi, type Renvoi } from "@/hooks/useRenvois";

/** « Setting › Traiter les objections · Vidéo : Le prix » — la formation n'est citée que si elle change. */
export function cheminCible(r: Renvoi): string {
  const morceaux = [r.meme_formation ? null : r.cible_formation_titre, r.cible_chapitre_titre].filter(Boolean);
  const chemin = morceaux.join(" › ");
  return r.cible_video_titre ? `${chemin} · ${r.cible_video_titre}` : chemin;
}

function CarteRenvoi({ r }: { r: Renvoi }) {
  const contenu = (
    <>
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
        {r.accessible ? (
          <CornerDownRight className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        {r.message && <span className="block text-sm text-foreground whitespace-pre-line">{r.message}</span>}
        <span className={`block text-sm ${r.message ? "text-muted-foreground" : "font-medium text-foreground"}`}>
          {cheminCible(r)}
        </span>
        {!r.accessible && (
          <span className="block text-xs text-muted-foreground">
            Disponible avec la formation {r.cible_formation_titre}
          </span>
        )}
        {!r.cible_publiee && (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
            <EyeOff className="h-3 w-3" />
            Cible en brouillon — invisible pour les élèves
          </span>
        )}
      </span>
      {r.accessible && <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />}
    </>
  );

  if (!r.accessible) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3" aria-disabled="true">
        {contenu}
      </div>
    );
  }
  return (
    <Link
      to={lienRenvoi(r)}
      className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-secondary/50"
    >
      {contenu}
    </Link>
  );
}

export default function Renvois({ renvois, titre = "Pour aller plus loin" }: { renvois: Renvoi[]; titre?: string }) {
  if (renvois.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <CornerDownRight className="h-4 w-4 text-primary" />
        {titre}
      </h3>
      <div className="grid gap-2">
        {renvois.map((r) => (
          <CarteRenvoi key={r.id} r={r} />
        ))}
      </div>
    </div>
  );
}
