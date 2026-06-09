import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { StepEyebrow, StepTitle, StepSub, Card, CardTitle, Btn, Actions } from "../../m1-niche/components/ui";
import { type M12State, type ModuleRenomme } from "../lib/types";
import { suggestModuleNames } from "../lib/generators";

interface Props { state: M12State; setState: (n: (p: M12State) => M12State) => void; onBack: () => void; onNext: () => void; }
const inputCls = "w-full rounded-[8px] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30";
const inputStyle = { background: "#0C0B08", border: "1px solid rgba(201,168,76,0.18)" } as const;

export function RenommerModulesScreen({ state, setState, onBack, onNext }: Props) {
  const d = state.data;
  const f = d.final;
  const me = d.methode;
  const modules: any[] = (state.m11_data && Array.isArray(state.m11_data.modules)) ? state.m11_data.modules : [];
  const getRen = (idx: number): ModuleRenomme | undefined => (d.modules_renommes || []).find((r) => r.index === idx);

  function persist(idx: number, modOriginal: any, patch: Partial<ModuleRenomme>) {
    setState((prev) => {
      let list = [...(prev.data.modules_renommes || [])];
      let existing = list.find((r) => r.index === idx);
      if (!existing) { existing = { index: idx, nom_origine: (modOriginal && modOriginal.nom) || "", nom_final: "", baseline: "" }; list.push(existing); }
      existing = { ...existing, ...patch };
      list = list.map((r) => (r.index === idx ? existing! : r));
      if (!existing.nom_final.trim() && !existing.baseline.trim()) list = list.filter((r) => r.index !== idx);
      return { ...prev, data: { ...prev.data, modules_renommes: list } };
    });
  }

  return (
    <div>
      <StepEyebrow>Étape 7 · Modules <span className="text-white/40">◇ bonus</span></StepEyebrow>
      <StepTitle>Renommer les modules de ton programme</StepTitle>
      <StepSub>Encore une étape optionnelle. Renommer chaque module transforme ta page de vente : chaque ligne du sommaire devient du marketing en soi. <em>Chaque module a 4 suggestions cliquables pour démarrer.</em></StepSub>

      <Card className="mb-5">
        <CardTitle>Pourquoi renommer tes modules change tout</CardTitle>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75">Un nom générique comme « Cartographier ses vraies forces » dit ce qu'on fait, mais ne <strong className="text-white">vend</strong> pas. « Le Mapping Identité Pro » dit la même chose, mais devient désirable, propriétaire, citable.</p>
        <p className="text-[13px] leading-[1.6] text-white/60">Sur une page de vente, ton sommaire est lu par 80% des visiteurs. Transforme chaque ligne en mini-promesse.</p>
      </Card>

      {f.nom && f.baseline && (
        <div className="mb-5 rounded-xl p-4 text-center" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
          <div className="text-[10px] uppercase tracking-[0.1em] text-white/40">Rappel — ton programme</div>
          <div className="mt-1 font-serif text-[18px] font-semibold text-[#C9A84C]">{f.nom}</div>
          {me.nom && <div className="mt-1 text-[12px] text-white/50">Méthode propriétaire : {me.nom}</div>}
        </div>
      )}

      {modules.length === 0 ? (
        <div className="mb-5 rounded-xl px-4 py-3.5 text-[13px] leading-[1.6] text-white/65" style={{ background: "rgba(255,180,80,0.06)", border: "0.5px solid rgba(255,180,80,0.3)" }}>
          <strong className="text-[#FFB450]">Pas de modules détectés depuis M11.</strong> Cette étape sert à renommer les modules d'un programme conçu dans le module précédent (M11). Si tu n'as pas encore signé M11, tu peux ignorer cette étape sans pénalité — ton nom de programme et ton positionnement suffisent pour signer M12.
        </div>
      ) : (
        <div className="mb-5 space-y-3">
          {modules.map((mod) => {
            const r = getRen(mod.index);
            const sugs = suggestModuleNames(mod);
            return (
              <div key={mod.index} className="rounded-xl p-3.5" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#C9A84C]">Module {mod.index}</div>
                <div className="mt-0.5 text-[12px] text-white/55">Origine : {mod.nom || "—"}</div>
                {mod.objectif_mesurable && <div className="mt-0.5 text-[11px] text-white/40">Objectif : {mod.objectif_mesurable}</div>}
                <div className="mt-2.5"><div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/45">Nouveau nom du module</div>
                  <input type="text" value={(r && r.nom_final) || ""} onChange={(e) => persist(mod.index, mod, { nom_final: e.target.value })} placeholder="Ex. Le Mapping Identité Pro" className={inputCls} style={inputStyle} /></div>
                {sugs.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{sugs.map((s, si) => <button key={si} type="button" onClick={() => { persist(mod.index, mod, { nom_final: s }); toast.success("« " + s + " » appliqué — affine-le ou garde-le tel quel."); }} className="rounded-full px-2.5 py-1 text-[11px] font-medium text-[#C9A84C]" style={{ background: "rgba(201,168,76,0.08)", border: "0.5px solid rgba(201,168,76,0.3)" }}>{s}</button>)}</div>}
                <div className="mt-2.5"><div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/45">Baseline du module (une ligne)</div>
                  <input type="text" value={(r && r.baseline) || ""} onChange={(e) => persist(mod.index, mod, { baseline: e.target.value })} placeholder="Ex. Découvrir tes vraies forces sans test générique" className={inputCls} style={inputStyle} /></div>
              </div>
            );
          })}
        </div>
      )}

      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Méthode</Btn>
        <Btn variant="cta" onClick={onNext}>Aller à la signature <ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
