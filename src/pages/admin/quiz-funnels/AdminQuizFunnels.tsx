// Admin CRUD pour gérer les tunnels Quiz Scoring.
// Accessible CEO only. Sidali édite ici les 4 tunnels (slug, nom,
// thank-you URL, actif/inactif) sans qu'on redéploie l'app.
//
// Donne aussi à chaque tunnel l'URL d'embed prête à coller dans Systemio.

import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, Copy, ExternalLink, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// ──────────────────────────────────────────────────────────────────────

interface FunnelRow {
  slug: string;
  name: string;
  thank_you_url: string;
  active: boolean;
  created_at: string;
}

interface FunnelStats {
  funnel_slug: string;
  total: number;
  chaud: number;
  tiede: number;
  froid: number;
  hors_cible: number;
  avg_score: number | null;
}

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$/;

function isValidSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug);
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function buildEmbedUrl(slug: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://plateforme.albarakaecosysteme.com";
  return `${origin}/quiz-funnel?slug=${encodeURIComponent(slug)}&prenom={contact_first_name}&email={contact_email}&tel={contact_phone}`;
}

// ──────────────────────────────────────────────────────────────────────

export default function AdminQuizFunnels() {
  const { profile } = useAuth();
  const { toast } = useToast();

  // Hooks doivent toujours être appelés dans le même ordre, AVANT toute early
  // return conditionnelle (règle React Hooks).
  const [loading, setLoading] = useState(true);
  const [funnels, setFunnels] = useState<FunnelRow[]>([]);
  const [stats, setStats] = useState<Map<string, FunnelStats>>(new Map());
  const [editing, setEditing] = useState<FunnelRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [funnelsRes, respsRes] = await Promise.all([
        supabase.from("quiz_funnels").select("*").order("created_at", { ascending: false }),
        supabase.from("funnel_quiz_responses").select("funnel_slug, score, category"),
      ]);
      if (funnelsRes.data) setFunnels(funnelsRes.data as FunnelRow[]);

      // Agréger les stats par tunnel
      const map = new Map<string, FunnelStats>();
      for (const r of (respsRes.data || []) as { funnel_slug: string; score: number; category: string }[]) {
        const cur = map.get(r.funnel_slug) || {
          funnel_slug: r.funnel_slug, total: 0, chaud: 0, tiede: 0, froid: 0, hors_cible: 0, avg_score: 0,
        };
        cur.total += 1;
        if (r.category === "chaud") cur.chaud += 1;
        else if (r.category === "tiede") cur.tiede += 1;
        else if (r.category === "froid") cur.froid += 1;
        else if (r.category === "hors_cible") cur.hors_cible += 1;
        cur.avg_score = ((cur.avg_score ?? 0) * (cur.total - 1) + r.score) / cur.total;
        map.set(r.funnel_slug, cur);
      }
      setStats(map);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      toast({ title: "Erreur de chargement", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const copyEmbed = (slug: string) => {
    const url = buildEmbedUrl(slug);
    navigator.clipboard?.writeText(url);
    toast({ title: "URL d'embed copiée", description: url });
  };

  const handleDelete = async () => {
    if (!deletingSlug) return;
    const { error } = await supabase.from("quiz_funnels").delete().eq("slug", deletingSlug);
    if (error) {
      toast({ title: "Suppression impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Tunnel supprimé" });
    setDeletingSlug(null);
    fetchAll();
  };

  // Garde de rôle après les hooks pour éviter les warnings React.
  if (profile && profile.role !== "ceo") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tunnels Quiz Scoring</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure les tunnels embed dans Systemio. Chaque tunnel a sa propre thank-you URL.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nouveau tunnel
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : funnels.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucun tunnel configuré pour l'instant.
            <br />
            Crée le premier en cliquant sur « Nouveau tunnel ».
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {funnels.map((f) => {
            const s = stats.get(f.slug);
            return (
              <Card key={f.slug}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <CardTitle className="text-lg">{f.name}</CardTitle>
                        {f.active ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Actif</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Inactif</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">slug: {f.slug}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => copyEmbed(f.slug)} title="Copier l'URL d'embed">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditing(f)} title="Modifier">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingSlug(f.slug)} title="Supprimer">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Thank-you URL */}
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Thank-you URL</p>
                    <a
                      href={f.thank_you_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline break-all"
                    >
                      {f.thank_you_url}
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-border/50">
                    <StatCell label="Total" value={s?.total ?? 0} />
                    <StatCell label="🟢 Chaud" value={s?.chaud ?? 0} />
                    <StatCell label="🟡 Tiède" value={s?.tiede ?? 0} />
                    <StatCell label="🟠 Froid" value={s?.froid ?? 0} />
                    <StatCell label="Score moy." value={s?.avg_score != null ? Math.round(s.avg_score) : "—"} />
                  </div>

                  {/* URL d'embed prête à copier */}
                  <details className="pt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Voir l'URL d'embed Systemio
                    </summary>
                    <div className="mt-2 p-2.5 bg-muted/40 rounded font-mono text-[11px] break-all">
                      {buildEmbedUrl(f.slug)}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Sidali doit coller cette URL dans la balise <code>iframe src</code> de la page intermédiaire Systemio.
                      Les variables <code>{"{contact_first_name}"}</code>, <code>{"{contact_email}"}</code>, <code>{"{contact_phone}"}</code>{" "}
                      seront remplacées par Systemio à l'affichage.
                    </p>
                  </details>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modale Create / Edit */}
      <FunnelEditDialog
        open={creating || editing !== null}
        funnel={editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={() => { setCreating(false); setEditing(null); fetchAll(); }}
      />

      {/* Confirmation suppression */}
      <AlertDialog open={deletingSlug !== null} onOpenChange={(open) => !open && setDeletingSlug(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce tunnel ?</AlertDialogTitle>
            <AlertDialogDescription>
              La suppression est bloquée si des leads sont déjà rattachés à ce tunnel (contrainte d'intégrité).
              Désactive-le plutôt si tu veux arrêter d'accepter de nouvelles soumissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────

function FunnelEditDialog({
  open,
  funnel,
  onClose,
  onSaved,
}: {
  open: boolean;
  funnel: FunnelRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = funnel !== null;
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [thankYouUrl, setThankYouUrl] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSlug(funnel?.slug ?? "");
      setName(funnel?.name ?? "");
      setThankYouUrl(funnel?.thank_you_url ?? "");
      setActive(funnel?.active ?? true);
    }
  }, [open, funnel]);

  const slugValid = !slug || isValidSlug(slug);
  const urlValid = !thankYouUrl || isValidUrl(thankYouUrl);
  const canSave = slug && name && thankYouUrl && slugValid && urlValid && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (isEdit) {
        const { error } = await supabase
          .from("quiz_funnels")
          .update({ name, thank_you_url: thankYouUrl, active })
          .eq("slug", funnel.slug);
        if (error) throw error;
        toast({ title: "Tunnel mis à jour" });
      } else {
        const { error } = await supabase
          .from("quiz_funnels")
          .insert({ slug, name, thank_you_url: thankYouUrl, active });
        if (error) throw error;
        toast({ title: "Tunnel créé" });
      }
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le tunnel" : "Nouveau tunnel"}</DialogTitle>
          <DialogDescription>
            Le slug apparaît dans l'URL d'embed Systemio et ne peut pas être modifié après création.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              disabled={isEdit}
              placeholder="ex: tunnel-reconversion"
              className="font-mono"
            />
            {!slugValid && (
              <p className="text-xs text-red-400 mt-1">
                Format : lettres minuscules, chiffres, tirets. Min 3, max 42 caractères.
              </p>
            )}
            {!isEdit && slugValid && slug && (
              <p className="text-xs text-muted-foreground mt-1">
                URL d'embed : <code className="text-foreground">{buildEmbedUrl(slug)}</code>
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="name">Nom du tunnel</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Tunnel Reconversion 2026"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Apparaît dans le CRM (détail du lead) et dans le récap admin.
            </p>
          </div>

          <div>
            <Label htmlFor="url">Thank-you URL (Systemio)</Label>
            <Input
              id="url"
              value={thankYouUrl}
              onChange={(e) => setThankYouUrl(e.target.value)}
              placeholder="https://..."
            />
            {!urlValid && <p className="text-xs text-red-400 mt-1">URL invalide.</p>}
          </div>

          <div className="flex items-center justify-between rounded-md border border-border/50 p-3">
            <div>
              <Label htmlFor="active" className="text-sm font-medium">Tunnel actif</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Si désactivé, le quiz refuse les nouvelles soumissions.
              </p>
            </div>
            <Switch id="active" checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
