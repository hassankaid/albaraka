import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Btn, Actions, Card, InputBlock, InputLabel, TextArea } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import {
  type M4State, type BridgeKey,
  ENTRY_STRATEGIES, BRIDGE_BY_ID, MIN_BRIDGE_LENGTH,
} from "../lib/types";

interface Props {
  state: M4State;
  setState: (n: (p: M4State) => M4State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function PasserellesScreen({ state, setState, onBack, onNext }: Props) {
  const strategy = state.entry.strategy;
  const def = strategy ? ENTRY_STRATEGIES[strategy] : null;
  const needed: BridgeKey[] = def?.bridges_needed ?? [];

  const setBridge = (k: BridgeKey, v: string) =>
    setState((prev) => ({ ...prev, bridges: { ...prev.bridges, [k]: v } }));

  const canNext = needed.length > 0 && needed.every((k) => state.bridges[k].trim().length >= MIN_BRIDGE_LENGTH);

  if (!strategy || !def) {
    return (
      <div>
        <Card className="mb-4">
          <p className="text-[13px] text-white/70">
            Tu dois d'abord choisir une stratégie d'entrée à l'étape précédente.
          </p>
        </Card>
        <Actions>
          <Btn variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Niveau d'entrée
          </Btn>
        </Actions>
      </div>
    );
  }

  return (
    <div>
      <StepHeader
        current={3}
        total={4}
        title="Tes passerelles entre marches"
        sub={`Stratégie choisie : ${def.label}. Voici les ${needed.length} passerelle(s) que tu dois écrire pour faire monter ton avatar de marche en marche. Min. ${MIN_BRIDGE_LENGTH} caractères par passerelle — sois concret, pas générique.`}
      />

      <div className="mb-5 space-y-4">
        {needed.map((bid) => {
          const b = BRIDGE_BY_ID[bid];
          const text = state.bridges[bid] || "";
          const len = text.trim().length;
          const isOk = len >= MIN_BRIDGE_LENGTH;
          return (
            <Card key={bid}>
              <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
                <span className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.08em]"
                  style={{ background: "rgba(201,168,76,0.15)", color: "#E8C770" }}>
                  {b.from}
                </span>
                <span className="text-[#C9A84C]">→</span>
                <span className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.08em]"
                  style={{ background: "rgba(201,168,76,0.15)", color: "#E8C770" }}>
                  {b.to}
                </span>
                {isOk ? (
                  <CheckCircle2 className="ml-auto h-4 w-4 text-[#7FB069]" />
                ) : (
                  <span className="ml-auto text-[10px] text-white/30">{len}/{MIN_BRIDGE_LENGTH}</span>
                )}
              </div>

              {/* Why — peda block */}
              <div
                className="mb-3 rounded-lg p-3 text-[12.5px] leading-[1.55]"
                style={{ background: "#0B0A07", border: "0.5px solid rgba(201,168,76,0.18)" }}
              >
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">
                  Pourquoi cette passerelle
                </div>
                <p className="text-white/75" dangerouslySetInnerHTML={{ __html: b.why }} />
              </div>

              {/* Script d'exemple */}
              <div
                className="mb-3 rounded-lg p-3 text-[12px] leading-[1.55]"
                style={{ background: "rgba(127,176,105,0.05)", border: "0.5px solid rgba(127,176,105,0.3)" }}
              >
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7FB069]">
                  Exemple de script
                </div>
                <p className="text-white/70" dangerouslySetInnerHTML={{ __html: b.script }} />
              </div>

              {/* Pitfall */}
              <div
                className="mb-3 rounded-lg p-3 text-[12px] leading-[1.55]"
                style={{ background: "rgba(232,107,107,0.05)", border: "0.5px solid rgba(232,107,107,0.3)" }}
              >
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#E86B6B]">
                  <AlertCircle className="h-3 w-3" />
                  Erreur à éviter
                </div>
                <p className="text-white/70" dangerouslySetInnerHTML={{ __html: b.pitfall }} />
              </div>

              <InputBlock>
                <InputLabel>Ta passerelle {b.from} → {b.to} *</InputLabel>
                <TextArea
                  rows={4}
                  value={text}
                  onChange={(e) => setBridge(bid, e.target.value)}
                  placeholder={`Décris concrètement comment tu fais transiter ton avatar de ${b.from} vers ${b.to}. Inspire-toi du script ci-dessus mais adapte à TON avatar.`}
                />
              </InputBlock>
            </Card>
          );
        })}
      </div>

      <Actions>
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Niveau d'entrée
        </Btn>
        <Btn variant="primary" disabled={!canNext} onClick={onNext}>
          Lock & Export
          <ArrowRight className="h-4 w-4" />
        </Btn>
      </Actions>
    </div>
  );
}
