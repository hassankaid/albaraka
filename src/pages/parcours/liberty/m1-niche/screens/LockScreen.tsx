import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileText, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  StepEyebrow, StepTitle, StepSub, InputLabel, TextInput, Btn, Actions,
} from "../components/ui";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useParcours, useCompleteChapitre } from "@/hooks/useParcours";
import { pushM1ProfilePivot } from "../lib/profilePivot";
import { exportM1PDF } from "../lib/exportPDF";
import type { M1State } from "../lib/types";

interface LockScreenProps {
  state: M1State;
  setState: (next: (prev: M1State) => M1State) => void;
  userId: string | null;
  onBack: () => void;
  flushNow: () => Promise<void>;
}

export function LockScreen({
  state, setState, userId, onBack, flushNow,
}: LockScreenProps) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { parcours } = useParcours("liberty");
  const completeMutation = useCompleteChapitre();

  const sn = state.sous_niche_2;
  const a = state.avatar;
  const eng = state.engagement;
  const today = new Date();
  const dateStr = today.toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  const signed = (eng.nom_complet ?? "").trim().length >= 3;

  function setNom(val: string) {
    setState((prev) => ({
      ...prev,
      engagement: {
        nom_complet: val,
        date_signature: val.trim().length >= 3 ? new Date().toISOString() : null,
      },
    }));
  }

  async function finalizeAndUnlock() {
    if (!signed || state.demoMode) return;
    setSubmitting(true);
    try {
      // 1. Marque le state local + cloud comme completed
      setState((prev) => ({ ...prev, completed: true }));
      await flushNow();

      // 2. Push du profil pivot (best-effort — n'empêche pas l'avancement)
      if (userId) {
        try {
          await pushM1ProfilePivot(userId, { ...state, completed: true });
        } catch (e: any) {
          console.warn("[M1] Profil pivot non synchronisé:", e?.message);
        }
      }

      // 3. Marque le chapitre M1 du parcours Liberty comme complété
      if (parcours) {
        const chapitre = parcours.phases
          .flatMap((ph) => ph.chapitres)
          .find((c) => c.titre.startsWith("M1 —"));
        if (chapitre) {
          try {
            await completeMutation.mutateAsync(chapitre.id);
          } catch (e: any) {
            console.warn("[M1] complete chapitre Liberty:", e?.message);
          }
        }
      }

      setShowSuccess(true);
    } catch (e: any) {
      console.error("[M1] finalize:", e);
      toast.error("Erreur de finalisation. Tu peux réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `liberty-m1-${eng.nom_complet || "export"}-${today.toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function goToM2() {
    setShowSuccess(false);
    navigate("/parcours/liberty");
  }

  return (
    <div>
      <StepEyebrow>Verrou pédagogique</StepEyebrow>
      <StepTitle>Lock & Export</StepTitle>
      <StepSub>
        Voilà tout ce que tu as construit. Tu signes, tu télécharges, tu démarres le M2.{" "}
        <strong className="text-[#C9A84C]">L'engagement n'est pas cosmétique</strong> — c'est ce
        qui te tiendra droit pendant les 90 jours.
      </StepSub>

      {/* Récap visuel */}
      <RecapBlock label="📌 Ma Sous-Niche 2.0">
        <p className="text-[16px] font-semibold leading-[1.4] text-white">{sn.phrase || "—"}</p>
      </RecapBlock>

      {state.branch === "A" && state.bilan.archetype && (
        <RecapBlock label="🎭 Mon profil psychologique">
          <p className="text-[13px] leading-[1.6] text-white/80">
            {state.bilan.archetype.emoji}{" "}
            <strong>{state.bilan.archetype.label}</strong> ·{" "}
            {state.bilan.marche?.label ?? "—"}
            {state.bilan.marche?.sous_segment ? ` / ${state.bilan.marche.sous_segment}` : ""}
          </p>
        </RecapBlock>
      )}

      <RecapBlock label="👤 Mon avatar client">
        <p className="text-[13px] leading-[1.7] text-white/80">
          <strong>{a.socio.nom || "—"}</strong>, {a.socio.age || "—"}, {a.socio.lieu || "—"}
          <br />
          {a.socio.situation || "—"} · {a.socio.revenu || "—"}
          <br />
          <br />
          <strong>Problème :</strong> {a.psycho.probleme || "—"}
          <br />
          <strong>Objectif :</strong> {a.psycho.objectifs || "—"}
          <br />
          <strong>Sentiment actuel :</strong> {a.psycho.sentiment || "—"}
        </p>
      </RecapBlock>

      <RecapBlock label="🎯 Ma phrase pivot">
        <p className="text-[13px] leading-[1.6] text-white/80">{a.psycho.phrase_avatar || "—"}</p>
      </RecapBlock>

      {/* ENGAGEMENT */}
      <div
        className="mt-6 rounded-2xl p-5"
        style={{
          background: "rgba(201,168,76,0.04)",
          border: "1px solid #C9A84C",
        }}
      >
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
          ⚖️ Engagement écrit · à signer
        </div>
        <p className="mb-4 text-[13px] leading-[1.7] text-white/90">
          Je, <strong className="text-white">[mon nom]</strong>, m'engage à construire mon offre
          exclusivement sur cette niche pour les <strong className="text-white">90 prochains
          jours</strong>.
          <br />
          <br />
          Je ne shopperai pas d'autres niches en parallèle. Je ne reviendrai pas sur cette décision
          tant que je n'aurai pas testé sérieusement cette niche avec les modules M2 à M11.
          <br />
          <br />
          Si je veux changer, je devrai recommencer ce M1 depuis le début.
        </p>
        <InputLabel>Signature</InputLabel>
        <TextInput
          value={eng.nom_complet}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Tape ton nom complet pour signer"
        />
        <p className="mt-2 text-[11px] text-white/40">Date de signature : {dateStr}</p>
        {state.demoMode && (
          <p className="mt-2 text-[11px] text-amber-400">
            Mode démo — la signature et la complétion sont désactivées.
          </p>
        )}
      </div>

      {/* Actions PDF + JSON */}
      <div className="mt-5 flex flex-wrap gap-2">
        <Btn variant="ghost" disabled={!signed} onClick={() => exportM1PDF(state)}>
          <FileText className="h-4 w-4" />
          Télécharger en PDF
        </Btn>
        <Btn variant="ghost" disabled={!signed} onClick={downloadJSON}>
          <Download className="h-4 w-4" />
          Télécharger en JSON
        </Btn>
      </div>

      {/* CTA Lock */}
      <div className="mt-4">
        <Btn
          variant="cta"
          disabled={!signed || submitting || !!state.demoMode}
          onClick={finalizeAndUnlock}
        >
          <Lock className="h-4 w-4" />
          {submitting
            ? "Verrouillage…"
            : signed
              ? "Verrouiller & accéder au Module 2 — Psychologie"
              : "Signe d'abord ton engagement"}
        </Btn>
      </div>

      <Actions align="center">
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à la validation
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
              M1 verrouillé.
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Ta Sous-Niche 2.0 est cristallisée. Ton avatar est incarné. Ton engagement est signé.
              <br />
              <br />
              Tu accèdes maintenant au <strong className="text-[#C9A84C]">Module 2 — Psychologie
              de l'acheteur</strong>. Tu construiras ensuite ton offre complète en Module 3 —
              Anatomie d'une offre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={goToM2}
              style={{
                background: "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)",
                color: "#FFFFFF",
              }}
            >
              Accéder au parcours Liberty
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RecapBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="mb-3 rounded-xl p-4"
      style={{
        background: "#14130E",
        border: "0.5px solid rgba(201,168,76,0.18)",
      }}
    >
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
        {label}
      </div>
      {children}
    </div>
  );
}
