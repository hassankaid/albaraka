import { useEffect } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { StepEyebrow, StepTitle, StepSub, Card, CardTitle, Btn, Actions, InputLabel, InputHelper, TextArea } from "../../m1-niche/components/ui";
import { type M12State } from "../lib/types";
import { suggestMethodeNames } from "../lib/generators";

interface Props { state: M12State; setState: (n: (p: M12State) => M12State) => void; onBack: () => void; onSkip: () => void; onNext: () => void; }
const inputCls = "w-full rounded-[8px] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30";
const inputStyle = { background: "#0C0B08", border: "1px solid rgba(201,168,76,0.18)" } as const;

export function MethodeScreen({ state, setState, onBack, onSkip, onNext }: Props) {
  const d = state.data;
  const f = d.final;
  const me = d.methode;

  // Pré-remplissage auto si le programme est déjà un acronyme.
  useEffect(() => {
    if (!me.nom && f.nom && f.technique === "acronyme") {
      setState((prev) => ({ ...prev, data: { ...prev.data, methode: { ...prev.data.methode, nom: f.nom, est_acronyme: true } } }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upstream = { niche: (state.m1_data && state.m1_data.niche) || "", headline_promesse: (state.m3_data && state.m3_data.headline_promesse) || (state.m5_data && state.m5_data.headline_promesse) || "", point_b: (state.m5_data && state.m5_data.ht_point_b) || "" };
  const sugs = suggestMethodeNames(f.nom, f.technique, upstream);
  const setMe = (patch: Partial<typeof me>) => setState((prev) => ({ ...prev, data: { ...prev.data, methode: { ...prev.data.methode, ...patch } } }));
  function applySug(sug: string) { setMe({ nom: sug, est_acronyme: /^[A-Z]{2,}$/.test(sug) ? true : me.est_acronyme }); toast.success("« " + sug + " » appliqué — affine-le ou garde-le tel quel."); }

  return (
    <div>
      <StepEyebrow>Étape 6 · Méthode <span className="text-white/40">◇ bonus</span></StepEyebrow>
      <StepTitle>Nommer ta méthode propriétaire</StepTitle>
      <StepSub>Tu peux passer cette étape — elle est optionnelle. Mais nommer ta méthode te crée un actif marketing : un cadre intellectuel qui t'appartient et que tes prospects peuvent retenir, citer, recommander.{f.technique === "acronyme" ? " Ton programme est déjà un acronyme — on te l'a pré-rempli ici." : ""}</StepSub>

      <Card className="mb-5">
        <CardTitle>Différence entre ton programme et ta méthode</CardTitle>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75">Ton <strong className="text-white">programme</strong>, c'est le produit qu'on achète (facture, garantie). Ta <strong className="text-white">méthode</strong>, c'est le cadre intellectuel qui le sous-tend : les 5 piliers, le framework en X axes. Elle peut porter un nom différent — ou le même.</p>
        <p className="text-[13px] leading-[1.6] text-[#C9A84C] italic">Un programme se vend. Une méthode se cite.</p>
      </Card>

      {f.nom && f.baseline && (
        <div className="mb-5 rounded-xl p-4 text-center" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
          <div className="text-[10px] uppercase tracking-[0.1em] text-white/40">Rappel — ton programme</div>
          <div className="mt-1 font-serif text-[18px] font-semibold text-[#C9A84C]">{f.nom}</div>
          <div className="mt-1 text-[12px] italic text-white/60">« {f.baseline} »</div>
        </div>
      )}

      <div className="mb-4"><InputLabel>Nom de ta méthode</InputLabel>
        <input type="text" value={me.nom} onChange={(e) => setMe({ nom: e.target.value })} placeholder="Ex. BARAKA, PIVOT, SCALE" className={inputCls} style={inputStyle} />
        <InputHelper>peut être identique au nom du programme, ou différent</InputHelper></div>
      {sugs.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-[11.5px] text-white/50">4 suggestions construites à partir de ton programme — clique pour démarrer, puis affine.</p>
          <div className="flex flex-wrap gap-1.5">{sugs.map((s, i) => <button key={i} type="button" onClick={() => applySug(s)} className="rounded-full px-2.5 py-1 text-[11.5px] font-medium text-[#C9A84C]" style={{ background: "rgba(201,168,76,0.08)", border: "0.5px solid rgba(201,168,76,0.3)" }}>{s}</button>)}</div>
        </div>
      )}
      <button type="button" onClick={() => setMe({ est_acronyme: !me.est_acronyme })} className="mb-4 flex items-center gap-2.5 text-left">
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px]" style={{ background: me.est_acronyme ? "#C9A84C" : "transparent", border: "1.5px solid #C9A84C" }}>{me.est_acronyme && <Check className="h-3 w-3" strokeWidth={3} style={{ color: "#080808" }} />}</span>
        <span className="text-[13px] text-white/80">Mon nom de méthode est un acronyme</span>
      </button>
      {me.est_acronyme && (
        <div className="mb-4"><InputLabel>Développement de l'acronyme</InputLabel>
          <TextArea value={me.acronyme_developpe} onChange={(e) => setMe({ acronyme_developpe: e.target.value })} rows={2} placeholder="Ex. Bilan, Alignement, Routine, Action, Khayr" />
          <InputHelper>une lettre = un pilier, lettres dans l'ordre du nom</InputHelper></div>
      )}
      <div className="mb-5"><InputLabel>Baseline de la méthode</InputLabel>
        <TextArea value={me.baseline} onChange={(e) => setMe({ baseline: e.target.value })} rows={2} placeholder="Ex. Le framework quotidien en 5 piliers pour reprendre le contrôle" />
        <InputHelper>une ligne qui décrit le cadre intellectuel</InputHelper></div>

      {me.nom && me.baseline && (
        <div className="mb-5 rounded-xl p-4 text-center" style={{ background: "rgba(201,168,76,0.06)", border: "0.5px solid rgba(201,168,76,0.3)" }}>
          <div className="text-[10px] uppercase tracking-[0.1em] text-[#C9A84C]">Aperçu de ta méthode propriétaire</div>
          <div className="mt-1 font-serif text-[18px] font-semibold text-[#C9A84C]">{me.nom}</div>
          <div className="mt-1 text-[12px] italic text-white/60">« {me.baseline} »</div>
          {me.est_acronyme && me.acronyme_developpe && <div className="mt-1.5 text-[11.5px] text-white/50">{me.acronyme_developpe}</div>}
        </div>
      )}

      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Positionnement</Btn>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={onSkip}>Passer cette étape →</Btn>
          <Btn variant="cta" onClick={onNext}>Renommer mes modules ◇ <ArrowRight className="h-4 w-4" /></Btn>
        </div>
      </Actions>
    </div>
  );
}
