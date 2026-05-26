import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserPass } from "@/hooks/useUserPass";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shell } from "./components/Shell";
import { ProgressBar } from "./components/ProgressBar";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { usePersistedM1State } from "./lib/usePersistedState";
import type { M1State, M1Step } from "./lib/types";

/**
 * Page orchestrateur de l'outil M1 NICHE (V2).
 * Route : /parcours/liberty/m1
 *
 * Accès :
 * - Pass Liberty actif
 * - OU rôle CEO/coach (pour démo / support)
 */
export default function M1NichePage() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { hasLiberty, isLoading: passLoading } = useUserPass();
  const userId = user?.id ?? null;

  const persisted = usePersistedM1State(userId);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showExitDemoConfirm, setShowExitDemoConfirm] = useState(false);

  const isAuthorized = useMemo(() => {
    if (!profile) return false;
    if (profile.role === "ceo" || profile.role === "coach") return true;
    return hasLiberty;
  }, [profile, hasLiberty]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleChooseBranch = useCallback(
    (branch: "A" | "B") => {
      persisted.setState((prev) => ({
        ...prev,
        branch,
        step: branch === "A" ? "branchA_bilan" : "branchB_capture",
      }));
    },
    [persisted],
  );

  const handleResume = useCallback(() => {
    // Le state contient déjà la dernière étape — pas d'action nécessaire,
    // l'écran courant va automatiquement re-render au prochain step.
    // (Implémenté plus tard quand on aura les autres écrans.)
  }, []);

  const handleOpenDemo = useCallback(() => {
    // TODO Sprint 3 : ouvrir le sélecteur de démo.
    alert("Mode démo — à implémenter au Sprint 3");
  }, []);

  const handleRestart = useCallback(async () => {
    setShowRestartConfirm(false);
    await persisted.resetState();
  }, [persisted]);

  const handleExitDemo = useCallback(async () => {
    setShowExitDemoConfirm(false);
    // TODO Sprint 3 : restaurer le state pré-démo
    await persisted.resetState();
  }, [persisted]);

  // ─── Guard auth + access ────────────────────────────────────────────────
  if (authLoading || passLoading) {
    return (
      <div className="-mx-6 -my-6 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] bg-[#050505] p-6">
        <div className="mx-auto max-w-[760px] space-y-3">
          <Skeleton className="h-10 w-1/3 bg-white/5" />
          <Skeleton className="h-64 w-full bg-white/5" />
        </div>
      </div>
    );
  }
  if (!user) {
    navigate("/login");
    return null;
  }
  if (!isAuthorized) {
    return (
      <div className="-mx-6 -my-6 flex min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] items-center justify-center bg-[#050505] p-6 text-center">
        <div className="max-w-md">
          <h2 className="mb-2 text-xl font-semibold text-white">Accès réservé</h2>
          <p className="text-sm text-white/60">
            L'outil M1 NICHE est réservé aux porteurs du pass LIBERTY.
          </p>
          <button
            type="button"
            onClick={() => navigate("/parcours/liberty")}
            className="mt-4 rounded-full px-4 py-2 text-sm font-medium text-[#C9A84C] underline"
          >
            Retour au parcours
          </button>
        </div>
      </div>
    );
  }
  if (persisted.isLoading) {
    return (
      <div className="-mx-6 -my-6 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] bg-[#050505] p-6">
        <div className="mx-auto max-w-[760px] space-y-3">
          <Skeleton className="h-10 w-1/3 bg-white/5" />
          <Skeleton className="h-64 w-full bg-white/5" />
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  const { state } = persisted;
  const showRestart = state.step !== "welcome" && !state.demoMode;
  const progress = computeProgress(state.step, state.branch);

  return (
    <Shell
      onRestart={showRestart ? () => setShowRestartConfirm(true) : undefined}
      demoLabel={state.demoMode}
      onExitDemo={state.demoMode ? () => setShowExitDemoConfirm(true) : undefined}
    >
      {progress && (
        <ProgressBar stepLabel={progress.label} percent={progress.percent} />
      )}

      {state.step === "welcome" && (
        <WelcomeScreen
          state={state}
          onChooseBranch={handleChooseBranch}
          onOpenDemo={handleOpenDemo}
          onResume={handleResume}
          onRestart={() => setShowRestartConfirm(true)}
        />
      )}

      {state.step !== "welcome" && (
        <ScreenPlaceholder step={state.step} />
      )}

      {/* Confirmation Recommencer */}
      <AlertDialog open={showRestartConfirm} onOpenChange={setShowRestartConfirm}>
        <AlertDialogContent
          style={{
            background: "#0F0E0A",
            border: "0.5px solid rgba(201,168,76,0.4)",
            color: "#ECEEF4",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Tout effacer et recommencer ?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Toutes les données saisies dans le M1 NICHE seront perdues. Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestart}
              style={{
                background: "rgba(232,107,107,0.18)",
                color: "#E86B6B",
                border: "1px solid rgba(232,107,107,0.4)",
              }}
            >
              Tout effacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Quitter Démo */}
      <AlertDialog open={showExitDemoConfirm} onOpenChange={setShowExitDemoConfirm}>
        <AlertDialogContent
          style={{
            background: "#0F0E0A",
            border: "0.5px solid rgba(201,168,76,0.4)",
            color: "#ECEEF4",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter le mode démo ?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tu reviendras à ton vrai parcours. Aucune donnée de la démo n'est sauvegardée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Rester en démo</AlertDialogCancel>
            <AlertDialogAction onClick={handleExitDemo}>Quitter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function computeProgress(
  step: M1Step,
  branch: M1State["branch"],
): { label: string; percent: number } | null {
  if (step === "welcome") return null;
  // Ordres calés sur le HTML standalone Sidali (~9 étapes payantes après welcome).
  const orderA: M1Step[] = [
    "branchA_bilan",
    "branchA_brainstorm",
    "branchA_propositions",
    "sous_niche_2",
    "avatar",
    "validation",
    "engagement",
    "recap",
  ];
  const orderB: M1Step[] = [
    "branchB_capture",
    "branchB_stress",
    "sous_niche_2",
    "avatar",
    "validation",
    "engagement",
    "recap",
  ];
  const order = branch === "B" ? orderB : orderA;
  const idx = order.indexOf(step);
  if (idx < 0) return null;
  const total = order.length;
  const stepNum = idx + 1;
  return {
    label: `Étape ${stepNum} / ${total}`,
    percent: Math.round((stepNum / total) * 100),
  };
}

/**
 * Placeholder pour les écrans non encore implémentés (Sprints 2-5).
 * Remplacé au fur et à mesure par les vrais composants.
 */
function ScreenPlaceholder({ step }: { step: M1Step }) {
  return (
    <div className="rounded-xl border border-dashed border-[#C9A84C]/30 p-8 text-center">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">
        En construction
      </div>
      <h2 className="mb-2 text-xl font-semibold text-white">
        Écran « {step} » à implémenter
      </h2>
      <p className="text-sm text-white/60">
        Cet écran arrive au prochain sprint. Le squelette de persistance et de navigation est en
        place — il ne reste qu'à brancher le contenu.
      </p>
    </div>
  );
}
