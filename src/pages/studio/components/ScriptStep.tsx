import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  FileText,
  CheckCircle2,
  Loader2,
  Clock,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateStudioProject } from "../hooks/useStudioProjects";
import type { StudioProject, StudioProjectStatus } from "../types";

interface Props {
  project: StudioProject;
  /** "active" = étape en cours d'édition · "done" = étape validée (script + audio uploaded) */
  variant: "active" | "done";
}

// Vitesse de lecture moyenne en français : ~2.5 mots/sec (= 150 mots/min).
// On utilise cette base pour estimer la durée du script.
const WORDS_PER_SECOND = 2.5;

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  // Split sur ponctuations fortes ou retour ligne, on filtre les segments vides.
  const segs = trimmed
    .split(/[.!?]+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return segs.length;
}

function formatDuration(seconds: number): string {
  if (seconds < 1) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `~${s}s`;
  return `~${m}min ${s.toString().padStart(2, "0")}s`;
}

export default function ScriptStep({ project, variant }: Props) {
  const updateMutation = useUpdateStudioProject();
  const [text, setText] = useState(project.script_text ?? "");
  // États du save indicator : idle (rien à faire), saving (en cours), saved (succès récent)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    project.script_text ? "saved" : "idle",
  );
  const lastSavedRef = useRef(project.script_text ?? "");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset si on change de projet (cas peu fréquent mais on protège)
  useEffect(() => {
    setText(project.script_text ?? "");
    lastSavedRef.current = project.script_text ?? "";
    setSaveState(project.script_text ? "saved" : "idle");
  }, [project.id]);

  // Auto-save debounced (1.5s après la dernière frappe)
  useEffect(() => {
    if (variant === "done") return; // pas d'édition en mode lecture
    if (text === lastSavedRef.current) return;

    setSaveState("saving");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await updateMutation.mutateAsync({
          id: project.id,
          updates: { script_text: text || null },
        });
        lastSavedRef.current = text;
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    }, 1500);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, variant, project.id]);

  const words = countWords(text);
  const sentences = countSentences(text);
  const durationEstimate = words / WORDS_PER_SECOND;
  const isEmpty = words === 0;

  // ─── MODE DONE (étape déjà validée) ────────────────────────────────
  if (variant === "done") {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/[0.03]">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground">1. Script</p>
              <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 rounded">
                ✓ Validé
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {words} mots · {sentences} phrases · {formatDuration(durationEstimate)}
            </p>
            <details className="text-xs mt-1">
              <summary className="cursor-pointer text-primary hover:underline inline-flex items-center gap-1">
                <Pencil className="h-3 w-3" /> Voir / éditer le script
              </summary>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={Math.min(12, Math.max(4, sentences + 1))}
                className="mt-2 text-sm font-sans leading-relaxed"
              />
              <div className="mt-1 flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
                <SaveIndicator state={saveState} />
              </div>
            </details>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── MODE ACTIVE (étape en cours) ──────────────────────────────────
  return (
    <Card className="border-primary/40 bg-primary/[0.03]">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground">1. Script</p>
              <span className="text-[10px] font-mono bg-primary/15 text-primary px-1.5 py-0.5 rounded">
                Étape 1
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Écris ou colle le script complet que tu vas lire en voix-off. Hook, valeur, CTA — dans l'ordre naturel de lecture. Auto-sauvegardé.
            </p>
          </div>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ex : Si je te dis que dans 2 ans je serai au Maroc, prêt à élever mes enfants dans la sérénité..."
          rows={Math.min(16, Math.max(8, sentences + 2))}
          className="text-sm font-sans leading-relaxed"
        />

        {/* Bandeau de stats */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className={cn(isEmpty && "text-muted-foreground/60")}>
              <strong className="text-foreground">{words}</strong> mots
            </span>
            <span className="opacity-50">·</span>
            <span className={cn(isEmpty && "text-muted-foreground/60")}>
              <strong className="text-foreground">{sentences}</strong> phrases
            </span>
            <span className="opacity-50">·</span>
            <span className={cn(isEmpty && "text-muted-foreground/60")}>
              durée estimée{" "}
              <strong className="text-foreground">
                {formatDuration(durationEstimate)}
              </strong>
            </span>
          </div>
          <SaveIndicator state={saveState} />
        </div>

        {/* Conseils ciblés selon longueur */}
        {!isEmpty && words < 40 && (
          <div className="rounded-md bg-amber-500/[0.06] border border-amber-500/30 px-3 py-2 text-xs text-amber-500/90">
            ⚠️ Ton script fait moins de 40 mots (~16s) — peut-être trop court pour un Reel. Vise 70-120 mots pour 30-45s de lecture.
          </div>
        )}
        {words > 200 && (
          <div className="rounded-md bg-amber-500/[0.06] border border-amber-500/30 px-3 py-2 text-xs text-amber-500/90">
            ⚠️ Plus de 200 mots (~80s+) — long pour un Reel. Pense à découper en plusieurs vidéos.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" }) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Sauvegarde…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-500">
        <CheckCircle2 className="h-3 w-3" /> Sauvegardé
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground/60">
      <Clock className="h-3 w-3" /> Non sauvegardé
    </span>
  );
}

/**
 * Helper exporté pour que le parent puisse vérifier qu'un script est "valide"
 * (suffisamment de mots pour générer un audio voix-off intéressant) avant
 * d'autoriser le passage à l'étape audio.
 */
export function isScriptReady(project: StudioProject): boolean {
  return countWords(project.script_text ?? "") >= 10;
}
