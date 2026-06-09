import { useCallback, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, RotateCcw, Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUserPass } from "@/hooks/useUserPass";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useParcours, useCompleteChapitre } from "@/hooks/useParcours";
import { supabase } from "@/integrations/supabase/client";
import { usePersistedM13State } from "./lib/usePersistedState";
import { buildM13Snapshot } from "./lib/snapshot";
import { CRITERIA, countChecked, allChecked, type CritereId, type M13State } from "./lib/types";

export default function M13BilanPage() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { hasLiberty, isLoading: passLoading } = useUserPass();
  const userId = user?.id ?? null;
  const persisted = usePersistedM13State(userId);
  const { parcours } = useParcours("liberty");
  const completeMutation = useCompleteChapitre();
  const [showRestart, setShowRestart] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAuthorized = useMemo(() => {
    if (!profile) return false;
    if (profile.role === "ceo" || profile.role === "coach") return true;
    return hasLiberty;
  }, [profile, hasLiberty]);

  async function pushProfilePivot(signedState: M13State) {
    if (!userId) return;
    try {
      const { data: existing } = await supabase.from("liberty_user_profile" as never).select("data").eq("user_id", userId as never).maybeSingle();
      const current = ((existing as any)?.data as Record<string, unknown>) ?? {};
      const snapshot = buildM13Snapshot(signedState);
      const merged = { ...current, m13: snapshot, m13_completed_at: snapshot.signed_at, _updated_at: new Date().toISOString() };
      const { error } = await supabase.from("liberty_user_profile" as never).upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    } catch (e: any) { console.warn("[M13] push profil pivot:", e?.message); }
  }

  const { state, setState, flushNow, resetState } = persisted;

  const toggle = useCallback((id: CritereId) => {
    if (state.signed) return;
    setState((prev) => ({ ...prev, checks: { ...prev.checks, [id]: !prev.checks[id] } }));
  }, [state.signed, setState]);

  async function sign(name: string) {
    if (!name.trim()) { toast.warning("Ajoute ton prénom pour signer"); return; }
    if (!allChecked(state)) { toast.error("Les 5 cases doivent être cochées"); return; }
    setSubmitting(true);
    try {
      const signedState: M13State = { ...state, signed: true, signed_at: new Date().toISOString(), signed_by: name.trim() };
      setState(() => signedState);
      await flushNow();
      await pushProfilePivot(signedState);
      if (parcours) {
        const chap = parcours.phases.flatMap((ph) => ph.chapitres).find((c) => c.titre.startsWith("M13 —"));
        if (chap) { try { await completeMutation.mutateAsync(chap.id); } catch (e: any) { console.warn("[M13] complete chapitre:", e?.message); } }
      }
      toast.success("Bilan signé. Tu peux poursuivre le parcours.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally { setSubmitting(false); }
  }

  if (authLoading || passLoading) {
    return <div className="-mx-6 -my-6 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] bg-[#050505] p-6"><div className="mx-auto max-w-[720px] space-y-3"><Skeleton className="h-10 w-1/3 bg-white/5" /><Skeleton className="h-64 w-full bg-white/5" /></div></div>;
  }
  if (!user) { navigate("/login"); return null; }
  if (!isAuthorized) {
    return (
      <div className="-mx-6 -my-6 flex min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] items-center justify-center bg-[#050505] p-6 text-center">
        <div className="max-w-md"><h2 className="mb-2 text-xl font-semibold text-white">Accès réservé</h2><p className="text-sm text-white/60">Le M13 BILAN est réservé aux porteurs du pass LIBERTY.</p><button type="button" onClick={() => navigate("/parcours/liberty")} className="mt-4 rounded-full px-4 py-2 text-sm font-medium text-[#C9A84C] underline">Retour au parcours</button></div>
      </div>
    );
  }
  if (persisted.isLoading) {
    return <div className="-mx-6 -my-6 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] bg-[#050505] p-6"><div className="mx-auto max-w-[720px] space-y-3"><Skeleton className="h-10 w-1/3 bg-white/5" /><Skeleton className="h-64 w-full bg-white/5" /></div></div>;
  }

  const count = countChecked(state);
  const all = allChecked(state);

  return (
    <div className="-mx-6 -my-6 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] text-[#ECEEF4]" style={{ background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(201,168,76,0.06), transparent 60%), #050505" }}>
      <div className="mx-auto w-full max-w-[720px] px-4 py-8 md:py-10">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/parcours/liberty" className="inline-flex items-center gap-1.5 text-xs font-medium text-white/40 transition-colors hover:text-[#C9A84C]"><ArrowLeft className="h-3.5 w-3.5" /> Retour au parcours LIBERTY</Link>
          {!state.signed && count > 0 && (
            <button type="button" onClick={() => setShowRestart(true)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "0.5px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}><RotateCcw className="h-3 w-3" /> Recommencer</button>
          )}
        </div>

        <div className="mb-1 flex items-baseline gap-2"><span className="font-serif text-[20px] font-semibold text-[#C9A84C]">LIBERTY</span><span className="text-white/30">·</span><span className="text-[11px] uppercase tracking-[0.14em] text-white/40">AL BARAKA</span></div>
        <h1 className="font-serif text-[30px] font-semibold leading-tight text-white"><span className="italic text-[#C9A84C]">13</span> Bilan des 5 non-négociables</h1>
        <p className="mt-2 mb-5 max-w-[640px] text-[14px] leading-[1.6] text-white/55">Avant de basculer en mise en marché, tu confirmes que ton offre remplit les 5 conditions qui décident si tu peux vraiment scaler — ou si tu retournes consolider d'abord.</p>

        {/* Bannières */}
        {!state.m10_present && !state.signed && (
          <div className="mb-3 rounded-xl px-4 py-3 text-[13px] leading-[1.5]" style={{ background: "rgba(201,138,76,0.08)", border: "1px solid #c98a4c", color: "#e8c9a0" }}>
            ⚠ <strong>Module 10 (happy clients) non détecté.</strong> Le critère 5 te demande d'affirmer que tu as 10 clients satisfaits. Si tu n'as pas signé M10, tu ne peux pas vraiment cocher cette case honnêtement — retourne d'abord consolider M10.
          </div>
        )}
        {state.signed && (
          <div className="mb-3 rounded-xl px-4 py-3 text-[13px] leading-[1.5]" style={{ background: "rgba(76,201,135,0.08)", border: "1px solid #4cc987", color: "#b0e8c5" }}>
            ✓ <strong>Bilan signé</strong> par {state.signed_by}{state.signed_at ? " le " + new Date(state.signed_at).toLocaleString("fr-FR") : ""}.
          </div>
        )}

        <div className="rounded-2xl p-6" style={{ background: "#111", border: "1px solid #2a2a2a" }}>
          <p className="mb-4 text-[14px] leading-[1.6] text-white/55">Tu coches honnêtement les 5 affirmations ci-dessous, puis tu signes pour basculer vers la mise en marché.</p>

          <div className="mb-5 space-y-2.5">
            {CRITERIA.map((c, idx) => {
              const checked = !!state.checks[c.id];
              return (
                <button key={c.id} type="button" onClick={() => toggle(c.id)} disabled={state.signed} className="flex w-full items-start gap-3.5 rounded-[10px] px-4 py-3.5 text-left transition-all disabled:cursor-default" style={{ background: checked ? "rgba(76,201,135,0.06)" : "#181818", border: "1px solid " + (checked ? "#4cc987" : "#2a2a2a") }}>
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px]" style={{ background: checked ? "#4cc987" : "transparent", border: "1.5px solid " + (checked ? "#4cc987" : "#555") }}>{checked && <Check className="h-3.5 w-3.5" strokeWidth={3} style={{ color: "#080808" }} />}</span>
                  <span className="flex-1 text-[14.5px] leading-[1.5] text-white/90"><span className="mr-1 font-serif text-[14px] italic text-white/40">{idx + 1}.</span>{c.lead}<b style={{ color: checked ? "#4cc987" : "#C9A84C" }}>{c.strong}</b>{c.tail}</span>
                </button>
              );
            })}
          </div>

          <div className="mb-4 flex items-center justify-between rounded-[10px] px-4 py-3.5" style={{ background: "#181818", border: "1px solid " + (all ? "#4cc987" : "#2a2a2a") }}>
            <div className="font-serif text-[20px] font-semibold"><span style={{ color: all ? "#4cc987" : "#C9A84C" }}>{count}</span><span className="text-white/70">/5 cochés</span></div>
            <div className="max-w-[60%] text-right text-[12.5px] leading-[1.4] text-white/45">{all ? (state.signed ? "Bilan signé." : "Tu remplis les 5 conditions. Signe ci-dessous.") : "Coche au fur et à mesure ce qui est vrai pour toi."}</div>
          </div>

          {state.signed ? (
            <div className="rounded-[10px] p-5" style={{ background: "rgba(76,201,135,0.05)", border: "1px solid #4cc987" }}>
              <h3 className="mb-2 font-serif text-[18px] font-semibold text-[#4cc987]">Bilan verrouillé — tu peux poursuivre</h3>
              <p className="mb-3 text-[14px] leading-[1.6] text-white/85">Ta fiche est verrouillée et transmise à la suite. Ton coach reçoit la notification dans son tableau d'accompagnement.</p>
              <p className="mb-4 text-[14px] leading-[1.6] text-white/85">La prochaine étape (mise en marché) arrive — en attendant, tu peux revenir au parcours.</p>
              <button type="button" onClick={() => navigate("/parcours/liberty")} className="inline-block rounded-lg px-5 py-2.5 text-[14px] font-semibold text-[#080808]" style={{ background: "#C9A84C" }}>Retour au parcours →</button>
            </div>
          ) : all ? (
            <SignBlock onSign={sign} submitting={submitting} initialName={state.signed_by} />
          ) : (
            <div className="rounded-[4px_10px_10px_4px] px-4 py-3.5 text-[13.5px] leading-[1.55] text-white/85" style={{ background: "rgba(201,76,76,0.05)", borderLeft: "3px solid #c94c4c" }}>
              <b className="text-[#e8a5a5]">Tu ne peux pas signer pour le moment.</b> Il te manque {5 - count} critère{5 - count > 1 ? "s" : ""}. Si un critère ne te semble pas atteignable aujourd'hui, retourne consolider le module amont concerné — tu reviendras signer quand ce sera vrai.
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.16em] text-white/25">AL BARAKA · Liberty · Module 13</p>
      </div>

      <AlertDialog open={showRestart} onOpenChange={setShowRestart}>
        <AlertDialogContent style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}>
          <AlertDialogHeader><AlertDialogTitle>Tout décocher et recommencer ?</AlertDialogTitle><AlertDialogDescription className="text-white/60">Les 5 cases seront remises à zéro.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={async () => { setShowRestart(false); await resetState(); }} style={{ background: "rgba(232,107,107,0.18)", color: "#E86B6B", border: "1px solid rgba(232,107,107,0.4)" }}>Recommencer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SignBlock({ onSign, submitting, initialName }: { onSign: (n: string) => void; submitting: boolean; initialName: string }) {
  const [name, setName] = useState(initialName || "");
  return (
    <div>
      <div className="mb-4 rounded-[4px_10px_10px_4px] px-4 py-3.5 text-[13.5px] leading-[1.55] text-white/85" style={{ background: "rgba(201,76,76,0.05)", borderLeft: "3px solid #c94c4c" }}>
        <b className="text-[#e8a5a5]">Tu signes que tu as vraiment les 5.</b> Si tu coches pour passer à la suite, tu te mens à toi-même — pas à moi.
      </div>
      <div className="rounded-[10px] p-5" style={{ background: "#181818", border: "1px solid #C9A84C" }}>
        <label className="mb-2 block text-[12px] uppercase tracking-[0.04em] text-white/50">Ton prénom</label>
        <div className="flex flex-wrap items-stretch gap-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton prénom" className="min-w-[200px] max-w-[300px] flex-1 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/30" style={{ background: "#0c0c0c", border: "1px solid #2a2a2a" }} />
          <button type="button" disabled={submitting} onClick={() => onSign(name)} className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[14px] font-semibold text-[#080808] disabled:opacity-40" style={{ background: "#C9A84C" }}><Lock className="h-4 w-4" />{submitting ? "Signature…" : "Je signe mon bilan"}</button>
        </div>
      </div>
    </div>
  );
}
