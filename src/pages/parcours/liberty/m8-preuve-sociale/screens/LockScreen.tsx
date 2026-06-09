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
import { exportM8PDF } from "../lib/exportPDF";
import {
  buildAllTemplates, canGenerate, missingBriefFields, pickAvatarName,
  SALUTATIONS, POSTURES, CONTEXTES, SCHEMA_VERSION, VERSION, type M8State,
} from "../lib/types";

interface Props {
  state: M8State;
  setState: (n: (p: M8State) => M8State) => void;
  userId: string | null;
  onBack: () => void;
  flushNow: () => Promise<void>;
}

function g(obj: unknown, key: string): unknown {
  return obj && typeof obj === "object" ? (obj as Record<string, unknown>)[key] : undefined;
}

export function LockScreen({ state, setState, userId, onBack, flushNow }: Props) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { parcours } = useParcours("liberty");
  const completeMutation = useCompleteChapitre();

  const bc = state.data.brief_client;
  const avatar = pickAvatarName(state);
  const today = new Date();
  const dateStr = today.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const signed = (state.signed_by ?? "").trim().length >= 3;
  const briefOk = canGenerate(bc);
  const canFinalize = signed && briefOk && !state.demoMode;

  function setName(val: string) {
    setState((prev) => ({
      ...prev,
      signed_by: val,
      signed: val.trim().length >= 3,
      signed_at: val.trim().length >= 3 ? new Date().toISOString() : null,
    }));
  }

  /** handoff_to_m9 — coeur M8 + propagation upstream complète (lecture défensive). */
  function buildHandoffToM9() {
    const tpl = briefOk ? buildAllTemplates(bc) : { A: "", B: "", C: "" };
    const m1 = state.m1_data, m2 = state.m2_data, m3 = state.m3_data;
    const m4 = state.m4_data, m5 = state.m5_data, m6 = state.m6_data, m7 = state.m7_data;
    const missing = missingBriefFields(bc);

    return {
      handoff_version: "m8_v1.3.1",
      schema_version: SCHEMA_VERSION,
      module: "M8_PREUVE_SOCIALE",
      version: VERSION,
      generated_at: new Date().toISOString(),
      signed: !!state.signed,
      signed_at: state.signed_at || null,
      signed_by: state.signed_by || "",
      // Coeur M8
      prenom_client_dernier: bc.prenom_client || "",
      nom_offre: bc.nom_offre || "",
      ton_salutation: bc.ton_salutation || "",
      ton_salutation_label: SALUTATIONS[bc.ton_salutation]?.label || "",
      posture: bc.posture || "",
      posture_label: POSTURES[bc.posture]?.label || "",
      contexte: bc.contexte || "lifestyle",
      contexte_label: CONTEXTES[bc.contexte]?.label || "",
      douleur_passe_hint: bc.douleur_passe_hint || "",
      generation_count: state.data.generation_count || 0,
      // Templates gelés
      template_a_dm_video: tpl.A || "",
      template_b_invitation_zoom: tpl.B || "",
      template_c_script_interview: tpl.C || "",
      // Audit
      m8_score_is_forced: false,
      upstream_forced_inherited: !!state.upstream_forced,
      // Propagation upstream pour M9
      niche: g(m1, "niche") ?? g(m7, "niche") ?? null,
      avatar: g(m1, "avatar_nom") ?? g(m7, "avatar") ?? null,
      dominant_pain: g(m2, "dominant_pain") ?? g(m7, "dominant_pain") ?? g(m6, "dominant_pain") ?? null,
      point_b: g(m5, "ht_point_b") ?? g(m7, "point_b") ?? g(m6, "point_b") ?? null,
      ht_timeframe_days: g(m5, "ht_timeframe_days") ?? g(m7, "ht_timeframe_days") ?? null,
      headline_promesse: g(m5, "headline_promesse") ?? g(m7, "headline_promesse") ?? g(m3, "headline_promesse") ?? null,
      prix_ht: g(m6, "prix_ht") ?? g(m7, "prix_ht") ?? null,
      entry_strategy: g(m4, "entry_strategy") ?? g(m7, "entry_strategy") ?? null,
      // Propagation garantie (M7)
      promesse_resultat: g(m7, "promesse_resultat") ?? "",
      promesse_duree_jours: g(m7, "promesse_duree_jours") ?? 0,
      formule_marketing_garantie: g(m7, "formule_marketing") ?? "",
      vendeur_statut: g(m7, "vendeur_statut") ?? "",
      handoff_to_m9: true,
      _missing_inputs: missing,
    };
  }

  async function pushM8ProfilePivot() {
    if (!userId) return;
    try {
      const { data: existing } = await supabase
        .from("liberty_user_profile" as never)
        .select("data")
        .eq("user_id", userId as never)
        .maybeSingle();
      const current = ((existing as any)?.data as Record<string, unknown>) ?? {};
      const handoff = buildHandoffToM9();
      const m8Snapshot = {
        source: "module_8_preuve_sociale",
        version: VERSION,
        schema_version: SCHEMA_VERSION,
        complete: true,
        completed_at: new Date().toISOString(),
        handoff_to_m9: handoff,
      };
      const merged = { ...current, m8: m8Snapshot, m8_completed_at: new Date().toISOString(), _updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from("liberty_user_profile" as never)
        .upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    } catch (e: any) {
      console.warn("[M8] push profil pivot:", e?.message);
    }
  }

  async function finalize() {
    if (!canFinalize) return;
    setSubmitting(true);
    try {
      setState((prev) => ({ ...prev, completed: true }));
      await flushNow();
      await pushM8ProfilePivot();
      if (parcours) {
        const chap = parcours.phases.flatMap((ph) => ph.chapitres).find((c) => c.titre.startsWith("M8 —"));
        if (chap) {
          try { await completeMutation.mutateAsync(chap.id); } catch (e: any) { console.warn("[M8] complete chapitre:", e?.message); }
        }
      }
      setShowSuccess(true);
    } catch (e: any) {
      toast.error("Erreur finalisation : " + (e?.message ?? "inconnue"));
    } finally { setSubmitting(false); }
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify({ state, handoff_to_m9: buildHandoffToM9() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `liberty-m8-${state.signed_by || "preuve-sociale"}-${today.toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">Étape 3 / 3 · Verrou</div>
        <h2 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight text-white">Preuve sociale prête</h2>
        <p className="mt-2 text-[13px] leading-[1.65] text-white/60">
          Tes 3 messages sont générés pour <strong className="text-[#C9A84C]">{bc.nom_offre || "ton offre"}</strong> (client
          cible : {avatar}). Signe pour transmettre le handoff au Module 9.
        </p>
      </div>

      <Card className="mb-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">📋 Récap brief</div>
        <ul className="space-y-1 text-[12.5px] leading-[1.5] text-white/75">
          <li>Client : <strong className="text-white">{bc.prenom_client || "—"}</strong></li>
          <li>Ton : <strong className="text-white">{SALUTATIONS[bc.ton_salutation]?.label}</strong> · Posture : <strong className="text-white">{POSTURES[bc.posture]?.label}</strong></li>
          <li>Contexte : <strong className="text-white">{CONTEXTES[bc.contexte]?.label}</strong></li>
        </ul>
      </Card>

      <Card className="mb-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">⚖️ Engagement</div>
        <p className="mb-4 text-[13px] leading-[1.6] text-white/85">
          Je, <strong className="text-white">[mon nom]</strong>, m'engage à mettre en place une routine de récolte de preuve
          sociale : envoyer ces messages à mes clients satisfaits, organiser les interviews « coaching bilan » et archiver
          chaque témoignage dans mon arsenal de preuve, prêt à être présenté à mes prochains prospects.
        </p>
        <InputLabel>Signature</InputLabel>
        <TextInput value={state.signed_by} onChange={(e) => setName(e.target.value)} placeholder="Tape ton nom complet" />
        <p className="mt-2 text-[11px] text-white/40">Date de signature : {dateStr}</p>
        {state.demoMode && <p className="mt-2 text-[11px] text-amber-400">Mode démo — signature désactivée.</p>}
      </Card>

      <div className="mb-5 flex flex-wrap gap-2">
        <Btn variant="ghost" disabled={!briefOk} onClick={() => exportM8PDF(state)}>
          <FileText className="h-4 w-4" /> Télécharger PDF (messages + engagement)
        </Btn>
        <Btn variant="ghost" disabled={!signed} onClick={downloadJSON}>
          <Download className="h-4 w-4" /> Télécharger JSON (handoff M9)
        </Btn>
      </div>

      <Btn variant="cta" disabled={!canFinalize || submitting} onClick={finalize} className="w-full">
        <Lock className="h-4 w-4" />
        {submitting ? "Verrouillage…" : "Verrouiller & passer au Module 9"}
      </Btn>
      {!briefOk && !state.demoMode && (
        <p className="mt-2 text-center text-[11px] text-[#FFB450]">⚠ Complète le brief client avant de verrouiller.</p>
      )}

      <Actions align="center">
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" /> Retour aux messages
        </Btn>
      </Actions>

      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" /> M8 verrouillé.
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Ta preuve sociale est prête et poussée vers le Module 9.
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
