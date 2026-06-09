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
import { DemoSelectorScreen } from "./screens/DemoSelectorScreen";
import { FormatScreen } from "./screens/FormatScreen";
import { ArchitectureScreen } from "./screens/ArchitectureScreen";
import { PricingScreen } from "./screens/PricingScreen";
import { LockScreen } from "./screens/LockScreen";
import { usePersistedM14State } from "./lib/usePersistedState";
import { type M14Step, type M14State, stepIndex } from "./lib/types";
import { M14_DEMO_CASES, buildDemoState } from "./lib/demo-cases";

export default function M14MiddleTicketPage() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { hasLiberty, isLoading: passLoading } = useUserPass();
  const userId = user?.id ?? null;

  const persisted = usePersistedM14State(userId);
  const [showRestart, setShowRestart] = useState(false);
  const [showExitDemo, setShowExitDemo] = useState(false);
  const [showDemoSelector, setShowDemoSelector] = useState(false);
  const preDemoSnapshot = useRef<M14State | null>(null);

  const isAuthorized = useMemo(() => {
    if (!profile) return false;
    if (profile.role === "ceo" || profile.role === "coach") return true;
    return hasLiberty;
  }, [profile, hasLiberty]);

  const goTo = useCallback((step: M14Step) => {
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
    return <div className="-mx-6 -my-6 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] bg-[#050505] p-6"><div className="mx-auto max-w-[960px] space-y-3"><Skeleton className="h-10 w-1/3 bg-white/5" /><Skeleton className="h-64 w-full bg-white/5" /></div></div>;
  }
  if (!user) { navigate("/login"); return null; }
  if (!isAuthorized) {
    return (
      <div className="-mx-6 -my-6 flex min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] items-center justify-center bg-[#050505] p-6 text-center">
        <div className="max-w-md">
          <h2 className="mb-2 text-xl font-semibold text-white">Accès réservé</h2>
          <p className="text-sm text-white/60">L'outil M14 MIDDLE-TICKET est réservé aux porteurs du pass LIBERTY.</p>
          <button type="button" onClick={() => navigate("/parcours/liberty")} className="mt-4 rounded-full px-4 py-2 text-sm font-medium text-[#C9A84C] underline">Retour au parcours</button>
        </div>
      </div>
    );
  }
  if (persisted.isLoading) {
    return <div className="-mx-6 -my-6 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] bg-[#050505] p-6"><div className="mx-auto max-w-[960px] space-y-3"><Skeleton className="h-10 w-1/3 bg-white/5" /><Skeleton className="h-64 w-full bg-white/5" /></div></div>;
  }

  const { state, setState, flushNow } = persisted;
  const showRestartBtn = state.current !== "welcome" && !state.demoMode;
  const demoLabel = state.demoMode ? M14_DEMO_CASES.find((c) => c.id === state.demoMode)?.name.split("—")[0].trim() ?? state.demoMode : null;

  return (
    <Shell state={state} onRestart={showRestartBtn ? () => setShowRestart(true) : undefined} demoLabel={demoLabel} onExitDemo={state.demoMode ? () => setShowExitDemo(true) : undefined} onGoToStep={(s) => goTo(s)}>
      {showDemoSelector ? (
        <DemoSelectorScreen onBack={() => setShowDemoSelector(false)} onSelect={handleSelectDemo} />
      ) : (
        <>
          {state.current === "welcome" && <WelcomeScreen state={state} onStart={() => goTo("format")} onOpenDemo={() => setShowDemoSelector(true)} />}
          {state.current === "format" && <FormatScreen state={state} setState={setState} onBack={() => goTo("welcome")} onNext={() => goTo("architecture")} />}
          {state.current === "architecture" && <ArchitectureScreen state={state} setState={setState} onBack={() => goTo("format")} onNext={() => goTo("pricing")} />}
          {state.current === "pricing" && <PricingScreen state={state} setState={setState} onBack={() => goTo("architecture")} onNext={() => goTo("lock")} />}
          {state.current === "lock" && <LockScreen state={state} setState={setState} userId={userId} onBack={() => goTo("pricing")} flushNow={flushNow} />}
        </>
      )}

      <AlertDialog open={showRestart} onOpenChange={setShowRestart}>
        <AlertDialogContent style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}>
          <AlertDialogHeader><AlertDialogTitle>Tout effacer et recommencer ?</AlertDialogTitle><AlertDialogDescription className="text-white/60">Tout le travail saisi dans le M14 sera perdu. Le contexte amont (M1-M13) sera réimporté.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleRestart} style={{ background: "rgba(232,107,107,0.18)", color: "#E86B6B", border: "1px solid rgba(232,107,107,0.4)" }}>Tout effacer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showExitDemo} onOpenChange={setShowExitDemo}>
        <AlertDialogContent style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}>
          <AlertDialogHeader><AlertDialogTitle>Quitter le mode démo ?</AlertDialogTitle><AlertDialogDescription className="text-white/60">Tu reviens à ton vrai parcours. Aucune donnée de la démo n'est sauvegardée.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Rester en démo</AlertDialogCancel><AlertDialogAction onClick={handleExitDemo}>Quitter</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}
