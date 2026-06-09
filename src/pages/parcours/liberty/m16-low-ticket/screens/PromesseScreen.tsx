import { useEffect } from "react";
import { Card, Eyebrow, HStep, Lead, Peda, FL, TInput, TArea, NavBtns } from "../components/parts";
import { type M16State } from "../lib/types";
import { ctx, canEnterPricing, suggestTitre } from "../lib/validations";

interface Props { state: M16State; setState: (n: (p: M16State) => M16State) => void; onBack: () => void; onNext: () => void; }

export function PromesseScreen({ state, setState, onBack, onNext }: Props) {
  const c = ctx(state);

  useEffect(() => {
    if (!state.data.titre) {
      setState((prev) => (prev.data.titre ? prev : { ...prev, data: { ...prev.data, titre: suggestTitre(prev) } }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: "titre" | "promesse_lt" | "promesse_lien_mt", v: string) => setState((prev) => ({ ...prev, data: { ...prev.data, [k]: v } }));

  return (
    <Card>
      <Eyebrow>Étape 3</Eyebrow>
      <HStep>La promesse</HStep>
      <Lead>Un produit Low-Ticket résout UN problème précis, vite. Pas dix. Et ce problème doit être la première marche vers ton offre principale.</Lead>
      <Peda><b className="text-[#C9A84C]">Garde-fou :</b> si ton produit résout tout, ton client n'aura plus besoin d'acheter la suite. Promets un résultat réel mais <i>partiel</i> — le premier pas, pas toute l'ascension.</Peda>

      <FL>Titre de ton produit</FL>
      <TInput value={state.data.titre} onChange={(e) => set("titre", e.target.value)} placeholder="Un titre orienté résultat" />

      <FL>La promesse en une phrase — quel résultat précis, en combien de temps ?</FL>
      <TArea value={state.data.promesse_lt} onChange={(e) => set("promesse_lt", e.target.value)} placeholder="Ex: obtenir tes 3 premiers rendez-vous client en 7 jours, sans publicité." />

      <FL>Le lien avec ton offre principale{c.programme_mt ? " (" + c.programme_mt + ")" : ""} — pourquoi ce produit donne envie d'aller plus loin ?</FL>
      <TArea value={state.data.promesse_lien_mt} onChange={(e) => set("promesse_lien_mt", e.target.value)} placeholder="Ex: ce premier résultat montre que la méthode marche ; la suite, c'est de la systématiser." />

      <NavBtns onBack={onBack} onNext={onNext} nextLabel="Fixer le prix →" nextDisabled={!canEnterPricing(state)} />
    </Card>
  );
}
