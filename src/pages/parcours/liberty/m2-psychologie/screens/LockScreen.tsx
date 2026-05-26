import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileText, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { TextInput, InputLabel, Btn, Actions } from "../../m1-niche/components/ui";
import { exportM2PDF } from "../lib/exportPDF";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useParcours, useCompleteChapitre } from "@/hooks/useParcours";
import { supabase } from "@/integrations/supabase/client";
import { pickAvatarName, type M2State } from "../lib/types";

interface LockProps {
  state: M2State;
  setState: (next: (prev: M2State) => M2State) => void;
  userId: string | null;
  onBack: () => void;
  flushNow: () => Promise<void>;
}

const AVG_SCORE_THRESHOLD = 60;

export function LockScreen({ state, setState, userId, onBack, flushNow }: LockProps) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { parcours } = useParcours("liberty");
  const completeMutation = useCompleteChapitre();
  const avatar = pickAvatarName(state);

  const scores = state.scores;
  const validScores = Object.values(scores).filter((s): s is number => s !== null);
  const avg = validScores.length
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : 0;
  const stepsDone = validScores.length;
  const signed = (state.signed.name ?? "").trim().length >= 3;

  const today = new Date();
  const dateStr = today.toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  function setName(val: string) {
    setState((prev) => ({
      ...prev,
      signed: {
        name: val,
        date: val.trim().length >= 3 ? new Date().toISOString() : null,
      },
    }));
  }

  async function pushM2ProfilePivot() {
    if (!userId) return;
    try {
      const { data: existing } = await supabase
        .from("liberty_user_profile" as never)
        .select("data")
        .eq("user_id", userId as never)
        .maybeSingle();
      const current = ((existing as any)?.data as Record<string, unknown>) ?? {};
      const m2Snapshot = {
        source: "module_2_psychologie",
        version: state.v,
        complete: true,
        completed_at: new Date().toISOString(),
        data: state.data,
        scores: state.scores,
        signed: state.signed,
      };
      const merged = { ...current, m2: m2Snapshot, _updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from("liberty_user_profile" as never)
        .upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() }, {
          onConflict: "user_id",
        });
      if (error) throw error;
    } catch (e: any) {
      console.warn("[M2] push profil pivot M2:", e?.message);
    }
  }

  async function finalize() {
    if (!signed || state.demoMode) return;
    setSubmitting(true);
    try {
      await flushNow();
      await pushM2ProfilePivot();
      // Mark chapitre M2 as completed if available
      if (parcours) {
        const chap = parcours.phases
          .flatMap((ph) => ph.chapitres)
          .find((c) => c.titre.startsWith("M2 —"));
        if (chap) {
          try {
            await completeMutation.mutateAsync(chap.id);
          } catch (e: any) {
            console.warn("[M2] complete chapitre:", e?.message);
          }
        }
      }
      setShowSuccess(true);
    } catch (e: any) {
      toast.error("Erreur de finalisation : " + (e?.message || "inconnue"));
    } finally {
      setSubmitting(false);
    }
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `liberty-m2-${state.signed.name || "brief"}-${today.toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">
          Verrou pédagogique
        </div>
        <h2 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight text-white">
          Brief stratégique verrouillé
        </h2>
        <p className="mt-2 text-[13px] leading-[1.65] text-white/60">
          Tu as cartographié la psychologie de {avatar} en 8 étapes. Score moyen :{" "}
          <strong className="text-[#C9A84C]">{avg}/100</strong> ({stepsDone}/8 étapes évaluées).
          Signe pour pousser le brief vers le Module 3.
        </p>
      </div>

      {/* Récap scores */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.entries(scores) as Array<[string, number | null]>).map(([k, s]) => (
          <div
            key={k}
            className="rounded-lg p-3 text-center"
            style={{
              background: "#14130E",
              border: `0.5px solid ${
                s === null
                  ? "rgba(255,255,255,0.1)"
                  : s >= 80
                    ? "rgba(80,200,120,0.4)"
                    : s >= 60
                      ? "rgba(255,180,80,0.4)"
                      : "rgba(232,107,107,0.4)"
              }`,
            }}
          >
            <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">
              {k}
            </div>
            <div
              className="mt-1 text-lg font-bold"
              style={{
                color:
                  s === null
                    ? "rgba(255,255,255,0.3)"
                    : s >= 80
                      ? "#50C878"
                      : s >= 60
                        ? "#FFB450"
                        : "#E86B6B",
              }}
            >
              {s ?? "—"}
            </div>
          </div>
        ))}
      </div>

      {avg < AVG_SCORE_THRESHOLD && (
        <div
          className="mb-5 rounded-xl p-4 text-[12.5px] leading-[1.6]"
          style={{
            background: "rgba(255,180,80,0.06)",
            border: "0.5px solid rgba(255,180,80,0.4)",
            color: "#FFB450",
          }}
        >
          ⚠️ Score moyen sous {AVG_SCORE_THRESHOLD}/100. Tu peux signer quand même mais le copy du
          M3 risque d'être tiède. Considère re-travailler les étapes faibles avant.
        </div>
      )}

      {/* Engagement */}
      <div
        className="mb-5 rounded-2xl p-5"
        style={{
          background: "rgba(201,168,76,0.04)",
          border: "1px solid #C9A84C",
        }}
      >
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
          ⚖️ Engagement écrit · à signer
        </div>
        <p className="mb-4 text-[13px] leading-[1.7] text-white/90">
          Je, <strong className="text-white">[mon nom]</strong>, m'engage à utiliser ce brief
          stratégique pour produire le copywriting de mon offre dans le Module 3 — sans dériver vers
          des angles manipulatoires, des promesses surréalistes ou des biais cognitifs non éthiques.
        </p>
        <InputLabel>Signature</InputLabel>
        <TextInput
          value={state.signed.name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tape ton nom complet pour signer"
        />
        <p className="mt-2 text-[11px] text-white/40">Date de signature : {dateStr}</p>
        {state.demoMode && (
          <p className="mt-2 text-[11px] text-amber-400">
            Mode démo — signature et complétion désactivées.
          </p>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <Btn variant="ghost" disabled={!signed} onClick={() => exportM2PDF(state)}>
          <FileText className="h-4 w-4" />
          Télécharger en PDF
        </Btn>
        <Btn variant="ghost" disabled={!signed} onClick={downloadJSON}>
          <Download className="h-4 w-4" />
          Télécharger en JSON
        </Btn>
      </div>

      <Btn
        variant="cta"
        disabled={!signed || submitting || !!state.demoMode}
        onClick={finalize}
        className="w-full"
      >
        <Lock className="h-4 w-4" />
        {submitting ? "Verrouillage…" : "Verrouiller & passer au Module 3"}
      </Btn>

      <Actions align="center">
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour au brief
        </Btn>
      </Actions>

      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent
          style={{
            background: "#0F0E0A",
            border: "0.5px solid rgba(201,168,76,0.4)",
            color: "#ECEEF4",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              M2 verrouillé.
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Ton brief stratégique sur {avatar} est signé et poussé vers le Module 3.
              <br /><br />
              Tu accèdes maintenant au{" "}
              <strong className="text-[#C9A84C]">Module 3 — Anatomie d'une offre</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowSuccess(false);
                navigate("/parcours/liberty");
              }}
              style={{
                background: "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)",
                color: "#FFFFFF",
              }}
            >
              Retour au parcours
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
