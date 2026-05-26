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
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { PontScreen } from "./screens/PontScreen";
import { ConditionsScreen } from "./screens/ConditionsScreen";
import { EatComplexityScreen } from "./screens/EatComplexityScreen";
import { StructureScreen } from "./screens/StructureScreen";
import { ConvictionScreen } from "./screens/ConvictionScreen";
import { LockScreen } from "./screens/LockScreen";
import { DemoSelectorScreen } from "./screens/DemoSelectorScreen";
import { usePersistedM5State } from "./lib/usePersistedState";
import { type M5Step, type M5State, PEDA_STEPS } from "./lib/types";

export default function M5HighTicketPage() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { hasLiberty, isLoading: passLoading } = useUserPass();
  const userId = user?.id ?? null;

  const persisted = usePersistedM5State(userId);
  const [showRestart, setShowRestart] = useState(false);
  const [showExitDemo, setShowExitDemo] = useState(false);
  const [showDemoSelector, setShowDemoSelector] = useState(false);
  const preDemoSnapshot = useRef<M5State | null>(null);

  const isAuthorized = useMemo(() => {
    if (!profile) return false;
    if (profile.role === "ceo" || profile.role === "coach") return true;
    return hasLiberty;
  }, [profile, hasLiberty]);

  const goTo = useCallback((step: M5Step) => {
    persisted.setState((prev) => ({ ...prev, step }));
  }, [persisted]);

  const handleRestart = useCallback(async () => {
    setShowRestart(false);
    await persisted.resetState();
  }, [persisted]);

  const handleSelectDemo = useCallback((key: string) => {
    if (!persisted.state.demoMode) preDemoSnapshot.current = persisted.state;
    persisted.setState((prev) => ({ ...prev, demoMode: key }));
    setShowDemoSelector(false);
  }, [persisted]);

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

  if (authLoading || passLoading) {
    return (
      <div className="-mx-6 -my-6 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] bg-[#050505] p-6">
        <div className="mx-auto max-w-[860px] space-y-3">
          <Skeleton className="h-10 w-1/3 bg-white/5" />
          <Skeleton className="h-64 w-full bg-white/5" />
        </div>
      </div>
    );
  }
  if (!user) { navigate("/login"); return null; }
  if (!isAuthorized) {
    return (
      <div className="-mx-6 -my-6 flex min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] items-center justify-center bg-[#050505] p-6 text-center">
        <div className="max-w-md">
          <h2 className="mb-2 text-xl font-semibold text-white">Accès réservé</h2>
          <p className="text-sm text-white/60">L'outil M5 HIGH-TICKET est réservé aux porteurs du pass LIBERTY.</p>
          <button type="button" onClick={() => navigate("/parcours/liberty")} className="mt-4 rounded-full px-4 py-2 text-sm font-medium text-[#C9A84C] underline">
            Retour au parcours
          </button>
        </div>
      </div>
    );
  }
  if (persisted.isLoading) {
    return (
      <div className="-mx-6 -my-6 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] bg-[#050505] p-6">
        <div className="mx-auto max-w-[860px] space-y-3">
          <Skeleton className="h-10 w-1/3 bg-white/5" />
          <Skeleton className="h-64 w-full bg-white/5" />
        </div>
      </div>
    );
  }

  const { state, setState, flushNow } = persisted;
  const showRestartBtn = state.step !== "welcome" && !state.demoMode;
  const demoLabel = state.demoMode || null;
  const m5Forced = PEDA_STEPS.some((k) => state.forced[k]);

  return (
    <Shell
      onRestart={showRestartBtn ? () => setShowRestart(true) : undefined}
      demoLabel={demoLabel}
      onExitDemo={state.demoMode ? () => setShowExitDemo(true) : undefined}
      upstreamForced={state.upstream_forced}
      m5Forced={m5Forced}
      signed={state.signed}
    >
      {showDemoSelector ? (
        <DemoSelectorScreen onBack={() => setShowDemoSelector(false)} onSelect={handleSelectDemo} />
      ) : (
        <>
          {state.step === "welcome" && (
            <WelcomeScreen
              state={state}
              setState={setState}
              onStart={() => goTo("pont")}
              onOpenDemo={() => setShowDemoSelector(true)}
            />
          )}
          {state.step === "pont" && (
            <PontScreen state={state} setState={setState} onBack={() => goTo("welcome")} onNext={() => goTo("conditions")} />
          )}
          {state.step === "conditions" && (
            <ConditionsScreen state={state} setState={setState} onBack={() => goTo("pont")} onNext={() => goTo("eatcomplex")} />
          )}
          {state.step === "eatcomplex" && (
            <EatComplexityScreen state={state} setState={setState} onBack={() => goTo("conditions")} onNext={() => goTo("structure")} />
          )}
          {state.step === "structure" && (
            <StructureScreen state={state} setState={setState} onBack={() => goTo("eatcomplex")} onNext={() => goTo("conviction")} />
          )}
          {state.step === "conviction" && (
            <ConvictionScreen state={state} setState={setState} onBack={() => goTo("structure")} onNext={() => goTo("lock")} />
          )}
          {state.step === "lock" && (
            <LockScreen state={state} setState={setState} userId={userId} onBack={() => goTo("conviction")} flushNow={flushNow} />
          )}
        </>
      )}

      <AlertDialog open={showRestart} onOpenChange={setShowRestart}>
        <AlertDialogContent style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Tout effacer et recommencer ?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Toutes les données saisies dans le M5 seront perdues. Le contexte M1+M2+M3+M4 sera réimporté.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestart} style={{ background: "rgba(232,107,107,0.18)", color: "#E86B6B", border: "1px solid rgba(232,107,107,0.4)" }}>
              Tout effacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showExitDemo} onOpenChange={setShowExitDemo}>
        <AlertDialogContent style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}>
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
