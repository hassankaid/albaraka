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
import { GateScreen } from "./screens/GateScreen";
import { PointsABScreen } from "./screens/PointsABScreen";
import { ObstaclesBrutScreen } from "./screens/ObstaclesBrutScreen";
import { ObstaclesOrdresScreen } from "./screens/ObstaclesOrdresScreen";
import { ModulesMappingScreen } from "./screens/ModulesMappingScreen";
import { ModuleFichesScreen } from "./screens/ModuleFichesScreen";
import { LockScreen } from "./screens/LockScreen";
import { DemoSelectorScreen } from "./screens/DemoSelectorScreen";
import { usePersistedM11State } from "./lib/usePersistedState";
import { type M11Step, type M11State, stepIndex } from "./lib/types";
import { M11_DEMO_CASES, buildDemoState } from "./lib/demo-cases";

export default function M11ConcevoirProgrammePage() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { hasLiberty, isLoading: passLoading } = useUserPass();
  const userId = user?.id ?? null;

  const persisted = usePersistedM11State(userId);
  const [showRestart, setShowRestart] = useState(false);
  const [showExitDemo, setShowExitDemo] = useState(false);
  const [showDemoSelector, setShowDemoSelector] = useState(false);
  const preDemoSnapshot = useRef<M11State | null>(null);

  const isAuthorized = useMemo(() => {
    if (!profile) return false;
    if (profile.role === "ceo" || profile.role === "coach") return true;
    return hasLiberty;
  }, [profile, hasLiberty]);

  const goTo = useCallback((step: M11Step) => {
    persisted.setState((prev) => {
      const nextHighest = stepIndex(step) > stepIndex(prev.highest) ? step : prev.highest;
      return { ...prev, current: step, highest: nextHighest };
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [persisted]);

  const handleRestart = useCallback(async () => { setShowRestart(false); await persisted.resetState(); }, [persisted]);

  const handleSelectDemo = useCallback((demoId: string) => {
    const next = buildDemoState(demoId);
    if (!next) return;
    if (!persisted.state.demoMode) preDemoSnapshot.current = persisted.state;
    persisted.setState(() => next);
    setShowDemoSelector(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [persisted]);

  const handleExitDemo = useCallback(async () => {
    setShowExitDemo(false);
    if (preDemoSnapshot.current) { const snap = preDemoSnapshot.current; preDemoSnapshot.current = null; persisted.setState(() => snap); }
    else { await persisted.resetState(); }
  }, [persisted]);

  if (authLoading || passLoading) {
    return (
      <div className="-mx-6 -my-6 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] bg-[#050505] p-6">
        <div className="mx-auto max-w-[960px] space-y-3"><Skeleton className="h-10 w-1/3 bg-white/5" /><Skeleton className="h-64 w-full bg-white/5" /></div>
      </div>
    );
  }
  if (!user) { navigate("/login"); return null; }
  if (!isAuthorized) {
    return (
      <div className="-mx-6 -my-6 flex min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] items-center justify-center bg-[#050505] p-6 text-center">
        <div className="max-w-md">
          <h2 className="mb-2 text-xl font-semibold text-white">Accès réservé</h2>
          <p className="text-sm text-white/60">L'outil M11 CONCEVOIR UN PROGRAMME est réservé aux porteurs du pass LIBERTY.</p>
          <button type="button" onClick={() => navigate("/parcours/liberty")} className="mt-4 rounded-full px-4 py-2 text-sm font-medium text-[#C9A84C] underline">Retour au parcours</button>
        </div>
      </div>
    );
  }
  if (persisted.isLoading) {
    return (
      <div className="-mx-6 -my-6 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] bg-[#050505] p-6">
        <div className="mx-auto max-w-[960px] space-y-3"><Skeleton className="h-10 w-1/3 bg-white/5" /><Skeleton className="h-64 w-full bg-white/5" /></div>
      </div>
    );
  }

  const { state, setState, flushNow } = persisted;
  const showRestartBtn = state.current !== "welcome" && !state.demoMode;
  const demoLabel = state.demoMode ? M11_DEMO_CASES.find((c) => c.id === state.demoMode)?.name.split("—")[0].trim() ?? state.demoMode : null;

  return (
    <Shell
      state={state}
      onRestart={showRestartBtn ? () => setShowRestart(true) : undefined}
      demoLabel={demoLabel}
      onExitDemo={state.demoMode ? () => setShowExitDemo(true) : undefined}
      onGoToStep={(s) => goTo(s)}
    >
      {showDemoSelector ? (
        <DemoSelectorScreen onBack={() => setShowDemoSelector(false)} onSelect={handleSelectDemo} />
      ) : (
        <>
          {state.current === "welcome" && <WelcomeScreen state={state} onStart={() => goTo("gate_transition")} onOpenDemo={() => setShowDemoSelector(true)} />}
          {state.current === "gate_transition" && <GateScreen state={state} setState={setState} onBack={() => goTo("welcome")} onNext={() => goTo("points_ab")} />}
          {state.current === "points_ab" && <PointsABScreen state={state} setState={setState} onBack={() => goTo("gate_transition")} onNext={() => goTo("obstacles_brut")} />}
          {state.current === "obstacles_brut" && <ObstaclesBrutScreen state={state} setState={setState} onBack={() => goTo("points_ab")} onNext={() => goTo("obstacles_ordres")} />}
          {state.current === "obstacles_ordres" && <ObstaclesOrdresScreen state={state} setState={setState} onBack={() => goTo("obstacles_brut")} onNext={() => goTo("modules_mapping")} />}
          {state.current === "modules_mapping" && <ModulesMappingScreen state={state} setState={setState} onBack={() => goTo("obstacles_ordres")} onNext={() => goTo("module_fiches")} />}
          {state.current === "module_fiches" && <ModuleFichesScreen state={state} setState={setState} onBack={() => goTo("modules_mapping")} onNext={() => goTo("lock")} />}
          {state.current === "lock" && <LockScreen state={state} setState={setState} userId={userId} onBack={() => goTo("module_fiches")} flushNow={flushNow} />}
        </>
      )}

      <AlertDialog open={showRestart} onOpenChange={setShowRestart}>
        <AlertDialogContent style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Tout effacer et recommencer ?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">Tout le travail saisi dans le M11 sera perdu. Le contexte amont (M1-M10) sera réimporté.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestart} style={{ background: "rgba(232,107,107,0.18)", color: "#E86B6B", border: "1px solid rgba(232,107,107,0.4)" }}>Tout effacer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showExitDemo} onOpenChange={setShowExitDemo}>
        <AlertDialogContent style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter le mode démo ?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">Tu reviens à ton vrai parcours. Aucune donnée de la démo n'est sauvegardée.</AlertDialogDescription>
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
