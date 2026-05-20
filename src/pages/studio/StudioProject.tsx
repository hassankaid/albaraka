import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  FileText,
  Mic,
  Sparkles,
  Wand2,
  Film,
  CheckCircle2,
  Clock,
  Lock,
} from "lucide-react";
import { useStudioProject } from "./hooks/useStudioProjects";
import {
  STATUS_LABEL,
  STATUS_TONE,
  type StudioProjectStatus,
} from "./types";

const STAGES: Array<{
  key: StudioProjectStatus;
  label: string;
  icon: typeof FileText;
  brick: "B1" | "B2" | "B3" | "B4" | "B5";
  desc: string;
}> = [
  {
    key: "draft",
    label: "Script",
    icon: FileText,
    brick: "B2",
    desc: "Écrire ou coller le script de ta vidéo.",
  },
  {
    key: "audio_uploaded",
    label: "Voix-off",
    icon: Mic,
    brick: "B2",
    desc: "Uploader ton enregistrement audio (MP3, M4A, WAV).",
  },
  {
    key: "transcribed",
    label: "Sous-titres",
    icon: Sparkles,
    brick: "B3",
    desc: "Whisper transcrit ton audio en sous-titres timestampés.",
  },
  {
    key: "broll_ready",
    label: "B-rolls IA",
    icon: Wand2,
    brick: "B4",
    desc: "L'IA génère un clip vidéo par segment du script.",
  },
  {
    key: "processing",
    label: "Rendu final",
    icon: Film,
    brick: "B5",
    desc: "Assemblage final : voix + b-rolls + sous-titres → MP4 9:16.",
  },
];

export default function StudioProject() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const projectQuery = useStudioProject(projectId);

  if (projectQuery.isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!projectQuery.data) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <h2 className="font-heading text-xl text-foreground">
              Projet introuvable
            </h2>
            <p className="text-sm text-muted-foreground">
              Ce projet a peut-être été supprimé ou ne t'appartient pas.
            </p>
            <Button onClick={() => navigate("/studio")} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Retour à mes vidéos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const project = projectQuery.data;
  const fromPB = project.source === "personal_brand" && project.source_personal_brand;
  const tone = STATUS_TONE[project.status];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Back link */}
      <div>
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/studio">
            <ArrowLeft className="h-4 w-4" /> Mes vidéos
          </Link>
        </Button>
      </div>

      {/* Header projet */}
      <div className="space-y-2">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div className="space-y-1">
            <p className="text-xs tracking-[0.3em] uppercase text-primary">
              Projet vidéo
            </p>
            <h1 className="font-heading text-2xl text-foreground">
              {project.title ?? "Sans titre"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Créé {format(new Date(project.created_at), "d MMM yyyy · HH:mm", { locale: fr })}
            </p>
          </div>
          <Badge className={`gap-1 ${toneClass(tone)}`}>
            {STATUS_LABEL[project.status]}
          </Badge>
        </div>

        {fromPB && (
          <div className="rounded-lg border border-primary/30 bg-primary/[0.05] p-3 flex items-start gap-3 text-xs">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-muted-foreground">
              Ce projet a été créé depuis ton calendrier{" "}
              <Link to="/working/personal-brand" className="text-primary underline">
                Personal Brand
              </Link>{" "}
              · Semaine {project.source_personal_brand?.week_num} · Jour{" "}
              {project.source_personal_brand?.script_day}.
            </p>
          </div>
        )}
      </div>

      {/* Script pré-rempli (visible si présent) */}
      {project.script_text && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="font-heading text-sm tracking-wider uppercase text-foreground">
                Script pré-rempli
              </h2>
            </div>
            <Separator />
            <pre className="whitespace-pre-wrap text-sm text-foreground/90 font-sans leading-relaxed">
              {project.script_text}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Étapes wizard — placeholder briques à venir */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1">
            <h2 className="font-heading text-lg text-foreground">
              Étapes de production
            </h2>
            <p className="text-xs text-muted-foreground">
              Chaque étape débloque la suivante. Le rendu final arrive après l'assemblage des b-rolls.
            </p>
          </div>

          <div className="space-y-2">
            {STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              const completed = isStageCompleted(project.status, stage.key);
              const current = stage.key === project.status;
              return (
                <div
                  key={stage.key}
                  className={`rounded-lg border p-3 flex items-start gap-3 ${
                    current
                      ? "border-primary/40 bg-primary/[0.04]"
                      : completed
                      ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                      : "border-border"
                  }`}
                >
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                      completed
                        ? "bg-emerald-500/15 text-emerald-500"
                        : current
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {completed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">
                        {idx + 1}. {stage.label}
                      </p>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {stage.brick}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {stage.desc}
                    </p>
                  </div>
                  <div className="shrink-0 self-center">
                    {completed ? (
                      <span className="text-xs text-emerald-500 font-medium">
                        ✓ Fait
                      </span>
                    ) : current ? (
                      <span className="text-xs text-primary font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" /> En cours
                      </span>
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border border-dashed border-border p-4 text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              🚧 Brique <span className="font-mono text-foreground">B1</span> en place — squelette fonctionnel. Les actions de chaque étape arrivent avec les briques suivantes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function isStageCompleted(
  current: StudioProjectStatus,
  stage: StudioProjectStatus,
): boolean {
  const order: StudioProjectStatus[] = [
    "draft",
    "audio_uploaded",
    "transcribed",
    "broll_ready",
    "processing",
    "done",
  ];
  const i = order.indexOf(stage);
  const j = order.indexOf(current);
  return j > i;
}

function toneClass(
  tone: "default" | "primary" | "warning" | "success" | "danger",
): string {
  switch (tone) {
    case "primary":
      return "bg-primary/15 text-primary border-0";
    case "warning":
      return "bg-amber-500/15 text-amber-500 border-0";
    case "success":
      return "bg-emerald-500/15 text-emerald-500 border-0";
    case "danger":
      return "bg-destructive/15 text-destructive border-0";
    default:
      return "bg-muted text-muted-foreground border-0";
  }
}
