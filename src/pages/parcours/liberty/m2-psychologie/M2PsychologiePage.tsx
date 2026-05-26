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
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { Step1Pains } from "./screens/Step1Pains";
import { Step2Desires } from "./screens/Step2Desires";
import { Step3Proofs } from "./screens/Step3Proofs";
import { Step4Levers } from "./screens/Step4Levers";
import { Step5Bias } from "./screens/Step5Bias";
import { Step6Phase } from "./screens/Step6Phase";
import { Step7Vocab } from "./screens/Step7Vocab";
import { Step8Brief } from "./screens/Step8Brief";
import { LockScreen } from "./screens/LockScreen";
import { DemoSelectorScreen } from "./screens/DemoSelectorScreen";
import { usePersistedM2State } from "./lib/usePersistedState";
import { defaultM2State, type M2Step, type M2State } from "./lib/types";
import { M2_DEMO_CASES, type M2DemoCase } from "./lib/demo-cases";
import { useRef } from "react";

/**
 * Page orchestrateur de l'outil M2 PSYCHOLOGIE DE L'ACHETEUR.
 * Route : /parcours/liberty/m2
 */
export default function M2PsychologiePage() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { hasLiberty, isLoading: passLoading } = useUserPass();
  const userId = user?.id ?? null;

  const persisted = usePersistedM2State(userId);
  const [showRestart, setShowRestart] = useState(false);
  const [showExitDemo, setShowExitDemo] = useState(false);
  const [showDemoSelector, setShowDemoSelector] = useState(false);
  const preDemoSnapshot = useRef<M2State | null>(null);

  const isAuthorized = useMemo(() => {
    if (!profile) return false;
    if (profile.role === "ceo" || profile.role === "coach") return true;
    return hasLiberty;
  }, [profile, hasLiberty]);

  const goTo = useCallback(
    (step: M2Step) => {
      persisted.setState((prev) => ({ ...prev, step }));
    },
    [persisted],
  );

  const handleRestart = useCallback(async () => {
    setShowRestart(false);
    await persisted.resetState();
  }, [persisted]);

  const handleSelectDemo = useCallback(
    (c: M2DemoCase) => {
      if (!c.patch) return;
      if (!persisted.state.demoMode) {
        preDemoSnapshot.current = persisted.state;
      }
      const fresh = defaultM2State();
      const next: M2State = {
        ...fresh,
        ...c.patch,
        demoMode: c.key,
      } as M2State;
      persisted.setState(() => next);
      setShowDemoSelector(false);
    },
    [persisted],
  );

  const handleExitDemo = useCallback(async () => {
    setShowExitDemo(false);
    if (preDemoSnapshot.current) {
      const snap = preDemoSnapshot.current;
      preDemoSnapshot.current = null;
      persisted.setState(() => snap);
    } else {
      await persisted.resetState();
    }
  }, [persisted]);

  const demoLabel = persisted.state.demoMode
    ? M2_DEMO_CASES.find((c) => c.key === persisted.state.demoMode)?.title.split("·")[0].trim() ?? null
    : null;

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
            L'outil M2 PSYCHOLOGIE est réservé aux porteurs du pass LIBERTY.
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

  const { state, setState, flushNow } = persisted;
  const showRestartBtn = state.step !== "welcome" && !state.demoMode;

  return (
    <Shell
      onRestart={showRestartBtn ? () => setShowRestart(true) : undefined}
      demoLabel={demoLabel}
      onExitDemo={state.demoMode ? () => setShowExitDemo(true) : undefined}
    >
      {showDemoSelector ? (
        <DemoSelectorScreen
          onBack={() => setShowDemoSelector(false)}
          onSelect={handleSelectDemo}
        />
      ) : (
        <>
      {state.step === "welcome" && (
        <WelcomeScreen
          state={state}
          onStart={() => goTo("step1")}
          onOpenDemo={() => setShowDemoSelector(true)}
        />
      )}
      {state.step === "step1" && (
        <Step1Pains state={state} setState={setState} onBack={() => goTo("welcome")} onNext={() => goTo("step2")} />
      )}
      {state.step === "step2" && (
        <Step2Desires state={state} setState={setState} onBack={() => goTo("step1")} onNext={() => goTo("step3")} />
      )}
      {state.step === "step3" && (
        <Step3Proofs state={state} setState={setState} onBack={() => goTo("step2")} onNext={() => goTo("step4")} />
      )}
      {state.step === "step4" && (
        <Step4Levers state={state} setState={setState} onBack={() => goTo("step3")} onNext={() => goTo("step5")} />
      )}
      {state.step === "step5" && (
        <Step5Bias state={state} setState={setState} onBack={() => goTo("step4")} onNext={() => goTo("step6")} />
      )}
      {state.step === "step6" && (
        <Step6Phase state={state} setState={setState} onBack={() => goTo("step5")} onNext={() => goTo("step7")} />
      )}
      {state.step === "step7" && (
        <Step7Vocab state={state} setState={setState} onBack={() => goTo("step6")} onNext={() => goTo("step8")} />
      )}
      {state.step === "step8" && (
        <Step8Brief state={state} setState={setState} onBack={() => goTo("step7")} onNext={() => goTo("lock")} />
      )}
      {state.step === "lock" && (
        <LockScreen
          state={state}
          setState={setState}
          userId={userId}
          onBack={() => goTo("step8")}
          flushNow={flushNow}
        />
      )}
        </>
      )}

      <AlertDialog open={showRestart} onOpenChange={setShowRestart}>
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
              Toutes les données saisies dans le M2 PSYCHOLOGIE seront perdues. Le contexte importé
              du M1 sera réimporté automatiquement.
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

      <AlertDialog open={showExitDemo} onOpenChange={setShowExitDemo}>
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
              Tu reviens à ton vrai parcours. Aucune donnée de la démo n'est sauvegardée.
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
