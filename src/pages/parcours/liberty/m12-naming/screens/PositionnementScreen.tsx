import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { StepEyebrow, StepTitle, StepSub, Card, CardTitle, Btn, Actions, InputLabel, InputHelper, TextArea } from "../../m1-niche/components/ui";
import { type M12State } from "../lib/types";
import { detectGenericTraps, compileCategorieNouvelle, missingForPositionnement } from "../lib/validations";

interface Props { state: M12State; setState: (n: (p: M12State) => M12State) => void; onBack: () => void; onSkipBonus: () => void; onNext: () => void; }
const inputCls = "w-full rounded-[8px] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30";
const inputStyle = { background: "#0C0B08", border: "1px solid rgba(201,168,76,0.18)" } as const;

export function PositionnementScreen({ state, setState, onBack, onSkipBonus, onNext }: Props) {
  const d = state.data;
  const p = d.positionnement;
  const f = d.final;
  const exempleCible = state.m1_data && state.m1_data.niche ? "pour " + state.m1_data.niche.toLowerCase().substring(0, 80) : "pour [ta cible précise — qui ils sont, ce qu'ils veulent]";
  const trapsCat = detectGenericTraps(((p.cat_type || "") + " " + (p.cat_cible || "") + " " + (p.cat_resultat || "")).trim());
  const trapsEnnemi = detectGenericTraps(p.ennemi_declare || "");
  const compiled = compileCategorieNouvelle(p);
  const setP = (patch: Partial<typeof p>) => setState((prev) => ({ ...prev, data: { ...prev.data, positionnement: { ...prev.data.positionnement, ...patch } } }));

  function guard(action: () => void) {
    const miss = missingForPositionnement(d);
    if (miss.length > 0) { toast.error("Renseigne " + miss.join(", ") + " avant de continuer."); return; }
    action();
  }

  return (
    <div>
      <StepEyebrow>Étape 5 / 5 · Positionnement</StepEyebrow>
      <StepTitle>Poser ton positionnement — catégorie nouvelle et combat</StepTitle>
      <StepSub>Le nom dit qui tu es. Le positionnement dit où tu joues et contre qui. Si tu crées ta catégorie et nommes ton ennemi, tu deviens incomparable. <em>Conceptuellement la partie la plus difficile du module.</em></StepSub>

      <Card className="mb-4">
        <CardTitle>Pourquoi créer une catégorie nouvelle</CardTitle>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75">Quand un prospect compare 5 « coachs business », il choisit le moins cher. Quand il tombe sur « le seul accompagnement pensé pour les mamans qui veulent rester à la maison », il n'a plus 5 concurrents — il en a 1. Tu deviens la <strong className="text-white">catégorie</strong>.</p>
        <p className="text-[13px] leading-[1.6] text-[#C9A84C] italic">« Le seul / l'accompagnement [type] pour [cible précise] qui veulent [résultat spécifique] »</p>
      </Card>
      <Card className="mb-5">
        <CardTitle>Pourquoi déclarer un ennemi</CardTitle>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75">Tes prospects te suivent parce qu'ils détestent ce que tu détestes. L'ennemi n'est pas une personne : c'est une <strong className="text-white">pratique</strong>, un <strong className="text-white">discours</strong>, un <strong className="text-white">format</strong>, un <strong className="text-white">type d'acteur</strong> que ta cible reconnaît et que tu prends de front.</p>
        <p className="text-[13px] leading-[1.6] text-[#C9A84C] italic">Sans ennemi, ton offre est juste une offre. Avec un ennemi, ton offre devient un mouvement.</p>
      </Card>

      {f.nom && f.baseline && (
        <div className="mb-5 rounded-xl p-4 text-center" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
          <div className="text-[10px] uppercase tracking-[0.1em] text-white/40">Rappel — ton nom et ta baseline</div>
          <div className="mt-1 font-serif text-[20px] font-semibold text-[#C9A84C]">{f.nom}</div>
          <div className="mt-1 text-[12.5px] italic text-white/60">« {f.baseline} »</div>
        </div>
      )}

      <div className="mb-2 font-serif text-[16px] font-semibold text-[#C9A84C]">Ta catégorie nouvelle, en 3 champs guidés</div>
      <p className="mb-3 text-[12.5px] text-white/50">L'aperçu compilé apparaît en bas.</p>
      <div className="mb-4"><InputLabel>1 · Type d'accompagnement</InputLabel>
        <input type="text" value={p.cat_type} onChange={(e) => setP({ cat_type: e.target.value })} placeholder="Ex. accompagnement business · programme de closing · méthode cuisine famille" className={inputCls} style={inputStyle} />
        <InputHelper>accompagnement, programme, méthode, atelier, consulting — pas « formation »</InputHelper></div>
      <div className="mb-4"><InputLabel>2 · Cible précise</InputLabel>
        <input type="text" value={p.cat_cible} onChange={(e) => setP({ cat_cible: e.target.value })} placeholder={exempleCible} className={inputCls} style={inputStyle} />
        <InputHelper>commence par « pour » — qui sont-ils, dans quelle situation</InputHelper></div>
      <div className="mb-4"><InputLabel>3 · Résultat spécifique ou différenciateur</InputLabel>
        <input type="text" value={p.cat_resultat} onChange={(e) => setP({ cat_resultat: e.target.value })} placeholder="Ex. et lancer une activité depuis leur salon sans structure complexe" className={inputCls} style={inputStyle} />
        <InputHelper>commence par « et » ou « qui » — la transformation chiffrée, datée, ou le marqueur d'unicité</InputHelper></div>

      {trapsCat.length > 0 && <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(232,107,107,0.08)", border: "0.5px solid rgba(232,107,107,0.4)", color: "#e8a0a0" }}><strong>Mots-pièges détectés :</strong> {trapsCat.join(", ")}. Force-toi à être chirurgical : qui exactement, quel résultat, quel chiffre, quel délai.</div>}
      {compiled && <div className="mb-5 rounded-xl p-4" style={{ background: "rgba(201,168,76,0.06)", border: "0.5px solid rgba(201,168,76,0.3)" }}><div className="text-[10px] uppercase tracking-[0.1em] text-[#C9A84C]">Aperçu compilé de ta catégorie</div><div className="mt-1 text-[16px] leading-[1.4] text-white/90">{compiled}</div></div>}

      <div className="mb-2 font-serif text-[16px] font-semibold text-[#C9A84C]">Le combat / ennemi que tu prends</div>
      <div className="mb-4"><InputLabel>Une pratique, un discours, un format ou un type d'acteur précis</InputLabel>
        <TextArea value={p.ennemi_declare} onChange={(e) => setP({ ennemi_declare: e.target.value })} rows={2} placeholder="Ex. Les gourous masculins qui te disent de tout déléguer et de viser 100k/mois, ignorant ta réalité de mère" /></div>
      {trapsEnnemi.length > 0 && <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(232,107,107,0.08)", border: "0.5px solid rgba(232,107,107,0.4)", color: "#e8a0a0" }}><strong>Mots-pièges dans ton combat :</strong> {trapsEnnemi.join(", ")}. Nomme la pratique, le tarif, le type d'acteur — quelque chose que ta cible visualise immédiatement.</div>}
      {compiled && p.ennemi_declare.trim() && (
        <div className="mb-5 rounded-xl p-4" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
          <div className="text-[10px] uppercase tracking-[0.1em] text-[#C9A84C]">Aperçu de ton positionnement complet</div>
          <div className="mt-1 text-[13.5px] leading-[1.5] text-white/85">{compiled}</div>
          <div className="mt-2 text-[13.5px] italic leading-[1.5] text-white/70">Contre : {p.ennemi_declare}</div>
        </div>
      )}

      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Choix</Btn>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={() => guard(onSkipBonus)}>Sauter les bonus →</Btn>
          <Btn variant="cta" onClick={() => guard(onNext)}>Nommer ma méthode ◇ <ArrowRight className="h-4 w-4" /></Btn>
        </div>
      </Actions>
    </div>
  );
}
