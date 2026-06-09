import { useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Btn, TextArea } from "../../m1-niche/components/ui";
import { type M14State, FORMATS, TRACE_MIN_LENGTH, type FormatKey, type ModuleDecision } from "../lib/types";
import { countDecisions, getSuggestionForModule, applyAutoSuggestions, getFrictionsForModule, detectGenericTraps, canEnterPricing, missingFieldsLabel } from "../lib/validations";

interface Props { state: M14State; setState: (n: (p: M14State) => M14State) => void; onBack: () => void; onNext: () => void; }

export function ArchitectureScreen({ state, setState, onBack, onNext }: Props) {
  const d = state.data;
  const locked = state.signed;
  const fmt = d.format_choisi || "";
  const fmtLabel = fmt ? FORMATS[fmt as FormatKey].label : "—";
  const modulesM11 = (state.m11_data && state.m11_data.modules) || [];

  // Peuplement depuis M11 si vide + application des auto-suggestions au changement de format.
  useEffect(() => {
    if (locked) return;
    setState((prev) => {
      let next = prev;
      let dec = prev.data.modules_decision || [];
      if ((!dec || dec.length === 0) && modulesM11.length > 0) {
        dec = modulesM11.map((m: any) => ({
          index: m.index || 0, nom_origine: m.nom || "", objectif_origine: m.objectif_mesurable || "",
          livrable_origine: m.livrable_attendu || "", duree_video_min: m.duree_video_min || 0, decision: "" as const, adaptation: "",
        }));
        next = { ...next, data: { ...next.data, modules_decision: dec } };
      }
      const f = next.data.format_choisi || "";
      if (f && next.data.modules_decision_format_origine !== f) {
        next = { ...next, data: { ...next.data, modules_decision: applyAutoSuggestions(next.data.modules_decision, f), modules_decision_format_origine: f } };
      }
      return next === prev ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.format_choisi]);

  const decisions = d.modules_decision || [];
  const stats = countDecisions(decisions);
  const canNext = canEnterPricing(state);

  const setDecision = (idx: number, dec: ModuleDecision["decision"]) => {
    if (locked) return;
    setState((prev) => {
      const arr = [...(prev.data.modules_decision || [])];
      const m = { ...arr[idx] };
      m.decision = dec;
      if (dec === "adapter") {
        if (!m.adaptation || m.adaptation.trim() === "") m.adaptation = getSuggestionForModule(m, prev.data.format_choisi).adaptation_suggeree;
      } else {
        m.adaptation = "";
      }
      arr[idx] = m;
      return { ...prev, data: { ...prev.data, modules_decision: arr } };
    });
  };
  const setAdaptation = (idx: number, val: string) => {
    if (locked) return;
    setState((prev) => {
      const arr = [...(prev.data.modules_decision || [])];
      arr[idx] = { ...arr[idx], adaptation: val };
      return { ...prev, data: { ...prev.data, modules_decision: arr } };
    });
  };

  const decBtn = (idx: number, m: ModuleDecision, dec: "garder" | "adapter" | "retirer", label: string) => {
    const active = m.decision === dec;
    const color = dec === "garder" ? "#4cc987" : dec === "adapter" ? "#c98a4c" : "#c94c4c";
    return (
      <button type="button" onClick={() => setDecision(idx, dec)} disabled={locked} className="flex-1 rounded-[8px] px-2 py-2 text-[11.5px] font-semibold transition-all disabled:cursor-default"
        style={{ background: active ? color + "22" : "#0F0E0A", border: "1px solid " + (active ? color : "rgba(201,168,76,0.14)"), color: active ? color : "rgba(255,255,255,0.6)" }}>
        {label}
      </button>
    );
  };

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-serif text-[20px] font-semibold italic text-[#C9A84C]">02</span>
        <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-white">Architecture des modules MT</h2>
      </div>
      <p className="mb-5 text-[13px] leading-[1.65] text-white/60">
        L'outil a analysé tes modules HT et te propose pour chacun une décision automatique (garder, adapter ou retirer) ET une adaptation pré-écrite adaptée au format <b className="text-white/90">{fmtLabel}</b>. Valide ce qui te convient, ajuste ce qui ne va pas — c'est ton avis qui compte. <em className="text-white/45">Format choisi : <b className="text-white/70">{fmtLabel}</b> · {decisions.length} modules HT analysés.</em>
      </p>

      <div className="mb-5 rounded-xl p-4" style={{ background: "rgba(201,168,76,0.04)", border: "0.5px solid rgba(201,168,76,0.18)" }}>
        <h4 className="mb-2 text-[13px] font-semibold text-[#C9A84C]">Comment l'outil a généré ces suggestions</h4>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75">L'outil a scanné les intitulés et objectifs de tes modules HT pour repérer les <strong className="text-white">frictions</strong> qui les rendent dépendants de ton temps : mentions de validation individuelle, rôle-play live, suivi long personnel, audit individuel. Pour chaque friction détectée, et selon le format MT que tu as choisi, il propose une adaptation pré-écrite tirée d'un référentiel de mécaniques scalables — par exemple un module qui mentionne "validation par le coach" devient en format groupe un "atelier hot seat pendant le call hebdo", et en format formation pure une "auto-évaluation guidée + audios commentés modèles".</p>
        <p className="mb-2 text-[13px] leading-[1.6] italic text-[#C9A84C]">La suggestion n'est pas la vérité — c'est un point de départ. Si tu vois mieux, écris-le.</p>
        <p className="text-[13px] leading-[1.6] text-white/75">Les modules sans friction détectée sont marqués <strong className="text-white">"garder tel quel"</strong> par défaut (l'outil estime qu'ils sont déjà autonomes). Tu peux toujours les rebasculer manuellement si tu sens qu'il faut adapter ou retirer.</p>
      </div>

      {modulesM11.length === 0 && decisions.length === 0 && (
        <div className="mb-5 rounded-xl px-4 py-3 text-[12.5px] leading-[1.5]" style={{ background: "rgba(232,107,107,0.08)", border: "0.5px solid rgba(232,107,107,0.4)", color: "#e8a0a0" }}>
          <b>Aucun module HT importé.</b> Tu n'as pas encore validé M11 (Concevoir ton programme HT) ou les modules ne sont pas transmis. Termine M11 pour récupérer la structure de ton programme HT — c'est elle qui sert de base à l'architecture MT. Sans elle, tu reconstruis tout de zéro, et ce module n'a plus de sens.
        </div>
      )}

      {decisions.length > 0 && (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-[10px] px-3 py-2.5 text-center" style={{ background: "rgba(76,201,135,0.08)", border: "0.5px solid rgba(76,201,135,0.3)" }}><div className="font-serif text-[20px] font-semibold text-[#4cc987]">{stats.garder}</div><div className="text-[10px] uppercase tracking-[0.06em] text-white/50">Gardés</div></div>
            <div className="rounded-[10px] px-3 py-2.5 text-center" style={{ background: "rgba(201,138,76,0.08)", border: "0.5px solid rgba(201,138,76,0.3)" }}><div className="font-serif text-[20px] font-semibold text-[#c98a4c]">{stats.adapter}</div><div className="text-[10px] uppercase tracking-[0.06em] text-white/50">Adaptés</div></div>
            <div className="rounded-[10px] px-3 py-2.5 text-center" style={{ background: "rgba(201,76,76,0.08)", border: "0.5px solid rgba(201,76,76,0.3)" }}><div className="font-serif text-[20px] font-semibold text-[#c94c4c]">{stats.retirer}</div><div className="text-[10px] uppercase tracking-[0.06em] text-white/50">Retirés</div></div>
          </div>
          {stats.vide > 0 && (
            <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5] text-white/70" style={{ background: "rgba(201,138,76,0.06)", border: "0.5px solid rgba(201,138,76,0.3)" }}>
              Il te reste {stats.vide} module{stats.vide > 1 ? "s" : ""} sans décision. Passe sur chacun avant de continuer.
            </div>
          )}
          <div className="space-y-3">
            {decisions.map((m, i) => {
              const frictions = getFrictionsForModule(m);
              const showAdaptation = m.decision === "adapter";
              const adaptationTraps = showAdaptation ? detectGenericTraps(m.adaptation || "") : [];
              const cardBorder = m.decision === "garder" ? "rgba(76,201,135,0.4)" : m.decision === "adapter" ? "rgba(201,138,76,0.4)" : m.decision === "retirer" ? "rgba(201,76,76,0.4)" : "rgba(201,168,76,0.18)";
              return (
                <div key={i} className="rounded-xl p-4" style={{ background: "#14130E", border: "1px solid " + cardBorder }}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-white/85">Module {m.index || i + 1}{frictions.length > 0 ? <span className="ml-1.5 text-[11px] italic text-[#c98a4c]">friction détectée</span> : null}</span>
                    <span className="text-[11px] text-white/40">{m.duree_video_min ? m.duree_video_min + " min de vidéo HT" : ""}</span>
                  </div>
                  <div className="text-[13px] font-semibold text-white">{m.nom_origine || "Module sans nom"}</div>
                  <div className="mt-1 text-[11.5px] leading-[1.4] text-white/50">Objectif HT : {m.objectif_origine || "—"} · Livrable HT : {m.livrable_origine || "—"}</div>
                  <div className="mt-3 flex gap-2">
                    {decBtn(i, m, "garder", "✓ Garder tel quel")}
                    {decBtn(i, m, "adapter", "↻ Adapter pour le scaling")}
                    {decBtn(i, m, "retirer", "✕ Retirer (inséparable du 1-to-1)")}
                  </div>
                  {showAdaptation && (
                    <div className="mt-3">
                      <label className="mb-1 block text-[12px] text-white/75">Adaptation pour le format <b className="text-white/90">{fmtLabel}</b> <span className="text-white/40">(min {TRACE_MIN_LENGTH} car — l'outil a pré-rempli une suggestion que tu peux garder, modifier ou réécrire)</span></label>
                      <TextArea value={m.adaptation || ""} onChange={(e) => setAdaptation(i, e.target.value)} rows={3} disabled={locked} />
                      {adaptationTraps.length > 0 && (
                        <div className="mt-1.5 rounded-[8px] px-3 py-2 text-[11.5px] leading-[1.45]" style={{ background: "rgba(232,107,107,0.08)", border: "0.5px solid rgba(232,107,107,0.4)", color: "#e8a0a0" }}>
                          <b>Mots-pièges détectés :</b> {adaptationTraps.map((t) => "« " + t + " »").join(", ")}. Décris plutôt l'action concrète qui remplace l'accompagnement 1-to-1.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!canNext && (
        <div className="mt-4 rounded-xl px-4 py-2.5 text-[12px] leading-[1.5] text-white/70" style={{ background: "rgba(201,138,76,0.06)", border: "0.5px solid rgba(201,138,76,0.3)" }}>
          <b className="text-white/90">Pour avancer, il te manque :</b> {missingFieldsLabel("pricing", state)}.
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> Format</Btn>
        <Btn variant="primary" disabled={!canNext} onClick={() => canNext && onNext()}>Passer au prix <ArrowRight className="h-4 w-4" /></Btn>
      </div>
    </div>
  );
}
