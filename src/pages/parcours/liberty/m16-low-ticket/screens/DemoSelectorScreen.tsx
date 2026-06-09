import { DEMOS } from "../lib/demo-cases";

interface Props { onBack: () => void; onSelect: (id: string) => void; }

export function DemoSelectorScreen({ onBack, onSelect }: Props) {
  return (
    <div className="rounded-2xl p-6" style={{ background: "#101010", border: "1px solid #262420" }}>
      <div className="text-[11px] uppercase tracking-[0.16em] text-[#C9A84C]">Module 16 · Exemples</div>
      <h1 className="mt-1 font-serif text-[27px] font-semibold text-white">Choisis un cas à explorer</h1>
      <p className="mt-1 max-w-[70ch] text-[15px] leading-[1.55] text-white/55">Dix cas pré-remplis du casting. Le format est déjà choisi, le prix fixé, le contenu généré — pour voir l'outil en action de bout en bout. Rien n'est sauvegardé sur ton profil.</p>

      <div className="my-4 grid gap-2.5 sm:grid-cols-2">
        {Object.keys(DEMOS).map((k) => {
          const d = DEMOS[k];
          const fmtLabel = d.format === "mini_cours" ? "Mini-cours vidéo" : "Ebook";
          return (
            <button key={k} type="button" onClick={() => onSelect(k)} className="rounded-xl p-4 text-left transition-all hover:border-[#C9A84C]" style={{ background: "#161513", border: "1px solid #262420" }}>
              <div className="text-[14px] font-semibold text-white">{d.label}</div>
              <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-medium" style={{ background: d.format === "mini_cours" ? "rgba(201,168,76,0.12)" : "rgba(153,153,153,0.15)", color: d.format === "mini_cours" ? "#C9A84C" : "#bbb" }}>{fmtLabel}</span>
              <div className="mt-1.5 text-[12px] text-white/50">{d.prix}€ · sous offre à {d.ctx.prix_mt}€</div>
            </button>
          );
        })}
      </div>

      <button type="button" onClick={onBack} className="rounded-full px-4 py-2 text-[13px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}>← Retour</button>
    </div>
  );
}
