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
import { exportM5PDF } from "../lib/exportPDF";
import {
  type M5State, pickAvatarName, validationThreshold,
  PEDA_STEPS, STEPS_META, CONDITION_AXES, SCHEMA_VERSION,
} from "../lib/types";

interface Props {
  state: M5State;
  setState: (n: (p: M5State) => M5State) => void;
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

  function setName(val: string) {
    setState((prev) => ({
      ...prev,
      signed_by: val,
      signed: val.trim().length >= 3,
      signed_at: val.trim().length >= 3 ? new Date().toISOString() : null,
    }));
  }

  /** Construit le handoff_to_m6 défensif (cf v1.1.1 spec slim). */
  function buildHandoffToM6() {
    const d = state.data;
    const missing: string[] = [];
    if (!d.pont.pointA.formulated) missing.push("pont.pointA");
    if (!d.pont.pointB.formulated) missing.push("pont.pointB");
    if (CONDITION_AXES.some((a) => !d.conditions[a.key].justification)) missing.push("conditions.justifications");
    if (!d.conditions.action_plan) missing.push("conditions.action_plan");
    if (d.eatcomplex.rows.filter((r) => r.client_step && r.what_you_eat).length < 4) missing.push("eatcomplex");
    if (d.structure.phases.filter((p) => p.name && p.livrables).length < 3) missing.push("structure.phases");
    if (!d.conviction.next_action) missing.push("conviction.next_action");

    const condScores = {
      simple: d.conditions.simple.score,
      rapide: d.conditions.rapide.score,
      systematique: d.conditions.systematique.score,
      aspirante: d.conditions.aspirante.score,
    };

    return {
      handoff_version: "m5_v1.1.0",
      schema_version: SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      // Pont
      ht_point_a: d.pont.pointA.formulated || "",
      ht_point_b: d.pont.pointB.formulated || "",
      ht_point_b_measurable: d.pont.pointB.measurable_outcome || "",
      ht_point_b_timeframe_days: d.pont.pointB.timeframe_days || 90,
      ht_bridge_summary: d.pont.bridge_summary || "",
      // 4 conditions
      conditions_scores: condScores,
      weakest_condition_axis: d.conditions.weakest_axis || "",
      action_plan: d.conditions.action_plan || "",
      // Eat complexity
      eat_complexity_summary: d.eatcomplex.rows.filter((r) => r.client_step && r.what_you_eat),
      // Structure
      structure_phases: d.structure.phases,
      structure_total_weeks: d.structure.total_weeks,
      structure_promise_days: d.structure.promise_days,
      mecanisme_anchor: d.structure.mecanisme_anchor || "",
      // Conviction
      conviction_checklist: d.conviction.checklist,
      conviction_missing: d.conviction.missing || "",
      conviction_next_action: d.conviction.next_action || "",
      // Scores + audit
      scores: state.scores,
      forced: state.forced,
      attempts: state.attempts,
      avg_score: avg,
      threshold_used: threshold,
      upstream_forced: state.upstream_forced,
      // Propagation M4 → M6
      entry_strategy: state.m4_data?.entry_strategy ?? null,
      ht_monthly_target: state.m4_data?.ht_monthly_target ?? null,
      strategy_score_is_forced: !!state.m4_data?.strategy_score_is_forced,
      // Signature
      signed_at: state.signed_at,
      signed_by: state.signed_by,
      _missing_inputs: missing,
    };
  }

