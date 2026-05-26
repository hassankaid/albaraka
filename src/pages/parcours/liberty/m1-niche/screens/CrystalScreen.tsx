import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  StepEyebrow, StepTitle, StepSub, InputBlock, InputLabel, InputHelper,
  TextInput, TextArea, Btn, LoadingScreen, Actions,
} from "../components/ui";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { aiCrystallize } from "../lib/prompts";
import type { M1State, SousNiche2State } from "../lib/types";

interface CrystalScreenProps {
  state: M1State;
  setState: (next: (prev: M1State) => M1State) => void;
  onBack: () => void;
  onNext: () => void;
}

const KEYS_REQUIRED: (keyof SousNiche2State)[] = [
  "phrase",
  "cible",
  "douleur",
  "pouvoir_achat",
  "contact",
  "croissance",
  "methode",
];

export function CrystalScreen({ state, setState, onBack, onNext }: CrystalScreenProps) {
  const [loading, setLoading] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  // Lance la cristallisation si la phrase finale n'a pas encore été produite.
  useEffect(() => {
    if (!state.sous_niche_2.phrase && !loading) {
      void crystallize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function crystallize() {
    setLoading(true);
    try {
      const result = await aiCrystallize(state);
      setState((prev) => ({
        ...prev,
        sous_niche_2: {
          cible: result.cible_precise || prev.sous_niche_2.cible,
          douleur: result.douleur_concrete || prev.sous_niche_2.douleur,
          pouvoir_achat: result.pouvoir_achat_preuve || prev.sous_niche_2.pouvoir_achat,
          contact: result.contact_canaux || prev.sous_niche_2.contact,
          croissance: result.croissance_marche || prev.sous_niche_2.croissance,
          methode: result.methode_propre || prev.sous_niche_2.methode,
          phrase: result.phrase_finale || prev.sous_niche_2.phrase,
        },
      }));
    } catch (e: any) {
      console.error("[M1 crystal]", e);
      toast.error("Erreur de cristallisation. Tu peux éditer les champs manuellement.");
    } finally {
      setLoading(false);
    }
  }

  function set(key: keyof SousNiche2State, val: string) {
    setState((prev) => ({ ...prev, sous_niche_2: { ...prev.sous_niche_2, [key]: val } }));
  }

  function resetAndRegenerate() {
    setConfirmRegen(false);
    setState((prev) => ({
      ...prev,
      sous_niche_2: {
        cible: "", douleur: "", pouvoir_achat: "", contact: "",
        croissance: "", methode: "", phrase: "",
      },
    }));
    void crystallize();
  }

  if (loading) {
    return (
      <LoadingScreen message="Cristallisation de ta Sous-Niche 2.0…" hint="~5-15 secondes" />
    );
  }

  const sn = state.sous_niche_2;
  const allFilled = KEYS_REQUIRED.every((k) => (sn[k] ?? "").trim().length > 0);

  return (
    <div>
      <StepEyebrow>Étape de cristallisation</StepEyebrow>
      <StepTitle>Ta Sous-Niche 2.0</StepTitle>
      <StepSub>
        Voici la formulation cristallisée.{" "}
        <strong className="text-[#C9A84C]">Édite chaque champ jusqu'à ce qu'elle te ressemble
        vraiment.</strong> C'est ce qui va définir ton offre, ton marketing, tout.
      </StepSub>

      {/* Phrase finale — mise en avant */}
      <div
        className="mb-6 rounded-2xl p-5"
        style={{
          background: "rgba(201,168,76,0.04)",
          border: "1px solid #C9A84C",
        }}
      >
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
          📌 Phrase finale type cours
        </div>
        <TextInput
          value={sn.phrase}
          onChange={(e) => set("phrase", e.target.value)}
          placeholder="Ex : Cohérence cardiaque + EMDR pour avocates 35-50 ans en cabinet parisien"
          className="text-base font-semibold !text-white"
          style={{
            fontSize: 16,
            fontWeight: 600,
            background: "rgba(201,168,76,0.04)",
            borderColor: "#C9A84C",
          } as React.CSSProperties}
        />
        <InputHelper>
          Format : "[Méthode] pour [cible 2.0]" — 8 à 15 mots max.
        </InputHelper>
      </div>

      <InputBlock>
        <InputLabel>👤 Cible précise (15-25 mots)</InputLabel>
        <TextArea rows={2} value={sn.cible} onChange={(e) => set("cible", e.target.value)} />
        <InputHelper>Âge + sexe + situation pro + zone géo + spécificité 2.0</InputHelper>
      </InputBlock>

      <InputBlock>
        <InputLabel>⚡ Douleur concrète (15-25 mots)</InputLabel>
        <TextArea rows={2} value={sn.douleur} onChange={(e) => set("douleur", e.target.value)} />
        <InputHelper>Concrète, fréquente, émotionnelle — pas une généralité.</InputHelper>
      </InputBlock>

      <InputBlock>
        <InputLabel>💰 Preuve du pouvoir d'achat</InputLabel>
        <TextArea
          rows={2}
          value={sn.pouvoir_achat}
          onChange={(e) => set("pouvoir_achat", e.target.value)}
        />
        <InputHelper>
          Concurrents identifiés, marché documenté, chiffres réels — pas de l'intuition.
        </InputHelper>
      </InputBlock>

      <InputBlock>
        <InputLabel>📡 Facile à contacter</InputLabel>
        <TextArea rows={2} value={sn.contact} onChange={(e) => set("contact", e.target.value)} />
        <InputHelper>
          Où sont-ils ? Quels canaux (Instagram, TikTok, LinkedIn, ads, podcasts, groupes Facebook)
          te permettent de les atteindre directement ?
        </InputHelper>
      </InputBlock>

      <InputBlock>
        <InputLabel>📈 Croissance du marché</InputLabel>
        <TextArea
          rows={2}
          value={sn.croissance}
          onChange={(e) => set("croissance", e.target.value)}
        />
        <InputHelper>
          Le marché croît-il d'au moins 10%/an ? Chiffres, recherches Google, signaux de tendance.
          Pas d'intuition.
        </InputHelper>
      </InputBlock>

      <InputBlock>
        <InputLabel>💪 Méthode propriétaire (5-8 mots)</InputLabel>
        <TextInput value={sn.methode} onChange={(e) => set("methode", e.target.value)} />
        <InputHelper>
          Avec un nom (™ optionnel) · Ex : "Méthode Doublez50K™ en 18 mois"
        </InputHelper>
      </InputBlock>

      <Actions>
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Btn>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={() => setConfirmRegen(true)}>
            <RotateCcw className="h-3.5 w-3.5" />
            Regénérer
          </Btn>
          <Btn variant="primary" disabled={!allFilled} onClick={onNext}>
            Construire mon avatar
            <ArrowRight className="h-4 w-4" />
          </Btn>
        </div>
      </Actions>
      {!allFilled && (
        <p className="mt-2 text-right text-[11px] text-white/40">
          Les 7 champs sont requis pour passer à l'avatar.
        </p>
      )}

      <AlertDialog open={confirmRegen} onOpenChange={setConfirmRegen}>
        <AlertDialogContent
          style={{
            background: "#0F0E0A",
            border: "0.5px solid rgba(201,168,76,0.4)",
            color: "#ECEEF4",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Regénérer la cristallisation ?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tes éditions manuelles seront écrasées par la nouvelle proposition de l'IA.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={resetAndRegenerate}>Oui, regénérer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
