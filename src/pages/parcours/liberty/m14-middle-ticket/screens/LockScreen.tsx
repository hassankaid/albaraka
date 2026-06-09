import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Lock, CheckCircle2, Check } from "lucide-react";
import { toast } from "sonner";
import { Btn } from "../../m1-niche/components/ui";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useParcours, useCompleteChapitre } from "@/hooks/useParcours";
import { supabase } from "@/integrations/supabase/client";
import { exportM14PDF } from "../lib/exportPDF";
import { buildM14Snapshot } from "../lib/snapshot";
import { type M14State, FORMATS, type FormatKey } from "../lib/types";
import { evaluatePricing, countDecisions, getPrixHT, getProgrammeHTNom, formatPrix } from "../lib/validations";

interface Props { state: M14State; setState: (n: (p: M14State) => M14State) => void; userId: string | null; onBack: () => void; flushNow: () => Promise<void>; }

export function LockScreen({ state, setState, userId, onBack, flushNow }: Props) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { parcours } = useParcours("liberty");
  const completeMutation = useCompleteChapitre();

  const d = state.data;
  const fmt = d.format_choisi || "";
  const fmtLabel = fmt ? FORMATS[fmt as FormatKey].label : "—";
  const prixHT = getPrixHT(state);
  const evp = evaluatePricing(d.prix_mt, prixHT, d.prix_mt_unite, d.valeur_percue_eur);
  const stats = countDecisions(d.modules_decision);
  const programmeNom = getProgrammeHTNom(state);

  const name = (state.signed_by ?? "").trim();
  const commit = !!state._commit;
  const canSign = !state.signed && !state.demoMode && name.length >= 2 && commit;

  const setName = (val: string) => setState((prev) => ({ ...prev, signed_by: val }));
  const setCommit = (v: boolean) => setState((prev) => ({ ...prev, _commit: v }));

  const decLabel = (dec: string) => (dec === "garder" ? "✓ Gardé" : dec === "adapter" ? "↻ Adapté" : dec === "retirer" ? "✕ Retiré" : "? Non décidé");
  const valeurMultiple = evp.prix_mt_effectif > 0 && d.valeur_percue_eur > 0 ? (d.valeur_percue_eur / evp.prix_mt_effectif).toFixed(1) + "x" : "—";

  async function pushProfilePivot(signedState: M14State) {
    if (!userId) return;
    try {
      const { data: existing } = await supabase.from("liberty_user_profile" as never).select("data").eq("user_id", userId as never).maybeSingle();
      const current = ((existing as any)?.data as Record<string, unknown>) ?? {};
      const snapshot = buildM14Snapshot(signedState);
      const merged = { ...current, m14: snapshot, m14_completed_at: snapshot.signed_at, _updated_at: new Date().toISOString() };
      const { error } = await supabase.from("liberty_user_profile" as never).upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    } catch (e: any) { console.warn("[M14] push profil pivot:", e?.message); }
  }

  async function finalize() {
    if (!canSign) return;
    setSubmitting(true);
    try {
      const signedState: M14State = { ...state, signed: true, signed_at: new Date().toISOString(), signed_by: name, highest: "lock" };
      setState(() => signedState);
      await flushNow();
      await pushProfilePivot(signedState);
      if (parcours) {
        const chap = parcours.phases.flatMap((ph) => ph.chapitres).find((c) => c.titre.startsWith("M14 —"));
        if (chap) { try { await completeMutation.mutateAsync(chap.id); } catch (e: any) { console.warn("[M14] complete chapitre:", e?.message); } }
      }
      toast.success("Module 14 signé. Tu peux maintenant télécharger ton mémo PDF.");
      setShowSuccess(true);
    } catch (e: any) { toast.error("Erreur finalisation : " + (e?.message ?? "inconnue")); }
    finally { setSubmitting(false); }
  }

  const recap = (label: string, value: React.ReactNode) => (
    <div className="rounded-lg px-3 py-2" style={{ background: "#0C0B08", border: "0.5px solid rgba(201,168,76,0.12)" }}>
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-white/40">{label}</div>
      <div className="mt-0.5 text-[12px] leading-[1.35] text-white/85">{value}</div>
    </div>
  );

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-serif text-[20px] font-semibold italic text-[#C9A84C]">04</span>
        <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-white">Signature et mémo PDF</h2>
      </div>
      <p className="mb-5 text-[13px] leading-[1.65] text-white/60">
        Tu vas signer l'architecture de ton MT et télécharger ton mémo PDF complet. Le mémo contient tout : synthèse, justifications, architecture détaillée des modules, et consignes de lancement à respecter. À garder pour toi ou à montrer à ton coach pour analyse.
      </p>

      {/* Récapitulatif */}
      <div className="mb-5 rounded-xl p-4" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
        <div className="text-[13px] font-semibold text-[#C9A84C]">Récapitulatif de ton Middle-Ticket</div>
        <div className="mb-3 text-[12px] text-white/55">Dérivé de <b className="text-white/85">{programmeNom}</b> · Format : <b className="text-white/85">{fmtLabel}</b></div>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {recap("Format MT", fmtLabel)}
          {recap("Prix MT", formatPrix(d.prix_mt, d.prix_mt_unite))}
          {recap(prixHT > 0 ? "Ratio MT/HT" : "Prix HT manquant", prixHT > 0 ? evp.ratio_pct + "%" : "—")}
          {recap("Valeur perçue / prix", valeurMultiple)}
          {recap("Modules gardés/adaptés", stats.garder + " + " + stats.adapter)}
          {recap("Modules retirés", String(stats.retirer))}
        </div>

        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40">Architecture des modules MT</div>
        <ul className="mb-3 space-y-1 pl-4 text-[12.5px] leading-[1.6] text-white/60" style={{ listStyle: "disc" }}>
          {(d.modules_decision || []).map((m, i) => {
            const adaptTxt = m.decision === "adapter" && m.adaptation ? (m.adaptation.length > 90 ? m.adaptation.substring(0, 90) + "…" : m.adaptation) : "";
            return <li key={i}><b className="text-white/80">Module {m.index || "?"}</b> · {m.nom_origine || ""} → <span className="text-[#C9A84C]">{decLabel(m.decision)}</span>{adaptTxt ? <> — <i className="text-white/50">{adaptTxt}</i></> : null}</li>;
          })}
        </ul>

        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40">Justification du format choisi</div>
        <div className="mb-3 rounded-lg px-3 py-2 text-[12.5px] leading-[1.5] text-white/80" style={{ background: "#0C0B08" }}>{d.format_justification || "—"}</div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40">Justification du prix</div>
        <div className="rounded-lg px-3 py-2 text-[12.5px] leading-[1.5] text-white/80" style={{ background: "#0C0B08" }}>{d.justification_prix || "—"}</div>
      </div>

      {/* Mémo PDF */}
      <div className="mb-5 rounded-xl p-4" style={{ background: "rgba(201,168,76,0.04)", border: "0.5px solid rgba(201,168,76,0.18)" }}>
        <h4 className="mb-2 text-[13px] font-semibold text-[#C9A84C]">Ton mémo PDF : ce qu'il contient</h4>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75">Le PDF que tu vas télécharger fait 5 pages : une page de synthèse (tout d'un coup d'œil pour ton coach), une page de justifications (pourquoi ce format, pourquoi ce prix), une à deux pages d'architecture détaillée (chaque module avec sa décision et son adaptation complète), et une dernière page de consignes de lancement — les 4 phases du lancement MT (annonce, contenu valeur, webinaire, cart open/close) avec les ratios de conversion typiques et 3 questions de calibration marché à te poser avant de lancer.</p>
        <p className="text-[13px] leading-[1.6] text-white/75">Garde ce mémo. C'est la trace de tes décisions à un moment T — utile pour ton coach, utile pour toi quand tu reviendras dessus dans 3 mois.</p>
      </div>

      {/* Signature */}
      {!state.signed && (
        <div className="mb-5 rounded-xl p-4" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
          <label className="mb-1 block text-[13px] font-medium text-white/85">Ton nom complet <span className="text-white/40">(prénom + nom — pour traçabilité et page de couverture du PDF)</span></label>
          <input type="text" value={state.signed_by || ""} disabled={!!state.demoMode} onChange={(e) => setName(e.target.value)} placeholder="ex : Sidali Bouallag" className="mb-3 w-full rounded-[10px] px-3.5 py-2.5 text-sm text-white outline-none" style={{ background: "#0c0c0c", border: "1px solid rgba(201,168,76,0.18)" }} />
          <button type="button" onClick={() => !state.demoMode && setCommit(!commit)} className="flex w-full items-start gap-3 rounded-[10px] px-4 py-3 text-left" style={{ background: commit ? "#2A2310" : "#0F0E0A", border: commit ? "1px solid #C9A84C" : "1px solid rgba(201,168,76,0.18)" }}>
            <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px]" style={{ background: commit ? "#C9A84C" : "transparent", border: "1.5px solid #C9A84C" }}>{commit && <Check className="h-3 w-3" strokeWidth={3} style={{ color: "#080808" }} />}</span>
            <span className="flex-1 text-[12.5px] leading-[1.5] text-white/85">Je confirme que cette architecture MT est cohérente avec mon HT, que j'ai exploré les 4 formats avant de trancher, que mon prix respecte les 3 garde-fous, et que je m'engage à respecter les consignes de lancement décrites dans le mémo.</span>
          </button>
          {state.demoMode && <p className="mt-2 text-[11px] text-amber-400">Mode démo — signature désactivée (aucune écriture sur ton profil).</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> Prix</Btn>
        <div className="flex flex-wrap gap-2">
          {state.signed && <Btn variant="ghost" onClick={() => { try { exportM14PDF(state); } catch (e) { console.error(e); toast.error("Erreur génération PDF — voir console."); } }}><Download className="h-4 w-4" /> Télécharger le mémo PDF</Btn>}
          {!state.signed && <Btn variant="cta" disabled={!canSign || submitting} onClick={finalize}><Lock className="h-4 w-4" />{submitting ? "Signature…" : "Signer mon MT"}</Btn>}
        </div>
      </div>

      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> M14 verrouillé.</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">Ton architecture Middle-Ticket, ton prix et ton mémo sont gravés et transmis au module suivant (M15). Tu peux télécharger ton mémo PDF depuis cet écran.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { setShowSuccess(false); navigate("/parcours/liberty"); }} style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)", color: "#FFFFFF" }}>Retour au parcours</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
