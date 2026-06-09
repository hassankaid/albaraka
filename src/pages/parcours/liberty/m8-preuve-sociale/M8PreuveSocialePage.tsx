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
import { BriefScreen } from "./screens/BriefScreen";
import { MessagesScreen } from "./screens/MessagesScreen";
import { LockScreen } from "./screens/LockScreen";
import { DemoSelectorScreen } from "./screens/DemoSelectorScreen";
import { usePersistedM8State } from "./lib/usePersistedState";
import { type M8Step, type M8State, defaultM8State } from "./lib/types";
import { M8_DEMO_CASES, type M8DemoCase } from "./lib/demo-cases";

export default function M8PreuveSocialePage() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { hasLiberty, isLoading: passLoading } = useUserPass();
  const userId = user?.id ?? null;

  const persisted = usePersistedM8State(userId);
  const [showRestart, setShowRestart] = useState(false);
  const [showExitDemo, setShowExitDemo] = useState(false);
  const [showDemoSelector, setShowDemoSelector] = useState(false);
  const preDemoSnapshot = useRef<M8State | null>(null);

  const isAuthorized = useMemo(() => {
    if (!profile) return false;
    if (profile.role === "ceo" || profile.role === "coach") return true;
    return hasLiberty;
  }, [profile, hasLiberty]);

  const goTo = useCallback((step: M8Step) => {
    persisted.setState((prev) => ({ ...prev, current: step }));
  }, [persisted]);

  const handleRestart = useCallback(async () => {
    setShowRestart(false);
    await persisted.resetState();
  }, [persisted]);

  const handleSelectDemo = useCallback((c: M8DemoCase) => {
    if (!c.patch) return;
    if (!persisted.state.demoMode) preDemoSnapshot.current = persisted.state;
    const fresh = defaultM8State();
    const next: M8State = { ...fresh, ...c.patch, demoMode: c.key } as M8State;
    persisted.setState(() => next);
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
          <p className="text-sm text-white/60">L'outil M8 PREUVE SOCIALE est réservé aux porteurs du pass LIBERTY.</p>
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
  const showRestartBtn = state.current !== "welcome" && !state.demoMode;
  const demoLabel = state.demoMode
    ? M8_DEMO_CASES.find((c) => c.key === state.demoMode)?.name.split("—")[0].trim() ?? state.demoMode
    : null;

  return (
    <Shell
      onRestart={showRestartBtn ? () => setShowRestart(true) : undefined}
      demoLabel={demoLabel}
      onExitDemo={state.demoMode ? () => setShowExitDemo(true) : undefined}
      upstreamForced={state.upstream_forced}
      signed={state.signed}
    >
      {showDemoSelector ? (
        <DemoSelectorScreen onBack={() => setShowDemoSelector(false)} onSelect={handleSelectDemo} />
      ) : (
        <>
          {state.current === "welcome" && (
            <WelcomeScreen state={state} onStart={() => goTo("brief_client")} onOpenDemo={() => setShowDemoSelector(true)} />
          )}
          {state.current === "brief_client" && (
            <BriefScreen state={state} setState={setState} onBack={() => goTo("welcome")} onNext={() => goTo("messages_generes")} />
          )}
          {state.current === "messages_generes" && (
            <MessagesScreen state={state} setState={setState} onBack={() => goTo("brief_client")} onNext={() => goTo("lock")} />
          )}
          {state.current === "lock" && (
            <LockScreen state={state} setState={setState} userId={userId} onBack={() => goTo("messages_generes")} flushNow={flushNow} />
          )}
        </>
      )}

      <AlertDialog open={showRestart} onOpenChange={setShowRestart}>
        <AlertDialogContent style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Tout effacer et recommencer ?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Le brief saisi dans le M8 sera perdu. Le contexte M1-M7 sera réimporté.
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
