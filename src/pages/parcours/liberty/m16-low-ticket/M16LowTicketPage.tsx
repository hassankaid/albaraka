import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast as sonner } from "sonner";
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
import { RoleScreen } from "./screens/RoleScreen";
import { FormatScreen } from "./screens/FormatScreen";
import { PromesseScreen } from "./screens/PromesseScreen";
import { PricingScreen } from "./screens/PricingScreen";
import { GenerationScreen } from "./screens/GenerationScreen";
import { LockScreen } from "./screens/LockScreen";
import { usePersistedM16State } from "./lib/usePersistedState";
import { type M16Step, stepIndex } from "./lib/types";
import { stepUnlocked } from "./lib/validations";
import { buildDemoState } from "./lib/demo-cases";

const toast = (m: string) => sonner(m);

export default function M16LowTicketPage() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { hasLiberty, isLoading: passLoading } = useUserPass();
  const userId = user?.id ?? null;

  const persisted = usePersistedM16State(userId);
  const [showRestart, setShowRestart] = useState(false);
  const [showExitDemo, setShowExitDemo] = useState(false);
  const [showDemoSelector, setShowDemoSelector] = useState(false);

  const isAuthorized = useMemo(() => {
    if (!profile) return false;
    if (profile.role === "ceo" || profile.role === "coach") return true;
    return hasLiberty;
  }, [profile, hasLiberty]);

  const goTo = useCallback((step: M16Step) => {
    let blocked = false;
    persisted.setState((prev) => {
      if (!stepUnlocked(step, prev)) { blocked = true; return prev; }
      const nextHighest = stepIndex(step) > stepIndex(prev.highest) ? step : prev.highest;
      return { ...prev, current: step, highest: nextHighest };
    });
    if (blocked) { sonner("Termine l'étape précédente d'abord."); return; }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [persisted]);

  const handleRestart = useCallback(async () => { setShowRestart(false); await persisted.resetState(); }, [persisted]);
  const handleSelectDemo = useCallback((id: string) => {
    const next = buildDemoState(id);
    if (!next) return;
    persisted.setState(() => next);
    setShowDemoSelector(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [persisted]);
  const handleExitDemo = useCallback(async () => { setShowExitDemo(false); await persisted.resetState(); }, [persisted]);

  if (authLoading || passLoading) {
    return <div className="-mx-6 -my-6 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] bg-[#080808] p-6"><div className="mx-auto max-w-[980px] space-y-3"><Skeleton className="h-10 w-1/3 bg-white/5" /><Skeleton className="h-64 w-full bg-white/5" /></div></div>;
  }
  if (!user) { navigate("/login"); return null; }
  if (!isAuthorized) {
    return (
      <div className="-mx-6 -my-6 flex min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] items-center justify-center bg-[#080808] p-6 text-center">
        <div className="max-w-md">
          <h2 className="mb-2 text-xl font-semibold text-white">Accès réservé</h2>
          <p className="text-sm text-white/60">L'outil M16 LOW-TICKET est réservé aux porteurs du pass LIBERTY.</p>
          <button type="button" onClick={() => navigate("/parcours/liberty")} className="mt-4 rounded-full px-4 py-2 text-sm font-medium text-[#C9A84C] underline">Retour au parcours</button>
        </div>
      </div>
    );
  }
  if (persisted.isLoading) {
    return <div className="-mx-6 -my-6 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] bg-[#080808] p-6"><div className="mx-auto max-w-[980px] space-y-3"><Skeleton className="h-10 w-1/3 bg-white/5" /><Skeleton className="h-64 w-full bg-white/5" /></div></div>;
  }

  const { state, setState, flushNow } = persisted;
  const showRestartBtn = state.current !== "welcome" && !state.demoMode;

  return (
    <Shell state={state} onRestart={showRestartBtn ? () => setShowRestart(true) : undefined} onExitDemo={state.demoMode ? () => setShowExitDemo(true) : undefined} onGoToStep={(s) => goTo(s)}>
      {state.current === "welcome" && (showDemoSelector
        ? <DemoSelectorScreen onBack={() => setShowDemoSelector(false)} onSelect={handleSelectDemo} />
        : <WelcomeScreen state={state} onStart={() => goTo("role")} onOpenDemo={() => setShowDemoSelector(true)} />)}
      {state.current === "role" && <RoleScreen onBack={() => goTo("welcome")} onNext={() => goTo("format")} />}
      {state.current === "format" && <FormatScreen state={state} setState={setState} onBack={() => goTo("role")} onNext={() => goTo("promesse")} />}
      {state.current === "promesse" && <PromesseScreen state={state} setState={setState} onBack={() => goTo("format")} onNext={() => goTo("pricing")} />}
      {state.current === "pricing" && <PricingScreen state={state} setState={setState} onBack={() => goTo("promesse")} onNext={() => goTo("generation")} />}
      {state.current === "generation" && <GenerationScreen state={state} setState={setState} onBack={() => goTo("pricing")} onNext={() => goTo("lock")} toast={toast} />}
      {state.current === "lock" && <LockScreen state={state} setState={setState} userId={userId} onBack={() => goTo("pricing")} onGoToGeneration={() => goTo("generation")} flushNow={flushNow} toast={toast} />}

      <AlertDialog open={showRestart} onOpenChange={setShowRestart}>
        <AlertDialogContent style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}>
          <AlertDialogHeader><AlertDialogTitle>Tout effacer et recommencer ?</AlertDialogTitle><AlertDialogDescription className="text-white/60">Tout le travail saisi dans le M16 sera perdu. Le contexte amont sera réimporté.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleRestart} style={{ background: "rgba(212,88,79,0.18)", color: "#d4584f", border: "1px solid rgba(212,88,79,0.4)" }}>Tout effacer</AlertDialogAction></AlertDialogFooter>
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
