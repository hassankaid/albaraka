import { ArrowLeft, ArrowRight } from "lucide-react";
import { StepEyebrow, StepTitle, StepSub, Card, CardTitle, Btn, Actions } from "../../m1-niche/components/ui";
import { TECHNIQUES, TECHNIQUE_KEYS, type M12State, type TechKey } from "../lib/types";

interface Props { state: M12State; setState: (n: (p: M12State) => M12State) => void; onBack: () => void; onNext: () => void; }

const REGLES = [
  { num: "1", title: "Évoquer le résultat ou la méthode", body: "Ton nom doit faire entendre la transformation que tu produis ou la manière dont tu opères. Un nom abstrait qui ne dit rien du résultat oblige à tout réexpliquer derrière." },
  { num: "2", title: "Mémorable et prononçable", body: "Si quelqu'un l'entend une fois et n'arrive pas à le redire à un proche le soir même, ton nom est mort. Court, simple à dire, simple à orthographier — pas de jeu de mots obscurs." },
  { num: "3", title: "Unique sur ton marché", body: "Tape ton nom dans Google avant de signer. S'il existe déjà cinq offres concurrentes qui s'appellent presque pareil, change. Sinon tu paies des Ads pour pousser tes rivaux et tu n'as pas de territoire à toi." },
];

export function ComprendreScreen({ state, setState, onBack, onNext }: Props) {
  const intuition = state.data.premier_choix_intuitif || "";
  const setIntuition = (k: TechKey) => setState((prev) => ({ ...prev, data: { ...prev.data, premier_choix_intuitif: prev.data.premier_choix_intuitif === k ? "" : k } }));

  return (
    <div>
      <StepEyebrow>Étape 1 / 5 · Comprendre</StepEyebrow>
      <StepTitle>Comprendre les 5 techniques et les 3 règles</StepTitle>
      <StepSub>Avant de brainstormer, tu dois savoir dans quelle boîte à outils tu pioches. Il existe 5 techniques de naming qui marchent — et 3 règles qui s'appliquent à toutes les 5. <em>Compte 10 minutes de lecture active.</em></StepSub>

      <Card className="mb-5">
        <CardTitle>Pourquoi cinq techniques et pas une seule</CardTitle>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75">Aucune technique n'est meilleure dans l'absolu. L'<strong className="text-white">acronyme</strong> structure ta méthode. La <strong className="text-white">métaphore</strong> vend une transformation émotionnelle. <strong className="text-white">Résultat + méthode</strong> parle aux rationnels. <strong className="text-white">Chiffre + promesse</strong> mise sur la vitesse et le mesurable. <strong className="text-white">Identité</strong> crée l'appartenance.</p>
        <p className="text-[12.5px] leading-[1.55] text-white/55">La meilleure dépend de 3 choses : ta cible (rationnelle vs émotionnelle), ta promesse (mesurable vs transformationnelle), la maturité de ton marché.</p>
      </Card>

      <div className="mb-2 font-serif text-[18px] font-semibold text-[#C9A84C]">Les 5 techniques</div>
      <div className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {TECHNIQUE_KEYS.map((k) => (
          <div key={k} className="rounded-xl p-4" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
            <div className="font-serif text-[15px] font-semibold text-[#C9A84C]">{TECHNIQUES[k].label}</div>
            <p className="mt-1 text-[12.5px] leading-[1.5] text-white/70">{TECHNIQUES[k].desc}</p>
            <p className="mt-2 text-[11.5px] italic text-white/40">{TECHNIQUES[k].examples}</p>
          </div>
        ))}
      </div>

      <div className="mb-2 font-serif text-[18px] font-semibold text-[#C9A84C]">Les 3 règles qui s'appliquent à toutes les techniques</div>
      <div className="mb-5 space-y-2">
        {REGLES.map((r) => (
          <div key={r.num} className="flex gap-3 rounded-xl p-4" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-[#080808]" style={{ background: "#C9A84C" }}>{r.num}</div>
            <div><div className="text-[13.5px] font-semibold text-white">{r.title}</div><p className="mt-0.5 text-[12.5px] leading-[1.5] text-white/60">{r.body}</p></div>
          </div>
        ))}
      </div>

      <Card className="mb-4">
        <CardTitle>Pose ton intuition avant de brainstormer</CardTitle>
        <p className="text-[13px] leading-[1.6] text-white/75">À première vue, quelle technique te semble coller le mieux à ton offre ? Tu n'es pas engagé — c'est une intuition à poser pour ancrer ta lecture. Tu pourras changer d'avis après avoir brainstormé 10 candidats.</p>
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {TECHNIQUE_KEYS.map((k) => {
          const sel = intuition === k;
          return (
            <button key={k} type="button" onClick={() => setIntuition(k)} className="rounded-[10px] px-3 py-2.5 text-left transition-all" style={{ background: sel ? "#2A2310" : "#14130E", border: sel ? "1px solid #C9A84C" : "1px solid rgba(201,168,76,0.18)" }}>
              <div className="text-[12.5px] font-semibold text-white">{TECHNIQUES[k].label}</div>
              <div className="mt-0.5 text-[10.5px] leading-[1.4] text-white/45">{TECHNIQUES[k].desc.split(".")[0]}.</div>
            </button>
          );
        })}
      </div>
      {intuition && (
        <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(201,168,76,0.06)", borderLeft: "2px solid #C9A84C", color: "#e8c9a0" }}>
          Tu as posé ton intuition : <strong>{TECHNIQUES[intuition as TechKey].label}</strong>. Garde-la en tête pendant le brainstorm — et autorise-toi à en changer si une autre technique sort plus fort à la confrontation.
        </div>
      )}

      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Welcome</Btn>
        <Btn variant="cta" onClick={onNext}>Brainstormer mes candidats <ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
