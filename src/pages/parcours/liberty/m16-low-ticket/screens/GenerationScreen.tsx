import { useEffect } from "react";
import { Card, Eyebrow, HStep, FL, TInput, TArea, NavBtns } from "../components/parts";
import { DocPreview } from "../components/DocPreview";
import { type M16State, type FormatKey, FORMATS_LT, LIVRABLE_LABEL } from "../lib/types";
import { canEnterLock } from "../lib/validations";
import { generateSections } from "../lib/generators";
import { generateWithAI } from "../lib/aiGenerate";
import { downloadDoc, copySection, copyAll } from "../lib/exportDoc";

interface Props { state: M16State; setState: (n: (p: M16State) => M16State) => void; onBack: () => void; onNext: () => void; toast: (m: string) => void; }

const HEAD_FONTS = ["Crimson Pro", "Georgia", "Inter", "Calibri"];
const BODY_FONTS = ["Inter", "Calibri", "Georgia"];

export function GenerationScreen({ state, setState, onBack, onNext, toast }: Props) {
  const d = state.data;
  const f = FORMATS_LT[d.format_choisi as FormatKey];
  const a = d.appearance;

  // Génère la trame par défaut au 1er affichage si aucune section.
  useEffect(() => {
    if (!d.sections || d.sections.length === 0) {
      setState((prev) => ({ ...prev, data: { ...prev.data, sections: generateSections(prev), content_edited: false, _regenPending: false } }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setGenTitle = (v: string) => setState((prev) => ({ ...prev, data: { ...prev.data, titre: v } }));
  const setGenPromesse = (v: string) => setState((prev) => ({ ...prev, data: { ...prev.data, promesse_lt: v } }));
  const setSectionHeading = (i: number, v: string) => setState((prev) => { const sections = [...prev.data.sections]; if (!sections[i]) return prev; sections[i] = { ...sections[i], heading: v }; return { ...prev, data: { ...prev.data, sections, content_edited: true } }; });
  const setSectionBody = (i: number, v: string) => setState((prev) => { const sections = [...prev.data.sections]; if (!sections[i]) return prev; sections[i] = { ...sections[i], body: v }; return { ...prev, data: { ...prev.data, sections, content_edited: true } }; });
  const setAppearMode = (m: "albaraka" | "custom") => setState((prev) => ({ ...prev, data: { ...prev.data, appearance: { ...prev.data.appearance, mode: m } } }));
  const setAppear = (k: "primary" | "headFont" | "bodyFont", v: string) => setState((prev) => ({ ...prev, data: { ...prev.data, appearance: { ...prev.data.appearance, [k]: v } } }));
  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setState((prev) => ({ ...prev, data: { ...prev.data, appearance: { ...prev.data.appearance, logo: String(r.result || "") } } }));
    r.readAsDataURL(file);
  };

  const regenerate = () => setState((prev) => ({ ...prev, data: { ...prev.data, sections: generateSections(prev), content_edited: false, _regenPending: false } }));
  const askRegen = () => { if (d.content_edited) setState((prev) => ({ ...prev, data: { ...prev.data, _regenPending: true } })); else regenerate(); };
  const doRegen = () => regenerate();
  const cancelRegen = () => setState((prev) => ({ ...prev, data: { ...prev.data, _regenPending: false } }));

  async function runAi() {
    if (state.demoMode) return;
    setState((prev) => ({ ...prev, data: { ...prev.data, _aiBusy: true } }));
    try {
      const secs = await generateWithAI(state);
      setState((prev) => ({ ...prev, data: { ...prev.data, sections: secs, content_edited: false, _aiGenerated: true, _regenPending: false, _aiBusy: false } }));
    } catch (e) {
      console.warn("runAi", (e as Error).message);
      toast("L'IA n'a pas pu répondre — la trame est conservée, à compléter.");
      setState((prev) => {
        const sections = prev.data.sections && prev.data.sections.length ? prev.data.sections : generateSections(prev);
        return { ...prev, data: { ...prev.data, sections, _aiBusy: false } };
      });
    }
  }

  return (
    <Card>
      <Eyebrow>Étape 5</Eyebrow>
      <HStep>Ton produit, généré</HStep>
      <p className="mt-1 mb-4 max-w-[70ch] text-[15px] leading-[1.55] text-white/55">
        Voici le contenu de ton produit, pré-rempli avec ton contexte. Ce qui est en <span style={{ background: "#FBE9A6", color: "#6b531a", borderRadius: 3, padding: "0 3px" }}>« jaune »</span> est à personnaliser, ce qui est en <span style={{ color: "#999", fontStyle: "italic" }}>‹ gris ›</span> est un exemple. Livrable : {f ? LIVRABLE_LABEL[f.livrable] : ""}.
      </p>

      {/* Apparence */}
      <div className="mb-4 rounded-xl p-4" style={{ background: "#161513", border: "1px solid #262420" }}>
        <div className="mb-2 text-[12.5px] text-white/45">Apparence du document</div>
        <div className="flex gap-2">
          {(["albaraka", "custom"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setAppearMode(m)} className="rounded-full px-3 py-1.5 text-[12px] font-medium" style={{ background: a.mode === m ? "#C9A84C" : "#0c0c0c", color: a.mode === m ? "#080808" : "#9a9488", border: "1px solid " + (a.mode === m ? "#C9A84C" : "#262420") }}>{m === "albaraka" ? "Charte AL BARAKA" : "Ma charte"}</button>
          ))}
        </div>
        {a.mode === "custom" && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-[11px] text-white/40">Couleur d'accent (titres)</label><input type="color" value={a.primary} onChange={(e) => setAppear("primary", e.target.value)} className="h-9 w-full rounded" /></div>
            <div><label className="mb-1 block text-[11px] text-white/40">Police des titres</label><select value={a.headFont} onChange={(e) => setAppear("headFont", e.target.value)} className="w-full rounded-[9px] px-3 py-2 text-[13px]" style={{ background: "#0c0c0c", border: "1px solid #262420", color: "#f4f1e8" }}>{HEAD_FONTS.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
            <div><label className="mb-1 block text-[11px] text-white/40">Police du texte</label><select value={a.bodyFont} onChange={(e) => setAppear("bodyFont", e.target.value)} className="w-full rounded-[9px] px-3 py-2 text-[13px]" style={{ background: "#0c0c0c", border: "1px solid #262420", color: "#f4f1e8" }}>{BODY_FONTS.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
            <div><label className="mb-1 block text-[11px] text-white/40">Logo (optionnel)</label><input type="file" accept="image/*" onChange={onLogo} className="text-[12px] text-white/50" /></div>
          </div>
        )}
        <div className="mt-2 text-[11.5px] leading-[1.5] text-white/40">La page reste toujours claire et lisible (faite pour être lue, imprimée ou exportée en PDF). La charte AL BARAKA est appliquée par défaut ; tu as ta propre identité ? Bascule sur « Ma charte » — ça s'applique à l'aperçu et au fichier exporté.</div>
      </div>

      {/* Titre + promesse éditables */}
      <FL>Titre du produit</FL>
      <TInput value={d.titre} onChange={(e) => setGenTitle(e.target.value)} />
      <FL>Promesse (une phrase)</FL>
      <TArea value={d.promesse_lt} onChange={(e) => setGenPromesse(e.target.value)} style={{ minHeight: 54 }} />

      {/* Barre IA */}
      {!state.demoMode && (
        <div className="my-4 flex flex-wrap items-center gap-3 rounded-xl p-3" style={{ background: "#161513", border: "1px solid #262420" }}>
          {d._aiBusy ? (
            <span className="text-[13px] text-[#C9A84C]">L'IA rédige ton premier jet… (quelques secondes)</span>
          ) : (
            <>
              <button type="button" onClick={runAi} className="rounded-full px-4 py-2 text-[13px] font-semibold text-[#080808]" style={{ background: "#C9A84C" }}>✨ Rédiger un premier jet avec l'IA</button>
              <span className="flex-1 text-[12px] leading-[1.45] text-white/50">{d._aiGenerated ? "Brouillon IA généré — vérifie et personnalise, surtout les passages « à compléter »." : "L'IA rédige un brouillon spécifique à ta niche, à partir de ton contexte. Tu l'édites ensuite librement."}</span>
            </>
          )}
        </div>
      )}

      {/* Layout génération */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <DocPreview state={state} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => downloadDoc(state, toast)} className="rounded-full px-4 py-2 text-[12.5px] font-semibold text-[#080808]" style={{ background: "#C9A84C" }}>⬇ Télécharger en DOCX (éditable)</button>
            <button type="button" onClick={() => copyAll(state, toast)} className="rounded-full px-4 py-2 text-[12.5px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}>Copier tout</button>
          </div>
          <div className="mt-2 text-[11.5px] leading-[1.5] text-white/40">Le DOCX s'ouvre dans Word, Google Docs ou LibreOffice. Tu modifies tout, puis tu exportes en PDF toi-même quand c'est prêt — ou tu héberges tes vidéos dans Liberty.</div>
        </div>
        <div>
          <div className="mb-2 text-[11.5px] leading-[1.5] text-white/40">Édite directement le texte ci-dessous — titre et corps de chaque section. Tout se met à jour dans l'aperçu et le fichier.</div>
          <div className="space-y-3">
            {d.sections.map((s, i) => (
              <div key={i} className="rounded-xl p-3" style={{ background: "#161513", border: "1px solid #262420" }}>
                <div className="mb-2 flex items-center gap-2">
                  <input value={s.heading} onChange={(e) => setSectionHeading(i, e.target.value)} className="flex-1 rounded-[8px] px-2.5 py-1.5 text-[13px] font-semibold outline-none focus:border-[#C9A84C]" style={{ background: "#0c0c0c", border: "1px solid #262420", color: "#f4f1e8" }} />
                  <button type="button" onClick={() => copySection(state, i, toast)} className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}>Copier</button>
                </div>
                <TArea value={s.body} onChange={(e) => setSectionBody(i, e.target.value)} style={{ minHeight: 120 }} />
              </div>
            ))}
          </div>
          {d._regenPending ? (
            <div className="mt-3 rounded-xl p-3 text-[13px] text-white/75" style={{ background: "rgba(212,88,79,0.07)", border: "1px solid #d4584f" }}>
              Régénérer va <b>écraser tes modifications</b> et repartir de la trame proposée. Continuer ?
              <div className="mt-2.5 flex gap-2">
                <button type="button" onClick={doRegen} className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-[#080808]" style={{ background: "#C9A84C" }}>Oui, régénérer</button>
                <button type="button" onClick={cancelRegen} className="rounded-full px-3 py-1.5 text-[12px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}>Annuler</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={askRegen} className="mt-1 rounded-full px-3 py-1.5 text-[12px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}>↻ Régénérer la trame</button>
          )}
        </div>
      </div>

      <NavBtns onBack={onBack} onNext={onNext} nextLabel="Verrouiller →" nextDisabled={!canEnterLock(state)} />
    </Card>
  );
}
