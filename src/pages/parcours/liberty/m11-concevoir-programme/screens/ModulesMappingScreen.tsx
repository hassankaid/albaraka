import { useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { StepEyebrow, StepTitle, StepSub, Card, Btn, Actions } from "../../m1-niche/components/ui";
import { type M11State } from "../lib/types";
import { validateModuleName, canEnterFichesStep, missingFieldsLabel, syncModulesFromObstaclesOrdonnes } from "../lib/validations";

interface Props { state: M11State; setState: (n: (p: M11State) => M11State) => void; onBack: () => void; onNext: () => void; }

export function ModulesMappingScreen({ state, setState, onBack, onNext }: Props) {
  // Re-sync modules ← obstacles ordonnés à l'entrée (préserve le travail).
  useEffect(() => {
    setState((prev) => ({ ...prev, data: { ...prev.data, modules: syncModulesFromObstaclesOrdonnes(prev.data) } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mods = state.data.modules || [];
  const ready = canEnterFichesStep(state.data);

  const setNom = (i: number, v: string) => setState((prev) => {
    const modules = prev.data.modules.map((m, k) => (k === i ? { ...m, nom: v } : m));
    return { ...prev, data: { ...prev.data, modules } };
  });

  function next() {
    setState((prev) => ({ ...prev, _activeFicheIdx: 0 }));
    onNext();
  }

  return (
    <div>
      <StepEyebrow>Étape 5 / 6 · Modules</StepEyebrow>
      <StepTitle>Mapper obstacles → modules</StepTitle>
      <StepSub>
        Chaque obstacle ordonné devient <strong className="text-white/80">un module</strong> avec un nom court et orienté résultat.
        À l'étape suivante, tu détailleras le contenu, l'exercice et le critère de validation de chacun.
      </StepSub>

      <Card className="mb-5">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">Un module = une transformation, pas un sujet</div>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75">Mauvais : « Module 3 — Marketing digital ». Aucune transformation. Bon : « Module 3 — Générer 30 appels qualifiés/mois ». Le nom annonce <strong className="text-white">ce que l'élève saura faire</strong> à la fin. Verbe d'action + résultat mesurable.</p>
        <p className="text-[12.5px] leading-[1.55] text-white/55">Astuce : ton nom de module doit pouvoir se finir par « …à la fin de ce module ».</p>
      </Card>

      <div className="mb-4 space-y-2.5">
        {mods.map((m, i) => {
          const warn = (m.nom || "").trim().length >= 2 ? validateModuleName(m.nom) : null;
          return (
            <div key={m.id || i} className="rounded-[10px] p-3" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
              <div className="flex items-center gap-2">
                <div className="w-6 shrink-0 text-center text-[13px] font-bold text-[#C9A84C]">{i + 1}</div>
                <div className="flex-1 text-[12px] leading-[1.4] text-white/55">{m.obstacle_origine}</div>
                <div className="shrink-0 text-[#C9A84C]">→</div>
                <input type="text" value={m.nom} onChange={(e) => setNom(i, e.target.value)} placeholder="Ex. Trouver ta niche spécifique"
                  className="flex-1 rounded-[8px] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30"
                  style={{ background: "#0C0B08", border: warn ? "1px solid rgba(232,180,80,0.5)" : "1px solid rgba(201,168,76,0.18)" }} />
              </div>
              {warn && <div className="ml-8 mt-1.5 text-[11px] leading-[1.45] text-amber-400/80">{warn.message}</div>}
            </div>
          );
        })}
      </div>

      {!ready && (
        <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(201,138,76,0.06)", borderLeft: "2px solid #c98a4c", color: "#e8c9a0" }}>
          Pour passer aux fiches, il te manque <strong>{missingFieldsLabel("modules_mapping", state.data)}</strong>.
        </div>
      )}

      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Tri obstacles</Btn>
        <Btn variant="cta" disabled={!ready} onClick={next}>Détailler les fiches modules <ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
