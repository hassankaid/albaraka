import { ArrowLeft, ArrowRight, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { StepEyebrow, StepTitle, StepSub, Card, CardTitle, Btn, Actions } from "../../m1-niche/components/ui";
import { UpstreamContext } from "../components/UpstreamContext";
import { TECHNIQUES, TECHNIQUE_KEYS, freshCandidat, type M12State, type TechKey, type Candidat } from "../lib/types";
import { nonEmptyCandidats, countDistinctTechniques, canEnterTester, missingFieldsLabel } from "../lib/validations";
import { suggestAcronyme, suggestMetaphore, suggestResultatMethode, suggestChiffrePromesse, suggestIdentite } from "../lib/generators";

interface Props { state: M12State; setState: (n: (p: M12State) => M12State) => void; onBack: () => void; onNext: () => void; }
const inputCls = "rounded-[8px] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30";
const inputStyle = { background: "#0C0B08", border: "1px solid rgba(201,168,76,0.18)" } as const;

export function BrainstormScreen({ state, setState, onBack, onNext }: Props) {
  const d = state.data;
  const candidats = d.candidats || [];
  const gi = d.generator_inputs;
  const upstream = {
    niche: (state.m1_data && state.m1_data.niche) || "",
    headline_promesse: (state.m3_data && state.m3_data.headline_promesse) || (state.m5_data && state.m5_data.headline_promesse) || "",
    point_b: (state.m5_data && state.m5_data.ht_point_b) || "",
  };
  const nbCand = nonEmptyCandidats(d).length;
  const nbTech = countDistinctTechniques(candidats);
  const ready = canEnterTester(d);
  const candColor = nbCand >= 5 ? "#4cc987" : nbCand >= 3 ? "#c98a4c" : "#c94c4c";
  const techColor = nbTech >= 3 ? "#4cc987" : nbTech >= 2 ? "#c98a4c" : "#c94c4c";

  const setCand = (next: Candidat[]) => setState((prev) => ({ ...prev, data: { ...prev.data, candidats: next } }));
  const updateCand = (i: number, patch: Partial<Candidat>) => setCand(candidats.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  const addCand = () => setCand([...candidats, freshCandidat()]);
  const removeCand = (idx: number) => {
    if (candidats.length <= 1) { toast.error("Garde au moins une ligne."); return; }
    setState((prev) => {
      const cand = [...prev.data.candidats]; cand.splice(idx, 1);
      const top3 = (prev.data.top3_indices || []).filter((i) => i !== idx).map((i) => (i > idx ? i - 1 : i));
      const newTests: Record<string, any> = {};
      Object.keys(prev.data.tests_par_candidat || {}).forEach((k) => {
        const old = parseInt(k, 10);
        if (isNaN(old) || old === idx) return;
        newTests[String(old > idx ? old - 1 : old)] = prev.data.tests_par_candidat[k];
      });
      return { ...prev, data: { ...prev.data, candidats: cand, top3_indices: top3, tests_par_candidat: newTests } };
    });
  };
  const setGi = (patch: Partial<typeof gi>) => setState((prev) => ({ ...prev, data: { ...prev.data, generator_inputs: { ...prev.data.generator_inputs, ...patch } } }));

  function addSuggestion(sug: string, tech: TechKey) {
    setState((prev) => {
      const cand = [...prev.data.candidats];
      let idx = cand.findIndex((c) => !c.nom || !c.nom.trim());
      if (idx < 0) { cand.push(freshCandidat()); idx = cand.length - 1; }
      cand[idx] = { ...cand[idx], nom: sug, technique: tech };
      return { ...prev, data: { ...prev.data, candidats: cand } };
    });
    toast.success("« " + sug + " » ajouté à tes candidats.");
  }

  const panels: { key: TechKey; sugs: string[]; hint: string; input?: ReactInput }[] = [
    { key: "acronyme", sugs: suggestAcronyme(gi.acronyme_mots), hint: "Donne 3 à 6 mots-clés qui décrivent les étapes de ta méthode. Les premières lettres composent l'acronyme.", input: { id: "acronyme_mots", label: "Mots-clés de la méthode", placeholder: "bienveillance authenticité récolte argumenter alliance", value: gi.acronyme_mots } },
    { key: "metaphore", sugs: suggestMetaphore(gi.metaphore_themes), hint: "Donne 1 à 3 thèmes qui résonnent avec ta transformation. Les suggestions piocheront dans ces univers.", input: { id: "metaphore_themes", label: "Thèmes inspirants", placeholder: "mouvement, lumière, spirituel, construction", value: gi.metaphore_themes } },
    { key: "resultat_methode", sugs: suggestResultatMethode(upstream), hint: "Les suggestions s'appuient sur ta promesse amont (M3/M5). Pas d'entrée à saisir — c'est ta promesse qui pilote." },
    { key: "chiffre_promesse", sugs: suggestChiffrePromesse(gi.chiffre_unite, gi.chiffre_valeur, upstream), hint: "Donne le nombre et l'unité de ta promesse de durée." },
    { key: "identite", sugs: suggestIdentite(upstream), hint: "Les suggestions s'appuient sur ta niche (M1) pour proposer des noms-univers." },
  ];

  return (
    <div>
      <StepEyebrow>Étape 2 / 5 · Brainstorm</StepEyebrow>
      <StepTitle>Brainstormer 5 à 10 candidats pour ton programme</StepTitle>
      <StepSub>Mets 5 à 10 noms sur la table, couvrant au moins 3 techniques différentes. Saisis librement, ou aide-toi des générateurs ci-dessous. <em>Compte 20 à 40 minutes de vraie réflexion.</em></StepSub>

      <Card className="mb-4">
        <CardTitle>Pourquoi 5 candidats minimum ET 3 techniques minimum</CardTitle>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75">Avec une ou deux options, tu es piégé par ta première intuition. 5 à 10 candidats te forcent à confronter ton réflexe à des alternatives. 3 techniques différentes évitent le piège du « tout-acronyme ».</p>
        <p className="text-[13px] leading-[1.6] text-[#C9A84C] italic">Le bon nom n'est jamais évident au premier essai. Il sort de la comparaison, pas de l'inspiration.</p>
      </Card>

      <UpstreamContext state={state} />

      <div className="mb-5 grid grid-cols-2 gap-2">
        <div className="rounded-lg px-3 py-2.5" style={{ background: "#14130E", borderLeft: "3px solid " + candColor }}>
          <div className="text-[10px] uppercase tracking-[0.08em] text-white/45">Candidats saisis</div>
          <div className="font-serif text-[22px] font-bold" style={{ color: candColor }}>{nbCand} <span className="text-[13px] font-normal text-white/40">/ 5 minimum</span></div>
        </div>
        <div className="rounded-lg px-3 py-2.5" style={{ background: "#14130E", borderLeft: "3px solid " + techColor }}>
          <div className="text-[10px] uppercase tracking-[0.08em] text-white/45">Techniques explorées</div>
          <div className="font-serif text-[22px] font-bold" style={{ color: techColor }}>{nbTech} <span className="text-[13px] font-normal text-white/40">/ 3 minimum</span></div>
        </div>
      </div>

      <div className="mb-2 font-serif text-[17px] font-semibold text-[#C9A84C]">Tes candidats</div>
      <div className="mb-3 space-y-2">
        {candidats.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-5 shrink-0 text-center text-[12px] font-bold text-[#C9A84C]">{i + 1}</div>
            <input type="text" value={c.nom} onChange={(e) => updateCand(i, { nom: e.target.value })} placeholder="Candidat (ex. Le Cocon)" className={inputCls + " flex-1"} style={inputStyle} />
            <select value={c.technique} onChange={(e) => updateCand(i, { technique: e.target.value as any })} className={inputCls} style={inputStyle}>
              <option value="">Technique…</option>
              {TECHNIQUE_KEYS.map((k) => <option key={k} value={k}>{TECHNIQUES[k].label}</option>)}
            </select>
            <button type="button" onClick={() => removeCand(i)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#E86B6B]" style={{ background: "rgba(232,107,107,0.08)" }}><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addCand} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold text-[#C9A84C]" style={{ background: "rgba(201,168,76,0.06)", border: "0.5px solid rgba(201,168,76,0.4)" }}>
        <Plus className="h-3.5 w-3.5" /> Ajouter un candidat
      </button>

      <div className="mb-2 font-serif text-[17px] font-semibold text-[#C9A84C]">Générateurs d'aide par technique</div>
      <p className="mb-3 text-[12.5px] leading-[1.5] text-white/50">Clique sur une suggestion pour l'ajouter à ta liste. Les générateurs s'appuient sur ta niche, ta promesse et tes consignes.</p>
      <div className="mb-5 space-y-3">
        {panels.map((panel) => (
          <div key={panel.key} className="rounded-xl p-3.5" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
            <div className="text-[13px] font-semibold text-[#C9A84C]">{TECHNIQUES[panel.key].label}</div>
            <p className="mt-1 mb-2 text-[11.5px] leading-[1.5] text-white/50">{panel.hint}</p>
            {panel.input && (
              <input type="text" value={panel.input.value} onChange={(e) => setGi({ [panel.input!.id]: e.target.value } as any)} placeholder={panel.input.placeholder} className={inputCls + " mb-2 w-full"} style={inputStyle} />
            )}
            {panel.key === "chiffre_promesse" && (
              <div className="mb-2 flex gap-2">
                <input type="text" value={gi.chiffre_valeur} onChange={(e) => setGi({ chiffre_valeur: e.target.value })} placeholder="90" className={inputCls + " w-24"} style={inputStyle} />
                <select value={gi.chiffre_unite} onChange={(e) => setGi({ chiffre_unite: e.target.value })} className={inputCls} style={inputStyle}>
                  <option value="jours">Jours</option><option value="semaines">Semaines</option><option value="mois">Mois</option>
                </select>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {panel.sugs.length === 0 && panel.input ? <span className="text-[11.5px] text-white/35">Saisis des mots-clés pour générer des suggestions.</span> : panel.sugs.map((s, si) => (
                <button key={si} type="button" onClick={() => addSuggestion(s, panel.key)} className="rounded-full px-2.5 py-1 text-[11.5px] font-medium text-[#C9A84C] transition-colors hover:bg-[rgba(201,168,76,0.15)]" style={{ background: "rgba(201,168,76,0.08)", border: "0.5px solid rgba(201,168,76,0.3)" }}>{s}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!ready && (
        <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(201,138,76,0.06)", borderLeft: "2px solid #c98a4c", color: "#e8c9a0" }}>
          Il te manque <strong>{missingFieldsLabel("tester_programme", d)}</strong> pour passer à l'étape suivante.
        </div>
      )}
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Comprendre</Btn>
        <Btn variant="cta" disabled={!ready} onClick={onNext}>Tester mes candidats <ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}

interface ReactInput { id: string; label: string; placeholder: string; value: string; }
