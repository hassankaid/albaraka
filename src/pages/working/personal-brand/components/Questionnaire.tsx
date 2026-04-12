import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_SECTIONS, countAnsweredQuestions, totalQuestions, type BrandAnswers } from "../lib/sections";
import { QuestionBlock } from "./QuestionBlock";

interface Props {
  answers: BrandAnswers;
  onChange: (id: string, value: string | string[]) => void;
  currentSection: number;
  setCurrentSection: (n: number) => void;
  onFinish: () => void;
  finishing?: boolean;
}

export function Questionnaire({
  answers, onChange, currentSection, setCurrentSection, onFinish, finishing,
}: Props) {
  const topRef = useRef<HTMLDivElement>(null);
  const section = BRAND_SECTIONS[currentSection];
  const total = totalQuestions();
  const answered = countAnsweredQuestions(answers);
  const isLast = currentSection === BRAND_SECTIONS.length - 1;

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
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div ref={topRef} />

      <div className="text-center space-y-2">
        <Badge variant="outline" className="text-[11px] tracking-[0.3em] uppercase border-amber-500/40 text-amber-700 dark:text-amber-400">
          AL BARAKA
        </Badge>
        <h1 className="font-heading text-3xl md:text-4xl text-foreground">Personal Branding</h1>
        <p className="font-heading italic text-muted-foreground">& Stratégie de Contenu</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto pt-2">
          Réponds à chaque question avec honnêteté. À la fin, l'IA te générera des profils
          Instagram uniques + un prompt pour créer 30 scripts de Reels et 1 an d'idées de stories.
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-primary tracking-widest uppercase">Progression</span>
          <span className="text-muted-foreground">{Math.round((answered / total) * 100)}%</span>
        </div>
        <Progress value={(answered / total) * 100} className="h-1.5" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {BRAND_SECTIONS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { setCurrentSection(i); scrollTop(); }}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-xs border transition-colors whitespace-nowrap",
              i === currentSection
                ? "bg-primary/10 border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {s.icon} {s.title}
          </button>
        ))}
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
          disabled={finishing}
          className="gap-2 flex-[2]"
        >
          {isLast ? <Sparkles className="h-4 w-4" /> : null}
          {isLast
            ? (finishing ? "Génération..." : "Générer ma fiche Personal Brand")
            : "Suivant"}
          {!isLast && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
