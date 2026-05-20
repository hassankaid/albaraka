import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useStudioProject } from "./hooks/useStudioProjects";
import {
  STATUS_LABEL,
  STATUS_TONE,
  type StudioProjectStatus,
} from "./types";
import ScriptStep, { isScriptReady } from "./components/ScriptStep";
import AudioStep from "./components/AudioStep";
import TranscriptionStep from "./components/TranscriptionStep";
import BrollStep from "./components/BrollStep";
import RenderStep from "./components/RenderStep";

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

      {/* ─── Étape 1 — Script ────────────────────────────────────── */}
      <ScriptStep
        project={project}
        variant={isStepDone(project.status, "audio_uploaded") ? "done" : "active"}
      />

      {/* ─── Étape 2 — Voix-off ─────────────────────────────────── */}
      <AudioStep
        project={project}
        variant={
          isStepDone(project.status, "audio_uploaded")
            ? "done"
            : isScriptReady(project)
            ? "active"
            : "locked"
        }
      />

      {/* ─── Étape 3 — Transcription Whisper ────────────────────── */}
      <TranscriptionStep
        project={project}
        variant={
          isStepDone(project.status, "transcribed")
            ? "done"
            : isStepDone(project.status, "audio_uploaded")
            ? "active"
            : "locked"
        }
      />

      {/* ─── Étape 4 — B-rolls IA ────────────────────────────── */}
      <BrollStep
        project={project}
        variant={
          isStepDone(project.status, "broll_ready")
            ? "done"
            : isStepDone(project.status, "transcribed")
            ? "active"
            : "locked"
        }
      />

      {/* ─── Étape 5 — Rendu final MP4 (B5) ────────────────────── */}
      <RenderStep
        project={project}
        variant={
          project.status === "done"
            ? "done"
            : isStepDone(project.status, "broll_ready")
            ? "active"
            : "locked"
        }
      />
    </div>
  );
}

/**
 * Indique si le statut courant est >= au statut cible (ordre logique du wizard).
 */
function isStepDone(
  current: StudioProjectStatus,
  target: StudioProjectStatus,
): boolean {
  const order: StudioProjectStatus[] = [
    "draft",
    "audio_uploaded",
    "transcribed",
    "broll_ready",
    "processing",
    "done",
  ];
  const ci = order.indexOf(current);
  const ti = order.indexOf(target);
  return ci >= ti;
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
