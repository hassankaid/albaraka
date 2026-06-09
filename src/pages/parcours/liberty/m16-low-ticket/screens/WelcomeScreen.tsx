import { type M16State } from "../lib/types";
import { ctx } from "../lib/validations";

interface Props { state: M16State; onStart: () => void; onOpenDemo: () => void; }

function CtxCards({ state }: { state: M16State }) {
  const c = ctx(state);
  const card = (k: string, v: string) => (
    <div className="rounded-[10px] px-3 py-2.5" style={{ background: "#0c0c0c", border: "1px solid #262420" }}>
      <div className="text-[10px] uppercase tracking-[0.08em] text-white/40">{k}</div>
      <div className={"mt-0.5 text-[12px] leading-[1.35] " + (v ? "text-white/85" : "italic text-white/30")}>{v || "à définir en amont"}</div>
    </div>
  );
  return (
    <div className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {card("Avatar", c.avatar)}
      {card("Ta méthode", c.mecanisme)}
      {card("Ton offre principale", c.programme_mt + (c.prix_mt ? " · " + c.prix_mt + "€" : ""))}
      {card("Résultat visé", c.point_b)}
    </div>
  );
}

export function WelcomeScreen({ state, onStart, onOpenDemo }: Props) {
  return (
    <div className="rounded-2xl p-6" style={{ background: "#101010", border: "1px solid #262420" }}>
      <div className="text-[11px] uppercase tracking-[0.16em] text-[#C9A84C]">Module 16</div>
      <h1 className="mt-1 font-serif text-[27px] font-semibold text-white">Créer ton produit Low-Ticket</h1>
      <p className="mt-1 max-w-[70ch] text-[15px] leading-[1.55] text-white/55">On va construire le petit produit à prix d'entrée (7 à 47€) qui transforme un curieux en client — et qui ouvre la porte à ton offre principale. Tu ressors avec le contenu de ton produit, prêt à éditer et à vendre.</p>

      <CtxCards state={state} />

      <div className="my-4 rounded-[8px] py-3 pl-4 pr-3 text-[14px] leading-[1.55] text-[#e7d295]" style={{ borderLeft: "2px solid #C9A84C", background: "linear-gradient(90deg,rgba(201,168,76,.07),transparent)" }}>
        <b className="text-[#C9A84C]">Pourquoi ce module ?</b> Vendre directement une offre chère à quelqu'un qui ne te connaît pas, c'est presque impossible. Le produit à petit prix fait sauter la première barrière : la première fois qu'on sort sa carte chez toi.
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={onStart} className="rounded-xl p-5 text-left transition-all hover:border-[#C9A84C]" style={{ background: "#161513", border: "1px solid rgba(201,168,76,0.3)" }}>
          <div className="text-[11px] uppercase tracking-[0.1em] text-[#C9A84C]">Mon vrai produit</div>
          <h3 className="mt-1 font-serif text-[18px] font-semibold text-white">Construire mon Low-Ticket</h3>
          <p className="mt-1.5 text-[12.5px] leading-[1.55] text-white/60">Je pars de mon offre principale et je bâtis mon produit d'entrée étape par étape. Tout est sauvegardé automatiquement — je peux m'interrompre et reprendre quand je veux.</p>
        </button>
        <button type="button" onClick={onOpenDemo} className="rounded-xl p-5 text-left transition-all hover:border-[#C9A84C]" style={{ background: "#161513", border: "1px solid #262420" }}>
          <div className="text-[11px] uppercase tracking-[0.1em] text-[#C9A84C]">Juste regarder</div>
          <h3 className="mt-1 font-serif text-[18px] font-semibold text-white">Explorer un cas démo</h3>
          <p className="mt-1.5 text-[12.5px] leading-[1.55] text-white/60">10 cas pré-remplis du casting (Aïcha, Karim, Sofia…), chaque format illustré. Pour comprendre la mécanique avant de me lancer. Rien n'est écrit sur mon profil.</p>
        </button>
      </div>
    </div>
  );
}
