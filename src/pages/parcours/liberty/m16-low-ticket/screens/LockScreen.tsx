import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast as sonner } from "sonner";
import { Card, Eyebrow, HStep, Peda } from "../components/parts";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useParcours, useCompleteChapitre } from "@/hooks/useParcours";
import { supabase } from "@/integrations/supabase/client";
import { type M16State, type FormatKey, FORMATS_LT, LIVRABLE_LABEL } from "../lib/types";
import { ctx, pricingEval } from "../lib/validations";
import { buildM16Snapshot } from "../lib/snapshot";
import { downloadDoc } from "../lib/exportDoc";

interface Props { state: M16State; setState: (n: (p: M16State) => M16State) => void; userId: string | null; onBack: () => void; onGoToGeneration: () => void; flushNow: () => Promise<void>; toast: (m: string) => void; }

export function LockScreen({ state, setState, userId, onBack, onGoToGeneration, flushNow, toast }: Props) {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const { parcours } = useParcours("liberty");
  const completeMutation = useCompleteChapitre();

  const d = state.data;
  const f = FORMATS_LT[d.format_choisi as FormatKey];
  const c = ctx(state);
  const pe = pricingEval(state);

  const setName = (v: string) => setState((prev) => ({ ...prev, signed_by: v }));

  async function pushProfilePivot(signedState: M16State) {
    if (!userId || signedState.demoMode) return;
    try {
      const { data: existing } = await supabase.from("liberty_user_profile" as never).select("data").eq("user_id", userId as never).maybeSingle();
      const current = ((existing as any)?.data as Record<string, unknown>) ?? {};
      const snapshot = buildM16Snapshot(signedState);
      const merged = { ...current, m16: snapshot, m16_completed_at: snapshot.signed_at, _updated_at: new Date().toISOString() };
      const { error } = await supabase.from("liberty_user_profile" as never).upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    } catch (e: any) { console.warn("[M16] push profil pivot:", e?.message); }
  }

  async function signLock() {
    if (!state.signed_by || state.signed_by.trim().length < 2) { sonner.warning("Indique ton nom pour signer."); return; }
    const signedState: M16State = { ...state, signed: true, signed_at: new Date().toISOString() };
    setState(() => signedState);
    await flushNow();
    await pushProfilePivot(signedState);
    if (!signedState.demoMode && parcours) {
      const chap = parcours.phases.flatMap((ph) => ph.chapitres).find((ch) => ch.titre.startsWith("M16 —"));
      if (chap) { try { await completeMutation.mutateAsync(chap.id); } catch (e: any) { console.warn("[M16] complete chapitre:", e?.message); } }
    }
    sonner.success("Verrouillé — ton Low-Ticket est prêt pour la suite.");
    setShowSuccess(true);
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <div>
          <Eyebrow>Étape 6</Eyebrow>
          <HStep>Verrouille ton Low-Ticket</HStep>
        </div>
        {state.signed && <span className="rounded-full px-3 py-1 text-[12px] font-semibold" style={{ background: "rgba(111,174,106,0.15)", color: "#6fae6a", border: "1px solid #6fae6a" }}>✓ Verrouillé le {(state.signed_at || "").slice(0, 10)}</span>}
      </div>

      <div className="my-4 rounded-xl p-4" style={{ background: "#161513", border: "1px solid #262420" }}>
        <p className="text-[14px] leading-[1.6] text-white/85"><b className="text-white">{d.titre || "—"}</b> — {f ? f.label : ""} à <b className="text-[#C9A84C]">{pe.lt}€</b>{c.prix_mt ? " (soit " + pe.ratio + "× sous ton offre principale)" : ""}.</p>
        {d.promesse_lt && <p className="mt-2 text-[13px] leading-[1.55] text-white/55">{d.promesse_lt}</p>}
        <p className="mt-2 text-[13px] text-white/55">Livrable : {f ? LIVRABLE_LABEL[f.livrable] : ""} · {d.sections ? d.sections.length : 0} sections générées.</p>
      </div>

      <Peda>En verrouillant, ton produit Low-Ticket part vers la suite : on s'en servira pour construire ton tunnel de vente automatique (la page, l'offre complémentaire au paiement, la montée vers ton offre principale).</Peda>

      {!state.signed ? (
        <div className="mt-4">
          <label className="mb-1.5 block text-[12.5px] text-white/45">Signe pour verrouiller (ton nom)</label>
          <div className="flex flex-wrap items-center gap-2">
            <input type="text" value={state.signed_by} onChange={(e) => setName(e.target.value)} placeholder="Ton nom" className="min-w-[200px] flex-1 rounded-[9px] px-3 py-2.5 text-[14.5px] outline-none focus:border-[#C9A84C]" style={{ background: "#161513", border: "1px solid #262420", color: "#f4f1e8" }} />
            <button type="button" onClick={signLock} className="rounded-full px-5 py-2.5 text-[13px] font-semibold text-[#080808]" style={{ background: "#C9A84C" }}>Verrouiller mon Low-Ticket</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onGoToGeneration} className="rounded-full px-4 py-2 text-[13px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}>Revenir au contenu</button>
          <button type="button" onClick={() => downloadDoc(state, toast)} className="rounded-full px-4 py-2 text-[13px] font-semibold text-[#080808]" style={{ background: "#C9A84C" }}>⬇ Re-télécharger le DOCX</button>
        </div>
      )}

      <div className="mt-5">
        <button type="button" onClick={onBack} className="rounded-full px-4 py-2 text-[13px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}>← Retour</button>
      </div>

      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Low-Ticket verrouillé.</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">Ton produit d'entrée est gravé et transmis au module suivant (M17 boosters). Tu peux re-télécharger ton document éditable à tout moment depuis cet écran.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { setShowSuccess(false); navigate("/parcours/liberty"); }} style={{ background: "#C9A84C", color: "#080808" }}>Retour au parcours</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
