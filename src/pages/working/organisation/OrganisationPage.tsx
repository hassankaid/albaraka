import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Flame, ArrowLeft, ArrowRight, Sparkles, RefreshCw, CheckCheck, CalendarCog, ListChecks, MessageSquareText, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserPass } from "@/hooks/useUserPass";
import { BARAKA_QUESTIONS, LIBERTY_QUESTIONS, type Question } from "./lib/questions";
import {
  decalageDepuisParis,
  estPlanningAncien,
  generatePlanning,
  planAffiche,
  tacheSurCoaching,
  tachesParDefaut,
  tachesSansPlace,
  type Answers,
  type BlockedSlot,
  type DayOverrides,
  type WeekPlan,
} from "./lib/generatePlanning";
import { PARCOURS } from "./lib/predefinedTasks";
import { BlockedSlotsEditor, QuestionCard, TachesParcoursEditor } from "./components/QuestionEditors";
import { DayOverridesEditor } from "./components/DayOverridesEditor";
import { WeeklyAgenda } from "./components/WeeklyAgenda";
import {
  useCoachingSlots,
  useOrganisationProfile,
  useLatestOrganisationPlan,
  useSaveOrganisation,
} from "./hooks/useOrganisationPlan";

type Step = "loading" | "accueil" | "commitment" | "questionnaire" | "planning";

const fuseauEleve = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const estAParis = () => decalageDepuisParis(fuseauEleve()) === 0;
const heure = (h: number, m = 0) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

