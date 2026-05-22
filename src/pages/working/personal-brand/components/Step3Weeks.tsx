import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Lock,
  CheckCircle2,
  Loader2,
  Clock,
  Sparkles,
  Film,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CopyButton } from "./CopyButton";
import { WEEKS } from "../lib/buildPrompts";
import type { BrandMode } from "../lib/sections";
import {
  type PersonalBrandWeekRow,
  type WeeklyScript,
  type WeeklyStoryDay,
} from "../hooks/usePersonalBrand";
import { useAuth } from "@/hooks/useAuth";
import { isStudioAllowed } from "@/lib/studio-access";
import { useCreateStudioProject } from "@/pages/studio/hooks/useStudioProjects";

interface Props {
  unlocked: boolean;
  mode: BrandMode;
  weeks: PersonalBrandWeekRow[];
  topicsHistory: string[];
  basePromptDefault: string; // prompt généré côté étape 2, pré-rempli
  onGenerate: (params: {
    weekNum: 1 | 2 | 3 | 4;
    basePrompt: string;
  }) => Promise<void>;
  onConfirmPublished: (weekRowId: string) => Promise<void>;
  generating: boolean;
}

export default function Step3Weeks({
  unlocked,
  mode,
  weeks,
  topicsHistory,
  basePromptDefault,
  onGenerate,
  onConfirmPublished,
  generating,
}: Props) {
  if (!unlocked) {
    return (
      <Card id="step-2" className="opacity-50">
        <CardContent className="p-6 space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">
              2
            </span>
            <h2 className="font-heading text-xl text-muted-foreground">
              Ta stratégie 4 semaines
            </h2>
          </div>
          <p className="text-xs text-muted-foreground pl-7">
            Valide l'étape 1 pour débloquer la génération hebdomadaire.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Détermine la semaine active à afficher par défaut : la dernière générée
  // non publiée, ou la 1re semaine débloquée.
  const indexedWeeks = new Map<number, PersonalBrandWeekRow>();
  for (const w of weeks) indexedWeeks.set(w.week_num, w);

  // Une semaine est débloquée si la précédente est publiée (week 1 toujours).
  const isUnlocked = (n: 1 | 2 | 3 | 4): boolean => {
    if (n === 1) return true;
    const prev = indexedWeeks.get(n - 1);
    return !!prev?.published_at;
  };

  const firstAccessibleWeek =
    ([1, 2, 3, 4] as const).find((n) => {
      if (!isUnlocked(n)) return false;
      const w = indexedWeeks.get(n);
      // pas encore généré OU généré mais pas publié → semaine "active"
      return !w || !w.published_at;
    }) ?? 1;

  const [activeWeek, setActiveWeek] = useState<1 | 2 | 3 | 4>(firstAccessibleWeek);

  return (
    <Card id="step-2" className="border-primary/30 bg-primary/[0.03]">
      <CardContent className="p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              2
            </span>
            <h2 className="font-heading text-xl text-foreground">
              Ta stratégie 4 semaines
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Génère tes scripts + idées de stories semaine par semaine. Publie
            avant de débloquer la suivante.
            {topicsHistory.length > 0 && (
              <> · <span className="text-primary">{topicsHistory.length} sujets déjà couverts</span></>
            )}
          </p>
        </div>

        <Tabs
          value={String(activeWeek)}
          onValueChange={(v) => setActiveWeek(Number(v) as 1 | 2 | 3 | 4)}
        >
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            {WEEKS.map((w) => {
              const wRow = indexedWeeks.get(w.num);
              const unlocked = isUnlocked(w.num);
              const published = !!wRow?.published_at;
              const generated = !!wRow;
              return (
                <TabsTrigger
                  key={w.num}
                  value={String(w.num)}
                  disabled={!unlocked}
                  className={cn(
                    "flex flex-col gap-0.5 py-2 px-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary",
                    !unlocked && "opacity-40 cursor-not-allowed",
                  )}
                >
                  <span className="text-base leading-none">
                    {!unlocked ? <Lock className="h-4 w-4" /> : w.icon}
                  </span>
                  <span className="text-[10px] font-semibold leading-tight">
                    S{w.num} · {w.theme}
                  </span>
                  {published && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                  {generated && !published && <Clock className="h-3 w-3 text-primary" />}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {WEEKS.map((w) => {
            const wRow = indexedWeeks.get(w.num);
            const unlocked = isUnlocked(w.num);
            return (
              <TabsContent key={w.num} value={String(w.num)} className="mt-4">
                {!unlocked ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    🔒 Publie la semaine {w.num - 1} pour débloquer celle-ci.
                  </p>
                ) : wRow ? (
                  <WeekContent
                    weekRow={wRow}
                    mode={mode}
                    onConfirmPublished={onConfirmPublished}
                  />
                ) : (
                  <WeekGenerator
                    weekNum={w.num}
                    weekTheme={w.theme}
                    weekDesc={w.desc}
                    basePromptDefault={basePromptDefault}
                    onGenerate={onGenerate}
                    generating={generating}
                  />
                )}
              </TabsContent>
            );
          })}
        </Tabs>

        <p className="text-[11px] text-muted-foreground italic text-center">
          Mode : {mode === "liberty" ? "Liberty — vente de ton offre" : "Pass — apporteur d'affaires AL BARAKA"}
        </p>
      </CardContent>
    </Card>
  );
}

// ───── Sous-composant : générateur d'une semaine ────────────────────
function WeekGenerator({
  weekNum,
  weekTheme,
  weekDesc,
  basePromptDefault,
  onGenerate,
  generating,
}: {
  weekNum: 1 | 2 | 3 | 4;
  weekTheme: string;
  weekDesc: string;
  basePromptDefault: string;
  onGenerate: (params: { weekNum: 1 | 2 | 3 | 4; basePrompt: string }) => Promise<void>;
  generating: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border p-4 space-y-1.5">
        <p className="text-xs font-semibold text-primary tracking-widest uppercase">
          Semaine {weekNum} · {weekTheme}
        </p>
        <p className="text-sm text-foreground">{weekDesc}</p>
        <p className="text-xs text-muted-foreground">
          La plateforme génère tes 7 scripts + 21 stories à partir de tes
          réponses au questionnaire. Aucun outil externe, rien à copier-coller.
        </p>
      </div>

      <Button
        onClick={() => onGenerate({ weekNum, basePrompt: basePromptDefault })}
        disabled={!basePromptDefault.trim() || generating}
        className="w-full gap-2"
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            L'IA écrit tes 7 scripts + 21 stories...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Générer la semaine {weekNum}
          </>
        )}
      </Button>
    </div>
  );
}

// ───── Sous-composant : affichage d'une semaine générée ────────────
function WeekContent({
  weekRow,
  mode,
  onConfirmPublished,
}: {
  weekRow: PersonalBrandWeekRow;
  mode: BrandMode;
  onConfirmPublished: (weekRowId: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<"scripts" | "stories">("scripts");
  const [confirming, setConfirming] = useState(false);
  const [checked, setChecked] = useState(!!weekRow.published_at);

  const isPublished = !!weekRow.published_at;
  const scripts = (weekRow.scripts ?? []) as WeeklyScript[];
  const stories = (weekRow.stories ?? []) as WeeklyStoryDay[];

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirmPublished(weekRow.id);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-4">
      {isPublished && (
        <p className="text-sm text-center text-emerald-500 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" />
          Semaine {weekRow.week_num} publiée — {weekRow.week_num < 4 ? "suivante débloquée" : "bravo, cycle terminé !"}
        </p>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as "scripts" | "stories")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scripts">🎬 Scripts ({scripts.length})</TabsTrigger>
          <TabsTrigger value="stories">📖 Stories ({stories.reduce((s, d) => s + (d.stories?.length || 0), 0)})</TabsTrigger>
        </TabsList>

        <TabsContent value="scripts" className="mt-3 space-y-3">
          {scripts.map((s, i) => (
            <ScriptCard
              key={i}
              script={s}
              weekRowId={weekRow.id}
              weekNum={weekRow.week_num as 1 | 2 | 3 | 4}
              mode={mode}
            />
          ))}
        </TabsContent>

        <TabsContent value="stories" className="mt-3 space-y-2">
          {stories.map((d, i) => (
            <StoryDay key={i} day={d} />
          ))}
        </TabsContent>
      </Tabs>

      {!isPublished && (
        <div className="rounded-lg border border-primary/30 bg-primary/[0.05] p-4 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground leading-relaxed">
              J'ai publié les 7 reels + 21 stories de la semaine {weekRow.week_num}.
            </span>
          </label>
          <Button
            onClick={handleConfirm}
            disabled={!checked || confirming}
            className="w-full gap-2"
          >
            {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
            {weekRow.week_num < 4
              ? `Valider et débloquer la semaine ${weekRow.week_num + 1}`
              : "Valider — j'ai bouclé mon cycle"}
          </Button>
        </div>
      )}
    </div>
  );
}

function ScriptCard({
  script,
  weekRowId,
  weekNum,
  mode,
}: {
  script: WeeklyScript;
  weekRowId: string;
  weekNum: 1 | 2 | 3 | 4;
  mode: BrandMode;
}) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const createStudioProject = useCreateStudioProject();
  const valeur = Array.isArray(script.valeur) ? script.valeur : [script.valeur || ""];
  const copyText = `J${script.day} — ${script.title}\n\nHOOK : ${script.hook}\n\nVALEUR :\n${valeur.join("\n")}\n\nCTA : ${script.cta}`;
  const canStudio = isStudioAllowed(profile);

  // Format dédié à la voix-off : pas de "TITRE :", juste le texte à lire dans l'ordre naturel
  // (hook → valeur → CTA). Le titre sert seulement pour le nom du projet Studio.
  const studioScript = [
    script.hook,
    ...valeur.filter((v) => v.trim().length > 0),
    script.cta,
  ]
    .filter((s) => s && s.trim().length > 0)
    .join("\n\n");

  const handleProduceVideo = async () => {
    try {
      const project = await createStudioProject.mutateAsync({
        title: `${script.title} — S${weekNum} · J${script.day}`,
        source: "personal_brand",
        source_personal_brand: {
          week_row_id: weekRowId,
          week_num: weekNum,
          script_day: script.day,
          mode,
        },
        script_text: studioScript,
      });
      toast.success("Projet Studio créé — direction la production ✦");
      navigate(`/studio/projects/${project.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Création échouée");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-background/50 p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-semibold text-primary">Jour {script.day}</span>
        <div className="flex items-center gap-1.5">
          <CopyButton text={copyText} label="Copier" />
          {canStudio && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleProduceVideo}
              disabled={createStudioProject.isPending}
              className="gap-1.5 text-xs h-7 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            >
              {createStudioProject.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Film className="h-3 w-3" />
              )}
              Produire en vidéo
            </Button>
          )}
        </div>
      </div>
      <p className="font-heading text-base text-foreground">{script.title}</p>
      <div className="space-y-2 text-sm">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">⏱️ HOOK</p>
          <p className="text-foreground/90 mt-0.5">{script.hook}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">💡 VALEUR</p>
          {valeur.map((v, i) => (
            <p key={i} className="text-foreground/80 text-xs leading-relaxed mt-0.5">
              {v}
            </p>
          ))}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">📣 CTA</p>
          <p className="text-primary text-xs mt-0.5">{script.cta}</p>
        </div>
        {script.alt_hooks && script.alt_hooks.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              🔄 {script.alt_hooks.length} hooks alternatifs
            </summary>
            <ul className="mt-1 space-y-0.5 pl-3">
              {script.alt_hooks.map((h, i) => (
                <li key={i} className="text-foreground/70 list-disc">{h}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

function StoryDay({ day }: { day: WeeklyStoryDay }) {
  const icons = ["🌅", "☀️", "🌙"];
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3 space-y-1.5">
      <p className="text-xs font-semibold text-primary">Jour {day.day}</p>
      {(day.stories ?? []).map((s, i) => (
        <div key={i} className="flex gap-2 text-xs">
          <span>{icons[i] ?? "·"}</span>
          <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground self-start">
            {s.type}
          </span>
          <p className="text-foreground/80 leading-relaxed flex-1">{s.desc}</p>
        </div>
      ))}
    </div>
  );
}
