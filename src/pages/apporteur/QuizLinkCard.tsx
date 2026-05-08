// QuizLinkCard — section affichée dans le dashboard apporteur (/my-space)
// pour gérer son lien de prospection quiz et consulter ses stats funnel.
// Accès : CEO, OU détenteur d'un pass AL BARAKA actif, OU whitelist manuelle
// via la feature `quiz_lead_magnet` (back-door exceptions).
//
// Modèle :
//   - À l'inscription/1ère visite, un owner est auto-créé via la RPC
//     `ensure_quiz_owner_for_current_user` :
//     slug = "prenom-XXXXXX" auto-généré (verrouillé)
//     display_name = premier token du full_name (verrouillé)
//     display_role = "Membre AL BARAKA" (verrouillé)
//     whatsapp_phone = NULL, is_active = FALSE
//   - L'utilisateur valide son numéro WhatsApp → le lien devient actif.
//   - Seul le numéro WhatsApp peut être modifié ensuite.
//   - Les apporteurs déjà actifs (AVANT la migration) gardent leur slug
//     custom + display_name + display_role inchangés.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureUnlocks } from "@/hooks/useFeatureUnlock";
import { useUserPass } from "@/hooks/useUserPass";
import { useToast } from "@/hooks/use-toast";
import { getPublicAppOrigin } from "@/lib/impersonation";
import { PhoneInputField, isValidPhoneNumber } from "@/components/ui/PhoneInputField";
import {
  Copy, Check, ExternalLink, Sparkles, Save, X, Link as LinkIcon,
  Eye, MessageCircle, Loader2, Phone as PhoneIcon, ShieldCheck, Lock,
} from "lucide-react";

interface QuizOwnerRow {
  id: string;
  user_id: string;
  slug: string;
  display_name: string;
  display_role: string;
  whatsapp_phone: string | null;
  is_active: boolean;
  total_views: number | null;
}

interface FunnelStats {
  total_views: number;
  info_captured: number;     // au moins prénom + email + tél laissés (= toutes submissions)
  quiz_completed: number;    // quiz fini
  whatsapp_clicked: number;  // a cliqué sur le bouton WhatsApp
}

function buildPublicUrl(slug: string): string {
  return `${getPublicAppOrigin()}/quiz/${slug}`;
}