export default function OrganisationPage() {
  const { passLevel } = useUserPass();
  const pack: "al_baraka" | "liberty" = passLevel === "liberty" ? "liberty" : "al_baraka";
  const questions = pack === "liberty" ? LIBERTY_QUESTIONS : BARAKA_QUESTIONS;

  const profileQuery = useOrganisationProfile();
  const planQuery = useLatestOrganisationPlan();
  const coachingsQuery = useCoachingSlots();
  const saveMutation = useSaveOrganisation();

  const [step, setStep] = useState<Step>("loading");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [version, setVersion] = useState(1);
  const [showRefinement, setShowRefinement] = useState(false);
  const [showDayEditor, setShowDayEditor] = useState(false);
  /** Buffer local des overrides pendant l'édition, pour ne pas
   *  écraser les réponses tant que l'élève n'a pas validé. */
  const [draftOverrides, setDraftOverrides] = useState<DayOverrides | undefined>(undefined);
  /** « Mes tâches » : parcours, tâches et créneaux bloqués, appliqués d'un coup à la validation. */
  const [showTaches, setShowTaches] = useState(false);
  const [draftTaches, setDraftTaches] = useState<Answers>({});
  const [remarque, setRemarque] = useState("");
  const [lectureRemarque, setLectureRemarque] = useState(false);
  const [compris, setCompris] = useState<BlockedSlot[] | null>(null);

  // Initialisation à partir du state BDD
  useEffect(() => {
    if (profileQuery.isLoading || planQuery.isLoading) return;
    if (planQuery.data && profileQuery.data?.committed_at) {
      setAnswers((profileQuery.data.answers as Answers) ?? {});
      setPlan(planQuery.data.plan as WeekPlan);
      setVersion(planQuery.data.version ?? 1);
      setStep("planning");
    } else if (profileQuery.data) {
      setAnswers((profileQuery.data.answers as Answers) ?? {});
      setStep("accueil");
    } else {
      setStep("accueil");
    }
  }, [profileQuery.isLoading, planQuery.isLoading, profileQuery.data, planQuery.data]);

  const visibleQuestions = useMemo(
    () => questions.filter((q) => !q.condition || q.condition(answers)),
    [questions, answers]
  );
  const currentQ: Question | undefined = visibleQuestions[qIndex];

  const handleAnswer = (val: any) => {
    if (!currentQ) return;
    setAnswers((prev) =>
      currentQ.id === "parcours"
        ? { ...prev, parcours: val, taches_parcours: tachesParDefaut(pack, val, prev.taches_parcours) }
        : { ...prev, [currentQ.id]: val }
    );
  };

  /** Calcule le planning (les coachings y sont d'office) et l'enregistre comme nouvelle version. */
  const calculer = async (reponses: Answers, commit = false) => {
    const coachings = coachingsQuery.data ?? [];
    const complet: Answers = { ...reponses, taches_parcours: reponses.taches_parcours ?? tachesParDefaut(pack, reponses.parcours) };
    const newPlan = generatePlanning(complet, pack, coachings);
    await saveMutation.mutateAsync({
      answers: complet,
      plan: newPlan,
      selectedRecurrenceIds: coachings.map((c) => c.id),
      commit,
    });
    setAnswers(complet);
    setPlan(newPlan);
    setVersion((v) => v + 1);
  };

  const handleGenerate = async () => {
    try {
      await calculer(answers, true);
      setStep("planning");
      toast.success("Planning généré 🌙");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur de génération");
    }
  };

  const ouvrirTaches = () => {
    setDraftTaches({
      parcours: answers.parcours,
      taches_parcours: answers.taches_parcours ?? tachesParDefaut(pack, answers.parcours),
      blocked_slots: answers.blocked_slots ?? [],
    });
    setShowRefinement(false);
    setShowTaches(true);
  };

  const handleRegenerateFromAnswers = async () => {
    // Un ancien planning n'a ni parcours ni nouvelles tâches : l'élève les choisit d'abord.
    if (estPlanningAncien(answers)) return ouvrirTaches();
    try {
      await calculer(answers);
      setShowRefinement(false);
      toast.success("Planning régénéré");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  };

  const handleApplyTaches = async () => {
    try {
      await calculer({ ...answers, ...draftTaches });
      setShowTaches(false);
      toast.success("Planning mis à jour");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  };

  /** L'IA traduit la remarque en créneaux bloqués, que l'élève voit avant de valider. */
  const lireRemarque = async () => {
    setLectureRemarque(true);
    setCompris(null);
    try {
      const { data, error } = await supabase.functions.invoke("organisation-remarque", { body: { remarque } });
      if (error) throw error;
      setCompris((data?.creneaux ?? []) as BlockedSlot[]);
    } catch {
      toast.error("La remarque n'a pas pu être lue. Réessaie, ou ajoute le créneau dans « Mes tâches et créneaux ».");
    } finally {
      setLectureRemarque(false);
    }
  };

  const appliquerRemarque = async () => {
    try {
      await calculer({ ...answers, blocked_slots: [...(answers.blocked_slots ?? []), ...(compris ?? [])] });
      setCompris(null);
      setRemarque("");
      setShowRefinement(false);
      toast.success("Planning mis à jour avec ta remarque");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  };

  const handleRestart = () => {
    setStep("questionnaire");
    setQIndex(0);
    setShowRefinement(false);
  };

  const handleOpenDayEditor = () => {
    setDraftOverrides(answers.day_overrides);
    setShowRefinement(false);
    setShowDayEditor(true);
  };

  const handleApplyDayEditor = async () => {
    try {
      await calculer({ ...answers, day_overrides: draftOverrides });
      setShowDayEditor(false);
      const count = Object.keys(draftOverrides || {}).length;
      toast.success(
        count > 0
          ? `Planning mis à jour · ${count} ${count > 1 ? "jours personnalisés" : "jour personnalisé"}`
          : "Planning mis à jour"
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  };

  // ─────────── LOADING ───────────
  if (step === "loading" || coachingsQuery.isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // ─────────── ACCUEIL ───────────
  if (step === "accueil") {
    return <AccueilScreen onContinue={() => setStep("commitment")} />;
  }

  // ─────────── COMMITMENT ───────────
  if (step === "commitment") {
    return <CommitmentScreen onCommit={() => { setStep("questionnaire"); setQIndex(0); }} pack={pack} />;
  }

  // ─────────── QUESTIONNAIRE ───────────
  if (step === "questionnaire") {
    const isLast = qIndex >= visibleQuestions.length - 1;
    const canNext = currentQ
      ? answers[currentQ.id] !== undefined && answers[currentQ.id] !== "" ||
        ["taches_parcours", "custom_tasks", "blocked_slots", "day_overrides"].includes(currentQ.type)
      : false;

    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-baseline justify-between">
          <Badge variant="outline" className="tracking-widest">
            {pack === "liberty" ? "Pack Liberty" : "Pass Al-Baraka"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Question {qIndex + 1} / {visibleQuestions.length}
          </span>
        </div>
        <Progress value={((qIndex + 1) / visibleQuestions.length) * 100} className="h-1.5" />

        <Card>
          <CardContent className="p-6">
            {currentQ && (
              <QuestionCard
                question={currentQ}
                value={answers[currentQ.id]}
                onChange={handleAnswer}
                pack={pack}
                answers={answers}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => setQIndex(Math.max(0, qIndex - 1))}
            disabled={qIndex === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Précédent
          </Button>
          {!isLast ? (
            <Button
              onClick={() => setQIndex(qIndex + 1)}
              disabled={!canNext}
              className="gap-2"
            >
              Suivant
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={!canNext || saveMutation.isPending}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {saveMutation.isPending ? "Génération..." : "Générer mon planning"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─────────── PLANNING ───────────
  if (step === "planning" && plan) {
    // Le planning est figé ; seuls les coachings sont lus en direct depuis l'admin.
    const affiche = planAffiche(plan, coachingsQuery.data ?? []);
    const ancien = estPlanningAncien(answers);
    const sansPlace = tachesSansPlace(plan, answers, pack);
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        {ancien && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm">
                <span className="font-semibold text-foreground">Nouvelles tâches d'apprentissage</span>
                <span className="block text-muted-foreground">Mets à jour ton planning : ton parcours, puis un clic.</span>
              </div>
              <Button size="sm" onClick={ouvrirTaches}>Mettre à jour</Button>
            </CardContent>
          </Card>
        )}
        {!ancien && tacheSurCoaching(affiche) && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="flex items-center gap-2 text-sm text-foreground">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                Un coaching a changé d'horaire et tombe sur une de tes tâches.
              </p>
              <Button size="sm" variant="outline" onClick={handleRegenerateFromAnswers} disabled={saveMutation.isPending}>
                Replacer mes tâches
              </Button>
            </CardContent>
          </Card>
        )}
        {sansPlace.length > 0 && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            Pas de place pour : {sansPlace.join(", ")}. Réduis sa durée ou choisis un autre jour dans « Ajuster mon planning ».
          </p>
        )}
        <WeeklyAgenda
          plan={affiche}
          version={version}
          onOpenRefinement={() => setShowRefinement(true)}
          fuseau={estAParis() ? undefined : fuseauEleve()}
        />

        <Sheet open={showRefinement} onOpenChange={setShowRefinement}>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Ajuster ton planning</SheetTitle>
              <SheetDescription>
                Modifie tes réponses ou tes horaires pour régénérer un planning adapté.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-3">
              {/* Action prioritaire — nouveau raccourci vers les exceptions par jour */}
              <Button
                onClick={handleOpenDayEditor}
                className="w-full justify-start gap-2"
              >
                <CalendarCog className="h-4 w-4" />
                Personnaliser mes horaires par jour
              </Button>
              <div className="text-[11px] text-muted-foreground px-1 -mt-1">
                Parfait pour ajouter une exception (shift, sport, jour férié…) sans refaire tout le questionnaire.
              </div>

              <Button onClick={ouvrirTaches} variant="outline" className="w-full justify-start gap-2">
                <ListChecks className="h-4 w-4" />
                Mes tâches et créneaux
              </Button>
              <div className="text-[11px] text-muted-foreground px-1 -mt-1">
                Change de parcours, modifie une durée, un jour, ou retire un créneau bloqué.
              </div>

              <div className="border-t border-border/60 my-4" />

              <div className="space-y-2">
                <label htmlFor="remarque" className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <MessageSquareText className="h-4 w-4" />
                  Une remarque ?
                </label>
                <Textarea
                  id="remarque"
                  value={remarque}
                  maxLength={500}
                  rows={3}
                  onChange={(e) => { setRemarque(e.target.value); setCompris(null); }}
                  placeholder="Ex : je ne suis pas dispo le mercredi soir, je garde mes enfants"
                />
                <Button
                  onClick={lireRemarque}
                  disabled={lectureRemarque || remarque.trim().length < 5}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {lectureRemarque ? "Lecture de ta remarque…" : "Tenir compte de ma remarque"}
                </Button>
                {compris && compris.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Je n'y trouve pas de créneau à bloquer. Précise le jour et le moment, ou passe par « Mes tâches et créneaux ».
                  </p>
                )}
                {compris && compris.length > 0 && (
                  <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
                    <p className="text-xs font-semibold text-foreground">Voici ce que j'ai compris, ces créneaux seront bloqués :</p>
                    {compris.map((c, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-xs text-foreground">
                        <span>
                          <b>{c.label}</b> · {(c.days ?? []).join(", ")} · {heure(c.h, c.m)} → {heure(Math.floor((c.h * 60 + (c.m ?? 0) + c.dur) / 60), (c.h * 60 + (c.m ?? 0) + c.dur) % 60)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Retirer ${c.label}`}
                          onClick={() => setCompris(compris.filter((_, j) => j !== i))}
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                    <Button size="sm" className="w-full" onClick={appliquerRemarque} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? "…" : "C'est bien ça, recalculer mon planning"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t border-border/60 my-4" />

              <Button
                onClick={handleRegenerateFromAnswers}
                disabled={saveMutation.isPending}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                Régénérer depuis mes réponses actuelles
              </Button>
              <Button
                onClick={handleRestart}
                variant="ghost"
                className="w-full justify-start gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refaire le questionnaire entier
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={showTaches} onOpenChange={setShowTaches}>
          <SheetContent side="right" className="sm:max-w-lg w-full p-0 flex flex-col gap-0">
            <SheetHeader className="shrink-0 border-b px-6 py-5 text-left space-y-1.5">
              <SheetTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                Mes tâches et créneaux
              </SheetTitle>
              <SheetDescription>
                Tes réponses au questionnaire sont gardées. Seules les tâches sont replacées, les coachings restent fixes.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0 space-y-6">
              {pack === "al_baraka" && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Sur quel parcours tu te concentres en ce moment ?</p>
                  <div className="grid gap-2">
                    {PARCOURS.map((o) => (
                      <Button
                        key={o}
                        type="button"
                        variant={draftTaches.parcours === o ? "default" : "outline"}
                        className="justify-start"
                        onClick={() =>
                          setDraftTaches((d) => ({ ...d, parcours: o, taches_parcours: tachesParDefaut(pack, o, d.taches_parcours) }))
                        }
                      >
                        {o}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {(pack === "liberty" || draftTaches.parcours) && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Tes tâches d'apprentissage</p>
                  <p className="text-xs text-muted-foreground">Sans jour choisi, on les répartit dans le temps que tu as indiqué.</p>
                  <TachesParcoursEditor
                    value={draftTaches.taches_parcours}
                    onChange={(v) => setDraftTaches((d) => ({ ...d, taches_parcours: v }))}
                    pack={pack}
                    parcours={draftTaches.parcours}
                  />
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Tes créneaux bloqués</p>
                <BlockedSlotsEditor
                  value={draftTaches.blocked_slots ?? []}
                  onChange={(v) => setDraftTaches((d) => ({ ...d, blocked_slots: v }))}
                />
              </div>
            </div>
            <div className="shrink-0 border-t bg-background px-6 py-4 flex gap-2">
              <Button variant="outline" onClick={() => setShowTaches(false)} className="flex-1">Annuler</Button>
              <Button
                onClick={handleApplyTaches}
                disabled={saveMutation.isPending || (pack === "al_baraka" && !draftTaches.parcours)}
                className="flex-1 gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {saveMutation.isPending ? "…" : "Mettre à jour mon planning"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Éditeur dédié aux horaires par jour — structure flex col 3 zones :
            - Header fixe (ne scrolle pas)
            - Body scrollable (occupe l'espace restant)
            - Footer fixe (toujours visible, les jours passent au-dessus puis disparaissent sous lui) */}
        <Sheet open={showDayEditor} onOpenChange={setShowDayEditor}>
          <SheetContent
            side="right"
            className="sm:max-w-lg w-full p-0 flex flex-col gap-0"
          >
            {/* Zone 1 : header fixe */}
            <SheetHeader className="shrink-0 border-b px-6 py-5 text-left space-y-1.5">
              <SheetTitle className="flex items-center gap-2">
                <CalendarCog className="h-5 w-5 text-primary" />
                Horaires par jour
              </SheetTitle>
              <SheetDescription>
                Ajoute des exceptions aux horaires que tu as renseignés dans le questionnaire.
                Les jours non modifiés garderont tes horaires habituels.
              </SheetDescription>
            </SheetHeader>

            {/* Zone 2 : body scrollable (flex-1 → prend tout l'espace restant entre header et footer) */}
            <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
              <DayOverridesEditor
                value={draftOverrides}
                onChange={setDraftOverrides}
                answers={answers}
                mode={
                  answers.profile === "Étudiant(e)"
                    ? "study"
                    : answers.profile === "Salarié(e)" ||
                      (answers.has_job && answers.has_job !== "Non")
                    ? "work"
                    : "none"
                }
              />
            </div>

            {/* Zone 3 : footer fixe (hors flux scrollable → les jours du body ne passent plus en dessous) */}
            <div className="shrink-0 border-t bg-background px-6 py-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDayEditor(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleApplyDayEditor}
                disabled={saveMutation.isPending}
                className="flex-1 gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {saveMutation.isPending ? "…" : "Enregistrer et régénérer"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return null;
}

function AccueilScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <Card>
        <CardContent className="p-10 space-y-4">
          <h1 className="font-heading text-3xl text-foreground">Ton planning d'apprentissage</h1>
          <p className="text-muted-foreground">
            Cet espace t'aide à organiser ton temps pendant ta phase d'apprentissage et de pratique. Tu réponds à quelques questions sur ton quotidien, et on te construit un planning qui s'adapte à ta vie : ton travail, ta famille, tes obligations.
          </p>
          <p className="text-muted-foreground">
            L'objectif : avancer dans ta formation et ta pratique avec régularité, sans te disperser, jusqu'au moment où tu passes à la monétisation.
          </p>
          <p className="text-foreground font-semibold">Ton planning t'appartient : tu peux l'ajuster à tout moment.</p>
          <Button size="lg" onClick={onContinue} className="gap-2">
            Commencer
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CommitmentScreen({
  onCommit, pack,
}: { onCommit: () => void; pack: "al_baraka" | "liberty" }) {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card">
        <CardContent className="p-10 text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-amber-500/15">
              <Flame className="h-10 w-10 text-amber-500" />
            </div>
          </div>
          <h1 className="font-heading text-3xl text-foreground">Avant de commencer...</h1>
          <p className="text-muted-foreground">
            Ton planning ne fonctionne que si{" "}
            <span className="text-foreground font-semibold">tu t'y tiens.</span>
          </p>
          <div className="text-left space-y-2.5 py-4">
            {[
              "Avancer avec régularité, même sans motivation",
              "Être rigoureux dans chaque tâche",
              "Respecter les créneaux définis",
              "La régularité prime sur l'intensité d'un jour",
            ].map((t) => (
              <div key={t} className="flex gap-3">
                <span className="text-primary">✦</span>
                <span className="text-sm text-muted-foreground">{t}</span>
              </div>
            ))}
          </div>
          <p className="text-sm">
            <span className="text-foreground font-semibold">
              C'est toi qui fais la différence.
            </span>
          </p>
          <Button size="lg" onClick={onCommit} className="gap-2">
            ✊ Je m'y engage
          </Button>
          <p className="text-[11px] text-muted-foreground">
            {pack === "liberty" ? "Pack Liberty" : "Pass Al-Baraka"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
