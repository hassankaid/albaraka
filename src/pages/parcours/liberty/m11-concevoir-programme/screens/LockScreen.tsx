import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileText, Lock, CheckCircle2, Check } from "lucide-react";
import { toast } from "sonner";
import { TextInput, InputLabel, Btn, Actions, Card } from "../../m1-niche/components/ui";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useParcours, useCompleteChapitre } from "@/hooks/useParcours";
import { supabase } from "@/integrations/supabase/client";
import { exportM11PDF } from "../lib/exportPDF";
import { buildM11Snapshot } from "../lib/snapshot";
import {
  type M11State, type Accountability, TIERS, VERSION, SCHEMA_VERSION, DUREE_MOIS_OPTIONS,
  ACCOUNTABILITY_VALIDATION, ACCOUNTABILITY_FREQUENCE, ACCOUNTABILITY_ENGAGEMENT, ACCOUNTABILITY_PROGRESSION,
} from "../lib/types";
import {
  canSignLock, canEnterLockStep, isAccountabilityComplete, computeAccountabilityForce, computeGateScore,
  analyzeBloomCoherence, analyzeAccountability, type CoherenceWarning,
} from "../lib/validations";

interface Props { state: M11State; setState: (n: (p: M11State) => M11State) => void; userId: string | null; onBack: () => void; flushNow: () => Promise<void>; }

const DIMS: { key: keyof Accountability; label: string; dict: any }[] = [
  { key: "validation_par_defaut", label: "Qui valide les livrables", dict: ACCOUNTABILITY_VALIDATION },
  { key: "frequence_contact_humain", label: "Fréquence de contact humain", dict: ACCOUNTABILITY_FREQUENCE },
  { key: "engagement_initial", label: "Engagement initial", dict: ACCOUNTABILITY_ENGAGEMENT },
  { key: "progression_modules", label: "Progression entre modules", dict: ACCOUNTABILITY_PROGRESSION },
];

