import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileText, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { TextInput, InputLabel, Btn, Actions } from "../../m1-niche/components/ui";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useParcours, useCompleteChapitre } from "@/hooks/useParcours";
import { supabase } from "@/integrations/supabase/client";
import { exportM3PDF } from "../lib/exportPDF";
import { pickAvatarName, type M3State } from "../lib/types";

interface Props {
  state: M3State;
  setState: (n: (p: M3State) => M3State) => void;
  userId: string | null;
  onBack: () => void;
  flushNow: () => Promise<void>;
}

export function LockScreen({ state, setState, userId, onBack, flushNow }: Props) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { parcours } = useParcours("liberty");
  const completeMutation = useCompleteChapitre();
  const avatar = pickAvatarName(state);

  const scores = {
    promesse: state.promesse.score,
    mecanisme: state.mecanisme.score,
    bonus: state.bonus.score,
    garantie: state.garantie.score,
    urgence: state.urgence.score,
    prix: state.prix.score,
  };
  const validScores = Object.values(scores).filter((s) => s > 0);
  const avg = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
  const today = new Date();
  const dateStr = today.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const signed = (state.engagement.nom_complet ?? "").trim().length >= 3;

  function setName(val: string) {
    setState((prev) => ({
      ...prev,
      engagement: {
        nom_complet: val,
        date_signature: val.trim().length >= 3 ? new Date().toISOString() : null,
      },
    }));
  }

  async function pushM3ProfilePivot() {
    if (!userId) return;
    try {
      const { data: existing } = await supabase
        .from("liberty_user_profile" as never)
        .select("data")
        .eq("user_id", userId as never)
        .maybeSingle();
      const current = ((existing as any)?.data as Record<string, unknown>) ?? {};
      const m3Snapshot = {
        source: "module_3_anatomie",
        version: state.version,
        complete: true,
        completed_at: new Date().toISOString(),
        market_type: state.market_type,
        promesse: state.promesse.text,
        mecanisme: { nom: state.mecanisme.nom, etapes: state.mecanisme.etapes },
        vehicule: state.vehicule,
        bonus: state.bonus.items,
        garantie: { type: state.garantie.type, formulation: state.garantie.formulation },
        urgence: { type: state.urgence.type, justification: state.urgence.justification },
        prix: {
          montant: state.prix.montant,
          leviers: state.prix.leviers,
          levier_faible: state.prix.levier_faible,
          alignements: state.prix.alignements,
        },
        scores,
        signed: state.engagement,
      };
      const merged = { ...current, m3: m3Snapshot, _updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from("liberty_user_profile" as never)
        .upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    } catch (e: any) {
      console.warn("[M3] push profil pivot:", e?.message);
    }
  }

  async function finalize() {
    if (!signed || state.demoMode) return;
    setSubmitting(true);
    try {
      setState((prev) => ({ ...prev, completed: true }));
      await flushNow();
      await pushM3ProfilePivot();
      if (parcours) {
        const chap = parcours.phases.flatMap((ph) => ph.chapitres).find((c) => c.titre.startsWith("M3 —"));
        if (chap) {
          try { await completeMutation.mutateAsync(chap.id); } catch (e: any) { console.warn("[M3] complete chapitre:", e?.message); }
        }
      }
      setShowSuccess(true);
    } catch (e: any) {
      toast.error("Erreur finalisation : " + (e?.message ?? "inconnue"));
    } finally {
      setSubmitting(false);
    }
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `liberty-m3-${state.engagement.nom_complet || "offre"}-${today.toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">Verrou pédagogique</div>
        <h2 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight text-white">
          Offre verrouillée
        </h2>
        <p className="mt-2 text-[13px] leading-[1.65] text-white/60">
          Tu as construit ton offre complète pour {avatar}. Score moyen :{" "}
          <strong className="text-[#C9A84C]">{avg}/100</strong>. Signe pour pousser l'offre vers le Module 4 (Value Ladder).
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(Object.entries(scores) as Array<[string, number]>).map(([k, s]) => (
          <div
            key={k}
            className="rounded-lg p-3 text-center"
            style={{
              background: "#14130E",
              border: `0.5px solid ${s === 0 ? "rgba(255,255,255,0.1)" : s >= 80 ? "rgba(80,200,120,0.4)" : s >= 60 ? "rgba(255,180,80,0.4)" : "rgba(232,107,107,0.4)"}`,
            }}
          >
            <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">{k}</div>
            <div
              className="mt-1 text-lg font-bold"
              style={{
                color: s === 0 ? "rgba(255,255,255,0.3)" : s >= 80 ? "#50C878" : s >= 60 ? "#FFB450" : "#E86B6B",
              }}
            >
              {s || "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Engagement */}
      <div
        className="mb-5 rounded-2xl p-5"
        style={{ background: "rgba(201,168,76,0.04)", border: "1px solid #C9A84C" }}
      >
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
          ⚖️ Engagement écrit · à signer
        </div>
        <p className="mb-4 text-[13px] leading-[1.7] text-white/90">
          Je, <strong className="text-white">[mon nom]</strong>, m'engage à mettre cette offre en
          marché telle que je l'ai construite — sans la dénaturer par des urgences fake, des
          garanties magiques ou des promesses surréalistes en cours de route.
        </p>
        <InputLabel>Signature</InputLabel>
        <TextInput value={state.engagement.nom_complet} onChange={(e) => setName(e.target.value)} placeholder="Tape ton nom complet" />
        <p className="mt-2 text-[11px] text-white/40">Date de signature : {dateStr}</p>
        {state.demoMode && (
          <p className="mt-2 text-[11px] text-amber-400">Mode démo — signature désactivée.</p>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <Btn variant="ghost" disabled={!signed} onClick={() => exportM3PDF(state)}>
          <FileText className="h-4 w-4" />
          Télécharger en PDF
        </Btn>
        <Btn variant="ghost" disabled={!signed} onClick={downloadJSON}>
          <Download className="h-4 w-4" />
          Télécharger en JSON
        </Btn>
      </div>

      <Btn variant="cta" disabled={!signed || submitting || !!state.demoMode} onClick={finalize} className="w-full">
        <Lock className="h-4 w-4" />
        {submitting ? "Verrouillage…" : "Verrouiller & passer au Module 4 (Value Ladder)"}
      </Btn>

      <Actions align="center">
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour
        </Btn>
      </Actions>

      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent
          style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              M3 verrouillé.
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Ton offre est cristallisée et poussée vers le Module 4.
              <br /><br />
              Tu accèdes maintenant au <strong className="text-[#C9A84C]">Module 4 — Value Ladder</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => { setShowSuccess(false); navigate("/parcours/liberty"); }}
              style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)", color: "#FFFFFF" }}
            >
              Retour au parcours
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
