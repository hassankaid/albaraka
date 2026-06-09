import { Card, Eyebrow, HStep, Lead, Peda, FL, TArea, NavBtns } from "../components/parts";
import { type M16State, type FormatKey, FORMATS_LT, FORMAT_KEYS, LIVRABLE_LABEL } from "../lib/types";
import { recommanderFormat, canEnterPromesse, suggestTitre } from "../lib/validations";

interface Props { state: M16State; setState: (n: (p: M16State) => M16State) => void; onBack: () => void; onNext: () => void; }

export function FormatScreen({ state, setState, onBack, onNext }: Props) {
  const reco = recommanderFormat(state);
  const choisi = state.data.format_choisi;

  const selectFormat = (k: FormatKey) => {
    setState((prev) => {
      if (prev.data.format_choisi === k) return prev;
      const data = { ...prev.data, format_choisi: k, sections: [] };
      const tmp = { ...prev, data };
      if (!data.titre) data.titre = suggestTitre(tmp);
      return { ...prev, data };
    });
  };
  const setJustif = (v: string) => setState((prev) => ({ ...prev, data: { ...prev.data, format_justification: v } }));

  const f = choisi ? FORMATS_LT[choisi as FormatKey] : null;

  return (
    <Card>
      <Eyebrow>Étape 2</Eyebrow>
      <HStep>Choisis LE format</HStep>
      <Lead>Un seul format. Celui qui colle à ta niche, à ton confort et au temps que tu peux y mettre. Selon ton offre principale, on te suggère un départ.</Lead>

      <div className="grid gap-3 sm:grid-cols-2">
        {FORMAT_KEYS.map((k) => {
          const ff = FORMATS_LT[k];
          const sel = choisi === k;
          return (
            <button key={k} type="button" onClick={() => selectFormat(k)} className="relative rounded-xl p-4 text-left transition-all" style={{ background: sel ? "#2A2310" : "#161513", border: "1px solid " + (sel ? "#C9A84C" : "#262420") }}>
              {k === reco && !choisi && <span className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#080808]" style={{ background: "#C9A84C" }}>Suggéré</span>}
              <div className="text-[15px] font-semibold text-white">{ff.label}</div>
              <div className="mt-0.5 text-[12px] text-[#C9A84C]">{ff.prix_min}€ – {ff.prix_max}€ · {ff.effort}</div>
              <div className="mt-2 text-[12.5px] leading-[1.5] text-white/60">{ff.desc}</div>
            </button>
          );
        })}
      </div>

      {f && (
        <>
          <Peda style={{ marginTop: 18 }}><b className="text-[#C9A84C]">{f.label}</b> — livrable : {LIVRABLE_LABEL[f.livrable]}. {f.quand}</Peda>
          <FL>Pourquoi ce format pour toi ? (optionnel, t'aide à clarifier)</FL>
          <TArea value={state.data.format_justification} onChange={(e) => setJustif(e.target.value)} placeholder="Ex: ma niche préfère le format vidéo, j'ai déjà un micro..." />
        </>
      )}

      <NavBtns onBack={onBack} onNext={onNext} nextDisabled={!canEnterPromesse(state)} />
    </Card>
  );
}
