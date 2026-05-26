import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileText, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { TextInput, InputLabel, Btn, Actions, Card } from "../../m1-niche/components/ui";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useParcours, useCompleteChapitre } from "@/hooks/useParcours";
import { supabase } from "@/integrations/supabase/client";
import { exportM7PDF } from "../lib/exportPDF";
import {
  type M7State, pickAvatarName, validationThreshold,
  PEDA_STEPS, STEPS_META, SCHEMA_VERSION, VERSION, GARANTIE_TYPES, computeNetPositif,
} from "../lib/types";

interface Props {
  state: M7State;
  setState: (n: (p: M7State) => M7State) => void;
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
  const canFinalize = signed && allValidated && !state.demoMode;

  function setName(val: string) {
    setState((prev) => ({
      ...prev,
      signed_by: val,
      signed: val.trim().length >= 3,
      signed_at: val.trim().length >= 3 ? new Date().toISOString() : null,
    }));
  }

  /** handoff_to_m8 défensif (48 clés) pour M8 PREUVE SOCIALE. */
  function buildHandoffToM8() {
    const d = state.data;
    const missing: string[] = [];
    if (!d.type_garantie.type_choisi) missing.push("type_garantie.type_choisi");
    if (!d.promesse_garantie.resultat) missing.push("promesse_garantie.resultat");
    if (!d.conditions_client.conditions_text) missing.push("conditions_client.conditions_text");
    if (!d.expose_garantie.pitch_text) missing.push("expose_garantie.pitch_text");
    if (!d.termes_conditions.tnc_text) missing.push("termes_conditions.tnc_text");

    const typeMeta = d.type_garantie.type_choisi ? GARANTIE_TYPES[d.type_garantie.type_choisi] : null;
    const net = computeNetPositif(d.math_garantie.clients_initiaux, d.math_garantie.delta_estime, d.math_garantie.taux_refund_pct);

    return {
      handoff_version: "m7_v1.0.0",
      schema_version: SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      // Type
      type_garantie: d.type_garantie.type_choisi,
      type_label: typeMeta?.label ?? "",
      type_formule: typeMeta?.formule ?? "",
      type_justification: d.type_garantie.justification,
      // Promesse
      promesse_resultat: d.promesse_garantie.resultat,
      promesse_duree_valeur: d.promesse_garantie.duree_valeur,
      promesse_duree_unite: d.promesse_garantie.duree_unite,
      promesse_critere: d.promesse_garantie.critere_objectif,
      // Conditions
      conditions_text: d.conditions_client.conditions_text,
      // Math
      math_clients_initiaux: d.math_garantie.clients_initiaux,
      math_delta_estime: d.math_garantie.delta_estime,
      math_taux_refund_pct: d.math_garantie.taux_refund_pct,
      math_net_positif: net,
      // Expose
      expose_pitch: d.expose_garantie.pitch_text,
      expose_formule_marketing: d.expose_garantie.formule_marketing,
      // T&C
      tnc_text: d.termes_conditions.tnc_text,
      vendeur_statut: d.termes_conditions.vendeur_statut,
      // Scores
      scores: state.scores,
      forced: state.forced,
      avg_score: avg,
      threshold_used: threshold,
      upstream_forced: state.upstream_forced,
      // Propagation entry strategy
      entry_strategy: state.m4_data?.entry_strategy ?? null,
      ht_monthly_target: state.m4_data?.ht_monthly_target ?? null,
      strategy_score_is_forced: !!state.m4_data?.strategy_score_is_forced,
      // Signature
      signed_at: state.signed_at,
      signed_by: state.signed_by,
      _missing_inputs: missing,
    };
  }

