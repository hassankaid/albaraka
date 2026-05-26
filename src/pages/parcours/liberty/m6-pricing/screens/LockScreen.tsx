import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileText, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { TextInput, TextArea, InputLabel, InputHelper, Btn, Actions, Card, InputBlock } from "../../m1-niche/components/ui";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useParcours, useCompleteChapitre } from "@/hooks/useParcours";
import { supabase } from "@/integrations/supabase/client";
import { exportM6PDF } from "../lib/exportPDF";
import {
  type M6State, pickAvatarName, validationThreshold,
  PEDA_STEPS, STEPS_META, SCHEMA_VERSION, VERSION,
} from "../lib/types";

interface Props {
  state: M6State;
  setState: (n: (p: M6State) => M6State) => void;
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

  const threshold = validationThreshold(state);
  const today = new Date();
  const dateStr = today.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const signed = (state.signed_by ?? "").trim().length >= 3;

  const validScores = PEDA_STEPS.map((k) => state.scores[k]).filter((s) => s !== null) as number[];
  const avg = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
  const allValidated = PEDA_STEPS.every((k) => {
    const s = state.scores[k];
    return state.forced[k] || (s !== null && s >= threshold);
  });

  const leviers = state.data.commitment_no_price_drop.leviers_valeur;
  const leviersOk = leviers.every((l) => l.trim().length >= 20);
  const canFinalize = signed && allValidated && leviersOk && !state.demoMode;

