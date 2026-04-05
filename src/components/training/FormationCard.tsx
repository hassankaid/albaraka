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
import { GraduationCap, PlayCircle, BookOpen, CheckCircle2, EyeOff } from "lucide-react";

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
  onOpen: () => void;
}

export function FormationCard({
  formation,
  progress,
  nbChapitresDone,
  nbChapitresTotal,
  isCeoView,
  onOpen,
}: FormationCardProps) {
  const isDraft = formation.status === "draft";

  const { label, Icon } =
    progress === 0
      ? { label: "Commencer", Icon: PlayCircle }
      : progress < 100
      ? { label: "Reprendre", Icon: BookOpen }
      : { label: "Revoir", Icon: CheckCircle2 };

  return (
    <Card
      className="overflow-hidden flex flex-col cursor-pointer hover:border-primary/40 transition-colors"
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
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-base">{formation.titre}</CardTitle>
        <CardDescription className="line-clamp-2 text-xs">
          {formation.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-auto space-y-3">
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {nbChapitresDone}/{nbChapitresTotal} chapitres
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Button variant="outline" size="sm" className="w-full gap-2 text-primary border-primary/30 hover:bg-primary/5">
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      </CardContent>
    </Card>
  );
}
