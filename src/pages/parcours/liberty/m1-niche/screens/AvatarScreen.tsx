import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, Image as ImageIcon, Search } from "lucide-react";
import { toast } from "sonner";
import {
  StepEyebrow, StepTitle, StepSub, InputLabel, InputHelper,
  TextInput, TextArea, Btn, LoadingScreen, Actions, Card,
} from "../components/ui";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { aiSuggestAvatar } from "../lib/prompts";
import type { M1State, AvatarSocioState, AvatarPsychoState } from "../lib/types";

interface AvatarScreenProps {
  state: M1State;
  setState: (next: (prev: M1State) => M1State) => void;
  onBack: () => void;
  onNext: () => void;
}

const SOCIO_FIELDS: {
  key: keyof AvatarSocioState; label: string; placeholder: string;
}[] = [
  { key: "sexe", label: "Sexe", placeholder: "F / H" },
  { key: "nom", label: "Prénom", placeholder: "Sophie M." },
  { key: "age", label: "Âge", placeholder: "38 ans" },
  { key: "lieu", label: "Lieu", placeholder: "Paris 15e" },
  { key: "revenu", label: "Revenu", placeholder: "4 200€/mois" },
  { key: "compagnon", label: "Couple", placeholder: "Mariée, 8 ans" },
  { key: "relations", label: "Relations", placeholder: "Proche sœur" },
  { key: "situation", label: "Famille", placeholder: "2 enfants 5/7 ans" },
];

const PSYCHO_FIELDS: { key: keyof AvatarPsychoState; label: string }[] = [
  { key: "probleme", label: "Quel est son problème principal ?" },
  { key: "objectifs", label: "Quels sont ses objectifs ?" },
  { key: "consequences", label: "Conséquences si problème non résolu ?" },
  { key: "passe", label: "Qu'a-t-elle/il essayé sans succès ?" },
  { key: "sentiment", label: "Comment se sent-elle/il aujourd'hui ?" },
  { key: "paradis", label: "Sa situation de rêve si problème résolu ?" },
  { key: "phrase_avatar", label: "Avatar en 1 phrase précise" },
];

