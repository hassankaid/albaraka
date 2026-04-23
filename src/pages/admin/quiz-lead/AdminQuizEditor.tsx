// AdminQuizEditor — Éditeur de la config du quiz lead magnet (CEO only).
// Stratégie : le CEO édite des sections en JSON dans des textareas séparées.
// Chaque sauvegarde crée une NOUVELLE version + désactive l'ancienne (versioning).

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, RotateCcw, AlertTriangle, CheckCircle2, History, Sparkles } from "lucide-react";

interface ConfigRow {
  id: string;
  version: number;
  questions: any;
  profiles: any;
  orientation_question: any;
  landing: any;
  intro: any;
  conference: any;
  whatsapp_message: string;
  is_active: boolean;
  created_at: string;
}

const SECTIONS: { key: keyof ConfigRow; label: string; hint: string }[] = [
  { key: "landing", label: "Landing page", hint: "Titre, bullets, CTA, badges de confiance" },
  { key: "intro", label: "Intro quiz + formulaire email", hint: "Textes du form (prénom/nom/email), intro 5 phases" },
  { key: "questions", label: "Questions du quiz", hint: "4 tableaux : profile, situation, education, rhetorical" },
  { key: "orientation_question", label: "Question d'orientation", hint: "Question finale avec 3 options (batisseur/connecteur/createur)" },
  { key: "profiles", label: "Profils résultats", hint: "Titres, descriptions, emojis, gradients des 3 profils" },
  { key: "conference", label: "Page téléphone + conférence", hint: "Textes du CTA téléphone et de la page conférence WhatsApp" },
];

// ──────────────────────────────────────────────────────────────────────