function CoherencePanel({ title, warnings, score }: { title: string; warnings: CoherenceWarning[]; score: string }) {
  if (score === "unknown") return null;
  const border = score === "warning" ? "rgba(232,107,107,0.4)" : score === "info" ? "rgba(255,180,80,0.4)" : "rgba(76,201,135,0.4)";
  return (
    <Card className="mb-3" >
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: score === "warning" ? "#E86B6B" : score === "info" ? "#FFB450" : "#4cc987" }}>{title} — {score === "ok" ? "cohérent" : score === "info" ? "à surveiller" : "à corriger"}</div>
      {warnings.length === 0 ? <p className="text-[12.5px] text-white/60">Aucune alerte. Tes choix sont cohérents.</p> : (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className="rounded-lg px-3 py-2" style={{ background: "#0C0B08", borderLeft: "2px solid " + border }}>
              <div className="text-[12.5px] font-semibold text-white">{w.severity === "warning" ? "⚠ " : "i "}{w.title}</div>
              <div className="mt-0.5 text-[11.5px] leading-[1.5] text-white/55">{w.detail}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function LockScreen({ state, setState, userId, onBack, flushNow }: Props) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { parcours } = useParcours("liberty");
  const completeMutation = useCompleteChapitre();
  const d = state.data;

  const today = new Date();
  const dateStr = today.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const signed = (state.signed_by ?? "").trim().length >= 3;
  const commit = !!state._commit;
  const accOk = isAccountabilityComplete(d);
  const lockOk = canEnterLockStep(d);
  const canSign = !state.signed && canSignLock(d) && signed && commit;

  const force = computeAccountabilityForce(d);
  const bloomCoh = analyzeBloomCoherence(d);
  const accCoh = analyzeAccountability(d, state.m6_data);
  const tierLabel = TIERS[d.tier_bloom_target as keyof typeof TIERS]?.label || "—";
  const dureeTotale = (d.modules || []).reduce((acc, m) => acc + (parseInt(m.duree_video, 10) || 0), 0);
  const totalLecons = (d.modules || []).reduce((acc, m) => acc + (m.lecons || []).length, 0);
  const gateScore = computeGateScore(d);

  const setAcc = (key: keyof Accountability, v: string) => setState((prev) => ({ ...prev, data: { ...prev.data, accountability: { ...prev.data.accountability, [key]: v } } }));
  const setDuree = (v: string) => setState((prev) => ({ ...prev, data: { ...prev.data, duree_programme_mois: v } }));
  const setName = (val: string) => setState((prev) => ({ ...prev, signed_by: val } as any));
  const setCommit = (v: boolean) => setState((prev) => ({ ...prev, _commit: v } as any));

  async function pushProfilePivot() {
    if (!userId) return;
    try {
      const { data: existing } = await supabase.from("liberty_user_profile" as never).select("data").eq("user_id", userId as never).maybeSingle();
      const current = ((existing as any)?.data as Record<string, unknown>) ?? {};
      const snapshot = buildM11Snapshot({ ...state, signed: true, signed_at: new Date().toISOString(), signed_by: state.signed_by });
      const merged = { ...current, m11: snapshot, m11_completed_at: snapshot.signed_at, _updated_at: new Date().toISOString() };
      const { error } = await supabase.from("liberty_user_profile" as never).upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    } catch (e: any) { console.warn("[M11] push profil pivot:", e?.message); }
  }

  async function finalize() {
    if (!canSign) return;
    setSubmitting(true);
    try {
      setState((prev) => ({ ...prev, signed: true, signed_at: new Date().toISOString(), highest: "lock" }));
      await flushNow();
      await pushProfilePivot();
      if (parcours) {
        const chap = parcours.phases.flatMap((ph) => ph.chapitres).find((c) => c.titre.startsWith("M11 —"));
        if (chap) { try { await completeMutation.mutateAsync(chap.id); } catch (e: any) { console.warn("[M11] complete chapitre:", e?.message); } }
      }
      setShowSuccess(true);
    } catch (e: any) { toast.error("Erreur finalisation : " + (e?.message ?? "inconnue")); }
    finally { setSubmitting(false); }
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify({ state, snapshot: buildM11Snapshot(state) }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `liberty-m11-${state.signed_by || "programme"}-${today.toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">Étape 7 / 7 · Lock</div>
        <h2 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight text-white">Lock — signature et transmission</h2>
        <p className="mt-2 text-[13px] leading-[1.65] text-white/60">
          Tu valides que <strong className="text-white">l'architecture</strong> de ton programme est gravée. Une fois signé, l'arborescence
          part vers les modules suivants (naming, transition DIY, value ladder). Ce que tu signes, c'est ton <strong className="text-[#C9A84C]">plan de tournage</strong>, pas tes vidéos.
        </p>
      </div>

      <Card className="mb-5">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">Mécanismes d'accountability · ce qui fait qu'un élève finit vraiment</div>
        <p className="text-[12.5px] leading-[1.55] text-white/65">Un programme DIY sans accountability structurée plafonne à 20-30% de complétion. L'accountability se conçoit sur 4 dimensions : qui valide, à quelle fréquence l'élève a un contact humain, quel engagement initial il prend, comment il progresse. Plus tu montes en tier, plus elles doivent être robustes.</p>
      </Card>

      {/* 4 dimensions */}
      <div className="mb-5 space-y-4">
        {DIMS.map((dim) => (
          <div key={dim.key}>
            <InputLabel>{dim.label}</InputLabel>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Object.keys(dim.dict).map((k) => {
                const sel = (d.accountability as any)[dim.key] === k;
                return (
                  <button key={k} type="button" onClick={() => setAcc(dim.key, k)} className="rounded-[10px] px-3 py-2.5 text-left transition-all" style={{ background: sel ? "#2A2310" : "#14130E", border: sel ? "1px solid #C9A84C" : "1px solid rgba(201,168,76,0.18)" }}>
                    <div className="text-[12.5px] font-semibold text-white">{dim.dict[k].label}</div>
                    <div className="mt-0.5 text-[10.5px] leading-[1.4] text-white/45">{dim.dict[k].meta}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Durée programme */}
      <div className="mb-5">
        <InputLabel>Durée totale du programme · {d.duree_programme_mois} mois</InputLabel>
        <div className="flex flex-wrap gap-1.5">
          {DUREE_MOIS_OPTIONS.map((mois) => (
            <button key={mois} type="button" onClick={() => setDuree(mois)} className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all" style={{ background: d.duree_programme_mois === mois ? "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)" : "rgba(201,168,76,0.06)", color: d.duree_programme_mois === mois ? "#080808" : "#C9A84C", border: d.duree_programme_mois === mois ? "none" : "0.5px solid rgba(201,168,76,0.3)" }}>{mois} mois</button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-white/40">Standard : LT 1-2 mois · MT 3-6 mois · HT 6-12 mois.</p>
      </div>

      {/* Panneaux de cohérence */}
      <CoherencePanel title="Cohérence Bloom" warnings={bloomCoh.warnings} score={bloomCoh.score} />
      <CoherencePanel title={"Accountability · force " + force + "/16"} warnings={accCoh.warnings} score={accCoh.score} />

      {/* Recap */}
      <Card className="mb-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">Ce que tu signes</div>
        <div className="grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-3">
          <Recap label="Point B" value={(d.point_b || "").slice(0, 90)} />
          <Recap label="Tier" value={tierLabel} />
          <Recap label="Modules · leçons" value={d.modules.length + " mod · " + totalLecons + " leç"} />
          <Recap label="Durée totale" value={dureeTotale + " min"} />
          <Recap label="Accountability" value={force + "/16"} />
          <Recap label="Prérequis" value={gateScore + "/8" + (d.gate.override_warning ? " · override" : "")} />
        </div>
      </Card>

      {/* Engagement + signature */}
      <Card className="mb-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">⚖️ Engagement</div>
        <button type="button" onClick={() => !state.signed && setCommit(!commit)} className="mb-4 flex w-full items-start gap-3 rounded-[10px] px-4 py-3 text-left" style={{ background: commit ? "#2A2310" : "#14130E", border: commit ? "1px solid #C9A84C" : "1px solid rgba(201,168,76,0.18)" }}>
          <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px]" style={{ background: commit ? "#C9A84C" : "transparent", border: "1.5px solid #C9A84C" }}>{commit && <Check className="h-3 w-3" strokeWidth={3} style={{ color: "#080808" }} />}</span>
          <span className="flex-1 text-[13px] font-semibold leading-[1.5] text-white/85">Je m'engage à scripter et filmer la première leçon dans les 14 jours.</span>
        </button>
        <InputLabel>Ton prénom + nom (signature)</InputLabel>
        <TextInput value={state.signed_by} onChange={(e) => setName(e.target.value)} placeholder="Ex. Karim Belaïd" />
        <p className="mt-2 text-[11px] text-white/40">Date de signature : {dateStr}</p>
      </Card>

      <div className="mb-5 flex flex-wrap gap-2">
        <Btn variant="ghost" disabled={!lockOk} onClick={() => exportM11PDF(state)}><FileText className="h-4 w-4" /> Télécharger PDF (architecture)</Btn>
        <Btn variant="ghost" disabled={!signed} onClick={downloadJSON}><Download className="h-4 w-4" /> Télécharger JSON (handoff)</Btn>
      </div>

      <Btn variant="cta" disabled={!canSign || submitting} onClick={finalize} className="w-full">
        <Lock className="h-4 w-4" />
        {submitting ? "Verrouillage…" : !lockOk ? "Complète toutes les fiches modules avant de signer" : !accOk ? "Renseigne les 4 dimensions d'accountability avant de signer" : "Signer & verrouiller ce module"}
      </Btn>

      <Actions align="center"><Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> Fiches modules</Btn></Actions>

      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> M11 verrouillé.</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">Ton architecture de programme est gravée et transmise aux modules suivants (M12 naming · M13 transition DIY · M18 value ladder).</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { setShowSuccess(false); navigate("/parcours/liberty"); }} style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)", color: "#FFFFFF" }}>Retour au parcours</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Recap({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "#0C0B08", border: "0.5px solid rgba(201,168,76,0.12)" }}>
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-white/40">{label}</div>
      <div className="mt-0.5 text-[12px] leading-[1.35] text-white/80">{value}</div>
    </div>
  );
}
