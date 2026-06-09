import { Card, StepH2, Lead, Peda, AlertSoft, NavBar } from "../components/parts";
import { type M18State, LTV_MULTIPLE_TARGET, fmtEur } from "../lib/types";
import { computeLTV, canEnterLock, missingFieldsLabel } from "../lib/validations";

interface Props { state: M18State; setState: (n: (p: M18State) => M18State) => void; onBack: () => void; onNext: () => void; }

export function LtvScreen({ state, setState, onBack, onNext }: Props) {
  const d = state.data;
  const locked = state.signed;
  const ltvR = computeLTV(state);
  const entry = ltvR.entry;
  const canNext = canEnterLock(state);
  const setLtvTaux = (v: string) => { if (locked) return; setState((prev) => ({ ...prev, data: { ...prev.data, ltv: { ...prev.data.ltv, taux_lt_mt: Math.max(0, Math.min(100, parseInt(v, 10) || 0)) } } })); };
  const mClass = ltvR.target_ok ? "#4cc987" : ltvR.multiple >= 2 ? "#c98a4c" : "#c94c4c";
  const v = Math.max(0, Math.min(100, Number(d.ltv.taux_lt_mt) || 0));

  const Row = ({ label, note, value, big, color }: { label: string; note?: string; value: string; big?: boolean; color?: string }) => (
    <div className="flex items-center justify-between border-b py-2 last:border-0" style={{ borderColor: "#2a2a2a" }}>
      <span className="text-[12.5px] text-white/60">{label}{note && <span className="text-white/35"> · {note}</span>}</span>
      <span className={"font-semibold " + (big ? "text-[18px]" : "text-[13px]")} style={{ color: color || "#fff" }}>{value}</span>
    </div>
  );

  return (
    <Card>
      <StepH2 marker="3 ·">La valeur vie client (LTV) de ton écosystème</StepH2>
      <Lead>La LTV, c’est tout ce qu’un client te rapporte sur sa durée de vie, en montant les marches. Estime tes taux de montée — même approximatifs au début — pour voir ce que chaque entrant vaut vraiment. C’est ce chiffre, pas le prix d’une offre isolée, qui décide combien tu peux dépenser en acquisition.</Lead>
      <Peda title="La LTV, ton KPI roi">Si chaque client n’achète que ton offre d’entrée, tu plafonnes. Si chaque client dépense plusieurs fois son prix d’entrée en montant l’échelle, tu peux te permettre un coût d’acquisition que tes concurrents ne peuvent pas suivre. <strong>Objectif : LTV ≥ {LTV_MULTIPLE_TARGET}× le prix d’entrée.</strong></Peda>

      {entry === "lt" ? (
        <div className="my-4 rounded-xl p-4" style={{ background: "#181818", border: "1px solid #2a2a2a" }}>
          <h3 className="text-[14px] font-semibold text-white">Taux de montée Low-Ticket → Middle-Ticket</h3>
          <div className="mt-1 mb-3 text-[12px] leading-[1.45] text-white/45">Sur 100 acheteurs de ton Low-Ticket, combien achètent ensuite ton Middle-Ticket ? (réaliste : 5–15 %)</div>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={100} step={1} value={v} disabled={locked} onChange={(e) => setLtvTaux(e.target.value)} className="flex-1 accent-[#C9A84C]" />
            <span className="w-12 text-right text-[14px] font-semibold text-[#C9A84C]">{v} %</span>
          </div>
        </div>
      ) : entry === "mt" ? (
        <AlertSoft>Ton offre d’entrée payante est ton Middle-Ticket : il n’y a pas de marche en amont à faire monter, donc ta LTV mesurée se limite à ce prix d’entrée. Le levier le plus puissant pour la multiplier, c’est d’ajouter une marche d’entrée bon marché (un Low-Ticket) qui alimente ton offre cœur.</AlertSoft>
      ) : null}

      <div className="my-4 rounded-xl px-4 py-2" style={{ background: "#0c0c0c", border: "1px solid #2a2a2a" }}>
        {ltvR.breakdown.map((b, i) => <Row key={i} label={b.label} note={b.note} value={fmtEur(Math.round(b.val))} />)}
        <Row label={"Prix d’entrée (" + (entry === "lt" ? "Low-Ticket" : "Middle-Ticket") + ")"} value={fmtEur(ltvR.entryPrice)} />
        <Row label="LTV par client entrant" value={fmtEur(ltvR.ltv)} big />
        <Row label="Multiple LTV / prix d’entrée" note={"cible ≥ " + LTV_MULTIPLE_TARGET + "×"} value={ltvR.multiple ? ltvR.multiple.toFixed(1) + "×" : "—"} color={mClass} />
      </div>

      {ltvR.has_entry && (
        ltvR.no_ascension ? (
          <AlertSoft>Sans Low-Ticket en amont, ta LTV mesurée égale ton prix d’entrée. Pour la faire grimper : ajoute une première marche bon marché qui amène les gens vers ton Middle-Ticket.</AlertSoft>
        ) : ltvR.target_ok ? (
          <AlertSoft tone="green">Solide : chaque client entrant te rapporte {ltvR.multiple.toFixed(1)}× son prix d’entrée. Tu as de la marge pour acheter du trafic.</AlertSoft>
        ) : (
          <AlertSoft>Ton multiple est sous {LTV_MULTIPLE_TARGET}×. Deux leviers : remonter ton taux de montée Low-Ticket → Middle-Ticket (meilleure séquence à l’étape 2), ou rapprocher tes prix (écart plus digeste entre les deux marches).</AlertSoft>
        )
      )}

      <NavBar onBack={onBack} onNext={onNext} nextLabel="Verrouiller ma carte →" nextDisabled={!canNext} hint={canNext ? undefined : missingFieldsLabel(state, "lock")} />
    </Card>
  );
}
