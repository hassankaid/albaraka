import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import { StepEyebrow, StepTitle, StepSub, Card, CardTitle } from "../../m1-niche/components/ui";
import { prefillNomOffre, pickAvatarName, type M8State } from "../lib/types";

interface Props {
  state: M8State;
  onStart: () => void;
  onOpenDemo: () => void;
}

export function WelcomeScreen({ state, onStart, onOpenDemo }: Props) {
  const nomOffre = state.data.brief_client.nom_offre || prefillNomOffre(state) || "ton offre";
  const avatar = pickAvatarName(state);
  const hasUpstream = !!(state.m6_data || state.m7_data || state.m3_data);

  return (
    <div>
      <StepEyebrow>Module 8 · Preuve sociale</StepEyebrow>
      <StepTitle>Récolte tes témoignages clients</StepTitle>
      <StepSub>
        Génère les messages personnalisés à envoyer à tes clients pour obtenir des <strong className="text-white/80">vidéos
        témoignages</strong> et organiser des <strong className="text-white/80">interviews « coaching bilan »</strong>. Ce
        sont ces preuves qui rendront ton offre et ta garantie crédibles aux yeux de tes prochains prospects.
      </StepSub>

      {hasUpstream && (
        <Card className="mb-5">
          <CardTitle>Contexte importé de tes modules précédents</CardTitle>
          <ul className="space-y-1 text-[13px] leading-[1.55] text-white/75">
            <li>Offre : <strong className="text-[#C9A84C]">{nomOffre}</strong></li>
            <li>Client cible : <strong className="text-[#C9A84C]">{avatar}</strong></li>
          </ul>
          <p className="mt-2 text-[11px] text-white/40">Le nom de l'offre est prérempli — tu pourras le modifier à l'étape suivante.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={onStart}
          className="group rounded-xl p-5 text-left transition-all"
          style={{ border: "1px solid rgba(201,160,76,0.45)", background: "linear-gradient(180deg, rgba(201,160,76,0.06), #14130E 60%)" }}
        >
          <h3 className="mb-1.5 flex items-center gap-1.5 font-serif text-[17px] font-semibold text-[#C9A84C]">
            <ArrowRight className="h-4 w-4" /> Commencer
          </h3>
          <p className="text-[13px] leading-[1.55] text-white/55">Renseigne le brief de ton client réel et génère tes 3 messages prêts à envoyer.</p>
        </button>
        <button
          type="button"
          onClick={onOpenDemo}
          className="group rounded-xl p-5 text-left transition-all"
          style={{ border: "1px solid rgba(201,168,76,0.18)", background: "#14130E" }}
        >
          <h3 className="mb-1.5 flex items-center gap-1.5 font-serif text-[17px] font-semibold text-white/70">
            <PlayCircle className="h-4 w-4" /> Voir les 10 démos
          </h3>
          <p className="text-[13px] leading-[1.55] text-white/55">Explore 10 cas calibrés (business, relations, santé) pour voir la mécanique en action.</p>
        </button>
      </div>

      <p className="mt-5 flex items-center gap-1.5 text-[11.5px] text-white/35">
        <Sparkles className="h-3.5 w-3.5 text-[#C9A84C]" />
        Aucune note, aucun quiz dans ce module — c'est un générateur d'outils prêts à l'emploi.
      </p>
    </div>
  );
}
