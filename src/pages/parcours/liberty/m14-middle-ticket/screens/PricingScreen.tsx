import { useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Btn, TextArea } from "../../m1-niche/components/ui";
import { type M14State, FORMATS, type FormatKey } from "../lib/types";
import { evaluatePricing, getPrixHT, formatPrix, detectGenericTraps, canEnterLock, missingFieldsLabel, type PricingAlert } from "../lib/validations";

interface Props { state: M14State; setState: (n: (p: M14State) => M14State) => void; onBack: () => void; onNext: () => void; }

export function PricingScreen({ state, setState, onBack, onNext }: Props) {
  const d = state.data;
  const locked = state.signed;
  const fmt = d.format_choisi || "";
  const fmtCfg = fmt ? FORMATS[fmt as FormatKey] : null;
  const prixHT = getPrixHT(state);
  const uniteForce = fmtCfg ? fmtCfg.type_paiement : "one_shot";
  const uniteActive = d.prix_mt_unite || uniteForce;
  const fourchette = fmtCfg ? fmtCfg.range : "";

  // Pré-remplit l'unité selon le format si non posée.
  useEffect(() => {
    if (locked) return;
    if (!d.prix_mt_unite) setState((prev) => ({ ...prev, data: { ...prev.data, prix_mt_unite: uniteForce } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const evp = evaluatePricing(d.prix_mt, prixHT, uniteActive, d.valeur_percue_eur);
  const justification = d.justification_prix || "";
  const traps = detectGenericTraps(justification);
  const canNext = canEnterLock(state);

  const setPrix = (v: string) => setState((prev) => ({ ...prev, data: { ...prev.data, prix_mt: parseInt(v, 10) || 0 } }));
  const setUnite = (v: string) => setState((prev) => ({ ...prev, data: { ...prev.data, prix_mt_unite: v } }));
  const setValeur = (v: string) => setState((prev) => ({ ...prev, data: { ...prev.data, valeur_percue_eur: parseInt(v, 10) || 0 } }));
  const setJustif = (v: string) => setState((prev) => ({ ...prev, data: { ...prev.data, justification_prix: v } }));

  // Alertes : evp + cohérence format/prix + format/unité.
  const alerts: PricingAlert[] = [...evp.alerts];
  if (fmtCfg && d.prix_mt > 0) {
    const prixCompare = d.prix_mt;
    if (uniteActive === fmtCfg.type_paiement) {
      if (prixCompare < fmtCfg.prix_min || prixCompare > fmtCfg.prix_max) {
        alerts.push({ kind: "orange", msg: "__COHERENCE__" + JSON.stringify({ label: fmtCfg.label, min: fmtCfg.prix_min, max: fmtCfg.prix_max, tp: fmtCfg.type_paiement, prixCompare, unite: uniteActive }) });
      }
    } else {
      alerts.push({ kind: "red", msg: "__INCOHERENCE__" + JSON.stringify({ label: fmtCfg.label, tp: fmtCfg.type_paiement, unite: uniteActive }) });
    }
  }

  const renderAlert = (a: PricingAlert, i: number) => {
    const red = a.kind === "red";
    let body: React.ReactNode = a.msg;
    let prefix = red ? "⚠ Alerte rouge :" : "◆ Vigilance :";
    if (a.msg.startsWith("__COHERENCE__")) {
      const o = JSON.parse(a.msg.slice("__COHERENCE__".length));
      prefix = "◆ Cohérence format/prix :";
      body = <>{o.label} se vend typiquement entre {o.min} € et {o.max} € {o.tp === "mensuel" ? "/ mois" : ""}. Ton prix de {o.prixCompare} € {o.unite === "mensuel" ? "/ mois" : ""} sort de cette fourchette — c'est possible si tu as une bonne raison (positionnement haut, niche premium, valeur exceptionnelle), mais explicite-la dans la justification.</>;
    } else if (a.msg.startsWith("__INCOHERENCE__")) {
      const o = JSON.parse(a.msg.slice("__INCOHERENCE__".length));
      prefix = "⚠ Incohérence format/unité :";
      body = <>Tu as choisi le format {o.label} qui se vend habituellement en {o.tp === "mensuel" ? "mensuel" : "paiement unique"}, mais ton unité est en {o.unite === "mensuel" ? "mensuel" : "paiement unique"}. Soit tu changes l'unité, soit tu changes de format.</>;
    }
    return (
      <div key={i} className="mb-2 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: red ? "rgba(201,76,76,0.08)" : "rgba(201,138,76,0.06)", border: "0.5px solid " + (red ? "rgba(201,76,76,0.4)" : "rgba(201,138,76,0.3)"), color: red ? "#e8a0a0" : "#e8c9a0" }}>
        <b>{prefix}</b> {body}
      </div>
    );
  };

  const sumColor = (cls: string) => (cls === "ok" ? "#4cc987" : cls === "warn" ? "#c98a4c" : cls === "bad" ? "#c94c4c" : "#fff");
  const Row = ({ label, value, cls, big }: { label: string; value: React.ReactNode; cls?: string; big?: boolean }) => (
    <div className="flex items-center justify-between border-b py-2 last:border-0" style={{ borderColor: "rgba(201,168,76,0.1)" }}>
      <span className="text-[12px] text-white/55">{label}</span>
      <span className={"font-semibold " + (big ? "text-[16px]" : "text-[13px]")} style={{ color: cls ? sumColor(cls) : "#fff" }}>{value}</span>
    </div>
  );

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-serif text-[20px] font-semibold italic text-[#C9A84C]">03</span>
        <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-white">Fixer ton prix MT</h2>
      </div>
      <p className="mb-5 text-[13px] leading-[1.65] text-white/60">
        Tu vas poser ton prix MT en respectant 3 garde-fous : ratio HT/MT entre 1/10 et 1/3, plancher 197 €, valeur perçue ≥ 5× le prix annualisé. <em className="text-white/45">Format choisi : <b className="text-white/70">{fmtCfg ? fmtCfg.label : "—"}</b>. Après cette étape, tu génères ton mémo PDF.</em>
      </p>

      <div className="mb-5 rounded-xl p-4" style={{ background: "rgba(201,168,76,0.04)", border: "0.5px solid rgba(201,168,76,0.18)" }}>
        <h4 className="mb-2 text-[13px] font-semibold text-[#C9A84C]">Les 3 garde-fous du prix Middle-Ticket</h4>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75"><strong className="text-white">Garde-fou 1 — Le plancher absolu de 197 €.</strong> Sous ce seuil, la valeur perçue chute violemment. Tu attires des clients qui ne s'investissent pas, qui consomment passivement, qui ne finissent jamais le programme. Et tu nuques ton propre positionnement : les prospects perçoivent un produit cheap.</p>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75"><strong className="text-white">Garde-fou 2 — Le ratio MT/HT entre 1/10 et 1/3.</strong> Si ton MT dépasse 1/3 du HT (ex : MT à 800 € pour un HT à 2 000 €), le prospect ne voit plus la différence et choisit le moins cher. Si ton MT descend sous 1/10 du HT (ex : MT à 80 € pour un HT à 3 000 €), tu te positionnes en low-ticket et tu donnes 80% du contenu pour 3% du prix — c'est un suicide commercial. La zone saine : MT entre 1/10 et 1/3 du HT, idéalement autour de 1/5.</p>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75"><strong className="text-white">Garde-fou 3 — La valeur perçue ≥ 5× le prix annualisé.</strong> Si tu vends 397 €, ton client doit gagner / économiser / valoriser au moins 2 000 € sur 12 mois grâce à ton MT. Sinon ton prix est sur-évalué par rapport à la transformation. Sois conservateur dans ce chiffre — un prospect bullshit-detector le ressentira si tu gonfles.</p>
        <p className="text-[13px] leading-[1.6] italic text-[#C9A84C]">Ton prix MT n'est pas un prix arbitraire : c'est le résultat de l'intersection entre le format, la valeur livrée, et la cohérence avec ton HT.</p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl p-4" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
          <h3 className="mb-1 text-[14px] font-semibold text-white">Ton prix MT</h3>
          <p className="mb-3 text-[11.5px] leading-[1.45] text-white/50">{fmtCfg ? "Fourchette indicative pour ce format : " + fourchette + ". " : ""}Plancher absolu MT : 197 €.</p>
          <label className="mb-1 block text-[12px] text-white/75">Prix en € <span className="text-white/40">(entier, sans décimales)</span></label>
          <input type="number" min={0} step={1} value={d.prix_mt || ""} disabled={locked} onChange={(e) => setPrix(e.target.value)} placeholder="ex : 397" className="mb-3 w-full rounded-[10px] px-3.5 py-2.5 text-sm text-white outline-none" style={{ background: "#0c0c0c", border: "1px solid rgba(201,168,76,0.18)" }} />
          <label className="mb-1 block text-[12px] text-white/75">Unité de paiement</label>
          <select value={uniteActive} disabled={locked} onChange={(e) => setUnite(e.target.value)} className="w-full rounded-[10px] px-3.5 py-2.5 text-sm text-white outline-none" style={{ background: "#0c0c0c", border: "1px solid rgba(201,168,76,0.18)" }}>
            <option value="one_shot">Paiement unique (one-shot)</option>
            <option value="mensuel">Mensuel (abonnement membership)</option>
          </select>
        </div>
        <div className="rounded-xl p-4" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
          <h3 className="mb-1 text-[14px] font-semibold text-white">Valeur perçue annuelle</h3>
          <p className="mb-3 text-[11.5px] leading-[1.45] text-white/50">Combien ton client va-t-il gagner / économiser / valoriser sur 12 mois grâce à ton MT ? Sois honnête et conservateur — cette valeur doit être ≥ 5× ton prix annualisé.</p>
          <label className="mb-1 block text-[12px] text-white/75">Valeur perçue en € sur 12 mois</label>
          <input type="number" min={0} step={1} value={d.valeur_percue_eur || ""} disabled={locked} onChange={(e) => setValeur(e.target.value)} placeholder="ex : 5000" className="w-full rounded-[10px] px-3.5 py-2.5 text-sm text-white outline-none" style={{ background: "#0c0c0c", border: "1px solid rgba(201,168,76,0.18)" }} />
        </div>
      </div>

      <div className="mb-4 rounded-xl px-4 py-2" style={{ background: "#0F0E0A", border: "0.5px solid rgba(201,168,76,0.14)" }}>
        <Row label="Ton prix MT" value={formatPrix(d.prix_mt, uniteActive)} big />
        <Row label={uniteActive === "mensuel" ? "Prix annualisé (×12)" : "Prix annualisé"} value={formatPrix(evp.prix_mt_effectif, "one_shot")} />
        <Row label="Prix HT de référence (depuis M6)" value={prixHT > 0 ? prixHT.toLocaleString("fr-FR") + " €" : "—"} />
        {prixHT > 0 && (
          <>
            <Row label="Ratio MT / HT" cls={evp.in_range ? "ok" : evp.ratio > 0.33 ? "bad" : "warn"} value={<>{evp.ratio_pct}% <span className="text-[11px] font-normal text-white/40">(cible : 10% à 33%)</span></>} />
            <Row label="Facteur d'écart HT vs MT" cls={evp.ecart_ok ? "ok" : "bad"} value={<>{evp.prix_mt_effectif > 0 ? (prixHT / evp.prix_mt_effectif).toFixed(2) + "x" : "—"} <span className="text-[11px] font-normal text-white/40">(minimum : 3x)</span></>} />
          </>
        )}
        {d.valeur_percue_eur > 0 && (
          <Row label="Valeur perçue / prix annualisé" cls={evp.valeur_ok ? "ok" : "warn"} value={<>{evp.prix_mt_effectif > 0 ? (d.valeur_percue_eur / evp.prix_mt_effectif).toFixed(1) + "x" : "—"} <span className="text-[11px] font-normal text-white/40">(minimum : 5x)</span></>} />
        )}
      </div>

      {alerts.map((a, i) => renderAlert(a, i))}
      {evp.notes.map((n, i) => (
        <div key={"n" + i} className="mb-2 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5] text-white/70" style={{ background: "rgba(201,138,76,0.06)", border: "0.5px solid rgba(201,138,76,0.3)" }}>{n}</div>
      ))}

      <div className="mt-2 mb-1">
        <label className="text-[13px] font-medium text-white/85">Justifie ton prix MT par rapport à la valeur livrée <span className="text-white/40">(min 15 car — ROI chiffré, pas du général)</span></label>
      </div>
      <TextArea value={justification} onChange={(e) => setJustif(e.target.value)} rows={3} disabled={locked}
        placeholder="Ex : « Une seule séance newborn signée à 600 € rentabilise déjà 1.5× le programme. La valeur sur 12 mois d'activité spécialisée dépasse largement les 397 €. »" />

      {traps.length > 0 && (
        <div className="mt-3 rounded-xl px-4 py-2.5 text-[12px] leading-[1.5]" style={{ background: "rgba(232,107,107,0.08)", border: "0.5px solid rgba(232,107,107,0.4)", color: "#e8a0a0" }}>
          <b>Attention aux mots-pièges génériques :</b> {traps.map((t) => "« " + t + " »").join(", ")} — décris plutôt le ROI chiffré et concret que ton client va obtenir pour justifier ce prix.
        </div>
      )}
      {!canNext && (
        <div className="mt-3 rounded-xl px-4 py-2.5 text-[12px] leading-[1.5] text-white/70" style={{ background: "rgba(201,138,76,0.06)", border: "0.5px solid rgba(201,138,76,0.3)" }}>
          <b className="text-white/90">Pour avancer, il te manque :</b> {missingFieldsLabel("lock", state)}.
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> Dégraissage</Btn>
        <Btn variant="primary" disabled={!canNext} onClick={() => canNext && onNext()}>Passer à la signature <ArrowRight className="h-4 w-4" /></Btn>
      </div>
    </div>
  );
}
