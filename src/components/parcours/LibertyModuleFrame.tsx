import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useParcours } from "@/hooks/useParcours";
import {
  getLibertyChapitreTitreForRoute,
  getLibertyToolRouteForChapitre,
} from "@/pages/parcours/liberty/liberty-tool-routes";

/**
 * Enveloppe légère autour des outils Liberty (M1..M18).
 *
 * Affiche un bouton flottant « Passer au module suivant » UNE FOIS le module
 * validé (= le chapitre du parcours est marqué terminé par l'outil, à la
 * signature). Permet d'enchaîner sans repasser par la liste du parcours.
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
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;
  const isCompleted = current
    ? progress?.completedChapitreIds.has(current.id) ?? false
    : false;

  // Route du module suivant : son outil si dispo, sinon sa page chapitre
  // (ex. modules sans outil M9/M10…), sinon retour au parcours.
  const nextRoute = next
    ? getLibertyToolRouteForChapitre("liberty", next.titre) ??
      `/parcours/liberty/chapitre/${next.id}`
    : "/parcours/liberty";

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
            onClick={() => navigate(nextRoute)}
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
            {next ? "Module validé — Passer au module suivant" : "Module validé — Retour au parcours"}
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
