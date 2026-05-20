import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Sparkles,
  Wand2,
  Film,
  Lock,
} from "lucide-react";
import { useStudioProject } from "./hooks/useStudioProjects";
import {
  STATUS_LABEL,
  STATUS_TONE,
  type StudioProject as StudioProjectT,
  type StudioProjectStatus,
} from "./types";
import ScriptStep, { isScriptReady } from "./components/ScriptStep";
import AudioStep from "./components/AudioStep";
import TranscriptionStep from "./components/TranscriptionStep";
import BrollStep from "./components/BrollStep";

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

      {/* ─── Étape 5 — Placeholder rendu final (B5) ─────────── */}
      <FutureStepCard
        idx={5}
        title="Rendu final"
        brick="B5"
        icon={Film}
        description="Assemblage final : voix + b-rolls + sous-titres → MP4 9:16 prêt à poster."
        unlocked={project.status === "processing" || project.status === "done"}
        completed={project.status === "done"}
      />

      {/* Statut B4 — note de progression */}
      <div className="rounded-lg border border-dashed border-border p-4 text-center space-y-1">
        <p className="text-xs text-muted-foreground">
          🚧 Briques <span className="font-mono text-foreground">B1 → B4</span> en place — script + voix + transcription + b-rolls IA opérationnels.
        </p>
        <p className="text-[11px] text-muted-foreground/70">
          Le rendu final (MP4 9:16 prêt à poster) arrive avec la brique B5.
        </p>
      </div>
    </div>
  );
}

function FutureStepCard({
  idx,
  title,
  brick,
  icon: Icon,
  description,
  unlocked,
  completed,
}: {
  idx: number;
  title: string;
  brick: string;
  icon: typeof Sparkles;
  description: string;
  unlocked: boolean;
  completed: boolean;
}) {
  return (
    <Card
      className={`${
        completed
          ? "border-emerald-500/30 bg-emerald-500/[0.03]"
          : unlocked
          ? "border-border"
          : "border-border opacity-60"
      }`}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <div
          className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
            completed
              ? "bg-emerald-500/15 text-emerald-500"
              : unlocked
              ? "bg-muted text-muted-foreground"
              : "bg-muted text-muted-foreground/60"
          }`}
        >
          {unlocked ? <Icon className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground">
              {idx}. {title}
            </p>
            <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              {brick}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
        <div className="shrink-0 self-center text-[11px] font-medium">
          {completed ? (
            <span className="text-emerald-500">✓ Fait</span>
          ) : unlocked ? (
            <span className="text-muted-foreground">À venir</span>
          ) : (
            <span className="text-muted-foreground/60">Verrouillé</span>
          )}
        </div>
      </CardContent>
    </Card>
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