  async function pushM7ProfilePivot() {
    if (!userId) return;
    try {
      const { data: existing } = await supabase
        .from("liberty_user_profile" as never)
        .select("data")
        .eq("user_id", userId as never)
        .maybeSingle();
      const current = ((existing as any)?.data as Record<string, unknown>) ?? {};
      const handoff = buildHandoffToM8();
      const m7Snapshot = {
        source: "module_7_garantie",
        version: VERSION,
        schema_version: SCHEMA_VERSION,
        complete: true,
        completed_at: new Date().toISOString(),
        avg_score: avg,
        handoff_to_m8: handoff,
      };
      const merged = { ...current, m7: m7Snapshot, m7_completed_at: new Date().toISOString(), _updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from("liberty_user_profile" as never)
        .upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    } catch (e: any) {
      console.warn("[M7] push profil pivot:", e?.message);
    }
  }

  async function finalize() {
    if (!canFinalize) return;
    setSubmitting(true);
    try {
      setState((prev) => ({ ...prev, completed: true }));
      await flushNow();
      await pushM7ProfilePivot();
      if (parcours) {
        const chap = parcours.phases.flatMap((ph) => ph.chapitres).find((c) => c.titre.startsWith("M7 —"));
        if (chap) {
          try { await completeMutation.mutateAsync(chap.id); } catch (e: any) { console.warn("[M7] complete chapitre:", e?.message); }
        }
      }
      setShowSuccess(true);
    } catch (e: any) {
      toast.error("Erreur finalisation : " + (e?.message ?? "inconnue"));
    } finally { setSubmitting(false); }
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify({ state, handoff_to_m8: buildHandoffToM8() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `liberty-m7-${state.signed_by || "garantie"}-${today.toISOString().slice(0, 10)}.json`;
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
          Garantie verrouillée
        </h2>
        <p className="mt-2 text-[13px] leading-[1.65] text-white/60">
          Garantie construite pour {avatar}. Score moyen : <strong className="text-[#C9A84C]">{avg}/100</strong>
          {state.upstream_forced && <span className="text-[#FFB450]"> (seuil M7 monté à 85 — upstream forcé)</span>}.
          Signe pour pousser le handoff vers le Module 8 (Preuve sociale).
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {PEDA_STEPS.map((k) => {
          const score = state.scores[k];
          const forced = state.forced[k];
          const meta = STEPS_META.find((s) => s.id === k);
          const ok = forced || (score !== null && score >= threshold);
          return (
            <div key={k} className="rounded-lg p-3 text-center"
              style={{ background: "#14130E", border: `0.5px solid ${score === null ? "rgba(255,255,255,0.1)" : ok ? "rgba(127,176,105,0.4)" : score >= 60 ? "rgba(255,180,80,0.4)" : "rgba(232,107,107,0.4)"}` }}>
              <div className="text-[9px] uppercase tracking-[0.08em] text-white/40">{meta?.short || k}</div>
              <div className="mt-1 text-[16px] font-bold"
                style={{ color: score === null ? "rgba(255,255,255,0.3)" : ok ? "#7FB069" : score >= 60 ? "#FFB450" : "#E86B6B" }}>
                {score ?? "—"}<span className="text-[10px] text-white/40">/100</span>
              </div>
              {forced && <div className="mt-0.5 text-[9px] text-[#FFB450]">⚠ forcé</div>}
            </div>
          );
        })}
      </div>

      <Card className="mb-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          ⚖️ Engagement écrit · respect littéral
        </div>
        <p className="mb-4 text-[13px] leading-[1.6] text-white/85">
          Je, <strong className="text-white">[mon nom]</strong>, m'engage à respecter LITTÉRALEMENT cette garantie telle
          qu'écrite — sans formuler verbalement de promesse différente, sans modifier les conditions a posteriori, et en
          exécutant le remboursement ou la continuité dans les délais convenus si un client la déclenche.
        </p>
        <InputLabel>Signature</InputLabel>
        <TextInput value={state.signed_by} onChange={(e) => setName(e.target.value)} placeholder="Tape ton nom complet" />
        <p className="mt-2 text-[11px] text-white/40">Date de signature : {dateStr}</p>
        {state.demoMode && <p className="mt-2 text-[11px] text-amber-400">Mode démo — signature désactivée.</p>}
      </Card>

      <div className="mb-5 flex flex-wrap gap-2">
        <Btn variant="ghost" disabled={!signed} onClick={() => exportM7PDF(state)}>
          <FileText className="h-4 w-4" />
          Télécharger PDF (audit + engagement)
        </Btn>
        <Btn variant="ghost" disabled={!signed} onClick={downloadJSON}>
          <Download className="h-4 w-4" />
          Télécharger JSON (handoff M8)
        </Btn>
      </div>

      <Btn variant="cta" disabled={!canFinalize || submitting} onClick={finalize} className="w-full">
        <Lock className="h-4 w-4" />
        {submitting ? "Verrouillage…" : "Verrouiller & passer au Module 8 (Preuve sociale)"}
      </Btn>
      {!allValidated && !state.demoMode && (
        <p className="mt-2 text-center text-[11px] text-[#FFB450]">
          ⚠ Certaines étapes ne sont pas validées (seuil {threshold}/100).
        </p>
      )}

      <Actions align="center">
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour
        </Btn>
      </Actions>

      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              M7 verrouillé.
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Ta garantie est cristallisée et poussée vers le Module 8.
              <br /><br />
              Le M8 va construire ta preuve sociale (témoignages, captures, audits) à partir de ta garantie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => { setShowSuccess(false); navigate("/parcours/liberty"); }}
              style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)", color: "#FFFFFF" }}>
              Retour au parcours
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