export function AdminQuizEditor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState<ConfigRow | null>(null);
  const [history, setHistory] = useState<ConfigRow[]>([]);

  // Local edit state
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // ─── Fetch ───
  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lead_quiz_configs")
        .select("*")
        .order("version", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as ConfigRow[];
      setHistory(rows);
      const activeRow = rows.find((r) => r.is_active) ?? null;
      setActive(activeRow);
      if (activeRow) resetDraftsFrom(activeRow);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetDraftsFrom = (row: ConfigRow) => {
    const nextDrafts: Record<string, string> = {};
    for (const section of SECTIONS) {
      nextDrafts[section.key as string] = JSON.stringify(row[section.key], null, 2);
    }
    setDrafts(nextDrafts);
    setWhatsappMessage(row.whatsapp_message ?? "");
    setValidationErrors({});
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Validation ───
  const validateAll = (): { valid: boolean; parsed: Record<string, any> } => {
    const parsed: Record<string, any> = {};
    const errors: Record<string, string> = {};
    for (const section of SECTIONS) {
      try {
        parsed[section.key as string] = JSON.parse(drafts[section.key as string] ?? "");
      } catch (e: any) {
        errors[section.key as string] = "JSON invalide : " + (e.message ?? "syntaxe incorrecte");
      }
    }
    if (!whatsappMessage.trim()) errors.whatsapp_message = "Le message ne peut pas être vide";
    setValidationErrors(errors);
    return { valid: Object.keys(errors).length === 0, parsed };
  };

  // ─── Save ───
  const handleSave = async () => {
    if (!active) return;
    const { valid, parsed } = validateAll();
    if (!valid) {
      toast({ title: "Corrige les erreurs JSON avant d'enregistrer", variant: "destructive" });
      return;
    }
    const confirm = window.confirm(
      `Cela va créer la version ${active.version + 1} du quiz et désactiver la version ${active.version}. Continuer ?`,
    );
    if (!confirm) return;

    setSaving(true);
    try {
      // Désactiver l'ancienne
      await supabase.from("lead_quiz_configs").update({ is_active: false }).eq("id", active.id);
      // Créer la nouvelle
      const { error: insertError } = await supabase.from("lead_quiz_configs").insert({
        version: active.version + 1,
        is_active: true,
        landing: parsed.landing,
        intro: parsed.intro,
        questions: parsed.questions,
        orientation_question: parsed.orientation_question,
        profiles: parsed.profiles,
        conference: parsed.conference,
        whatsapp_message: whatsappMessage.trim(),
      });
      if (insertError) {
        // rollback
        await supabase.from("lead_quiz_configs").update({ is_active: true }).eq("id", active.id);
        throw insertError;
      }
      toast({ title: `Version ${active.version + 1} activée`, description: "Les prochains visiteurs verront la nouvelle version." });
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRevertDraft = () => {
    if (!active) return;
    resetDraftsFrom(active);
    toast({ title: "Modifications annulées" });
  };

  const handleActivateVersion = async (row: ConfigRow) => {
    if (row.id === active?.id) return;
    const confirm = window.confirm(`Réactiver la version ${row.version} ? La version actuelle ${active?.version} sera désactivée.`);
    if (!confirm) return;
    try {
      if (active) await supabase.from("lead_quiz_configs").update({ is_active: false }).eq("id", active.id);
      await supabase.from("lead_quiz_configs").update({ is_active: true }).eq("id", row.id);
      toast({ title: `Version ${row.version} activée` });
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  // ─── UI ───

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!active) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Aucune version active en base. Lance la migration initiale.
        </CardContent>
      </Card>
    );
  }

  const hasUnsavedChanges = (() => {
    if (active.whatsapp_message !== whatsappMessage) return true;
    for (const s of SECTIONS) {
      const current = JSON.stringify(active[s.key], null, 2);
      if (drafts[s.key as string] !== current) return true;
    }
    return false;
  })();

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="border-border/50 bg-gradient-to-br from-gold-500/5 to-gold-600/5">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold-400" />
              <span className="text-sm font-semibold text-foreground">Version active : v{active.version}</span>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 border-emerald-500/30 text-emerald-300">Active</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Créée le {new Date(active.created_at).toLocaleDateString("fr-FR")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRevertDraft} disabled={!hasUnsavedChanges || saving} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={!hasUnsavedChanges || saving} className="gradient-primary text-primary-foreground gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {saving ? "Enregistrement…" : `Enregistrer → v${active.version + 1}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasUnsavedChanges && (
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-200">
            Tu as des modifications non enregistrées. Clique sur "Enregistrer" pour créer une nouvelle version, ou "Annuler" pour revenir à la v{active.version}.
          </AlertDescription>
        </Alert>
      )}

      {/* WhatsApp message (simple input) */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Message WhatsApp pré-rempli</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={whatsappMessage}
            onChange={(e) => setWhatsappMessage(e.target.value)}
            rows={3}
            className="bg-background font-mono text-sm"
          />
          {validationErrors.whatsapp_message && (
            <p className="text-xs text-red-400">⚠️ {validationErrors.whatsapp_message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            C'est le message que le prospect enverra à l'apporteur en cliquant sur le CTA WhatsApp final.
          </p>
        </CardContent>
      </Card>

      {/* JSON sections */}
      {SECTIONS.map((section) => (
        <Card key={section.key as string} className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span>{section.label}</span>
              {validationErrors[section.key as string] ? (
                <Badge variant="outline" className="text-[10px] bg-red-500/10 border-red-500/30 text-red-300 gap-1">
                  <AlertTriangle className="h-3 w-3" /> JSON invalide
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 border-emerald-500/30 text-emerald-300 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> OK
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{section.hint}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              value={drafts[section.key as string] ?? ""}
              onChange={(e) => {
                const next = { ...drafts, [section.key as string]: e.target.value };
                setDrafts(next);
                try {
                  JSON.parse(e.target.value);
                  const errs = { ...validationErrors };
                  delete errs[section.key as string];
                  setValidationErrors(errs);
                } catch {
                  // validation at save time
                }
              }}
              rows={16}
              className="bg-background font-mono text-xs"
              spellCheck={false}
            />
            {validationErrors[section.key as string] && (
              <p className="text-xs text-red-400">⚠️ {validationErrors[section.key as string]}</p>
            )}
          </CardContent>
        </Card>
      ))}

      {/* History */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Historique des versions ({history.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {history.map((row) => (
              <div
                key={row.id}
                className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                  row.is_active ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/40 bg-background/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">v{row.version}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString("fr-FR")}
                  </span>
                  {row.is_active && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
                      Active
                    </Badge>
                  )}
                </div>
                {!row.is_active && (
                  <Button variant="ghost" size="sm" onClick={() => handleActivateVersion(row)} className="text-xs">
                    Réactiver
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
