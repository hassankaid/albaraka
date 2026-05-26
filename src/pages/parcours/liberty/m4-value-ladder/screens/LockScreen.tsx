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
import { exportM4PDF } from "../lib/exportPDF";
import { type M4State, pickAvatarName, ENTRY_STRATEGIES, BRIDGE_BY_ID, TIER_LABELS, TIER_PRICE_RANGES } from "../lib/types";

interface Props {
  state: M4State;
  setState: (n: (p: M4State) => M4State) => void;
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

  const today = new Date();
  const dateStr = today.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const signed = (state.signed_name ?? "").trim().length >= 3;
  const strategyDef = state.entry.strategy ? ENTRY_STRATEGIES[state.entry.strategy] : null;
  const activeTiers = strategyDef?.active_tiers ?? [];
  const bridges = strategyDef?.bridges_needed ?? [];

  function setName(val: string) {
    setState((prev) => ({
      ...prev,
      signed_name: val,
      signed: val.trim().length >= 3,
      signed_at: val.trim().length >= 3 ? new Date().toISOString() : null,
    }));
  }

  async function pushM4ProfilePivot() {
    if (!userId) return;
    try {
      const { data: existing } = await supabase
        .from("liberty_user_profile" as never)
        .select("data")
        .eq("user_id", userId as never)
        .maybeSingle();
      const current = ((existing as any)?.data as Record<string, unknown>) ?? {};
      const m4Snapshot = {
        source: "module_4_value_ladder",
        version: state.version,
        complete: true,
        completed_at: new Date().toISOString(),
        market_type: state.market_type,
        ladder: state.ladder,
        entry: {
          strategy: state.entry.strategy,
          rationale: state.entry.rationale,
          score: state.entry.score,
          ai_mode: state.entry.ai_mode,
          forced: state.entry.forced,
          ht_monthly_target: state.entry.ht_monthly_target,
          lt_breakeven_check: state.entry.lt_breakeven_check,
        },
        bridges: state.bridges,
        signed: { name: state.signed_name, at: state.signed_at },
      };
      const merged = { ...current, m4: m4Snapshot, _updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from("liberty_user_profile" as never)
        .upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    } catch (e: any) {
      console.warn("[M4] push profil pivot:", e?.message);
    }
  }

  async function finalize() {
    if (!signed || state.demoMode) return;
    setSubmitting(true);
    try {
      setState((prev) => ({ ...prev, completed: true }));
      await flushNow();
      await pushM4ProfilePivot();
      if (parcours) {
        const chap = parcours.phases.flatMap((ph) => ph.chapitres).find((c) => c.titre.startsWith("M4 —"));
        if (chap) {
          try { await completeMutation.mutateAsync(chap.id); } catch (e: any) { console.warn("[M4] complete chapitre:", e?.message); }
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
    link.download = `liberty-m4-${state.signed_name || "ladder"}-${today.toISOString().slice(0, 10)}.json`;
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
          Value ladder verrouillée
        </h2>
        <p className="mt-2 text-[13px] leading-[1.65] text-white/60">
          Tu as posé ton écosystème pour {avatar}. Stratégie : <strong className="text-[#C9A84C]">{strategyDef?.label ?? "—"}</strong>.
          Score IA : <strong className="text-[#C9A84C]">{state.entry.score ?? "—"}/100</strong>. Signe pour pousser vers le Module 5.
        </p>
      </div>

      {/* Récap synthétique */}
      <div
        className="mb-5 rounded-2xl p-5"
        style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.4)" }}
      >
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
          📊 Récap final
        </div>
        <table className="w-full border-collapse text-[12.5px]">
          <tbody>
            {(["high", "mid", "low", "freemium"] as const).map((tid) => {
              const t = state.ladder[tid];
              const isActive = activeTiers.includes(tid);
              const isHigh = tid === "high";
              return (
                <tr key={tid} className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)", opacity: isActive ? 1 : 0.4 }}>
                  <td className="py-2 pr-3 font-semibold" style={{ color: isHigh ? "#E8C770" : "#C9A84C" }}>
                    {TIER_LABELS[tid]}{isHigh ? " ★" : ""}
                  </td>
                  <td className="py-2 pr-3 text-white/70">{t.price || TIER_PRICE_RANGES[tid]}</td>
                  <td className="py-2 text-white/80">
                    {t.name || (isActive ? <em className="text-white/40">à définir</em> : <span className="text-white/30">— inactive</span>)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {bridges.length > 0 && (
          <div className="mt-4 border-t pt-3" style={{ borderColor: "rgba(201,168,76,0.18)" }}>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">
              Passerelles ({bridges.length})
            </div>
            <div className="space-y-1.5 text-[12px]">
              {bridges.map((bid) => (
                <div key={bid} className="flex items-center gap-2 text-white/70">
                  <span className="text-[#C9A84C]">→</span>
                  <span><strong>{BRIDGE_BY_ID[bid].from}</strong> vers <strong>{BRIDGE_BY_ID[bid].to}</strong></span>
                  <span className="text-white/30">· {state.bridges[bid]?.trim().length || 0} chars</span>
                </div>
              ))}
            </div>
          </div>
        )}
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
          Je, <strong className="text-white">[mon nom]</strong>, m'engage à construire ma value ladder selon cette stratégie —
          sans précipiter les marches basses avant que mon HT soit rodé, sans copier d'autres écosystèmes par mimétisme.
        </p>
        <InputLabel>Signature</InputLabel>
        <TextInput value={state.signed_name} onChange={(e) => setName(e.target.value)} placeholder="Tape ton nom complet" />
        <p className="mt-2 text-[11px] text-white/40">Date de signature : {dateStr}</p>
        {state.demoMode && (
          <p className="mt-2 text-[11px] text-amber-400">Mode démo — signature désactivée.</p>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <Btn variant="ghost" disabled={!signed} onClick={() => exportM4PDF(state)}>
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
        {submitting ? "Verrouillage…" : "Verrouiller & passer au Module 5"}
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
              M4 verrouillé.
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Ta value ladder est cristallisée et poussée vers le Module 5.
              <br /><br />
              Tu accèdes maintenant au <strong className="text-[#C9A84C]">Module 5 — High Ticket Detail</strong>.
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
