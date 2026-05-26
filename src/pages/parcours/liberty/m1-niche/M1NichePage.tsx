import { useCallback, useMemo, useRef, useState } from "react";
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
import { BilanScreen } from "./screens/BilanScreen";
import { BrainstormScreen } from "./screens/BrainstormScreen";
import { PropositionsScreen } from "./screens/PropositionsScreen";
import { CaptureScreen } from "./screens/CaptureScreen";
import { StressTestScreen } from "./screens/StressTestScreen";
import { CrystalScreen } from "./screens/CrystalScreen";
import { AvatarScreen } from "./screens/AvatarScreen";
import { ValidationScreen } from "./screens/ValidationScreen";
import { LockScreen } from "./screens/LockScreen";
import { DemoSelectorScreen } from "./screens/DemoSelectorScreen";
import { usePersistedM1State } from "./lib/usePersistedState";
import { defaultM1State, type M1State, type M1Step } from "./lib/types";
import { DEMO_NICHES, type DemoNiche } from "./lib/demo-niches";

/**
 * Page orchestrateur de l'outil M1 NICHE (V2).
 * Route : /parcours/liberty/m1
 */
export default function M1NichePage() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { hasLiberty, isLoading: passLoading } = useUserPass();
  const userId = user?.id ?? null;

  const persisted = usePersistedM1State(userId);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showExitDemoConfirm, setShowExitDemoConfirm] = useState(false);
  const [showDemoSelector, setShowDemoSelector] = useState(false);
  // Backup du state pré-démo en RAM (pour restauration sans cassure du vrai parcours).
  const preDemoSnapshot = useRef<M1State | null>(null);

  const isAuthorized = useMemo(() => {
    if (!profile) return false;
    if (profile.role === "ceo" || profile.role === "coach") return true;
    return hasLiberty;
  }, [profile, hasLiberty]);

  // ─── Navigation entre étapes ─────────────────────────────────────────
  const goTo = useCallback(
    (step: M1Step) => {
      persisted.setState((prev) => ({ ...prev, step }));
    },
    [persisted],
  );

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
    // No-op : le state contient déjà la dernière étape, le render switchera dessus.
    // On force juste un re-render en touchant step si on est sur welcome avec une session.
    if (persisted.state.step === "welcome" && persisted.state.branch) {
      const nextStep: M1Step =
        persisted.state.branch === "A" ? "branchA_bilan" : "branchB_capture";
      persisted.setState((prev) => ({ ...prev, step: nextStep }));
    }
  }, [persisted]);

  const handleRestart = useCallback(async () => {
    setShowRestartConfirm(false);
    preDemoSnapshot.current = null;
    setShowDemoSelector(false);
    await persisted.resetState();
  }, [persisted]);

  // ─── Mode démo ────────────────────────────────────────────────────────
  const handleOpenDemoSelector = useCallback(() => {
    setShowDemoSelector(true);
  }, []);

  const handleSelectDemo = useCallback(
    (niche: DemoNiche) => {
      // Sauve le state actuel pour pouvoir y revenir en sortie de démo.
      if (!persisted.state.demoMode) {
        preDemoSnapshot.current = persisted.state;
      }
      // Construit un state propre, on n'y mélange pas la session réelle.
      const fresh = defaultM1State();
      const next: M1State = {
        ...fresh,
        ...niche.patch,
        sous_niche_2: { ...fresh.sous_niche_2, ...(niche.patch.sous_niche_2 ?? {}) },
        avatar: niche.patch.avatar ?? fresh.avatar,
        demoMode: niche.key,
      };
      persisted.setState(() => next);
      setShowDemoSelector(false);
    },
    [persisted],
  );

  const handleExitDemo = useCallback(async () => {
    setShowExitDemoConfirm(false);
    // Restaure le state pré-démo s'il existe, sinon repart à zéro.
    if (preDemoSnapshot.current) {
      const snap = preDemoSnapshot.current;
      preDemoSnapshot.current = null;
      persisted.setState(() => snap);
    } else {
      await persisted.resetState();
    }
  }, [persisted]);

  // ─── Guards ──────────────────────────────────────────────────────────
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

  // ─── Render ──────────────────────────────────────────────────────────
  const { state, setState, flushNow } = persisted;
  const showRestart = state.step !== "welcome" && !state.demoMode;
  const progress = computeProgress(state.step, state.branch);
  const demoLabel = state.demoMode
    ? findDemoLabel(state.demoMode)
    : null;

  return (
    <Shell
      onRestart={showRestart ? () => setShowRestartConfirm(true) : undefined}
      demoLabel={demoLabel}
      onExitDemo={demoLabel ? () => setShowExitDemoConfirm(true) : undefined}
    >
      {progress && <ProgressBar stepLabel={progress.label} percent={progress.percent} />}

      {/* Sélecteur démo en surcouche */}
      {showDemoSelector && (
        <DemoSelectorScreen
          onBack={() => setShowDemoSelector(false)}
          onSelect={handleSelectDemo}
        />
      )}

      {/* Écrans principaux */}
      {!showDemoSelector && state.step === "welcome" && (
        <WelcomeScreen
          state={state}
          onChooseBranch={handleChooseBranch}
          onOpenDemo={handleOpenDemoSelector}
          onResume={handleResume}
          onRestart={() => setShowRestartConfirm(true)}
        />
      )}

      {!showDemoSelector && state.step === "branchA_bilan" && (
        <BilanScreen
          state={state}
          setState={setState}
          onBack={() => goTo("welcome")}
          onNext={() => goTo("branchA_brainstorm")}
        />
      )}

      {!showDemoSelector && state.step === "branchA_brainstorm" && (
        <BrainstormScreen
          state={state}
          setState={setState}
          onBack={() => goTo("branchA_bilan")}
          onNext={() => goTo("branchA_propositions")}
        />
      )}

      {!showDemoSelector && state.step === "branchA_propositions" && (
        <PropositionsScreen
          state={state}
          setState={setState}
          onBack={() => goTo("branchA_brainstorm")}
          onNext={() => goTo("sous_niche_2")}
        />
      )}

      {!showDemoSelector && state.step === "branchB_capture" && (
        <CaptureScreen
          state={state}
          setState={setState}
          onBack={() => goTo("welcome")}
          onNext={() => goTo("branchB_stress")}
        />
      )}

      {!showDemoSelector && state.step === "branchB_stress" && (
        <StressTestScreen
          state={state}
          setState={setState}
          onBack={() => goTo("branchB_capture")}
          onNextCristallisation={() => goTo("sous_niche_2")}
          onSwitchToA={() => {
            setState((prev) => ({ ...prev, branch: "A", step: "branchA_bilan" }));
          }}
        />
      )}

      {!showDemoSelector && state.step === "sous_niche_2" && (
        <CrystalScreen
          state={state}
          setState={setState}
          onBack={() =>
            goTo(state.branch === "A" ? "branchA_propositions" : "branchB_stress")
          }
          onNext={() => goTo("avatar")}
        />
      )}

      {!showDemoSelector && state.step === "avatar" && (
        <AvatarScreen
          state={state}
          setState={setState}
          onBack={() => goTo("sous_niche_2")}
          onNext={() => goTo("validation")}
        />
      )}

      {!showDemoSelector && state.step === "validation" && (
        <ValidationScreen
          state={state}
          setState={setState}
          onBack={() => goTo("avatar")}
          onNext={() => goTo("engagement")}
        />
      )}

      {!showDemoSelector && (state.step === "engagement" || state.step === "recap") && (
        <LockScreen
          state={state}
          setState={setState}
          userId={userId}
          onBack={() => goTo("validation")}
          flushNow={flushNow}
        />
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
  const orderA: M1Step[] = [
    "branchA_bilan",
    "branchA_brainstorm",
    "branchA_propositions",
    "sous_niche_2",
    "avatar",
    "validation",
    "engagement",
  ];
  const orderB: M1Step[] = [
    "branchB_capture",
    "branchB_stress",
    "sous_niche_2",
    "avatar",
    "validation",
    "engagement",
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

function findDemoLabel(key: string): string | null {
  const found = DEMO_NICHES.find((n) => n.key === key);
  return found?.label ?? null;
}
