import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { useParcours } from "@/hooks/useParcours";
import { useProchaineEtapeLiberty } from "@/hooks/useProchaineEtapeLiberty";
import { getLibertyChapitreTitreForRoute } from "@/pages/parcours/liberty/liberty-tool-routes";

/**
 * Enveloppe légère autour des outils Liberty (M1..M18).
 *
 * Affiche un bouton flottant UNE FOIS le module validé (= le chapitre du
 * parcours est marqué terminé par l'outil, à la signature). Permet d'enchaîner
 * sans repasser par la liste du parcours.
 *
 * Destination : le module de théorie suivant s'il reste à voir, sinon
 * directement l'outil suivant (voir useProchaineEtapeLiberty).
 *
 * N'altère PAS le layout full-bleed des outils : le bouton est en position
 * fixe (overlay) et n'apparaît qu'après validation, donc il ne gêne pas les
 * boutons de l'outil pendant le parcours.
 */
export function LibertyModuleFrame({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const titre = getLibertyChapitreTitreForRoute(location.pathname);
  const { parcours, progress } = useParcours("liberty");

  const ordered = parcours ? parcours.phases.flatMap((p) => p.chapitres) : [];
  const idx = titre ? ordered.findIndex((c) => c.titre === titre) : -1;
  const current = idx >= 0 ? ordered[idx] : null;
  const isCompleted = current
    ? progress?.completedChapitreIds.has(current.id) ?? false
    : false;

  const prochaine = useProchaineEtapeLiberty();

  // La théorie avant la pratique, y compris par URL directe ou vieux favori.
  // Tant que la progression n'est pas connue, on laisse passer : mieux vaut un
  // outil ouvert une seconde de trop qu'un élève coincé derrière un écran vide.
  const theorie = current && progress ? progress.theoriePour(current.id) : null;
  if (theorie) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
          <BookOpen className="h-6 w-6" />
        </div>
        <h1 className="font-heading text-2xl text-foreground">La théorie d'abord</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Cet outil s'ouvre une fois que tu as vu{" "}
          <span className="font-medium text-foreground">{theorie.titre}</span> dans ta formation.
        </p>
        <button
          type="button"
          onClick={() => navigate(theorie.route)}
          className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
          style={{ background: "#C9A84C", color: "#0A0A0A" }}
        >
          Voir le module
          <ArrowRight size={16} />
        </button>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate("/parcours/liberty")}
            className="text-xs text-muted-foreground underline"
          >
            Retour au parcours
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {isCompleted && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            justifyContent: "center",
            padding: "14px",
            zIndex: 50,
            pointerEvents: "none",
          }}
        >
          <button
            type="button"
            onClick={() => navigate(prochaine.route)}
            style={{
              pointerEvents: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#C9A84C",
              color: "#0A0A0A",
              border: "none",
              borderRadius: 999,
              padding: "12px 22px",
              fontSize: 14,
              fontWeight: 700,
              boxShadow: "0 8px 30px rgba(0,0,0,0.45)",
              cursor: "pointer",
            }}
          >
            <CheckCircle2 size={16} />
            {`Module validé — ${prochaine.libelle}`}
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
