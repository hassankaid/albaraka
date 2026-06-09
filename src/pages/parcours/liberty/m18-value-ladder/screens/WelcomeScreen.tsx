import { Card, StepH2, Lead } from "../components/parts";
import { UpstreamContext } from "../components/UpstreamContext";
import { type M18State } from "../lib/types";

interface Props { state: M18State; onStart: () => void; onOpenDemo: () => void; }

export function WelcomeScreen({ state, onStart, onOpenDemo }: Props) {
  return (
    <Card>
      <StepH2 marker="◆">Assembler ta Value Ladder</StepH2>
      <Lead>Tu as construit chaque marche séparément. Ici tu les relies en un seul écosystème : tu vérifies que chaque offre prépare la suivante, tu poses les passages, et tu calcules ce que chaque client te rapporte vraiment.</Lead>

      <UpstreamContext state={state} />

      <div className="my-4 rounded-[0_8px_8px_0] py-3 pl-4 pr-4 text-[14px] leading-[1.6]" style={{ borderLeft: "2px solid #C9A84C", background: "linear-gradient(90deg,rgba(201,168,76,.07),transparent)" }}>
        <h4 className="mb-1.5 font-semibold text-[#C9A84C]">Pourquoi cette échelle existe</h4>
        <p className="text-white/70">Vendre du High-Ticket à un inconnu coûte une fortune en acquisition — souvent plus cher que la vente elle-même. La Value Ladder résout ça : chaque marche réchauffe le client pour la suivante. Il entre par une petite transaction, il voit un premier résultat, et il monte naturellement.</p>
        <p className="my-2 font-serif text-[15px] italic text-[#e7d295]">« Chaque offre crée le besoin de la suivante. »</p>
        <p className="text-white/70">Le Low-Ticket dit <strong className="text-white">quoi</strong>, le Middle-Ticket dit <strong className="text-white">comment</strong>, le High-Ticket dit <strong className="text-white">comment + je t’accompagne</strong>. Ton vrai indicateur n’est pas le prix d’une offre, c’est la <strong className="text-white">valeur vie client</strong> : combien un client te rapporte sur toute sa durée.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={onStart} className="rounded-xl p-5 text-left transition-all hover:border-[#C9A84C]" style={{ background: "#181818", border: "1px solid rgba(201,168,76,0.3)" }}>
          <h3 className="font-serif text-[18px] font-semibold text-white">Assembler mon échelle</h3>
          <p className="mt-1.5 text-[12.5px] leading-[1.55] text-white/60">Je pars de mes propres offres. Le High-Ticket et le Middle-Ticket que j’ai déjà construits se pré-remplissent automatiquement. Tout est sauvegardé — je peux interrompre et reprendre.</p>
        </button>
        <button type="button" onClick={onOpenDemo} className="rounded-xl p-5 text-left transition-all hover:border-[#C9A84C]" style={{ background: "#181818", border: "1px solid #2a2a2a" }}>
          <h3 className="font-serif text-[18px] font-semibold text-white">Explorer les cas démos</h3>
          <p className="mt-1.5 text-[12.5px] leading-[1.55] text-white/60">10 cas pré-remplis du casting (Aïcha, Karim, Sofia, Mehdi, Yacine, Nora, Tarik, Lina, Adam, Sara) — chaque niveau, chaque transition, chaque LTV illustré. Aucune écriture sur ton profil.</p>
        </button>
      </div>
    </Card>
  );
}
