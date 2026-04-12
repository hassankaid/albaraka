import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, PlayCircle, BookOpen, CheckCircle2, EyeOff, Trophy, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormationCardProps {
  formation: {
    id: string;
    slug: string;
    titre: string;
    description: string | null;
    cover_url: string | null;
    status: string;
  };
  progress: number;
  nbChapitresDone: number;
  nbChapitresTotal: number;
  isCeoView: boolean;
  hasCertificate?: boolean;
  onOpen: () => void;
}

export function FormationCard({
  formation,
  progress,
  nbChapitresDone,
  nbChapitresTotal,
  isCeoView,
  hasCertificate = false,
  onOpen,
}: FormationCardProps) {
  const isDraft = formation.status === "draft";

  const { label, Icon } =
    progress === 0
      ? { label: "Commencer", Icon: PlayCircle }
      : progress < 100
      ? { label: "Reprendre", Icon: BookOpen }
      : { label: "Revoir", Icon: CheckCircle2 };

  const isCompleted = progress >= 100;
  const isInProgress = progress > 0 && progress < 100;

  return (
    <Card
      className={cn(
        "overflow-hidden flex flex-col cursor-pointer transition-colors",
        isCompleted ? "border-emerald-500/50 hover:border-emerald-500" : "hover:border-primary/40"
      )}
      onClick={onOpen}
    >
      <div className="relative h-40 bg-muted">
        {formation.cover_url ? (
          <img
            src={formation.cover_url}
            alt={formation.titre}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        {isDraft && isCeoView && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="gap-1 text-xs">
              <EyeOff className="h-3 w-3" />
              Brouillon
            </Badge>
          </div>
        )}
        {isCompleted && !hasCertificate && (
          <div className="absolute top-2 right-2">
            <Badge className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-600 text-white border-0">
              <Trophy className="h-3 w-3" />
              Terminé
            </Badge>
          </div>
        )}
        {hasCertificate && (
          <div className="absolute top-2 right-2">
            <Badge className="gap-1 text-xs bg-amber-500 hover:bg-amber-500 text-neutral-950 border-0">
              <Award className="h-3 w-3" />
              Certifié
            </Badge>
          </div>
        )}
        {isInProgress && (
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="gap-1 text-xs bg-background/80 backdrop-blur">
              <BookOpen className="h-3 w-3" />
              En cours
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {isCompleted && <span className="text-lg">🏆</span>}
          {formation.titre}
        </CardTitle>
        <CardDescription className="line-clamp-2 text-xs">
          {formation.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-auto space-y-3">
        <Progress
          value={progress}
          className={cn("h-2", isCompleted && "[&>div]:bg-emerald-500")}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {nbChapitresDone}/{nbChapitresTotal} chapitres
          </span>
          <span className={cn(isCompleted && "text-emerald-600 font-semibold")}>
            {Math.round(progress)}%
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-full gap-2",
            isCompleted
              ? "bg-transparent text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10"
              : "bg-transparent text-primary border-primary/30 hover:bg-primary/10"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      </CardContent>
    </Card>
  );
}
