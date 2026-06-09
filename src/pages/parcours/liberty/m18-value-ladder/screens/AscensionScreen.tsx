import { Card, StepH2, Lead, Peda, AlertSoft, FL, Hint, TArea, NavBar } from "../components/parts";
import { EmailSeq } from "../components/EmailSeq";
import { type M18State, detectGenericTraps } from "../lib/types";
import { hasLT, canEnterLtv, missingFieldsLabel } from "../lib/validations";
import { isSensitiveNiche } from "../lib/emails";

interface Props { state: M18State; setState: (n: (p: M18State) => M18State) => void; onBack: () => void; onNext: () => void; toast: (m: string) => void; }

const HINT_LT_MT = "Une fois le LT acheté et un premier résultat obtenu : quelle séquence (emails, retargeting, offre de transition à durée limitée) ramène le client vers ton MT ?";
const HINT_MT_HT = "Le client a suivi ton MT en autonomie et touché ses limites (manque d’accountability, cas particulier non couvert). Comment lui proposes-tu l’accompagnement premium — bilan offert, invitation, fenêtre d’upgrade ?";

function TransitionCard({ from, to, hint, val, onChange, disabled }: { from: string; to: string; hint: string; val: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#181818", border: "1px solid #2a2a2a" }}>
      <div className="text-[14px] font-semibold text-white">{from} <span className="text-[#C9A84C]">→</span> {to}</div>
      <div className="mt-1 mb-2 text-[12px] leading-[1.45] text-white/45">{hint}</div>
      <TArea value={val || ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} placeholder="Décris le mécanisme concret…" />
    </div>
  );
}

export function AscensionScreen({ state, setState, onBack, onNext, toast }: Props) {
  const d = state.data;
  const locked = state.signed;
  const lt = hasLT(state);
  const canNext = canEnterLtv(state);
  const setTransition = (k: "lt_mt" | "mt_ht", v: string) => setState((prev) => ({ ...prev, data: { ...prev.data, transitions: { ...prev.data.transitions, [k]: v } } }));
  const setConnexion = (v: string) => setState((prev) => ({ ...prev, data: { ...prev.data, connexion_lt_mt: v } }));
  const traps = detectGenericTraps(d.connexion_lt_mt);

  return (
    <Card>
      <StepH2 marker="2 ·">Les passages d’une marche à la suivante</StepH2>
      <Lead>Une échelle n’a de valeur que si les clients la montent. Décris en deux mots le mécanisme de chaque passage — l’outil te rédige ensuite les séquences email complètes, adaptées à ta niche, prêtes à copier.</Lead>
      <Peda title="Chaque offre prépare la suivante">Quand un client a acheté ton Low-Ticket, il a goûté ta méthode et vu un résultat partiel. C’est le moment exact où l’offre du dessus devient évidente : « tu as vu ce que ça donne en surface — voilà le système complet ». Ton job ici, c’est de rendre ce passage automatique, pas de l’espérer.</Peda>

      <div className="space-y-3">
        {lt ? (
          <TransitionCard from="Low-Ticket" to="Middle-Ticket" hint={HINT_LT_MT} val={d.transitions.lt_mt} onChange={(v) => setTransition("lt_mt", v)} disabled={locked} />
        ) : (
          <AlertSoft>Tu n’as pas posé de Low-Ticket : ton offre d’entrée payante est ton Middle-Ticket. On passe directement au passage MT → HT.</AlertSoft>
        )}
        <TransitionCard from="Middle-Ticket" to="High-Ticket" hint={HINT_MT_HT} val={d.transitions.mt_ht} onChange={(v) => setTransition("mt_ht", v)} disabled={locked} />
      </div>

      {lt && (
        <>
          <FL>Le lien thématique Low-Ticket → Middle-Ticket <Hint>la marche doit être évidente, pas un saut de sujet</Hint></FL>
          <TArea value={d.connexion_lt_mt || ""} disabled={locked} onChange={(e) => setConnexion(e.target.value)} placeholder="Ex : mon LT enseigne le script d’un appel ; mon MT enseigne tout le système de prospection dont l’appel n’est qu’une étape. Le client comprend qu’il lui manque le reste." />
          {traps.length > 0 && <AlertSoft>Mots un peu creux repérés ({traps.join(", ")}). Décris le lien concret, pas une promesse générique.</AlertSoft>}
        </>
      )}

      <Peda title="Tes emails d’ascension sont déjà rédigés">À partir de ta niche, de ton avatar et de tes offres, l’outil a écrit les séquences email complètes de chaque passage. <strong>Tu peux tout modifier directement ici — objet et corps — c’est enregistré automatiquement.</strong> Copie ensuite chaque email dans ton outil d’emailing et remplace <strong>[prénom]</strong> et <strong>[lien]</strong> par tes champs. Si tu changes une offre ou une description, le bouton « Régénérer » repart du modèle (et efface tes retouches sur cette séquence).</Peda>

      {lt && <EmailSeq state={state} setState={setState} seqKey="lt_mt" title="Séquence — passage Low-Ticket → Middle-Ticket" toast={toast} />}
      <EmailSeq state={state} setState={setState} seqKey="mt_ht" title="Séquence — passage Middle-Ticket → High-Ticket" toast={toast} />
      {isSensitiveNiche(state) && (
        <AlertSoft tone="green">Niche sensible détectée (deuil, santé, accompagnement…) : les emails sont automatiquement <b>adoucis</b> — sans compte à rebours, sans rareté de pression, sans « dernier appel ». Un registre respectueux, adapté à ce que traversent tes contacts.</AlertSoft>
      )}

      <NavBar onBack={onBack} onNext={onNext} nextLabel="Calculer ma LTV →" nextDisabled={!canNext} hint={canNext ? undefined : missingFieldsLabel(state, "ltv")} />
    </Card>
  );
}
