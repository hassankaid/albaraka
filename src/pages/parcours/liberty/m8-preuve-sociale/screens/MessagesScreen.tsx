import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Copy, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { StepEyebrow, StepTitle, StepSub, Btn, Actions } from "../../m1-niche/components/ui";
import { buildAllTemplates, type M8State } from "../lib/types";

interface Props {
  state: M8State;
  setState: (n: (p: M8State) => M8State) => void;
  onBack: () => void;
  onNext: () => void;
}

function TemplateCard({ title, sub, body }: { title: string; sub: string; body: string }) {
  const [copied, setCopied] = useState(false);
  const hasPlaceholder = /\[[^\]]+\]/.test(body);

  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      toast.success("Message copié");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Copie impossible — sélectionne le texte manuellement.");
    }
  }

  return (
    <div className="rounded-xl p-5" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif text-[17px] font-semibold text-[#C9A84C]">{title}</h3>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors"
          style={{ background: "rgba(201,168,76,0.08)", border: "0.5px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <p className="mb-3 text-[12px] text-white/45">{sub}</p>
      {hasPlaceholder && (
        <div
          className="mb-3 flex items-start gap-1.5 rounded-lg px-3 py-2 text-[11.5px] leading-[1.5]"
          style={{ background: "rgba(232,107,107,0.08)", border: "0.5px solid rgba(232,107,107,0.4)", color: "#e8a0a0" }}
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Remplace impérativement les passages entre <strong>[crochets]</strong> par les vraies infos avant d'envoyer.</span>
        </div>
      )}
      <pre
        className="max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-lg px-4 py-3.5 text-[12.5px] leading-[1.6] text-white/80"
        style={{ background: "#0C0B08", border: "0.5px solid rgba(201,168,76,0.12)", fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {body}
      </pre>
    </div>
  );
}

export function MessagesScreen({ state, setState, onBack, onNext }: Props) {
  const bc = state.data.brief_client;
  const tpl = buildAllTemplates(bc);

  // Compte une génération à l'entrée de l'écran (hors démo).
  useEffect(() => {
    if (state.demoMode) return;
    setState((prev) => ({ ...prev, data: { ...prev.data, generation_count: (prev.data.generation_count || 0) + 1 } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <StepEyebrow>Étape 2 / 3 · Tes messages</StepEyebrow>
      <StepTitle>3 messages prêts à envoyer pour {bc.prenom_client || "ton client"}</StepTitle>
      <StepSub>
        Personnalisés selon ton offre, ta posture et ton contexte. Copie-les, remplace les crochets, et envoie-les à tes
        clients satisfaits pour bâtir ton arsenal de preuve sociale.
      </StepSub>

      <div className="space-y-4">
        <TemplateCard title="Message A · DM témoignage vidéo" sub="À envoyer en privé pour obtenir une courte vidéo témoignage (1-2 min)." body={tpl.A} />
        <TemplateCard title="Message B · Invitation « coaching bilan » Zoom" sub="Pour organiser une interview client de 20-40 min en visio." body={tpl.B} />
        <TemplateCard title="Message C · Script d'interview" sub="À garder sous les yeux pendant l'enregistrement Zoom." body={tpl.C} />
      </div>

      <Actions>
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Modifier le brief
        </Btn>
        <Btn variant="cta" onClick={onNext}>
          Finaliser & transmettre
          <ArrowRight className="h-4 w-4" />
        </Btn>
      </Actions>
    </div>
  );
}
