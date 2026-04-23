// QuizLinkCard — section affichée dans le dashboard apporteur (/my-space)
// pour configurer son lien de prospection quiz et consulter ses stats funnel.
// Gated par la feature `quiz_lead_magnet` (whitelist Sid Test au démarrage).

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureUnlocks } from "@/hooks/useFeatureUnlock";
import { useToast } from "@/hooks/use-toast";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Copy, Check, ExternalLink, Sparkles, Pencil, Save, X, Link as LinkIcon, Eye, Mail, CheckCircle2, Phone as PhoneIcon, MessageCircle, Loader2 } from "lucide-react";

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

interface QuizOwnerRow {
  id: string;
  user_id: string;
  slug: string;
  display_name: string;
  display_role: string;
  whatsapp_phone: string;
  is_active: boolean;
  total_views: number | null;
}

interface FunnelStats {
  total_views: number;
  email_captured: number;
  quiz_completed: number;
  phone_captured: number;
  whatsapp_clicked: number;
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$|^[a-z0-9]{3,30}$/;

function proposeSlug(fullName: string | null | undefined, userId: string): string {
  const base =
    (fullName ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 22) || "apporteur";
  const suffix = userId.replace(/[^a-z0-9]/g, "").slice(0, 5);
  const candidate = `${base}-${suffix}`;
  // Trim éventuel dépassement
  return candidate.slice(0, 30).replace(/-+$/, "");
}

function buildPublicUrl(slug: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/quiz/${slug}`;
  }
  return `/quiz/${slug}`;
}

// ──────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────

export default function QuizLinkCard() {
  const { profile } = useAuth();
  const { isLoading: featureLoading, has } = useFeatureUnlocks();
  const { toast } = useToast();

  const isCeo = profile?.role === "ceo";
  const isWhitelisted = has("quiz_lead_magnet");
  const canAccess = isCeo || isWhitelisted;

  const [loading, setLoading] = useState(true);
  const [owner, setOwner] = useState<QuizOwnerRow | null>(null);
  const [stats, setStats] = useState<FunnelStats | null>(null);
  const [copied, setCopied] = useState(false);

  // Mode édition (nouvel owner ou édition)
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [slug, setSlug] = useState("");
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [displayRole, setDisplayRole] = useState("Membre AL BARAKA");
  const [whatsappPhone, setWhatsappPhone] = useState<string | undefined>("");

  // ─── Fetch owner + stats ───
  const fetchAll = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data: ownerRow } = await supabase
        .from("lead_quiz_owners")
        .select("id, user_id, slug, display_name, display_role, whatsapp_phone, is_active, total_views")
        .eq("user_id", profile.id)
        .maybeSingle();

      setOwner(ownerRow ?? null);

      if (ownerRow) {
        // Stats funnel : on fait un fetch simple de toutes les submissions et on compte côté client
        const { data: subs } = await supabase
          .from("lead_quiz_submissions")
          .select("status")
          .eq("owner_id", ownerRow.id);
        const s: FunnelStats = {
          total_views: ownerRow.total_views ?? 0,
          email_captured: 0,
          quiz_completed: 0,
          phone_captured: 0,
          whatsapp_clicked: 0,
        };
        for (const row of subs ?? []) {
          s.email_captured++;
          const st = row.status as string;
          if (st === "quiz_completed" || st === "phone_captured" || st === "whatsapp_clicked") s.quiz_completed++;
          if (st === "phone_captured" || st === "whatsapp_clicked") s.phone_captured++;
          if (st === "whatsapp_clicked") s.whatsapp_clicked++;
        }
        setStats(s);
      } else {
        setStats(null);
      }
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    fetchAll();
  }, [canAccess, fetchAll]);

  // ─── Préremplissage du form pour création ───
  useEffect(() => {
    if (!owner && profile && editing) {
      setSlug((prev) => prev || proposeSlug(profile.full_name, profile.id));
      setDisplayName((prev) => prev || (profile.full_name ?? "").split(" ")[0] || "Apporteur");
      setDisplayRole((prev) => prev || "Membre AL BARAKA");
    }
    if (owner && editing) {
      setSlug(owner.slug);
      setDisplayName(owner.display_name);
      setDisplayRole(owner.display_role);
      setWhatsappPhone(owner.whatsapp_phone);
    }
  }, [editing, owner, profile]);

  // ─── Vérification d'unicité du slug (debounced) ───
  useEffect(() => {
    if (!editing || owner) return; // inutile si édition (slug verrouillé)
    const trimmed = slug.trim().toLowerCase();
    setSlugError(null);
    if (!trimmed) return;
    if (!SLUG_REGEX.test(trimmed)) {
      setSlugError("3 à 30 caractères, uniquement lettres minuscules, chiffres et tirets");
      return;
    }
    setSlugChecking(true);
    const t = setTimeout(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("is_quiz_slug_available", { p_slug: trimmed });
      if (!error && data === false) {
        setSlugError("Ce lien est déjà utilisé, choisis-en un autre");
      }
      setSlugChecking(false);
    }, 400);
    return () => clearTimeout(t);
  }, [slug, editing, owner]);

  // ─── Validation form ───
  const canSave =
    displayName.trim().length >= 2 &&
    displayRole.trim().length >= 2 &&
    !!whatsappPhone &&
    isValidPhoneNumber(whatsappPhone) &&
    (owner ? true : !!slug && !slugError && !slugChecking) &&
    !saving;

  // ─── Save ───
  const handleSave = async () => {
    if (!profile || !canSave) return;
    setSaving(true);
    try {
      if (!owner) {
        // CREATE
        const { error } = await supabase.from("lead_quiz_owners").insert({
          user_id: profile.id,
          slug: slug.trim().toLowerCase(),
          display_name: displayName.trim(),
          display_role: displayRole.trim(),
          whatsapp_phone: whatsappPhone!,
          is_active: true,
        });
        if (error) throw error;
        toast({ title: "Ton lien est actif 🎉", description: "Tu peux maintenant le partager." });
      } else {
        // UPDATE (slug verrouillé)
        const { error } = await supabase
          .from("lead_quiz_owners")
          .update({
            display_name: displayName.trim(),
            display_role: displayRole.trim(),
            whatsapp_phone: whatsappPhone!,
          })
          .eq("id", owner.id);
        if (error) throw error;
        toast({ title: "Infos mises à jour" });
      }
      setEditing(false);
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message ?? "Impossible d'enregistrer", variant: "destructive" });
    } finally {
      setSaving(false);
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

  // Gated : pas d'accès → on n'affiche rien du tout (section invisible)
  if (featureLoading) {
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

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold-400" />
          Mon lien de prospection quiz
          <Badge variant="outline" className="text-[10px] bg-gold-500/10 border-gold-500/30 text-gold-300 uppercase tracking-wider">Beta</Badge>
        </h3>
      </div>

      {loading ? (
        <Card className="border-border/50">
          <CardContent className="p-6">
            <Skeleton className="h-6 w-2/3 mb-3" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : !owner && !editing ? (
        // ─── Setup initial ───
        <Card className="border-border/50 bg-gradient-to-br from-gold-500/5 to-gold-600/5">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-gold-400" />
                Active ton lien de quiz personnalisé
              </h4>
              <p className="text-sm text-muted-foreground">
                Partage un lien unique sur tes réseaux. Chaque prospect qui complète le quiz devient automatiquement un de tes leads.
              </p>
            </div>
            <Button onClick={() => setEditing(true)} className="gradient-primary text-primary-foreground gap-2 shrink-0">
              <Sparkles className="h-4 w-4" />
              Configurer mon lien
            </Button>
          </CardContent>
        </Card>
      ) : editing ? (
        // ─── Form création / édition ───
        <Card className="border-border/50">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-foreground">{owner ? "Modifier mes infos" : "Configurer mon lien"}</h4>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center justify-between">
                <span>Mon identifiant de lien</span>
                {owner && <span className="text-xs text-muted-foreground italic">Verrouillé après activation</span>}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">/quiz/</span>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="ex: youssef"
                  disabled={!!owner || saving}
                  className="bg-background"
                />
                {slugChecking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              {slugError && <p className="text-xs text-red-400">⚠️ {slugError}</p>}
              {!slugError && slug && !slugChecking && !owner && SLUG_REGEX.test(slug.trim()) && (
                <p className="text-xs text-emerald-400">✓ Identifiant disponible</p>
              )}
              <p className="text-xs text-muted-foreground">
                Ton lien final : <span className="text-foreground">{buildPublicUrl(slug || "ton-slug")}</span>
              </p>
            </div>

            {/* Display name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Prénom affiché au prospect</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex : Youssef"
                disabled={saving}
                className="bg-background"
                maxLength={40}
              />
              <p className="text-xs text-muted-foreground">
                C'est ce que le prospect verra : "Pour t'inscrire, écris à <b>{displayName || "…"}</b>"
              </p>
            </div>

            {/* Display role */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Mon titre / rôle</label>
              <Input
                value={displayRole}
                onChange={(e) => setDisplayRole(e.target.value)}
                placeholder="Ex : Coach AL BARAKA"
                disabled={saving}
                className="bg-background"
                maxLength={60}
              />
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Mon numéro WhatsApp</label>
              <PhoneInput
                international
                defaultCountry="FR"
                value={whatsappPhone}
                onChange={setWhatsappPhone}
                placeholder="Ex : 6 12 34 56 78"
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Le prospect cliquera sur un bouton qui ouvrira WhatsApp avec un message pré-rempli vers ce numéro.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={!canSave} className="gradient-primary text-primary-foreground gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {owner ? "Enregistrer" : "Activer mon lien"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        // ─── Vue active du lien ───
        owner && (
          <div className="space-y-3">
            <Card className="border-gold-500/20 bg-gradient-to-br from-gold-500/5 to-gold-600/5">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <LinkIcon className="h-4 w-4 text-gold-400" />
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">Ton lien public</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-[14px] font-mono text-foreground bg-background/60 px-3 py-1.5 rounded-md border border-border/40 break-all">
                        {publicUrl}
                      </code>
                    </div>
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
                    <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
                      <Pencil className="h-3.5 w-3.5" />
                      Modifier
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <MiniStat icon={<Mail className="h-3.5 w-3.5" />} label="Emails capturés" value={stats?.email_captured ?? 0} />
                  <MiniStat icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Quiz terminés" value={stats?.quiz_completed ?? 0} />
                  <MiniStat icon={<PhoneIcon className="h-3.5 w-3.5" />} label="Téléphones" value={stats?.phone_captured ?? 0} accent />
                  <MiniStat icon={<MessageCircle className="h-3.5 w-3.5" />} label="Clics WhatsApp" value={stats?.whatsapp_clicked ?? 0} />
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                  <Eye className="h-3 w-3" />
                  {stats?.total_views ?? 0} visite{(stats?.total_views ?? 0) > 1 ? "s" : ""} au total sur ton lien
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground italic">
              💡 Les leads qui laissent leur téléphone apparaissent automatiquement dans tes leads ci-dessus (source "Apporteur&nbsp;- Quiz").
            </p>
          </div>
        )
      )}
    </section>
  );
}

function MiniStat({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        accent
          ? "border-gold-500/30 bg-gold-500/10"
          : "border-border/50 bg-background/40"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`text-lg font-bold mt-0.5 ${accent ? "text-gold-300" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
