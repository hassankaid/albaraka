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
import { exportM12PDF } from "../lib/exportPDF";
import { buildM12Snapshot } from "../lib/snapshot";
import { type M12State, type TechKey, TECHNIQUES, freshTests, VERSION, SCHEMA_VERSION } from "../lib/types";
import {
  nonEmptyCandidats, missingForFinal, missingForPositionnement, allHumanTestsValidated,
  compileCategorieNouvelle, detectGenericTraps, hasMinTrace, activeTestsBag, missingFieldsLabel,
} from "../lib/validations";

interface Props { state: M12State; setState: (n: (p: M12State) => M12State) => void; userId: string | null; onBack: () => void; flushNow: () => Promise<void>; }

export function LockScreen({ state, setState, userId, onBack, flushNow }: Props) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { parcours } = useParcours("liberty");
  const completeMutation = useCompleteChapitre();
  const d = state.data;
  const f = d.final, p = d.positionnement, me = d.methode, ren = d.modules_renommes || [];

  const today = new Date();
  const dateStr = today.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const signed = (state.signed_by ?? "").trim().length >= 3;
  const commit = !!state._commit;
  const allTests = allHumanTestsValidated(d);
  const missingFinal = missingForFinal(d);
  const missingPos = missingForPositionnement(d);
  const canSign = !state.signed && !state.demoMode && missingFinal.length === 0 && missingPos.length === 0 && allTests && signed && commit;
  const t = activeTestsBag(d, freshTests);
  const compiled = compileCategorieNouvelle(p);
  const traps = [...detectGenericTraps(((p.cat_type || "") + " " + (p.cat_cible || "") + " " + (p.cat_resultat || "")).trim()), ...detectGenericTraps(p.ennemi_declare || "")];
  const techLabel = f.technique ? TECHNIQUES[f.technique as TechKey]?.label || "—" : "—";
  const testsValides = [t.telephone && hasMinTrace(t.telephone_trace), t.google && hasMinTrace(t.google_trace), t.promesse && hasMinTrace(t.promesse_trace), t.resonance && hasMinTrace(t.resonance_trace)].filter(Boolean).length;

  const blocked = !state.signed && (!signed || !commit) ? "" : (missingFinal.length || missingPos.length || !allTests) ? "Il te manque : " + missingFieldsLabel("lock", d) : "";

  const setName = (val: string) => setState((prev) => ({ ...prev, signed_by: val }));
  const setCommit = (v: boolean) => setState((prev) => ({ ...prev, _commit: v }));

  async function pushProfilePivot() {
    if (!userId) return;
    try {
      const { data: existing } = await supabase.from("liberty_user_profile" as never).select("data").eq("user_id", userId as never).maybeSingle();
      const current = ((existing as any)?.data as Record<string, unknown>) ?? {};
      const snapshot = buildM12Snapshot({ ...state, signed: true, signed_at: new Date().toISOString(), signed_by: state.signed_by });
      const merged = { ...current, m12: snapshot, m12_completed_at: snapshot.signed_at, _updated_at: new Date().toISOString() };
      const { error } = await supabase.from("liberty_user_profile" as never).upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    } catch (e: any) { console.warn("[M12] push profil pivot:", e?.message); }
  }

  async function finalize() {
    if (!canSign) return;
    setSubmitting(true);
    try {
      setState((prev) => ({ ...prev, signed: true, signed_at: new Date().toISOString(), highest: "lock" }));
      await flushNow();
      await pushProfilePivot();
      if (parcours) {
        const chap = parcours.phases.flatMap((ph) => ph.chapitres).find((c) => c.titre.startsWith("M12 —"));
        if (chap) { try { await completeMutation.mutateAsync(chap.id); } catch (e: any) { console.warn("[M12] complete chapitre:", e?.message); } }
      }
      setShowSuccess(true);
    } catch (e: any) { toast.error("Erreur finalisation : " + (e?.message ?? "inconnue")); }
    finally { setSubmitting(false); }
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify({ state, snapshot: buildM12Snapshot(state) }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `liberty-m12-${f.nom || "naming"}-${today.toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  }

  const testRow = (label: string, ok: boolean, trace: string) => {
    const valid = ok && hasMinTrace(trace);
    return <div className="flex items-start gap-2 text-[12px]"><span className="shrink-0 font-bold" style={{ color: valid ? "#4cc987" : "#c94c4c" }}>{valid ? "✓" : "✗"}</span><span className="text-white/40">{label} —</span><span style={{ color: valid ? "#b0e8c5" : "#e8a0a0" }}>{valid ? trace : "manquant"}</span></div>;
  };

  return (
    <div>
      <div className="mb-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">Étape 8 · Lock</div>
        <h2 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight text-white">Lock — signature et transmission</h2>
        <p className="mt-2 text-[13px] leading-[1.65] text-white/60">Tu valides que ton naming et ton positionnement sont prêts. Une fois signé, tout est transmis automatiquement au module suivant.</p>
      </div>

      <Card className="mb-5">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">Ce qui se passe après la signature</div>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75">Le nom et la baseline deviennent la trame de tout ce que tu vendras : page de vente, mail, ads, posts. Si tu changes le nom ensuite, reviens ici et tout se propagera proprement.</p>
        <p className="text-[13px] leading-[1.6] text-[#C9A84C] italic">L'engagement réel n'est pas de cliquer ici — c'est d'oser dire ton nom à voix haute à un prospect, sans hésiter, comme s'il existait depuis dix ans.</p>
      </Card>

      {traps.length > 0 && <div className="mb-5 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(232,107,107,0.08)", border: "0.5px solid rgba(232,107,107,0.4)", color: "#e8a0a0" }}><strong>Avertissement :</strong> ton positionnement contient des mots-pièges génériques : <strong>{traps.join(", ")}</strong>. Tu peux signer, mais ces termes diluent l'unicité de ta catégorie.</div>}

      {/* Récap */}
      <Card className="mb-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">Ce que tu signes</div>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Recap label="Nom du programme" value={f.nom || "—"} />
          <Recap label="Technique" value={techLabel} />
          <Recap label="Candidats explorés" value={String(nonEmptyCandidats(d).length)} />
          <Recap label="Tests humains" value={<span style={{ color: allTests ? "#4cc987" : "#c94c4c" }}>{testsValides}/4</span>} />
          <Recap label="Méthode" value={me.nom || "non posée"} />
          <Recap label="Modules renommés" value={ren.length + " / " + ((state.m11_data && state.m11_data.modules) ? state.m11_data.modules.length : 0)} />
        </div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40">Baseline</div>
        <div className="mb-3 rounded-lg px-3 py-2 font-serif text-[14px] italic text-white/85" style={{ background: "#0C0B08" }}>« {f.baseline || "—"} »</div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40">Positionnement</div>
        <div className="mb-3 rounded-lg px-3 py-2 text-[12.5px] leading-[1.5] text-white/80" style={{ background: "#0C0B08" }}>{compiled || "—"}<div className="mt-1 italic text-white/55">Contre : {p.ennemi_declare || "—"}</div></div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40">Traces des 4 tests humains</div>
        <div className="space-y-1 rounded-lg px-3 py-2" style={{ background: "#0C0B08" }}>
          {testRow("Téléphone", t.telephone, t.telephone_trace)}
          {testRow("Google", t.google, t.google_trace)}
          {testRow("Promesse", t.promesse, t.promesse_trace)}
          {testRow("Résonance", t.resonance, t.resonance_trace)}
        </div>
        {me.nom && <div className="mt-3"><div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40">Méthode propriétaire</div><div className="rounded-lg px-3 py-2 text-[13px] text-[#C9A84C]" style={{ background: "#0C0B08" }}><strong>{me.nom}</strong>{me.baseline ? <span className="text-white/60 italic"> — « {me.baseline} »</span> : null}</div></div>}
        {ren.length > 0 && <div className="mt-3"><div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40">Modules renommés</div><div className="space-y-1">{ren.map((r) => <div key={r.index} className="rounded-lg px-3 py-1.5 text-[12px]" style={{ background: "#0C0B08" }}><span className="text-white/40">M{r.index} : </span><span className="text-[#C9A84C] font-semibold">{r.nom_final || "—"}</span>{r.baseline ? <span className="text-white/50 italic"> — « {r.baseline} »</span> : null}</div>)}</div></div>}
      </Card>

      {/* Engagement */}
      <Card className="mb-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">⚖️ Engagement</div>
        <button type="button" onClick={() => !state.signed && setCommit(!commit)} className="mb-4 flex w-full items-start gap-3 rounded-[10px] px-4 py-3 text-left" style={{ background: commit ? "#2A2310" : "#14130E", border: commit ? "1px solid #C9A84C" : "1px solid rgba(201,168,76,0.18)" }}>
          <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px]" style={{ background: commit ? "#C9A84C" : "transparent", border: "1.5px solid #C9A84C" }}>{commit && <Check className="h-3 w-3" strokeWidth={3} style={{ color: "#080808" }} />}</span>
          <span className="flex-1 text-[13px] font-semibold leading-[1.5] text-white/85">Je m'engage à dire mon nom de programme à voix haute à 3 prospects dans les 7 jours, sans hésitation.</span>
        </button>
        <InputLabel>Ton prénom + nom (signature)</InputLabel>
        <TextInput value={state.signed_by} onChange={(e) => setName(e.target.value)} placeholder="Ex. Sidali Mansour" />
        <p className="mt-2 text-[11px] text-white/40">Date de signature : {dateStr}</p>
        {state.demoMode && <p className="mt-2 text-[11px] text-amber-400">Mode démo — signature désactivée (aucune écriture sur ton profil).</p>}
      </Card>

      <div className="mb-5 flex flex-wrap gap-2">
        <Btn variant="ghost" disabled={!f.nom || !f.baseline} onClick={() => exportM12PDF(state)}><FileText className="h-4 w-4" /> Télécharger PDF</Btn>
        <Btn variant="ghost" disabled={!signed} onClick={downloadJSON}><Download className="h-4 w-4" /> Télécharger JSON (handoff)</Btn>
      </div>

      <Btn variant="cta" disabled={!canSign || submitting} onClick={finalize} className="w-full">
        <Lock className="h-4 w-4" />{submitting ? "Verrouillage…" : blocked || "Signer et verrouiller ce module"}
      </Btn>

      <Actions align="center"><Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> Modules</Btn></Actions>

      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.4)", color: "#ECEEF4" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> M12 verrouillé.</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">Ton naming et ton positionnement sont gravés et transmis au module suivant (M13 transition DIY).</AlertDialogDescription>
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
