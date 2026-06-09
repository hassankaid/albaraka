import { ArrowLeft } from "lucide-react";
import { StepEyebrow, StepTitle, StepSub, Btn, Actions } from "../../m1-niche/components/ui";
import { M11_DEMO_CASES, type Segment } from "../lib/demo-cases";

interface Props { onBack: () => void; onSelect: (demoId: string) => void; }

const SEGMENT_LABEL: Record<Segment, string> = {
  argent: "💰 Argent / business",
  relations: "❤️ Relations / lifestyle",
  sante: "🩺 Santé",
};

export function DemoSelectorScreen({ onBack, onSelect }: Props) {
  const segments: Segment[] = ["argent", "relations", "sante"];
  return (
    <div>
      <StepEyebrow>Démos · 10 programmes calibrés</StepEyebrow>
      <StepTitle>Choisis une démo</StepTitle>
      <StepSub>Charge un programme complet pré-rempli (gate, points A/B, obstacles, modules, leçons). Aucune écriture sur ton profil.</StepSub>

      {segments.map((seg) => {
        const cases = M11_DEMO_CASES.filter((c) => c.segment === seg);
        if (cases.length === 0) return null;
        return (
          <div key={seg} className="mb-5">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">{SEGMENT_LABEL[seg]}</div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {cases.map((c) => (
                <button key={c.id} type="button" onClick={() => onSelect(c.id)} className="rounded-xl p-4 text-left transition-all hover:-translate-y-0.5" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
                  <div className="font-serif text-[15px] font-semibold text-[#C9A84C]">{c.name}</div>
                  <div className="mt-1 text-[11.5px] leading-[1.45] text-white/45">{c.tag}</div>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <Actions align="center"><Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> Retour</Btn></Actions>
    </div>
  );
}
