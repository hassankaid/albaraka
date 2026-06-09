import { Card, Eyebrow, HStep, Lead, FL, NavBtns } from "../components/parts";
import { type M16State, clampInt } from "../lib/types";
import { ctx, pricingEval, canEnterGeneration } from "../lib/validations";

interface Props { state: M16State; setState: (n: (p: M16State) => M16State) => void; onBack: () => void; onNext: () => void; }

export function PricingScreen({ state, setState, onBack, onNext }: Props) {
  const c = ctx(state);
  const pe = pricingEval(state);
  const setPrix = (v: any) => setState((prev) => ({ ...prev, data: { ...prev.data, prix_lt: clampInt(v, 0) } }));

  const Row = ({ lab, val, cls }: { lab: string; val: string; cls?: "ok" | "bad" | "warn" }) => (
    <div className="flex items-center justify-between border-b py-2 last:border-0" style={{ borderColor: "#262420" }}>
      <span className="text-[12.5px] text-white/55">{lab}</span>
      <span className="text-[13px] font-semibold" style={{ color: cls === "ok" ? "#6fae6a" : cls === "bad" ? "#d4584f" : cls === "warn" ? "#c98a4c" : "#f4f1e8" }}>{val}</span>
    </div>
  );

  return (
    <Card>
      <Eyebrow>Étape 4</Eyebrow>
      <HStep>Le prix</HStep>
      <Lead>La fenêtre de l'achat impulsif : 7 à 47€. Et un ancrage : 5 à 20 fois moins cher que ton offre principale.</Lead>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FL>Ton prix (€)</FL>
          <input type="number" min={0} value={state.data.prix_lt || ""} onChange={(e) => setPrix(e.target.value)} placeholder={String(state.data.prix_lt_suggere || 17)} className="w-full rounded-[9px] px-3 py-2.5 text-[14.5px] outline-none focus:border-[#C9A84C]" style={{ background: "#161513", border: "1px solid #262420", color: "#f4f1e8" }} />
          {state.data.prix_lt_suggere ? (
            <div className="mt-2 text-[12px] text-white/45">Suggestion ancrée sous ton offre principale : <b className="text-white/80">{state.data.prix_lt_suggere}€</b>. <button type="button" onClick={() => setPrix(state.data.prix_lt_suggere)} className="text-[#C9A84C] underline">utiliser</button></div>
          ) : null}
        </div>
        <div className="rounded-xl p-4" style={{ background: "#161513", border: "1px solid #262420" }}>
          <Row lab="Fenêtre 7-47€" val={pe.lt ? (pe.inWindow ? "✓ dans la zone" : "✗ hors zone") : "—"} cls={pe.lt ? (pe.inWindow ? "ok" : "bad") : undefined} />
          {c.prix_mt ? <Row lab={"Ratio vs offre principale (" + c.prix_mt + "€)"} val={pe.ratio ? pe.ratio + "× " + (pe.ratioOk ? "✓" : "⚠") : "—"} cls={pe.ratioOk ? "ok" : "warn"} /> : null}
          <Row lab="Prix psychologique (en 7)" val={pe.lt ? (pe.isPsycho ? "✓ oui" : "— préfère 7/17/27/47") : "—"} cls={pe.lt ? (pe.isPsycho ? "ok" : "warn") : undefined} />
          {c.prix_mt ? <Row lab="Zone conseillée" val={pe.range_lo + " – " + pe.range_hi + "€"} /> : null}
        </div>
      </div>

      {pe.warnings.length > 0 && (
        <div className="my-4 rounded-[8px] py-3 pl-4 pr-3 text-[13.5px] leading-[1.5]" style={{ borderLeft: "2px solid #d4584f", background: "rgba(212,88,79,0.07)", color: "#f0b3ae" }}>
          {pe.warnings.map((w, i) => <div key={i}>{w}</div>)}
        </div>
      )}

      <NavBtns onBack={onBack} onNext={onNext} nextLabel="Générer mon produit →" nextDisabled={!canEnterGeneration(state)} />
    </Card>
  );
}