export function AvatarScreen({ state, setState, onBack, onNext }: AvatarScreenProps) {
  const [loading, setLoading] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  const isEmpty = !state.avatar.socio.nom && !state.avatar.psycho.probleme;

  useEffect(() => {
    if (isEmpty && !loading) {
      void generateAvatar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateAvatar() {
    setLoading(true);
    try {
      const result = await aiSuggestAvatar(state);
      setState((prev) => ({
        ...prev,
        avatar: {
          ...prev.avatar,
          socio: { ...prev.avatar.socio, ...result.socio },
          psycho: { ...prev.avatar.psycho, ...result.psycho },
        },
      }));
    } catch (e: any) {
      console.error("[M1 avatar]", e);
      toast.error("Erreur de génération de l'avatar. Tu peux remplir manuellement.");
    } finally {
      setLoading(false);
    }
  }

  function setSocio(key: keyof AvatarSocioState, val: string) {
    setState((prev) => ({
      ...prev,
      avatar: { ...prev.avatar, socio: { ...prev.avatar.socio, [key]: val } },
    }));
  }
  function setPsycho(key: keyof AvatarPsychoState, val: string) {
    setState((prev) => ({
      ...prev,
      avatar: { ...prev.avatar, psycho: { ...prev.avatar.psycho, [key]: val } },
    }));
  }

  function searchPhoto() {
    if (!state.avatar.socio.nom) {
      toast.error("Renseigne d'abord le prénom de ton avatar");
      return;
    }
    const q = encodeURIComponent(
      `${state.avatar.socio.nom} ${state.avatar.socio.age} portrait`,
    );
    window.open(`https://www.google.com/search?tbm=isch&q=${q}`, "_blank");
  }

  function askPhotoUrl() {
    const url = prompt(
      "Colle l'URL de l'image (clic-droit → Copier l'adresse de l'image) :",
      state.avatar.photo_url,
    );
    if (url === null) return;
    setState((prev) => ({ ...prev, avatar: { ...prev.avatar, photo_url: url } }));
  }

  function resetAndRegenerate() {
    setConfirmRegen(false);
    setState((prev) => ({
      ...prev,
      avatar: {
        photo_url: prev.avatar.photo_url,
        socio: {
          sexe: "", nom: "", age: "", lieu: "",
          revenu: "", compagnon: "", relations: "", situation: "",
        },
        psycho: {
          probleme: "", objectifs: "", consequences: "",
          passe: "", sentiment: "", paradis: "", phrase_avatar: "",
        },
      },
    }));
    void generateAvatar();
  }

  if (loading) {
    return <LoadingScreen message="L'IA incarne ton avatar…" hint="~5-15 secondes" />;
  }

  const a = state.avatar;
  const socioFilled = SOCIO_FIELDS.every((f) => (a.socio[f.key] ?? "").length >= 2);
  const psychoFilled =
    PSYCHO_FIELDS.filter((f) => (a.psycho[f.key] ?? "").length >= 5).length >= 5;
  const canNext = socioFilled && psychoFilled;

  return (
    <div>
      <StepEyebrow>Avatar client</StepEyebrow>
      <StepTitle>Incarne ton client idéal</StepTitle>
      <StepSub>
        Pas une moyenne statistique — un personnage{" "}
        <strong className="text-[#C9A84C]">incarné</strong> avec prénom, situation, douleurs, rêves.{" "}
        <strong className="text-[#C9A84C]">Imprime cette page</strong> et visualise-le chaque jour.
      </StepSub>

      <Card className="mb-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          {/* Photo */}
          <div className="flex shrink-0 flex-col items-center gap-2">
            <button
              type="button"
              onClick={searchPhoto}
              className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl text-4xl transition-all hover:opacity-80"
              style={{
                background: "#0F0E0A",
                border: "1px solid rgba(201,168,76,0.4)",
              }}
              title="Cliquer pour chercher une image"
            >
              {a.photo_url ? (
                <img src={a.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8 text-[#C9A84C]/50" />
              )}
            </button>
            <button
              type="button"
              onClick={searchPhoto}
              className="inline-flex items-center gap-1.5 text-[11px] text-[#C9A84C] underline-offset-2 hover:underline"
            >
              <Search className="h-3 w-3" />
              Chercher sur Google
            </button>
            <button
              type="button"
              onClick={askPhotoUrl}
              className="text-[11px] text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
            >
              Coller une URL
            </button>
          </div>

          {/* Socio fields */}
          <div className="flex-1">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">
              Profil socio-démographique
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SOCIO_FIELDS.map((f) => (
                <div key={f.key}>
                  <InputLabel>{f.label}</InputLabel>
                  <TextInput
                    value={a.socio[f.key]}
                    onChange={(e) => setSocio(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">
        Profil psychographique · 7 questions (min. 5 remplies)
      </h3>
      <div className="space-y-3">
        {PSYCHO_FIELDS.map((f) => (
          <div key={f.key}>
            <InputLabel>{f.label}</InputLabel>
            <TextArea
              rows={2}
              value={a.psycho[f.key]}
              onChange={(e) => setPsycho(f.key, e.target.value)}
            />
          </div>
        ))}
      </div>

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
          <Btn variant="primary" disabled={!canNext} onClick={onNext}>
            Validation finale
            <ArrowRight className="h-4 w-4" />
          </Btn>
        </div>
      </Actions>
      <p className="mt-2 text-right text-[11px] text-white/40">
        {socioFilled ? "✓ Socio" : "8 champs socio à remplir"} ·{" "}
        {psychoFilled ? "✓ Psycho" : "Min. 5 questions psycho"}
      </p>

      <AlertDialog open={confirmRegen} onOpenChange={setConfirmRegen}>
        <AlertDialogContent
          style={{
            background: "#0F0E0A",
            border: "0.5px solid rgba(201,168,76,0.4)",
            color: "#ECEEF4",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Regénérer l'avatar ?</AlertDialogTitle>
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
