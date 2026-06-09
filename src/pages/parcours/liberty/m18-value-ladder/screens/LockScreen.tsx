import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast as sonner } from "sonner";
import { Card, StepH2, Lead, Peda, AlertSoft } from "../components/parts";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useParcours, useCompleteChapitre } from "@/hooks/useParcours";
import { supabase } from "@/integrations/supabase/client";
import { type M18State, LEVELS, toIntPrice, fmtEur } from "../lib/types";
import { computeLTV, hasLT, getNiv, getProgrammeNom, canEnterLock } from "../lib/validations";
import { buildM18Snapshot } from "../lib/snapshot";
import { exportEcosystemePDF } from "../lib/exportPDF";

interface Props { state: M18State; setState: (n: (p: M18State) => M18State) => void; userId: string | null; onBack: () => void; onGoToContent: () => void; flushNow: () => Promise<void>; }

export function LockScreen({ state, setState, userId, onBack, onGoToContent, flushNow }: Props) {
  const navigate = useNavigate();
  const [commit, setCommit] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { parcours } = useParcours("liberty");
  const completeMutation = useCompleteChapitre();

  const d = state.data;
  const ltvR = computeLTV(state);
  const mColor = ltvR.target_ok ? "#4cc987" : ltvR.multiple >= 2 ? "#c98a4c" : "#c94c4c";
  const setName = (v: string) => setState((prev) => ({ ...prev, signed_by: v }));
  const nameOk = (state.signed_by || "").trim().length >= 2;

  async function pushProfilePivot(signedState: M18State) {
    if (!userId) return;
    try {
      const { data: existing } = await supabase.from("liberty_user_profile" as never).select("data").eq("user_id", userId as never).maybeSingle();
      const current = ((existing as any)?.data as Record<string, unknown>) ?? {};
      const snapshot = buildM18Snapshot(signedState);
      const merged = { ...current, m18: snapshot, m18_completed_at: snapshot.signed_at, _updated_at: new Date().toISOString() };
      const { error } = await supabase.from("liberty_user_profile" as never).upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    } catch (e: any) { console.warn("[M18] push profil pivot:", e?.message); }
  }

  async function signEcosystem() {
    if (!commit || !nameOk) { sonner.error("Coche l’engagement et signe avec ton nom."); return; }
    if (!canEnterLock(state)) { sonner.error("Complète l’échelle, les passages et la LTV avant de verrouiller."); return; }
    const signedState: M18State = { ...state, signed: true, signed_at: new Date().toISOString(), signed_by: (state.signed_by || "").trim() };
    setState(() => signedState);
    await flushNow();
    await pushProfilePivot(signedState);
    if (parcours) {
      const chap = parcours.phases.flatMap((ph) => ph.chapitres).find((c) => c.titre.startsWith("M18 —"));
      if (chap) { try { await completeMutation.mutateAsync(chap.id); } catch (e: any) { console.warn("[M18] complete chapitre:", e?.message); } }
    }
    sonner.success("Écosystème verrouillé. Carte prête à télécharger.");
    setShowSuccess(true);
  }

  return (
    <Card>
      <StepH2 marker="4 ·">Ta carte d’écosystème</StepH2>
      <Lead>Voici ta Value Ladder complète, prête à être figée. Vérifie, signe, et télécharge la carte PDF — la vue d’ensemble que tu garderas sous les yeux pour piloter ton acquisition.</Lead>

      <div className="my-4 rounded-xl p-4" style={{ background: "#0c0c0c", border: "1px solid #2a2a2a" }}>
        <div className="text-[16px] font-semibold text-[#C9A84C]">{getProgrammeNom(state) || "Ton écosystème"}</div>
        <div className="mb-3 text-[12.5px] text-white/55">{state.m1_data && state.m1_data.niche ? state.m1_data.niche : "Value Ladder en 5 niveaux"}</div>

        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40">L’échelle</div>
        <div className="mb-3 space-y-1">
          {LEVELS.map((lv) => {
            const n: any = getNiv(state, lv.key);
            const nom = (n.nom || "").trim() || "—";
            const prix = lv.paid ? (toIntPrice(n.prix) > 0 ? fmtEur(toIntPrice(n.prix)) : "—") : "gratuit";
            return <div key={lv.key} className="flex items-center gap-2 text-[12.5px]"><span className="shrink-0 font-semibold text-[#C9A84C]">{lv.label.replace("Niveau ", "N")}</span><span className="flex-1 text-white/80">{nom}</span><span className="font-semibold text-white/70">{prix}</span></div>;
          })}
        </div>

        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40">La machine à ascension</div>
        <div className="space-y-1">
          {hasLT(state) && <div className="flex items-center justify-between text-[12.5px]"><span className="text-white/60">Montée LT → MT</span><span className="font-semibold text-white">{Number(d.ltv.taux_lt_mt) || 0} %</span></div>}
          <div className="flex items-center justify-between text-[12.5px]"><span className="text-white/60">LTV par client entrant</span><span className="text-[16px] font-semibold text-white">{fmtEur(ltvR.ltv)}</span></div>
          <div className="flex items-center justify-between text-[12.5px]"><span className="text-white/60">Multiple / prix d’entrée</span><span className="font-semibold" style={{ color: mColor }}>{ltvR.multiple ? ltvR.multiple.toFixed(1) + "×" : "—"}</span></div>
        </div>
      </div>

      {state.signed ? (
        <>
          <AlertSoft tone="green">Ton écosystème est verrouillé. Tu peux régénérer la carte PDF autant de fois que nécessaire.</AlertSoft>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={onBack} className="rounded-full px-4 py-2 text-[13px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}>← Retour</button>
            <button type="button" onClick={() => exportEcosystemePDF(state)} className="rounded-full px-5 py-2.5 text-[13px] font-semibold text-[#080808]" style={{ background: "#C9A84C" }}>⬇ Télécharger la carte PDF</button>
          </div>
          <AlertSoft>Prochaine étape : <b>Module 19 — Les erreurs fatales</b>, pour blinder ton écosystème avant de lancer.</AlertSoft>
        </>
      ) : (
        <>
          <button type="button" onClick={() => setCommit(!commit)} className="my-3 flex w-full items-start gap-3 rounded-[10px] px-4 py-3 text-left" style={{ background: commit ? "#2A2310" : "#181818", border: commit ? "1px solid #C9A84C" : "1px solid #2a2a2a" }}>
            <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px]" style={{ background: commit ? "#C9A84C" : "transparent", border: "1.5px solid #C9A84C", color: "#080808", fontWeight: 700, fontSize: 12 }}>{commit ? "✓" : ""}</span>
            <span className="flex-1 text-[12.5px] leading-[1.5] text-white/85">Je confirme que cette échelle reflète mes vraies offres et que chaque marche prépare la suivante. Je m’engage à piloter mon acquisition sur ma LTV, pas sur le prix d’une offre isolée.</span>
          </button>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1"><label className="mb-1.5 block text-[12.5px] text-white/45">Ton nom <span className="text-white/35">pour signer la carte</span></label>
              <input type="text" value={state.signed_by || ""} onChange={(e) => setName(e.target.value)} placeholder="Prénom Nom" className="w-full rounded-[9px] px-3 py-2.5 text-[14.5px] outline-none focus:border-[#C9A84C]" style={{ background: "#0c0c0c", border: "1px solid #2a2a2a", color: "#f5f5f5" }} /></div>
            <button type="button" disabled={!commit || !nameOk} onClick={signEcosystem} className="rounded-full px-5 py-2.5 text-[13px] font-semibold text-[#080808] transition-all disabled:cursor-not-allowed disabled:opacity-40" style={{ background: "#C9A84C" }}>Verrouiller mon écosystème</button>
          </div>
          <div className="mt-5"><button type="button" onClick={onBack} className="rounded-full px-4 py-2 text-[13px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}>← Retour</button></div>
        </>
      )}

      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Écosystème verrouillé.</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">Ta Value Ladder complète est gravée et transmise au module suivant (M19). Tu peux télécharger ta carte d’écosystème à tout moment depuis cet écran.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button type="button" onClick={onGoToContent} className="mr-2 rounded-full px-4 py-2 text-[13px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}>Revenir au contenu</button>
            <AlertDialogAction onClick={() => { setShowSuccess(false); navigate("/parcours/liberty"); }} style={{ background: "#C9A84C", color: "#080808" }}>Retour au parcours</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
