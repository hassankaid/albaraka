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
import { EchelleScreen } from "./screens/EchelleScreen";
import { AscensionScreen } from "./screens/AscensionScreen";
import { LtvScreen } from "./screens/LtvScreen";
import { LockScreen } from "./screens/LockScreen";
import { usePersistedM18State } from "./lib/usePersistedState";
import { type M18Step, stepIndex } from "./lib/types";
import { canEnterStep, missingFieldsLabel } from "./lib/validations";
import { buildDemoState } from "./lib/demo-cases";

const toast = (m: string) => sonner(m);

export default function M18ValueLadderPage() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { hasLiberty, isLoading: passLoading } = useUserPass();
  const userId = user?.id ?? null;

  const persisted = usePersistedM18State(userId);
  const [showRestart, setShowRestart] = useState(false);
  const [showExitDemo, setShowExitDemo] = useState(false);
  const [showDemoSelector, setShowDemoSelector] = useState(false);

  const isAuthorized = useMemo(() => {
    if (!profile) return false;
    if (profile.role === "ceo" || profile.role === "coach") return true;
    return hasLiberty;
  }, [profile, hasLiberty]);

  const goTo = useCallback((step: M18Step) => {
    let blocked = false;
    persisted.setState((prev) => {
      const idx = stepIndex(step), hi = stepIndex(prev.highest);
      const open = prev.demoMode || idx <= hi || canEnterStep(prev, step);
      if (!open) { blocked = true; return prev; }
      return { ...prev, current: step, highest: idx > hi ? step : prev.highest };
    });
    if (blocked) { sonner("Termine d’abord : " + (missingFieldsLabel(persisted.state, step) || "l’étape précédente")); return; }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [persisted]);

  const handleRestart = useCallback(async () => { setShowRestart(false); await persisted.resetState(); }, [persisted]);
  const handleSelectDemo = useCallback((id: string) => {
    const next = buildDemoState(id);
    if (!next) return;
    persisted.setState(() => next);
    setShowDemoSelector(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    sonner.success("Démo chargée : " + next._activeDemo!.name);
  }, [persisted]);
  const handleExitDemo = useCallback(async () => { setShowExitDemo(false); await persisted.resetState(); }, [persisted]);

  if (authLoading || passLoading) {
    return <div className="-mx-6 -my-6 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] bg-[#080808] p-6"><div className="mx-auto max-w-[1100px] space-y-3"><Skeleton className="h-10 w-1/3 bg-white/5" /><Skeleton className="h-64 w-full bg-white/5" /></div></div>;
  }
  if (!user) { navigate("/login"); return null; }
  if (!isAuthorized) {
    return (
      <div className="-mx-6 -my-6 flex min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] items-center justify-center bg-[#080808] p-6 text-center">
        <div className="max-w-md">
          <h2 className="mb-2 text-xl font-semibold text-white">Accès réservé</h2>
          <p className="text-sm text-white/60">L'outil M18 VALUE LADDER est réservé aux porteurs du pass LIBERTY.</p>
          <button type="button" onClick={() => navigate("/parcours/liberty")} className="mt-4 rounded-full px-4 py-2 text-sm font-medium text-[#C9A84C] underline">Retour au parcours</button>
        </div>
      </div>
    );
  }
  if (persisted.isLoading) {
    return <div className="-mx-6 -my-6 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] bg-[#080808] p-6"><div className="mx-auto max-w-[1100px] space-y-3"><Skeleton className="h-10 w-1/3 bg-white/5" /><Skeleton className="h-64 w-full bg-white/5" /></div></div>;
  }

  const { state, setState, flushNow } = persisted;
  const showRestartBtn = state.current !== "welcome" && !state.demoMode;

  return (
    <Shell state={state} onRestart={showRestartBtn ? () => setShowRestart(true) : undefined} onExitDemo={state.demoMode ? () => setShowExitDemo(true) : undefined} onGoToStep={(s) => goTo(s)}>
      {state.current === "welcome" && (showDemoSelector
        ? <DemoSelectorScreen onBack={() => setShowDemoSelector(false)} onSelect={handleSelectDemo} />
        : <WelcomeScreen state={state} onStart={() => goTo("echelle")} onOpenDemo={() => setShowDemoSelector(true)} />)}
      {state.current === "echelle" && <EchelleScreen state={state} setState={setState} onBack={() => goTo("welcome")} onNext={() => goTo("ascension")} />}
      {state.current === "ascension" && <AscensionScreen state={state} setState={setState} onBack={() => goTo("echelle")} onNext={() => goTo("ltv")} toast={toast} />}
      {state.current === "ltv" && <LtvScreen state={state} setState={setState} onBack={() => goTo("ascension")} onNext={() => goTo("lock")} />}
      {state.current === "lock" && <LockScreen state={state} setState={setState} userId={userId} onBack={() => goTo("ltv")} onGoToContent={() => goTo("echelle")} flushNow={flushNow} />}

      <AlertDialog open={showRestart} onOpenChange={setShowRestart}>
        <AlertDialogContent style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}>
          <AlertDialogHeader><AlertDialogTitle>Tout effacer et recommencer ?</AlertDialogTitle><AlertDialogDescription className="text-white/60">Tout le travail saisi dans le M18 sera perdu. Le contexte amont sera réimporté.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleRestart} style={{ background: "rgba(201,76,76,0.18)", color: "#c94c4c", border: "1px solid rgba(201,76,76,0.4)" }}>Tout effacer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showExitDemo} onOpenChange={setShowExitDemo}>
        <AlertDialogContent style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}>
          <AlertDialogHeader><AlertDialogTitle>Quitter le mode démo ?</AlertDialogTitle><AlertDialogDescription className="text-white/60">Tu reviens à ta vraie carte. Aucune donnée de la démo n'est sauvegardée.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Rester en démo</AlertDialogCancel><AlertDialogAction onClick={handleExitDemo}>Quitter</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}
