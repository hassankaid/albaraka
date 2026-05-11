import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
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
  const sections = getSections(mode);
  const section = sections[currentSection];
  const total = totalQuestions(mode);
  const answered = countAnsweredQuestions(answers, mode);
  const isLast = currentSection === sections.length - 1;

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

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-primary tracking-widest uppercase">Progression</span>
          <span className="text-muted-foreground">{Math.round((answered / total) * 100)}%</span>
        </div>
        <Progress value={(answered / total) * 100} className="h-1.5" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {sections.map((s, i) => {
          const active = i === currentSection;
          const done = s.questions.every((q) => {
            const v = answers[q.id];
            if (Array.isArray(v)) return v.length > 0;
            return typeof v === "string" && v.trim().length > 0;
          });
          return (
            <button
              key={s.id}
              onClick={() => { setCurrentSection(i); scrollTop(); }}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-3 rounded-lg border text-center transition-colors",
                active
                  ? "bg-primary/10 border-primary text-primary"
                  : done
                    ? "border-emerald-500/40 text-foreground hover:border-primary/60"
                    : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              <span className="text-lg leading-none">{s.icon}</span>
              <span className="text-[11px] font-medium leading-tight">{s.title}</span>
            </button>
          );
        })}
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
