import { useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Sparkles, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSections, countAnsweredQuestions, totalQuestions, findDeprecatedQuestionIds, type BrandAnswers, type BrandMode } from "../lib/sections";
import { QuestionBlock } from "./QuestionBlock";

interface Props {
  answers: BrandAnswers;
  mode: BrandMode;
  onChange: (id: string, value: string | string[]) => void;
  currentSection: number;
  setCurrentSection: (n: number) => void;
  onFinish: () => void;
  onBackToRecap?: () => void;
  finishing?: boolean;
}

export function Questionnaire({
  answers, mode, onChange, currentSection, setCurrentSection, onFinish, onBackToRecap, finishing,
}: Props) {
  const topRef = useRef<HTMLDivElement>(null);
  const activeStepRef = useRef<HTMLButtonElement>(null);
  const sections = getSections(mode);
  const section = sections[currentSection];
  const total = totalQuestions(mode);
  const answered = countAnsweredQuestions(answers, mode);
  const isLast = currentSection === sections.length - 1;
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  // Refonte 19/05/2026 : détecte les questions dont la valeur stockée est
  // obsolète (anciens libellés disparus du quiz). Sert au bandeau global +
  // au marquage de section "incomplete migration" dans le stepper.
  const deprecatedQuestionIds = useMemo(
    () => findDeprecatedQuestionIds(answers, mode),
    [answers, mode],
  );
  const hasDeprecated = deprecatedQuestionIds.length > 0;
  const deprecatedSet = useMemo(() => new Set(deprecatedQuestionIds), [deprecatedQuestionIds]);

  // Une section est "terminée" quand toutes ses questions ont une réponse
  // ET aucune n'a de valeur obsolète à re-confirmer.
  const isSectionDone = (idx: number) =>
    sections[idx].questions.every((q) => {
      if (deprecatedSet.has(q.id)) return false;
      const v = answers[q.id];
      if (Array.isArray(v)) return v.length > 0;
      return typeof v === "string" && v.trim().length > 0;
    });

  // Une section a-t-elle au moins une question avec valeur obsolète ?
  // (pour le badge orange dans le stepper)
  const sectionHasDeprecated = (idx: number) =>
    sections[idx].questions.some((q) => deprecatedSet.has(q.id));

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const goNext = () => {
    if (isLast) { onFinish(); return; }
    setCurrentSection(currentSection + 1);
    scrollTop();
  };
  const goPrev = () => {
    if (currentSection === 0) return;
    setCurrentSection(currentSection - 1);
    scrollTop();
  };

  // Garde l'étape active visible dans le stepper (utile en scroll horizontal mobile).
  useEffect(() => {
    activeStepRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [currentSection]);

  return (
    <div className="space-y-6">
      <div ref={topRef} />

      {onBackToRecap && (
        <div className="flex justify-start">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToRecap}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Annuler et revenir à ma fiche
          </Button>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Réponds à chaque question avec honnêteté. Plus tu donnes de contexte,
        plus tes profils Instagram, ton prompt et tes 4 semaines de contenu
        seront uniques et fidèles à toi.
      </p>

      {/* Bandeau global migration 19/05/2026 — sections / questions simplifiées */}
      {hasDeprecated && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-foreground">
                Le questionnaire a été simplifié
              </p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Certaines questions ont des options raccourcies ou redéfinies.{" "}
                <span className="text-amber-300 font-medium">
                  {deprecatedQuestionIds.length} réponse{deprecatedQuestionIds.length > 1 ? "s" : ""}
                </span>{" "}
                doi{deprecatedQuestionIds.length > 1 ? "vent" : "t"} être mise{deprecatedQuestionIds.length > 1 ? "s" : ""} à jour pour profiter
                des améliorations du prompt. Cherche le badge{" "}
                <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                  <AlertTriangle className="h-2.5 w-2.5" /> À METTRE À JOUR
                </span>{" "}
                à côté des questions concernées.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Parcours : stepper horizontal (homogène 6 ou 7 étapes) ─── */}
      <div className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs tracking-[0.18em] uppercase text-primary">
            Ton parcours
          </span>
          <span className="text-xs text-muted-foreground">
            {answered}/{total} questions · <span className="text-foreground font-medium">{pct}%</span>
          </span>
        </div>

        <div className="overflow-x-auto pb-1">
          <div
            className="grid min-w-[40rem] gap-0"
            style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}
          >
            {sections.map((s, i) => {
              const active = i === currentSection;
              const done = isSectionDone(i);
              const needsUpdate = sectionHasDeprecated(i);
              const prevDone = i > 0 && isSectionDone(i - 1);
              return (
                <button
                  key={s.id}
                  ref={active ? activeStepRef : undefined}
                  type="button"
                  onClick={() => { setCurrentSection(i); scrollTop(); }}
                  className="group flex flex-col items-center gap-1.5 px-1"
                >
                  {/* pastille + trait de liaison */}
                  <div className="relative flex w-full items-center justify-center">
                    {i > 0 && (
                      <span
                        className={cn(
                          "absolute right-1/2 top-1/2 h-[2px] w-full -translate-y-1/2 transition-colors duration-300",
                          prevDone ? "bg-primary" : "bg-border",
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 flex h-9 w-9 items-center justify-center rounded-full border text-base transition-all duration-300",
                        active
                          ? "border-primary bg-primary/15 text-primary ring-4 ring-primary/15"
                          : needsUpdate
                            ? "border-amber-500/60 bg-amber-500/10 text-amber-400"
                            : done
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-muted-foreground group-hover:border-primary/50",
                      )}
                    >
                      {needsUpdate && !active ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : done && !active ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        s.icon
                      )}
                    </span>
                  </div>
                  {/* titre de l'étape */}
                  <span
                    className={cn(
                      "text-center text-[10px] font-medium leading-tight transition-colors",
                      active
                        ? "text-primary"
                        : needsUpdate
                          ? "text-amber-400"
                          : done
                            ? "text-foreground"
                            : "text-muted-foreground group-hover:text-foreground/80",
                    )}
                  >
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div>
            <h2 className="font-heading text-2xl text-foreground">{section.icon} {section.title}</h2>
            <p className="text-sm text-muted-foreground">{section.subtitle}</p>
          </div>
          <div className="space-y-5">
            {section.questions.map((q) => (
              <QuestionBlock
                key={q.id}
                q={q}
                value={answers[q.id]}
                onChange={(v) => onChange(q.id, v)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={currentSection === 0}
          className="gap-2 flex-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Précédent
        </Button>
        <Button
          onClick={goNext}
          disabled={finishing || (isLast && answered === 0)}
          className="gap-2 flex-[2]"
        >
          {isLast ? <Sparkles className="h-4 w-4" /> : null}
          {isLast
            ? (finishing ? "L'IA écrit tes profils..." : "Générer mes 10 profils Instagram")
            : "Suivant"}
          {!isLast && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>

      {!isLast && (
        <div className="flex flex-col items-center gap-1 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onFinish}
            disabled={finishing || answered === 0}
            className="gap-2 text-primary hover:text-primary"
          >
            <Sparkles className="h-4 w-4" />
            {finishing ? "L'IA écrit tes profils..." : "Générer mes profils maintenant"}
          </Button>
          <p className="text-[11px] text-muted-foreground italic">
            Pas besoin de tout remplir — plus tu donnes de contexte, plus les profils sont précis.
          </p>
        </div>
      )}
    </div>
  );
}