export default function QuizLinkCard() {
  const { profile } = useAuth();
  const { isLoading: featureLoading, has } = useFeatureUnlocks();
  const { hasAlBaraka, isLoading: passLoading } = useUserPass();
  const { toast } = useToast();

  const isCeo = profile?.role === "ceo";
  const isWhitelisted = has("quiz_lead_magnet");
  const canAccess = isCeo || hasAlBaraka || isWhitelisted;
  const accessLoading = featureLoading || passLoading;

  const [loading, setLoading] = useState(true);
  const [owner, setOwner] = useState<QuizOwnerRow | null>(null);
  const [stats, setStats] = useState<FunnelStats | null>(null);
  const [copied, setCopied] = useState(false);

  // Mode édition WhatsApp (uniquement)
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState<string | undefined>("");

  // ─── Fetch / auto-provision owner + stats ───
  const fetchAll = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // 1. Auto-provisionne via RPC (idempotent)
      const { data: ensured, error: ensureErr } = await (supabase.rpc as any)(
        "ensure_quiz_owner_for_current_user"
      );
      if (ensureErr) {
        console.error("[QuizLinkCard] ensure_quiz_owner failed", ensureErr);
        toast({
          title: "Impossible de charger ton lien",
          description: ensureErr.message,
          variant: "destructive",
        });
        setOwner(null);
        return;
      }
      // La RPC retourne un row (table function). Selon Supabase, c'est soit
      // l'objet direct, soit un tableau d'1 row.
      const row: QuizOwnerRow | null = Array.isArray(ensured)
        ? (ensured[0] ?? null)
        : ((ensured as QuizOwnerRow) ?? null);
      setOwner(row);

      if (row) {
        // 2. Stats funnel (3 étapes simplifiées)
        const { data: subs } = await supabase
          .from("lead_quiz_submissions")
          .select("status")
          .eq("owner_id", row.id);
        const s: FunnelStats = {
          total_views: row.total_views ?? 0,
          info_captured: 0,
          quiz_completed: 0,
          whatsapp_clicked: 0,
        };
        for (const sub of subs ?? []) {
          // Toutes les submissions ont au moins l'email capturé (donc info partielle).
          // Avec le nouveau flow (refonte 06/05/2026), prénom + email + tel sont
          // demandés dès le formulaire initial → le statut passe directement à
          // 'phone_captured' AVANT que le quiz ne commence. Donc 'phone_captured'
          // signifie maintenant "coordonnées laissées", pas "quiz fini".
          // Seuls quiz_completed (= quiz fini) et whatsapp_clicked (= a cliqué
          // sur WhatsApp à la fin) prouvent que le quiz a été terminé.
          s.info_captured++;
          const st = sub.status as string;
          if (st === "quiz_completed" || st === "whatsapp_clicked") {
            s.quiz_completed++;
          }
          if (st === "whatsapp_clicked") s.whatsapp_clicked++;
        }
        setStats(s);
      } else {
        setStats(null);
      }
    } finally {
      setLoading(false);
    }
  }, [profile, toast]);

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    fetchAll();
  }, [canAccess, fetchAll]);

  // ─── Pré-remplit le draft phone à l'ouverture du mode édition ───
  useEffect(() => {
    if (editingPhone && owner) {
      setPhoneDraft(owner.whatsapp_phone ?? "");
    }
  }, [editingPhone, owner]);

  // ─── Save phone (active aussi le lien si pas encore actif) ───
  const handleSavePhone = async () => {
    if (!owner || !phoneDraft || !isValidPhoneNumber(phoneDraft)) return;
    setSavingPhone(true);
    try {
      const updates: Record<string, unknown> = {
        whatsapp_phone: phoneDraft,
      };
      // Si le lien n'était pas encore actif, on l'active maintenant
      if (!owner.is_active) {
        updates.is_active = true;
      }
      const { error } = await supabase
        .from("lead_quiz_owners")
        .update(updates)
        .eq("id", owner.id);
      if (error) throw error;
      toast({
        title: owner.is_active ? "Numéro mis à jour" : "Ton lien est actif 🎉",
        description: owner.is_active
          ? undefined
          : "Tu peux maintenant le partager.",
      });
      setEditingPhone(false);
      await fetchAll();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Impossible d'enregistrer",
        variant: "destructive",
      });
    } finally {
      setSavingPhone(false);
    }
  };

  // ─── Copy ───
  const publicUrl = useMemo(() => (owner ? buildPublicUrl(owner.slug) : ""), [owner]);
  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Impossible de copier", variant: "destructive" });
    }
  };

  // ─── Rendu ───

  if (accessLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4">
          <Skeleton className="h-6 w-48 mb-3" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }
  if (!canAccess) return null;

  // ── Loading skeleton ──
  if (loading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold-400" />
            Mon lien de prospection quiz
          </h3>
        </div>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <Skeleton className="h-6 w-2/3 mb-3" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </section>
    );
  }

  if (!owner) {
    return (
      <section className="space-y-4">
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4 text-sm text-red-300">
            Impossible de charger ton lien. Réessaye dans un instant.
          </CardContent>
        </Card>
      </section>
    );
  }

  const needsSetup = !owner.is_active || !owner.whatsapp_phone;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold-400" />
          Mon lien de prospection quiz
          <Badge variant="outline" className="text-[10px] bg-gold-500/10 border-gold-500/30 text-gold-300 uppercase tracking-wider">Beta</Badge>
        </h3>
      </div>

      {needsSetup ? (
        // ─── État 1 : Setup WhatsApp obligatoire avant activation ──────
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-600/5">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-500/15 p-2 mt-0.5 shrink-0">
                <PhoneIcon className="h-4 w-4 text-amber-300" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground mb-1">
                  Une dernière étape : valide ton numéro WhatsApp
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ton lien personnel <code className="text-xs bg-muted/40 px-1.5 py-0.5 rounded">{owner.slug}</code> est prêt.
                  Avant de le partager, indique le numéro WhatsApp sur lequel tes prospects te contacteront à la fin du quiz.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label htmlFor="qlc-phone" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <PhoneIcon className="h-3.5 w-3.5" />
                Mon numéro WhatsApp
              </label>
              <PhoneInputField
                id="qlc-phone"
                value={phoneDraft}
                onChange={setPhoneDraft}
                defaultCountry="FR"
                placeholder="Ex : 6 12 34 56 78"
                disabled={savingPhone}
              />
              <p className="text-xs text-muted-foreground">
                Le prospect cliquera sur un bouton qui ouvrira WhatsApp avec un message pré-rempli vers ce numéro.
              </p>
            </div>

            <Button
              onClick={async () => {
                if (!phoneDraft || !isValidPhoneNumber(phoneDraft)) return;
                await handleSavePhone();
              }}
              disabled={savingPhone || !phoneDraft || !isValidPhoneNumber(phoneDraft)}
              className="gradient-primary text-primary-foreground gap-2 w-full sm:w-auto"
            >
              {savingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Activer mon lien
            </Button>
          </CardContent>
        </Card>
      ) : editingPhone ? (
        // ─── État 2 : Édition du numéro WhatsApp uniquement ──────
        <Card className="border-border/50">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <PhoneIcon className="h-4 w-4" />
                Modifier mon numéro WhatsApp
              </h4>
              <Button variant="ghost" size="sm" onClick={() => setEditingPhone(false)} disabled={savingPhone}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Champs verrouillés (lecture seule) */}
            <div className="space-y-3 rounded-md border border-border/50 bg-muted/20 p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Verrouillé
              </div>
              <ReadOnlyRow label="Lien" value={owner.slug} />
              <ReadOnlyRow label="Prénom affiché" value={owner.display_name} />
              <ReadOnlyRow label="Rôle affiché" value={owner.display_role} />
            </div>

            <div className="space-y-2">
              <label htmlFor="qlc-phone-edit" className="text-sm font-medium text-foreground">
                Mon numéro WhatsApp
              </label>
              <PhoneInputField
                id="qlc-phone-edit"
                value={phoneDraft}
                onChange={setPhoneDraft}
                defaultCountry="FR"
                placeholder="Ex : 6 12 34 56 78"
                disabled={savingPhone}
              />
              <p className="text-xs text-muted-foreground">
                Numéro actuel : <code className="text-foreground">{owner.whatsapp_phone}</code>
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditingPhone(false)} disabled={savingPhone}>
                Annuler
              </Button>
              <Button
                onClick={handleSavePhone}
                disabled={savingPhone || !phoneDraft || !isValidPhoneNumber(phoneDraft)}
                className="gap-2"
              >
                {savingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        // ─── État 3 : Vue active ──────
        <div className="space-y-3">
          <Card className="border-gold-500/20 bg-gradient-to-br from-gold-500/5 to-gold-600/5">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <LinkIcon className="h-4 w-4 text-gold-400" />
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Ton lien public</span>
                    <Badge className="text-[9px] bg-emerald-500/15 border-emerald-500/30 text-emerald-300 gap-1">
                      <ShieldCheck className="h-2.5 w-2.5" />
                      Actif
                    </Badge>
                  </div>
                  <code className="text-[14px] font-mono text-foreground bg-background/60 px-3 py-1.5 rounded-md border border-border/40 break-all inline-block">
                    {publicUrl}
                  </code>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copié" : "Copier"}
                  </Button>
                  <Button variant="outline" size="sm" asChild className="gap-1.5">
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ouvrir
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingPhone(true)} className="gap-1.5">
                    <PhoneIcon className="h-3.5 w-3.5" />
                    Modifier mon WhatsApp
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <MiniStat label="Coordonnées laissées" value={stats?.info_captured ?? 0} />
                <MiniStat label="Quiz terminés" value={stats?.quiz_completed ?? 0} />
                <MiniStat label="Clics WhatsApp" value={stats?.whatsapp_clicked ?? 0} accent />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                <Eye className="h-3 w-3" />
                {stats?.total_views ?? 0} visite{(stats?.total_views ?? 0) > 1 ? "s" : ""} au total sur ton lien
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground italic">
            💡 Les leads qui complètent le quiz apparaissent automatiquement dans tes leads ci-dessus (source "Apporteur&nbsp;- Quiz").
          </p>
        </div>
      )}
    </section>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0 w-28">{label}</span>
      <span className="text-foreground font-medium truncate">{value}</span>
    </div>
  );
}

function MiniStat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        accent
          ? "border-gold-500/30 bg-gold-500/10"
          : "border-border/50 bg-background/40"
      }`}
    >
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`text-lg font-bold mt-0.5 ${accent ? "text-gold-300" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

// Re-export pour rétrocompat (au cas où un autre composant l'importait)
export { isValidPhoneNumber };
