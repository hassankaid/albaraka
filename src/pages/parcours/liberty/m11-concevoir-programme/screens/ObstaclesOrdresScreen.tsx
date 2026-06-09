import { ArrowLeft, ArrowRight, ChevronUp, ChevronDown, X } from "lucide-react";
import { StepEyebrow, StepTitle, StepSub, Card, Btn, Actions } from "../../m1-niche/components/ui";
import { MIN_MODULES_FINAL, MAX_MODULES, type M11State } from "../lib/types";
import { canEnterMappingStep, missingFieldsLabel, syncModulesFromObstaclesOrdonnes } from "../lib/validations";

interface Props { state: M11State; setState: (n: (p: M11State) => M11State) => void; onBack: () => void; onNext: () => void; }

export function ObstaclesOrdresScreen({ state, setState, onBack, onNext }: Props) {
  const ord = state.data.obstacles_ordonnes || [];
  const ready = canEnterMappingStep(state.data);
  const trop = ord.length > MAX_MODULES;

  const setOrd = (next: string[]) => setState((prev) => ({ ...prev, data: { ...prev.data, obstacles_ordonnes: next } }));
  const move = (i: number, dir: number) => { const j = i + dir; if (j < 0 || j >= ord.length) return; const n = [...ord]; const t = n[i]; n[i] = n[j]; n[j] = t; setOrd(n); };
  const remove = (i: number) => { const n = [...ord]; n.splice(i, 1); setOrd(n); };

  function next() {
    setState((prev) => ({ ...prev, data: { ...prev.data, modules: syncModulesFromObstaclesOrdonnes(prev.data) } }));
    onNext();
  }

  return (
    <div>
      <StepEyebrow>Étape 4 / 6 · Tri</StepEyebrow>
      <StepTitle>Ordonner les obstacles chronologiquement</StepTitle>
      <StepSub>
        Tu mets tes obstacles dans <strong className="text-white/80">l'ordre où ton client doit les franchir</strong>. Tu filtres les
        doublons et tu retiens <code className="text-[#C9A84C]">{MIN_MODULES_FINAL}-{MAX_MODULES}</code> obstacles maximum. Chacun deviendra un module.
      </StepSub>

      <Card className="mb-4">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">L'ordre n'est pas thématique, il est chronologique</div>
        <p className="text-[13px] leading-[1.6] text-white/75">Tu ranges les obstacles dans l'ordre où ton client les rencontre <strong className="text-white">en réalité</strong>. Le test : si tu mets B avant A, est-ce que ton client peut franchir B sans avoir franchi A ? Si non, A doit venir avant. Exemple : avant de closer un appel, il faut savoir générer un appel ; avant ça, avoir une offre ; avant, une niche.</p>
      </Card>
      <Card className="mb-4">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">Plafond à 8 modules — pourquoi</div>
        <p className="text-[13px] leading-[1.6] text-white/75">Au-delà de 8 modules, ton programme devient <strong className="text-white">indigeste</strong>. Un élève qui voit 12 modules abandonne avant le module 4. La règle : 4 à 8 modules max. <strong className="text-[#C9A84C]">Eat complexity</strong> côté concepteur — c'est ton job d'absorber la complexité.</p>
      </Card>

      <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: trop ? "rgba(232,107,107,0.08)" : "rgba(201,168,76,0.06)", border: "0.5px solid " + (trop ? "rgba(232,107,107,0.4)" : "rgba(201,168,76,0.2)"), color: trop ? "#e8a0a0" : "#e8c9a0" }}>
        <strong>{ord.length} obstacle{ord.length > 1 ? "s" : ""} dans la liste</strong> · plafond {MAX_MODULES} modules. {trop ? <><b>Tu en as trop —</b> regroupe ou supprime {ord.length - MAX_MODULES} obstacle{ord.length - MAX_MODULES > 1 ? "s" : ""}.</> : "Tu peux continuer."}
      </div>

      <div className="mb-4 space-y-2">
        {ord.map((o, i) => (
          <div key={i} className="flex items-center gap-2 rounded-[10px] px-3 py-2.5" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
            <div className="w-6 shrink-0 text-center text-[13px] font-bold text-[#C9A84C]">{i + 1}</div>
            <div className="flex-1 text-[13.5px] leading-[1.45] text-white/85">{o}</div>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Monter" className="flex h-7 w-7 items-center justify-center rounded-lg text-[#C9A84C] disabled:opacity-25" style={{ background: "rgba(201,168,76,0.08)" }}><ChevronUp className="h-4 w-4" /></button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === ord.length - 1} title="Descendre" className="flex h-7 w-7 items-center justify-center rounded-lg text-[#C9A84C] disabled:opacity-25" style={{ background: "rgba(201,168,76,0.08)" }}><ChevronDown className="h-4 w-4" /></button>
            <button type="button" onClick={() => remove(i)} title="Retirer" className="flex h-7 w-7 items-center justify-center rounded-lg text-[#E86B6B]" style={{ background: "rgba(232,107,107,0.08)" }}><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>

      {!ready && (
        <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(201,138,76,0.06)", borderLeft: "2px solid #c98a4c", color: "#e8c9a0" }}>
          Pour passer au mapping, il te manque <strong>{missingFieldsLabel("obstacles_ordres", state.data)}</strong>.
        </div>
      )}

      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Liste brut</Btn>
        <Btn variant="cta" disabled={!ready} onClick={next}>Mapper en modules <ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
