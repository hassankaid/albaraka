import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import { StepEyebrow, StepTitle, StepSub, Card, CardTitle } from "../../m1-niche/components/ui";
import { tierFromPrice, type M11State } from "../lib/types";

interface Props { state: M11State; onStart: () => void; onOpenDemo: () => void; }

export function WelcomeScreen({ state, onStart, onOpenDemo }: Props) {
  const m1 = state.m1_data, m5 = state.m5_data, m6 = state.m6_data, m10 = state.m10_data;
  const cards: { label: string; value: string }[] = [];
  if (m1?.niche) cards.push({ label: "Niche", value: m1.niche });
  if (m1?.avatar_nom) cards.push({ label: "Avatar", value: m1.avatar_nom + (m1.avatar_age ? " · " + m1.avatar_age : "") });
  if (m5?.ht_point_a) cards.push({ label: "Point A (M5)", value: m5.ht_point_a });
  if (m5?.ht_point_b) cards.push({ label: "Point B (M5)", value: m5.ht_point_b });
  if (m6?.prix_ht) cards.push({ label: "Prix offre", value: m6.prix_ht + " € HT · " + tierFromPrice(m6.prix_ht).toUpperCase() });
  if (m10?.happy_clients_count) cards.push({ label: "10 happy clients (M10)", value: m10.happy_clients_count + " clients livrés" });

  return (
    <div>
      <StepEyebrow>Module 11 · Concevoir un programme</StepEyebrow>
      <StepTitle>Architecture ton programme qui transforme</StepTitle>
      <StepSub>
        Tu vas transformer tes patterns clients validés en un programme DIY structuré : du <strong className="text-white/80">Point A
        au Point B</strong>, en passant par les obstacles, les modules, leurs objectifs mesurables et le découpage en leçons.
        À la sortie, tu auras ton <strong className="text-white/80">plan de tournage</strong> complet, prêt à scripter et filmer.
      </StepSub>

      {cards.length > 0 ? (
        <Card className="mb-5">
          <CardTitle>Contexte importé de tes modules précédents</CardTitle>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {cards.map((c, i) => (
              <div key={i} className="rounded-lg px-3 py-2" style={{ background: "#0C0B08", border: "0.5px solid rgba(201,168,76,0.12)" }}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">{c.label}</div>
                <div className="mt-0.5 text-[12.5px] leading-[1.4] text-white/75">{c.value}</div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="mb-5">
          <p className="text-[13px] leading-[1.6] text-white/60">Aucun amont détecté. Tu peux quand même utiliser le module — tu renseigneras le Point A et le Point B à la main.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <button type="button" onClick={onStart} className="group rounded-xl p-5 text-left transition-all" style={{ border: "1px solid rgba(201,160,76,0.45)", background: "linear-gradient(180deg, rgba(201,160,76,0.06), #14130E 60%)" }}>
          <h3 className="mb-1.5 flex items-center gap-1.5 font-serif text-[17px] font-semibold text-[#C9A84C]"><ArrowRight className="h-4 w-4" /> Commencer</h3>
          <p className="text-[13px] leading-[1.55] text-white/55">Valide la gate de transition puis architecture ton programme étape par étape.</p>
        </button>
        <button type="button" onClick={onOpenDemo} className="group rounded-xl p-5 text-left transition-all" style={{ border: "1px solid rgba(201,168,76,0.18)", background: "#14130E" }}>
          <h3 className="mb-1.5 flex items-center gap-1.5 font-serif text-[17px] font-semibold text-white/70"><PlayCircle className="h-4 w-4" /> Voir les 10 démos</h3>
          <p className="text-[13px] leading-[1.55] text-white/55">Explore 10 programmes complets calibrés (business, relations, santé) entièrement remplis.</p>
        </button>
      </div>

      <p className="mt-5 flex items-center gap-1.5 text-[11.5px] text-white/35">
        <Sparkles className="h-3.5 w-3.5 text-[#C9A84C]" /> 8 étapes · validations heuristiques de cohérence (Bloom + accountability) · aucune note, aucun quiz.
      </p>
    </div>
  );
}
