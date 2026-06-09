import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { StepEyebrow, StepTitle, StepSub, Card, CardTitle, Btn, Actions, InputLabel, InputHelper, TextArea } from "../../m1-niche/components/ui";
import { TECHNIQUES, TECHNIQUE_KEYS, freshTests, type M12State, type TechKey, type Tests } from "../lib/types";
import { evaluateName, autoScoreLevel, detectGenericTraps, hasMinTrace, missingForFinal, canEnterPositionnement, missingFieldsLabel } from "../lib/validations";

interface Props { state: M12State; setState: (n: (p: M12State) => M12State) => void; onBack: () => void; onNext: () => void; }
const inputCls = "w-full rounded-[8px] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30";
const inputStyle = { background: "#0C0B08", border: "1px solid rgba(201,168,76,0.18)" } as const;

const HUMAN_TESTS: { key: keyof Tests; traceKey: keyof Tests; title: string; desc: string; placeholder: string }[] = [
  { key: "telephone", traceKey: "telephone_trace", title: "Le test du téléphone", desc: "Dicte ton nom à voix haute à quelqu'un par téléphone, sans épeler. Si la personne peut le retaper et te le redire correctement, c'est validé.", placeholder: "Ex. Hamza (collègue) a redit « Le Closer Halal » sans hésiter, du premier coup" },
  { key: "google", traceKey: "google_trace", title: "Le test Google", desc: "Tape ton nom dans Google. S'il n'y a aucune offre concurrente directe qui s'appelle pareil ou très proche, c'est validé.", placeholder: "Ex. aucun concurrent direct, quelques marques tech sans rapport" },
  { key: "promesse", traceKey: "promesse_trace", title: "Le test de la promesse", desc: "Lis ton nom à quelqu'un qui ne connaît pas ton offre. Note exactement sa phrase. Si elle évoque la transformation, c'est validé.", placeholder: "Ex. Sarah a dit textuellement « ça sonne comme un accompagnement business pour mamans »" },
  { key: "resonance", traceKey: "resonance_trace", title: "Le test de résonance", desc: "Présente ton nom à 3 personnes de ta cible réelle. Si ≥ 2 sur 3 disent « ah ouais, ça je le verrais bien », c'est validé.", placeholder: "Ex. Latifa, Nadia, Karima — 3/3 ont validé fortement" },
];

