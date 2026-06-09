import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  StepEyebrow, StepTitle, StepSub, InputBlock, InputLabel, InputHelper,
  TextInput, TextArea, Option, Btn, Actions,
} from "../../m1-niche/components/ui";
import {
  SALUTATIONS, POSTURES, CONTEXTES, missingBriefFields, canGenerate,
  type M8State, type BriefClient, type TonSalutation, type Posture, type Contexte,
} from "../lib/types";

interface Props {
  state: M8State;
  setState: (n: (p: M8State) => M8State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function BriefScreen({ state, setState, onBack, onNext }: Props) {
  const bc = state.data.brief_client;

  function patch(p: Partial<BriefClient>) {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, brief_client: { ...prev.data.brief_client, ...p } },
    }));
  }

  const missing = missingBriefFields(bc);
  const ready = canGenerate(bc);

  return (
    <div>
      <StepEyebrow>Étape 1 / 3 · Brief client</StepEyebrow>
      <StepTitle>Qui est le client à solliciter ?</StepTitle>
      <StepSub>
        Renseigne un client réel et satisfait. Ces infos personnalisent tes 3 messages (ton, posture, vocabulaire selon le
        contexte). Tout est modifiable ensuite.
      </StepSub>

      <InputBlock>
        <InputLabel>Prénom du client</InputLabel>
        <TextInput value={bc.prenom_client} onChange={(e) => patch({ prenom_client: e.target.value })} placeholder="Ex : Yacine" />
      </InputBlock>

      <InputBlock>
        <InputLabel>Nom de ton offre</InputLabel>
        <TextInput value={bc.nom_offre} onChange={(e) => patch({ nom_offre: e.target.value })} placeholder="Ex : Méthode Liberty Business" />
        <InputHelper>Prérempli depuis l'amont si dispo — modifiable.</InputHelper>
      </InputBlock>

      <InputBlock>
        <InputLabel>Ton de salutation</InputLabel>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(SALUTATIONS) as TonSalutation[]).map((k) => (
            <Option key={k} selected={bc.ton_salutation === k} onClick={() => patch({ ton_salutation: k })}>
              <span className="flex flex-col">
                <span>{SALUTATIONS[k].label}</span>
                <span className="text-[11px] text-white/40">{SALUTATIONS[k].meta}</span>
              </span>
            </Option>
          ))}
        </div>
      </InputBlock>

      <InputBlock>
        <InputLabel>Posture</InputLabel>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(POSTURES) as Posture[]).map((k) => (
            <Option key={k} selected={bc.posture === k} onClick={() => patch({ posture: k })}>
              <span className="flex flex-col">
                <span>{POSTURES[k].label}</span>
                <span className="text-[11px] text-white/40">{POSTURES[k].meta}</span>
              </span>
            </Option>
          ))}
        </div>
      </InputBlock>

      <InputBlock>
        <InputLabel>Contexte</InputLabel>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(Object.keys(CONTEXTES) as Contexte[]).map((k) => (
            <Option key={k} selected={bc.contexte === k} onClick={() => patch({ contexte: k })}>
              <span className="flex flex-col">
                <span>{CONTEXTES[k].label}</span>
                <span className="text-[11px] text-white/40">{CONTEXTES[k].meta}</span>
              </span>
            </Option>
          ))}
        </div>
        <InputHelper>Module le vocabulaire des messages (chaleureux, pro ou pudique).</InputHelper>
      </InputBlock>

      <InputBlock>
        <InputLabel>Douleur « avant » du client <span className="text-white/30">(optionnel)</span></InputLabel>
        <TextArea
          value={bc.douleur_passe_hint}
          onChange={(e) => patch({ douleur_passe_hint: e.target.value })}
          placeholder="Ex : Plafonner à 1-3k€ MRR malgré 2-3 ans d'activité"
          rows={2}
        />
        <InputHelper>Sert d'indice dans le script d'interview (bloc « découverte du passé »).</InputHelper>
      </InputBlock>

      {!ready && (
        <div
          className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]"
          style={{ background: "rgba(201,138,76,0.06)", borderLeft: "2px solid #c98a4c", color: "#e8c9a0" }}
        >
          Il manque : <strong>{missing.join(", ")}</strong>.
        </div>
      )}

      <Actions>
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Retour
        </Btn>
        <Btn variant="cta" disabled={!ready} onClick={onNext}>
          Générer mes messages
          <ArrowRight className="h-4 w-4" />
        </Btn>
      </Actions>
    </div>
  );
}
