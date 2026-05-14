import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSections, countAnsweredQuestions, totalQuestions, type BrandAnswers, type BrandMode } from "../lib/sections";
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

  // Une section est "terminée" quand toutes ses questions ont une réponse.
  const isSectionDone = (idx: number) =>
    sections[idx].questions.every((q) => {
      const v = answers[q.id];
      if (Array.isArray(v)) return v.length > 0;
      return typeof v === "string" && v.trim().length > 0;
    });

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
                          : done
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground group-hover:border-primary/50",
                      )}
                    >
                      {done && !active ? <Check className="h-4 w-4" /> : s.icon}
                    </span>
                  </div>
                  {/* titre de l'étape */}
                  <span
                    className={cn(
                      "text-center text-[10px] font-medium leading-tight transition-colors",
                      active
                        ? "text-primary"
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
