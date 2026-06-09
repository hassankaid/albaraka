import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import { StepEyebrow, StepTitle, StepSub, Card, CardTitle } from "../../m1-niche/components/ui";
import { UpstreamContext } from "../components/UpstreamContext";
import { type M12State } from "../lib/types";

interface Props { state: M12State; onStart: () => void; onOpenDemo: () => void; }

export function WelcomeScreen({ state, onStart, onOpenDemo }: Props) {
  return (
    <div>
      <StepEyebrow>Module 12 · Naming & positionnement</StepEyebrow>
      <StepTitle>Bienvenue dans le Naming & Positionnement</StepTitle>
      <StepSub>
        Tu vas trouver le nom qui vend pour ton programme — un nom qui évoque ce que tu transformes, qui se retient au premier
        coup d'oreille, qui est unique sur ton marché. Puis tu vas poser ta catégorie nouvelle et le combat que tu prends pour différencier ton offre.
      </StepSub>

      <Card className="mb-4">
        <CardTitle>Pourquoi cette étape est décisive</CardTitle>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75">Le nom de ton programme n'est pas un détail décoratif. C'est le premier mot que tes prospects entendent, retiennent, et prononcent à un proche. Un mauvais nom rend ton offre invisible. Un bon nom fait le travail à ta place : il évoque le résultat, il se retient, il devient un raccourci mental.</p>
        <p className="text-[13px] leading-[1.6] text-[#C9A84C] italic">Un nom qui ne se retient pas, c'est une offre qui n'existe pas dans la tête de ton prospect.</p>
      </Card>
      <Card className="mb-5">
        <CardTitle>Ce que tu vas faire ici</CardTitle>
        <p className="text-[13px] leading-[1.6] text-white/75">D'abord comprendre les <strong className="text-white">5 techniques de naming</strong> et les <strong className="text-white">3 règles</strong> ; puis brainstormer 5 à 10 candidats ; tester ton top 3 (auto-checks + 4 tests humains) ; choisir ton nom final et sa baseline ; poser ton positionnement (catégorie + combat). Deux bonus : nommer ta méthode propriétaire et renommer tes modules.</p>
      </Card>

      <UpstreamContext state={state} />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <button type="button" onClick={onStart} className="group rounded-xl p-5 text-left transition-all" style={{ border: "1px solid rgba(201,160,76,0.45)", background: "linear-gradient(180deg, rgba(201,160,76,0.06), #14130E 60%)" }}>
          <h3 className="mb-1.5 flex items-center gap-1.5 font-serif text-[17px] font-semibold text-[#C9A84C]"><ArrowRight className="h-4 w-4" /> Démarrer le naming</h3>
          <p className="text-[13px] leading-[1.55] text-white/55">Je commence par comprendre les 5 techniques, puis je brainstorme mes candidats. Tout est sauvegardé automatiquement.</p>
        </button>
        <button type="button" onClick={onOpenDemo} className="group rounded-xl p-5 text-left transition-all" style={{ border: "1px solid rgba(201,168,76,0.18)", background: "#14130E" }}>
          <h3 className="mb-1.5 flex items-center gap-1.5 font-serif text-[17px] font-semibold text-white/70"><PlayCircle className="h-4 w-4" /> Explorer les démos</h3>
          <p className="text-[13px] leading-[1.55] text-white/55">10 cas pré-remplis du casting. Naming et positionnement déjà validés. Aucune écriture sur ton profil.</p>
        </button>
      </div>

      <p className="mt-5 flex items-center gap-1.5 text-[11.5px] text-white/35">
        <Sparkles className="h-3.5 w-3.5 text-[#C9A84C]" /> Score auto sur 7 critères + 4 tests humains IRL · aucune note, aucun quiz.
      </p>
    </div>
  );
}