export function ValiderScreen({ state, setState, onBack, onNext }: Props) {
  const d = state.data;
  const f = d.final;
  const top3 = d.top3_indices || [];
  const idxKey = f.candidat_idx_source >= 0 ? String(f.candidat_idx_source) : "final";
  const currentTests = d.tests_par_candidat[idxKey] || d.tests_par_candidat["final"] || freshTests();
  const baselineTraps = detectGenericTraps(f.baseline);
  const upstreamPromesse = (state.m3_data && state.m3_data.headline_promesse) || (state.m5_data && state.m5_data.headline_promesse) || "";
  const ev = f.nom ? evaluateName(f.nom) : null;

  // Mutateurs avec reset des tests si le nom change.
  function resetIfChanged(data: M12State, newNom: string): M12State {
    const bag = data.data.tests_par_candidat["final"];
    if (!bag) return data;
    const oldName = (bag.nom_teste || "").trim();
    const newTrim = String(newNom || "").trim();
    const hasAny = bag.telephone || bag.google || bag.promesse || bag.resonance || hasMinTrace(bag.telephone_trace) || hasMinTrace(bag.google_trace) || hasMinTrace(bag.promesse_trace) || hasMinTrace(bag.resonance_trace);
    if (!hasAny) { return { ...data, data: { ...data.data, tests_par_candidat: { ...data.data.tests_par_candidat, final: { ...bag, nom_teste: newTrim } } } }; }
    if (oldName && newTrim && oldName !== newTrim) {
      toast.error("⚠ Tu as changé de nom — les 4 tests humains ont été remis à zéro. Refais-les sur « " + newTrim + " ».");
      const fresh = freshTests(); fresh.nom_teste = newTrim;
      const tpc = { ...data.data.tests_par_candidat, final: fresh };
      const idxSrc = data.data.final.candidat_idx_source;
      if (idxSrc >= 0 && tpc[String(idxSrc)]) { const fr2 = freshTests(); fr2.nom_teste = newTrim; tpc[String(idxSrc)] = fr2; }
      return { ...data, data: { ...data.data, tests_par_candidat: tpc } };
    }
    return data;
  }

  function pick(idx: number) {
    const c = d.candidats[idx];
    setState((prev) => {
      let next = resetIfChanged(prev, c.nom);
      next = { ...next, data: { ...next.data, final: { ...next.data.final, nom: c.nom, technique: c.technique, candidat_idx_source: idx } } };
      const oldBag = next.data.tests_par_candidat[String(idx)];
      if (oldBag) next = { ...next, data: { ...next.data, tests_par_candidat: { ...next.data.tests_par_candidat, final: { ...oldBag } } } };
      return next;
    });
  }
  function setNom(val: string) {
    setState((prev) => {
      const match = prev.data.candidats.findIndex((c) => c.nom && c.nom.trim().length >= 2 && c.nom.trim() === val.trim());
      if (match >= 0) return { ...prev, data: { ...prev.data, final: { ...prev.data.final, nom: val, candidat_idx_source: match } } };
      const next = resetIfChanged(prev, val);
      return { ...next, data: { ...next.data, final: { ...next.data.final, nom: val, candidat_idx_source: -1 } } };
    });
  }
  const setFinal = (patch: Partial<typeof f>) => setState((prev) => ({ ...prev, data: { ...prev.data, final: { ...prev.data.final, ...patch } } }));
  function setTest(key: keyof Tests, val: any) {
    setState((prev) => {
      const idx = prev.data.final.candidat_idx_source;
      // Écrit dans 'final' ET dans String(idx) (bag faisant autorité pour allHumanTestsValidated quand un candidat est choisi).
      const base: Tests = { ...(prev.data.tests_par_candidat["final"] || freshTests()), [key]: val, nom_teste: prev.data.final.nom };
      const tpc = { ...prev.data.tests_par_candidat, final: base };
      if (idx >= 0) tpc[String(idx)] = { ...base };
      return { ...prev, data: { ...prev.data, tests_par_candidat: tpc } };
    });
  }

  const levelColor = (lvl: string) => (lvl === "good" ? "#4cc987" : lvl === "warn" ? "#c98a4c" : "#c94c4c");

  return (
    <div>
      <StepEyebrow>Étape 4 / 5 · Choix + IRL</StepEyebrow>
      <StepTitle>Choisir ton nom final, écrire la baseline, faire les 4 tests humains</StepTitle>
      <StepSub>Tu prends ta décision sur le nom + tu écris la baseline d'une ligne + tu fais (vraiment, IRL) les 4 tests humains. <em>Les tests sont à faire en vrai, pas à cocher au feeling.</em></StepSub>

      <Card className="mb-5">
        <CardTitle>Pourquoi le nom + baseline marchent en couple</CardTitle>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75">Le nom seul ne dit pas tout. La <strong className="text-white">baseline</strong> précise la promesse. Le nom porte l'identité ; la baseline porte la transformation. Une bonne baseline tient en une phrase, contient un <strong className="text-white">chiffre ou un délai</strong>, et dit ce que ton client obtient.</p>
      </Card>

      {/* Choix top 3 */}
      <div className="mb-2 font-serif text-[16px] font-semibold text-[#C9A84C]">Ton choix dans ton top 3</div>
      {top3.length === 0 ? (
        <div className="mb-4 rounded-xl px-4 py-3 text-[13px] text-white/60" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>Tu n'as pas de top 3. Reviens à l'étape précédente pour cocher au moins 1 candidat.</div>
      ) : (
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {top3.map((idx) => {
            const c = d.candidats[idx]; if (!c) return null;
            const e2 = evaluateName(c.nom);
            const sel = f.candidat_idx_source === idx;
            return (
              <button key={idx} type="button" onClick={() => pick(idx)} className="rounded-[10px] px-3 py-2.5 text-left transition-all" style={{ background: sel ? "#2A2310" : "#14130E", border: sel ? "1px solid #C9A84C" : "1px solid rgba(201,168,76,0.18)" }}>
                <div className="text-[13px] font-semibold text-white">{c.nom}</div>
                <div className="mt-0.5 text-[10.5px] text-white/45">{c.technique ? TECHNIQUES[c.technique as TechKey]?.label : "—"} · score auto {e2.score}/{e2.max}</div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-4"><InputLabel>Ou saisis ton nom final directement</InputLabel>
        <input type="text" value={f.nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Le Cocon" className={inputCls} style={inputStyle} />
        <InputHelper>si tu as changé d'avis en cours de route</InputHelper></div>
      <div className="mb-4"><InputLabel>Technique de naming utilisée</InputLabel>
        <select value={f.technique} onChange={(e) => setFinal({ technique: e.target.value as any })} className={inputCls} style={inputStyle}>
          <option value="">Choisir une technique…</option>
          {TECHNIQUE_KEYS.map((k) => <option key={k} value={k}>{TECHNIQUES[k].label}</option>)}
        </select></div>
      <div className="mb-4"><InputLabel>Baseline d'une ligne</InputLabel>
        <TextArea value={f.baseline} onChange={(e) => setFinal({ baseline: e.target.value })} rows={2} placeholder="Ex. 60 jours pour lancer ton activité depuis chez toi, sans sacrifier ta famille" />
        <InputHelper>qui dit la transformation et inclut un chiffre ou un délai</InputHelper></div>

      {baselineTraps.length > 0 && (
        <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(232,107,107,0.08)", border: "0.5px solid rgba(232,107,107,0.4)", color: "#e8a0a0" }}>
          <strong>Mots-pièges détectés dans ta baseline :</strong> {baselineTraps.join(", ")}. Force-toi à remplacer par du concret : un chiffre, un délai, un résultat précis.
        </div>
      )}
      {upstreamPromesse && <div className="mb-4 rounded-xl px-4 py-2 text-[12px] leading-[1.5] text-white/60" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>Ta promesse amont : « {upstreamPromesse} ». Ta baseline peut s'en inspirer.</div>}

      {ev && (
        <div className="mb-5 rounded-xl p-3.5" style={{ background: "#14130E", borderLeft: "3px solid " + levelColor(autoScoreLevel(ev.score, ev.max)) }}>
          <div className="text-[12px] font-semibold" style={{ color: levelColor(autoScoreLevel(ev.score, ev.max)) }}>Auto-check de ton nom final · {ev.score}/{ev.max}</div>
          <div className="mt-1.5 space-y-0.5">{ev.flags.map((fl, fi) => <div key={fi} className="text-[11.5px] leading-[1.4] text-white/60"><span style={{ color: fl.kind === "ok" ? "#4cc987" : fl.kind === "ko" ? "#c94c4c" : "#c98a4c" }}>{fl.kind === "ok" ? "✓" : fl.kind === "ko" ? "✗" : "!"}</span> {fl.txt}</div>)}</div>
        </div>
      )}

      {/* 4 tests humains */}
      <div className="mb-2 font-serif text-[16px] font-semibold text-[#C9A84C]">Les 4 tests humains sur ton nom final</div>
      {f.nom ? <p className="mb-3 text-[12.5px] text-white/60">Tests appliqués au nom : <strong className="text-white">{f.nom}</strong>. Va faire ces tests IRL maintenant. Sans les 4 traces, le module n'est pas signable.</p> : <div className="mb-3 rounded-xl px-4 py-3 text-[13px] text-white/60" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>Choisis ton nom final ci-dessus avant de faire les tests humains.</div>}

      <Card className="mb-4" accent="warning">
        <CardTitle>Pourquoi des traces concrètes, pas des cases à cocher</CardTitle>
        <p className="text-[12.5px] leading-[1.55] text-white/70">Sans trace, l'élève coche par auto-tromperie. Avec une trace de 15 caractères minimum, tu es obligé de décrire ce qui s'est passé en vrai. C'est la règle anti-hallucination de ce module.</p>
      </Card>

      <div className="mb-5 space-y-3">
        {HUMAN_TESTS.map((ht) => {
          const checked = !!currentTests[ht.key];
          const trace = (currentTests[ht.traceKey] as string) || "";
          const valid = checked && hasMinTrace(trace);
          return (
            <div key={ht.key} className="rounded-xl p-3.5" style={{ background: "#14130E", border: "0.5px solid " + (valid ? "rgba(76,201,135,0.4)" : "rgba(201,168,76,0.18)") }}>
              <button type="button" onClick={() => setTest(ht.key, !checked)} className="flex w-full items-start gap-2.5 text-left">
                <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px]" style={{ background: checked ? "#C9A84C" : "transparent", border: "1.5px solid #C9A84C" }}>{checked && <Check className="h-3 w-3" strokeWidth={3} style={{ color: "#080808" }} />}</span>
                <span><span className="block text-[13.5px] font-semibold text-white">{ht.title}</span><span className="mt-0.5 block text-[12px] leading-[1.5] text-white/55">{ht.desc}</span></span>
              </button>
              <div className="mt-2.5 pl-7">
                <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">Trace concrète</div>
                <input type="text" value={trace} onChange={(e) => setTest(ht.traceKey, e.target.value)} placeholder={ht.placeholder} className={inputCls} style={inputStyle} />
                {!hasMinTrace(trace) && <div className="mt-1 text-[11px] italic text-amber-400/70">Au minimum 15 caractères — assez pour décrire concrètement, pas juste un OK.</div>}
              </div>
            </div>
          );
        })}
      </div>

      {missingForFinal(d).length > 0 && <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(201,138,76,0.06)", borderLeft: "2px solid #c98a4c", color: "#e8c9a0" }}>Pour continuer, il te manque <strong>{missingFieldsLabel("positionnement", d)}</strong>.</div>}
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Auto-checks</Btn>
        <Btn variant="cta" disabled={!canEnterPositionnement(d)} onClick={onNext}>Poser mon positionnement <ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
