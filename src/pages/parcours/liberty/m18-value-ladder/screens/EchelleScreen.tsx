import { Card, StepH2, Lead, Peda, FL, Hint, TInput, NavBar } from "../components/parts";
import { type M18State, type Level, type LevelKey, LEVELS, toIntPrice } from "../lib/types";
import { evaluateCoherence, canEnterAscension, missingFieldsLabel } from "../lib/validations";

interface Props { state: M18State; setState: (n: (p: M18State) => M18State) => void; onBack: () => void; onNext: () => void; }

function rungPlaceholder(k: string): string {
  if (k === "lt") return "Ex : le mini-cours « ton premier script en 5 étapes »";
  if (k === "mt") return "Ex : ton programme — version autonome";
  if (k === "ht") return "Ex : ton accompagnement premium 1-to-1";
  return "";
}

export function EchelleScreen({ state, setState, onBack, onNext }: Props) {
  const d = state.data;
  const locked = state.signed;

  const setNiveau = (lvl: LevelKey, field: string, v: string) => {
    if (locked) return;
    setState((prev) => {
      const niveaux: any = { ...prev.data.niveaux, [lvl]: { ...(prev.data.niveaux as any)[lvl], [field]: v } };
      if (niveaux[lvl].src === "herite") niveaux[lvl].src = "manual";
      return { ...prev, data: { ...prev.data, niveaux } };
    });
  };
  const setNiveauPrix = (lvl: LevelKey, v: string) => {
    if (locked) return;
    setState((prev) => {
      const niveaux: any = { ...prev.data.niveaux, [lvl]: { ...(prev.data.niveaux as any)[lvl], prix: toIntPrice(v) } };
      if (niveaux[lvl].src === "herite") niveaux[lvl].src = "manual";
      return { ...prev, data: { ...prev.data, niveaux } };
    });
  };

  const c = evaluateCoherence(state);
  const canNext = canEnterAscension(state);

  const renderRung = (lv: Level) => {
    const n: any = (d.niveaux as any)[lv.key] || {};
    const inherited = n.src === "herite";
    const filled = lv.paid ? toIntPrice(n.prix) > 0 && !!(n.nom || "").trim() : !!(n.nom || "").trim();
    return (
      <div key={lv.key} className="rounded-xl p-4" style={{ background: "#181818", border: "1px solid " + (filled ? "rgba(76,201,135,0.35)" : "#2a2a2a") }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold text-white">{lv.label}</span>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C", border: "0.5px solid rgba(201,168,76,0.3)" }}>{lv.roleLabel}</span>
        </div>
        <div className="mt-1 text-[12px] leading-[1.45] text-white/45">{lv.hint}{inherited && <span className="ml-1 text-[#C9A84C]">· hérité de l’amont</span>}</div>

        {lv.key === "gratuit" && (
          <>
            <FL>Tes canaux de contenu gratuit</FL>
            <TInput value={n.canaux || ""} disabled={locked} onChange={(e) => setNiveau("gratuit", "canaux", e.target.value)} placeholder="Ex : Instagram + YouTube + posts LinkedIn" />
            <FL>L’angle de ton contenu <Hint>le fil rouge qui démontre ton expertise</Hint></FL>
            <TInput value={n.nom || ""} disabled={locked} onChange={(e) => setNiveau("gratuit", "nom", e.target.value)} placeholder="Ex : décortiquer les erreurs de closing en 60 secondes" />
          </>
        )}
        {lv.key === "lead_magnet" && (
          <>
            <FL>Ton lead magnet <Hint>gratuit, contre un email</Hint></FL>
            <TInput value={n.nom || ""} disabled={locked} onChange={(e) => setNiveau("lead_magnet", "nom", e.target.value)} placeholder="Ex : la checklist des 7 erreurs qui tuent un appel de découverte" />
          </>
        )}
        {(lv.key === "lt" || lv.key === "mt" || lv.key === "ht") && (
          <>
            <div className="mt-3 grid grid-cols-[1fr_120px] gap-3">
              <div><FL>Nom de l’offre</FL><TInput value={n.nom || ""} disabled={locked} onChange={(e) => setNiveau(lv.key, "nom", e.target.value)} placeholder={rungPlaceholder(lv.key)} /></div>
              <div><FL>Prix (€)</FL><input type="number" min={0} step={1} value={toIntPrice(n.prix) || ""} disabled={locked} onChange={(e) => setNiveauPrix(lv.key, e.target.value)} placeholder="0" className="w-full rounded-[9px] px-3 py-2.5 text-[14.5px] outline-none focus:border-[#C9A84C]" style={{ background: "#0c0c0c", border: "1px solid #2a2a2a", color: "#f5f5f5" }} /></div>
            </div>
            {lv.key === "mt" && (
              <>
                <FL>Format <Hint>hérité de M14</Hint></FL>
                <TInput value={n.format || ""} disabled={locked} onChange={(e) => setNiveau("mt", "format", e.target.value)} placeholder="Ex : formation en ligne, programme de groupe…" />
              </>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <Card>
      <StepH2 marker="1 ·">Les 5 niveaux de ton échelle</StepH2>
      <Lead>De bas en haut : du contenu gratuit qui attire, jusqu’au High-Ticket qui dégage le plus de marge. Les niveaux déjà construits dans la formation sont pré-remplis — tu peux les ajuster. Les deux niveaux du haut (Middle et High-Ticket) sont le cœur payant : sans eux, pas d’écosystème.</Lead>

      <div className="space-y-3">{LEVELS.map((lv) => renderRung(lv))}</div>

      <div className="my-5 rounded-xl p-4" style={{ background: "#0c0c0c", border: "1px solid #2a2a2a" }}>
        <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">Cohérence de l’échelle</h4>
        {c.lines.length === 0 ? (
          <div className="flex items-start gap-2 text-[12.5px] text-white/55"><span>·</span><span>Renseigne au moins ton Middle-Ticket et ton High-Ticket pour voir la cohérence.</span></div>
        ) : (
          <div className="space-y-1.5">
            {c.lines.map((l, i) => (
              <div key={i} className="flex items-start gap-2 text-[12.5px] leading-[1.5]" style={{ color: l.st === "ok" ? "#b0e8c5" : l.st === "warn" ? "#e8c9a0" : "#e8a0a0" }}>
                <span className="shrink-0 font-bold">{l.st === "ok" ? "✓" : l.st === "warn" ? "!" : "✕"}</span><span>{l.txt}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Peda title="Pourquoi commencer par le High-Ticket">Tu as construit ton offre dans cet ordre pour une raison : si tu sais vendre en 1-to-1 à prix fort, tu peux décliner vers le bas. Le Middle-Ticket est une version autonome du High-Ticket — même méthode, moins d’accompagnement. Le Low-Ticket est un échantillon de cette méthode. L’échelle se lit de haut en bas pour la <strong>conception</strong>, et de bas en haut pour la <strong>vente</strong>.</Peda>

      <NavBar onBack={onBack} onNext={onNext} nextLabel="Définir les passages →" nextDisabled={!canNext} hint={canNext ? undefined : missingFieldsLabel(state, "ascension")} />
    </Card>
  );
}