  async function pushM5ProfilePivot() {
    if (!userId) return;
    try {
      const { data: existing } = await supabase
        .from("liberty_user_profile" as never)
        .select("data")
        .eq("user_id", userId as never)
        .maybeSingle();
      const current = ((existing as any)?.data as Record<string, unknown>) ?? {};
      const handoff = buildHandoffToM6();
      const m5Snapshot = {
        source: "module_5_high_ticket",
        version: state.v,
        schema_version: state.schema_version,
        complete: true,
        completed_at: new Date().toISOString(),
        avg_score: avg,
        handoff_to_m6: handoff,
      };
      const merged = { ...current, m5: m5Snapshot, m5_completed_at: new Date().toISOString(), _updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from("liberty_user_profile" as never)
        .upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    } catch (e: any) {
      console.warn("[M5] push profil pivot:", e?.message);
    }
  }

  async function finalize() {
    if (!signed || state.demoMode) return;
    if (!allValidated) {
      toast.error("Certaines étapes ne sont pas validées (seuil " + threshold + "/100).");
      return;
    }
    setSubmitting(true);
    try {
      setState((prev) => ({ ...prev, completed: true }));
      await flushNow();
      await pushM5ProfilePivot();
      if (parcours) {
        const chap = parcours.phases.flatMap((ph) => ph.chapitres).find((c) => c.titre.startsWith("M5 —"));
        if (chap) {
          try { await completeMutation.mutateAsync(chap.id); } catch (e: any) { console.warn("[M5] complete chapitre:", e?.message); }
        }
      }
      setShowSuccess(true);
    } catch (e: any) {
      toast.error("Erreur finalisation : " + (e?.message ?? "inconnue"));
    } finally { setSubmitting(false); }
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify({ state, handoff_to_m6: buildHandoffToM6() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `liberty-m5-${state.signed_by || "audit"}-${today.toISOString().slice(0, 10)}.json`;
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
          Audit High-Ticket verrouillé
        </h2>
        <p className="mt-2 text-[13px] leading-[1.65] text-white/60">
          Tu as audité ton HT pour {avatar}. Score moyen : <strong className="text-[#C9A84C]">{avg}/100</strong>
          {state.upstream_forced && <span className="text-[#FFB450]"> (seuil M5 monté à 85 — M4 forcé)</span>}.
          Signe pour pousser le handoff vers le Module 6.
        </p>
      </div>

      {/* Récap scores */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
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

      {/* Engagement */}
      <div
        className="mb-5 rounded-2xl p-5"
        style={{ background: "rgba(201,168,76,0.04)", border: "1px solid #C9A84C" }}
      >
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
          ⚖️ Engagement écrit · à signer
        </div>
        <p className="mb-4 text-[13px] leading-[1.7] text-white/90">
          Je, <strong className="text-white">[mon nom]</strong>, m'engage à porter ce High-Ticket avec conviction
          jusqu'au prochain palier {state.m4_data?.ht_monthly_target ? `de ${state.m4_data.ht_monthly_target} ventes HT/mois` : "défini en M4"} —
          sans dilution, sans copie d'écosystème, sans urgence fake.
        </p>
        <InputLabel>Signature</InputLabel>
        <TextInput value={state.signed_by} onChange={(e) => setName(e.target.value)} placeholder="Tape ton nom complet" />
        <p className="mt-2 text-[11px] text-white/40">Date de signature : {dateStr}</p>
        {state.demoMode && (
          <p className="mt-2 text-[11px] text-amber-400">Mode démo — signature désactivée.</p>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <Btn variant="ghost" disabled={!signed} onClick={() => exportM5PDF(state)}>
          <FileText className="h-4 w-4" />
          Télécharger PDF (audit IA détaillé)
        </Btn>
        <Btn variant="ghost" disabled={!signed} onClick={downloadJSON}>
          <Download className="h-4 w-4" />
          Télécharger JSON (handoff M6)
        </Btn>
      </div>

      <Btn variant="cta" disabled={!signed || submitting || !!state.demoMode || !allValidated} onClick={finalize} className="w-full">
        <Lock className="h-4 w-4" />
        {submitting ? "Verrouillage…" : "Verrouiller & passer au Module 6 (Pricing)"}
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
              M5 verrouillé.
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Ton audit High-Ticket est cristallisé et poussé vers le Module 6 (Pricing).
              <br /><br />
              Le M6 va dériver le pricing détaillé en croisant ton M5 avec ta stratégie d'entrée M4.
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
