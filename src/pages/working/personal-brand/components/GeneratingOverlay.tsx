import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

const STEP_MESSAGES = [
  "Analyse de ton histoire...",
  "Recherche de ton ton unique...",
  "Rédaction du profil Créatif...",
  "Rédaction du profil Authentique...",
  "Rédaction du profil Premium...",
  "Finalisation de tes 10 profils...",
];

// Total estimated duration to reach 90 % (ms). Real gen takes ~25-35s.
const RAMP_DURATION_MS = 28_000;
const TICK_MS = 300;

export function GeneratingOverlay() {
  const [pct, setPct] = useState(2);
  const [msgIdx, setMsgIdx] = useState(0);

  // Progress ramp — eased, capped at 90 until parent unmounts the overlay.
  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / RAMP_DURATION_MS, 1);
      // Ease-out cubic, capped à 90
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.min(2 + eased * 88, 90);
      setPct(next);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Rotate step messages every ~5s.
  useEffect(() => {
    const id = window.setInterval(() => {
      setMsgIdx((i) => (i + 1) % STEP_MESSAGES.length);
    }, 5_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-primary/30 shadow-2xl">
        <CardContent className="p-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
              <Sparkles className="relative h-12 w-12 text-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-heading text-xl text-foreground">
              L'IA écrit tes 10 profils Personal Brand
            </h3>
            <p className="text-sm text-muted-foreground">
              ~30 secondes. Ne ferme pas cette fenêtre.
            </p>
          </div>
          <div className="space-y-2">
            <Progress value={pct} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="italic">{STEP_MESSAGES[msgIdx]}</span>
              <span>{Math.round(pct)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