  function setName(val: string) {
    setState((prev) => ({
      ...prev,
      signed_by: val,
      signed: val.trim().length >= 3,
      signed_at: val.trim().length >= 3 ? new Date().toISOString() : null,
    }));
  }
  function setLevier(idx: number, val: string) {
    setState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        commitment_no_price_drop: {
          ...prev.data.commitment_no_price_drop,
          leviers_valeur: prev.data.commitment_no_price_drop.leviers_valeur.map((l, i) => (i === idx ? val : l)) as [string, string, string],
        },
      },
    }));
  }

  /** Construit le handoff_to_m7 défensif. */
  function buildHandoffToM7() {
    const d = state.data;
    const missing: string[] = [];
    if (!d.valeur_prix.ma_bugatti) missing.push("valeur_prix.ma_bugatti");
    if (parseFloat(d.prix_valeur.prix_ht || "0") <= 0) missing.push("prix_valeur.prix_ht");
    if (!d.prix_marche.positionnement) missing.push("prix_marche.positionnement");
    if (!d.prix_confiance.action_renforcement) missing.push("prix_confiance.action_renforcement");
    if (!d.script_annonce.script_text) missing.push("script_annonce.script_text");
    if (leviers.some((l) => !l.trim())) missing.push("commitment.leviers_valeur");

    return {
      handoff_version: "m6_v1.2.0",
      schema_version: SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      // Prix
      prix_ht: d.prix_valeur.prix_ht,
      roi_calcule: d.prix_valeur.roi_calcule,
      prix_marche_moyen: d.prix_marche.prix_marche_moyen,
      positionnement: d.prix_marche.positionnement,
      // Confiance + plan
      confiance_sur_deliver: d.prix_confiance.confiance_sur_deliver,
      plan_augmentation: d.prix_confiance.plan_augmentation,
      // Paiements
      paiements_actives: d.paiements.options,
      pitch_fractionnement: d.paiements.pitch_fractionnement,
      // BAO
      bao: d.bao,
      // Script
      script_annonce: d.script_annonce.script_text,
      // Psycho premium
      valeur_prix_leviers: d.valeur_prix,
      // Commitment
      commitment_no_price_drop: {
        signed: true,
        signed_at: state.signed_at,
        leviers_valeur: leviers,
      },
      // Scores + audit
      scores: state.scores,
      forced: state.forced,
      avg_score: avg,
      threshold_used: threshold,
      upstream_forced: state.upstream_forced,
      // Propagation M4 → M7
      entry_strategy: state.m4_data?.entry_strategy ?? null,
      ht_monthly_target: state.m4_data?.ht_monthly_target ?? null,
      strategy_score_is_forced: !!state.m4_data?.strategy_score_is_forced,
      // Signature
      signed_at: state.signed_at,
      signed_by: state.signed_by,
      _missing_inputs: missing,
    };
  }

  async function pushM6ProfilePivot() {
    if (!userId) return;
    try {
      const { data: existing } = await supabase
        .from("liberty_user_profile" as never)
        .select("data")
        .eq("user_id", userId as never)
        .maybeSingle();
      const current = ((existing as any)?.data as Record<string, unknown>) ?? {};
      const handoff = buildHandoffToM7();
      const m6Snapshot = {
        source: "module_6_pricing",
        version: VERSION,
        schema_version: SCHEMA_VERSION,
        complete: true,
        completed_at: new Date().toISOString(),
        avg_score: avg,
        handoff_to_m7: handoff,
      };
      const merged = { ...current, m6: m6Snapshot, m6_completed_at: new Date().toISOString(), _updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from("liberty_user_profile" as never)
        .upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    } catch (e: any) {
      console.warn("[M6] push profil pivot:", e?.message);
    }
  }

  async function finalize() {
    if (!canFinalize) return;
    setSubmitting(true);
    try {
      setState((prev) => ({
        ...prev,
        completed: true,
        data: {
          ...prev.data,
          commitment_no_price_drop: { ...prev.data.commitment_no_price_drop, signed: true, signed_at: new Date().toISOString() },
        },
      }));
      await flushNow();
      await pushM6ProfilePivot();
      if (parcours) {
        const chap = parcours.phases.flatMap((ph) => ph.chapitres).find((c) => c.titre.startsWith("M6 —"));
        if (chap) {
          try { await completeMutation.mutateAsync(chap.id); } catch (e: any) { console.warn("[M6] complete chapitre:", e?.message); }
        }
      }
      setShowSuccess(true);
    } catch (e: any) {
      toast.error("Erreur finalisation : " + (e?.message ?? "inconnue"));
    } finally { setSubmitting(false); }
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify({ state, handoff_to_m7: buildHandoffToM7() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `liberty-m6-${state.signed_by || "pricing"}-${today.toISOString().slice(0, 10)}.json`;
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
          Audit Pricing verrouillé
        </h2>
        <p className="mt-2 text-[13px] leading-[1.65] text-white/60">
          Tu as calibré ton prix pour {avatar}. Score moyen : <strong className="text-[#C9A84C]">{avg}/100</strong>
          {state.upstream_forced && <span className="text-[#FFB450]"> (seuil M6 monté à 85 — M5 forcé)</span>}.
          Signe l'engagement no_price_drop pour pousser le handoff vers le Module 7 (Garantie).
        </p>
      </div>

      {/* Récap scores */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {PEDA_STEPS.map((k) => {
          const score = state.scores[k];
          const forced = state.forced[k];
          const meta = STEPS_META.find((s) => s.id === k);
          const ok = forced || (score !== null && score >= threshold);
          return (
            <div
              key={k}
              className="rounded-lg p-3 text-center"
              style={{
                background: "#14130E",
                border: `0.5px solid ${score === null ? "rgba(255,255,255,0.1)" : ok ? "rgba(127,176,105,0.4)" : score >= 60 ? "rgba(255,180,80,0.4)" : "rgba(232,107,107,0.4)"}`,
              }}
            >
              <div className="text-[9px] uppercase tracking-[0.08em] text-white/40">{meta?.short || k}</div>
              <div
                className="mt-1 text-[16px] font-bold"
                style={{ color: score === null ? "rgba(255,255,255,0.3)" : ok ? "#7FB069" : score >= 60 ? "#FFB450" : "#E86B6B" }}
              >
                {score ?? "—"}<span className="text-[10px] text-white/40">/100</span>
              </div>
              {forced && <div className="mt-0.5 text-[9px] text-[#FFB450]">⚠ forcé</div>}
            </div>
          );
        })}
      </div>

      {/* Engagement no_price_drop */}
      <Card className="mb-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          ⚖️ Engagement no_price_drop · 3 leviers valeur
        </div>
        <p className="mb-4 text-[13px] leading-[1.6] text-white/85">
          Je, <strong className="text-white">[mon nom]</strong>, m'engage à NE PAS baisser mon prix sous la pression
          des prospects. Au lieu de baisser le prix, je <strong>renforce la valeur perçue</strong> via ces 3 leviers
          concrets que je précise ci-dessous.
        </p>
        {[0, 1, 2].map((i) => (
          <InputBlock key={i}>
            <InputLabel>Levier {i + 1} (20+ chars) *</InputLabel>
            <TextArea
              rows={2}
              value={leviers[i]}
              onChange={(e) => setLevier(i, e.target.value)}
              placeholder={
                i === 0 ? "Ex : Ajouter 2 calls 1to1 supplémentaires de coaching individuel"
                : i === 1 ? "Ex : Offrir l'accès lifetime à la bibliothèque de templates"
                : "Ex : Inclure une session annuelle de bilan stratégique post-programme"
              }
            />
          </InputBlock>
        ))}
        {!leviersOk && (
          <InputHelper intent="warning">Les 3 leviers doivent être renseignés (20+ chars chacun) avant la signature.</InputHelper>
        )}
      </Card>

      {/* Signature */}
      <Card className="mb-5">
        <InputLabel>Signature</InputLabel>
        <TextInput value={state.signed_by} onChange={(e) => setName(e.target.value)} placeholder="Tape ton nom complet" />
        <p className="mt-2 text-[11px] text-white/40">Date de signature : {dateStr}</p>
        {state.demoMode && (
          <p className="mt-2 text-[11px] text-amber-400">Mode démo — signature désactivée.</p>
        )}
      </Card>

      <div className="mb-5 flex flex-wrap gap-2">
        <Btn variant="ghost" disabled={!signed} onClick={() => exportM6PDF(state)}>
          <FileText className="h-4 w-4" />
          Télécharger PDF (audit + engagement)
        </Btn>
        <Btn variant="ghost" disabled={!signed} onClick={downloadJSON}>
          <Download className="h-4 w-4" />
          Télécharger JSON (handoff M7)
        </Btn>
      </div>

      <Btn variant="cta" disabled={!canFinalize || submitting} onClick={finalize} className="w-full">
        <Lock className="h-4 w-4" />
        {submitting ? "Verrouillage…" : "Verrouiller & passer au Module 7 (Garantie)"}
      </Btn>
      {!allValidated && !state.demoMode && (
        <p className="mt-2 text-center text-[11px] text-[#FFB450]">
          ⚠ Certaines étapes ne sont pas validées (seuil {threshold}/100). Reviens-les terminer avant de signer.
        </p>
      )}

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
              M6 verrouillé.
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Ton pricing est cristallisé avec l'engagement no_price_drop signé. Le handoff_to_m7 est poussé.
              <br /><br />
              Le M7 va dériver la garantie commerciale en croisant ton M5 (HT) + M6 (prix + paiements).
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
