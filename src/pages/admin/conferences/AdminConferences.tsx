// AdminConferences — page CEO /admin/conferences
//
// Sprint S (17/05/2026) : interface admin pour configurer les rediffusions
// des conferences hebdomadaires.
//
// Workflow :
//   1. Liste des conferences pre-creees (1 par dimanche) avec filtre statut.
//   2. Pour chaque ligne : badge statut + bouton "Configurer" (modal) + bouton
//      "Copier le lien" actif si status=ready.
//   3. Modal de configuration : 4 champs (replay_url, replay_code,
//      video_duration_min, calendly_url). Save → le trigger SQL bascule
//      automatiquement le statut en 'ready' si tout est rempli.

import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, Copy, CheckCircle2, Clock, Archive, Settings2, Video } from "lucide-react";

interface Conference {
  id: string;
  conference_date: string;
  token: string;
  status: "scheduled" | "ready" | "archived";
  replay_url: string | null;
  replay_code: string | null;
  video_duration_min: number | null;
  calendly_url: string | null;
  ready_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<Conference["status"], { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof Clock }> = {
  scheduled: { label: "En attente", variant: "outline", icon: Clock },
  ready: { label: "Prête", variant: "default", icon: CheckCircle2 },
  archived: { label: "Archivée", variant: "secondary", icon: Archive },
};

function formatConferenceDate(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isPast(iso: string): boolean {
  const d = new Date(iso + "T23:59:59Z");
  return d.getTime() < Date.now();
}

export default function AdminConferences() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "ready" | "archived">("all");
  const [editingConf, setEditingConf] = useState<Conference | null>(null);

  // Garde CEO only (RLS le bloquerait de toute façon)
  if (profile && profile.role !== "ceo") {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: conferences, isLoading } = useQuery({
    queryKey: ["admin-conferences", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("conferences" as any)
        .select("*")
        .order("conference_date", { ascending: true });
      if (statusFilter !== "all") {
        q = q.eq("status", statusFilter);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as Conference[]) || [];
    },
  });

  // Sprint S2 (17/05/2026) : split en 2 sections
  //   - À venir : conference_date >= today, triées ASC (plus proche en haut)
  //   - Passées : conference_date < today, triées DESC (plus récente du passé en haut)
  // La conf du jour (ex: 17/05) reste dans "À venir" tant qu'on est le 17/05.
  const { upcoming, past } = useMemo(() => {
    if (!conferences) return { upcoming: [] as Conference[], past: [] as Conference[] };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming: Conference[] = [];
    const past: Conference[] = [];
    for (const c of conferences) {
      const d = new Date(c.conference_date + "T12:00:00Z");
      if (d.getTime() >= today.getTime()) upcoming.push(c);
      else past.push(c);
    }
    // upcoming est deja trie ASC (plus proche en haut) car requete ASC
    // past doit etre inverse pour avoir le plus recent en haut
    past.reverse();
    return { upcoming, past };
  }, [conferences]);

  const updateMutation = useMutation({
    mutationFn: async (input: {
      id: string;
      replay_url: string;
      replay_code: string;
      video_duration_min: number;
      calendly_url: string;
    }) => {
      const { error } = await supabase
        .from("conferences" as any)
        .update({
          replay_url: input.replay_url || null,
          replay_code: input.replay_code || null,
          video_duration_min: input.video_duration_min || null,
          calendly_url: input.calendly_url || null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-conferences"] });
      setEditingConf(null);
      toast.success("Conférence mise à jour");
    },
    onError: (e: any) => {
      toast.error(`Erreur : ${e?.message ?? "inconnue"}`);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("conferences" as any)
        .update({ status: "archived" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-conferences"] });
      toast.success("Conférence archivée");
    },
  });

  const counts = useMemo(() => {
    if (!conferences) return { total: 0, ready: 0, scheduled: 0, archived: 0 };
    return {
      total: conferences.length,
      ready: conferences.filter((c) => c.status === "ready").length,
      scheduled: conferences.filter((c) => c.status === "scheduled").length,
      archived: conferences.filter((c) => c.status === "archived").length,
    };
  }, [conferences]);

  function copyLink(token: string) {
    const url = `${window.location.origin}/redif/${token}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Lien copié dans le presse-papier"))
      .catch(() => toast.error("Impossible de copier"));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conférences — Rediffusions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure le replay de chaque conférence hebdomadaire. Une fois renseignée, copie le lien et partage-le sur WhatsApp.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total" value={counts.total} icon={Calendar} />
        <StatCard label="Prêtes" value={counts.ready} icon={CheckCircle2} variant="success" />
        <StatCard label="En attente" value={counts.scheduled} icon={Clock} />
        <StatCard label="Archivées" value={counts.archived} icon={Archive} variant="muted" />
      </div>

      {/* Filtre global */}
      <div className="flex justify-end">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="scheduled">En attente</SelectItem>
            <SelectItem value="ready">Prêtes</SelectItem>
            <SelectItem value="archived">Archivées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 text-muted-foreground text-sm">Chargement…</CardContent>
        </Card>
      ) : (
        <>
          {/* Section "À venir" */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-5 text-primary" />
                À venir
                <span className="text-sm font-normal text-muted-foreground">({upcoming.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucune conférence à venir{statusFilter !== "all" ? " avec ce statut" : ""}.</p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((conf) => (
                    <ConferenceRow
                      key={conf.id}
                      conference={conf}
                      onConfigure={setEditingConf}
                      onCopy={copyLink}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section "Passées" */}
          {past.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  <Archive className="size-5" />
                  Passées
                  <span className="text-sm font-normal text-muted-foreground">({past.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {past.map((conf) => (
                    <ConferenceRow
                      key={conf.id}
                      conference={conf}
                      onConfigure={setEditingConf}
                      onCopy={copyLink}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Modal de configuration */}
      {editingConf && (
        <ConferenceEditModal
          conference={editingConf}
          onClose={() => setEditingConf(null)}
          onSave={(input) => updateMutation.mutate(input)}
          onArchive={(id) => archiveMutation.mutate(id)}
          saving={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function ConferenceRow({
  conference,
  onConfigure,
  onCopy,
}: {
  conference: Conference;
  onConfigure: (c: Conference) => void;
  onCopy: (token: string) => void;
}) {
  const statusCfg = STATUS_LABELS[conference.status];
  const StatusIcon = statusCfg.icon;
  const past = isPast(conference.conference_date);
  const isReady = conference.status === "ready";
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex flex-col items-center justify-center w-16 h-16 rounded-md bg-muted/60 flex-shrink-0">
          <Calendar className="size-4 text-muted-foreground mb-1" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {new Date(conference.conference_date + "T12:00:00Z").toLocaleDateString("fr-FR", { month: "short" })}
          </span>
          <span className="text-sm font-bold leading-none">
            {new Date(conference.conference_date + "T12:00:00Z").getDate()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium capitalize">{formatConferenceDate(conference.conference_date)}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
            <code className="bg-muted px-1.5 py-0.5 rounded">{conference.token}</code>
            {conference.replay_url && (
              <span className="inline-flex items-center gap-1">
                <Video className="size-3" />
                <span className="truncate max-w-[200px]">Replay configuré</span>
              </span>
            )}
            {!past && (
              <Badge variant="outline" className="text-[10px]">À venir</Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant={statusCfg.variant} className="gap-1">
          <StatusIcon className="size-3" />
          {statusCfg.label}
        </Badge>
        <Button size="sm" variant="outline" onClick={() => onConfigure(conference)}>
          <Settings2 className="size-4 mr-1.5" />
          Configurer
        </Button>
        <Button
          size="sm"
          variant={isReady ? "default" : "outline"}
          disabled={!isReady}
          onClick={() => onCopy(conference.token)}
          title={isReady ? "Copier le lien à partager" : "Renseignez d'abord le replay pour activer le partage"}
        >
          <Copy className="size-4 mr-1.5" />
          Copier le lien
        </Button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string;
  value: number;
  icon: typeof Calendar;
  variant?: "success" | "muted";
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
        <Icon
          className={
            variant === "success"
              ? "size-8 text-green-500/70"
              : variant === "muted"
                ? "size-8 text-muted-foreground/50"
                : "size-8 text-primary/70"
          }
        />
      </CardContent>
    </Card>
  );
}

function ConferenceEditModal({
  conference,
  onClose,
  onSave,
  onArchive,
  saving,
}: {
  conference: Conference;
  onClose: () => void;
  onSave: (input: {
    id: string;
    replay_url: string;
    replay_code: string;
    video_duration_min: number;
    calendly_url: string;
  }) => void;
  onArchive: (id: string) => void;
  saving: boolean;
}) {
  const [replayUrl, setReplayUrl] = useState(conference.replay_url || "");
  const [replayCode, setReplayCode] = useState(conference.replay_code || "");
  const [duration, setDuration] = useState(String(conference.video_duration_min || 90));
  const [calendlyUrl, setCalendlyUrl] = useState(
    conference.calendly_url || "https://calendly.com/d/cvyb-4ts-83b/rediffusion-conference",
  );

  function handleSave() {
    const dur = parseInt(duration, 10);
    if (isNaN(dur) || dur <= 0) {
      toast.error("La durée doit être un nombre positif");
      return;
    }
    if (!replayUrl.trim()) {
      toast.error("L'URL du replay est requise");
      return;
    }
    onSave({
      id: conference.id,
      replay_url: replayUrl.trim(),
      replay_code: replayCode.trim(),
      video_duration_min: dur,
      calendly_url: calendlyUrl.trim(),
    });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="capitalize">Conférence du {formatConferenceDate(conference.conference_date)}</DialogTitle>
          <DialogDescription>
            Renseigne le replay Zoom + le code d'accès. Quand les 4 champs sont remplis, le statut passe automatiquement en « Prête » et le lien devient copiable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="replay-url">URL du replay</Label>
            <Input
              id="replay-url"
              value={replayUrl}
              onChange={(e) => setReplayUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... ou https://zoom.us/rec/share/..."
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              💡 <strong>Pour un visionnage intégré directement dans la page</strong> (sans pop-up),
              privilégie <strong>YouTube</strong> (en mode « non répertoriée »), <strong>Vimeo</strong> ou <strong>Loom</strong>.<br/>
              Avec <strong>Zoom</strong>, l'embed est bloqué (limite de leur sécurité) → la page affichera
              un bouton pour ouvrir Zoom dans un nouvel onglet. Le compteur continue de tourner.
            </p>
          </div>
          <div>
            <Label htmlFor="replay-code">
              Code d'accès <span className="text-muted-foreground font-normal">(optionnel)</span>
            </Label>
            <Input
              id="replay-code"
              value={replayCode}
              onChange={(e) => setReplayCode(e.target.value)}
              placeholder="Uniquement si Zoom (ex : abc123)"
              className="mt-1 font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Laisse vide pour YouTube / Vimeo / Loom (pas de code requis).
            </p>
          </div>
          <div>
            <Label htmlFor="duration">Durée de la vidéo (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Le bouton « J'ai terminé » se débloquera après 90 % de cette durée (= {Math.round((parseInt(duration, 10) || 0) * 0.9)} min).
            </p>
          </div>
          <div>
            <Label htmlFor="calendly-url">URL Calendly du coach</Label>
            <Input
              id="calendly-url"
              value={calendlyUrl}
              onChange={(e) => setCalendlyUrl(e.target.value)}
              placeholder="https://calendly.com/..."
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Default préfilled. Tu peux le surcharger par conférence si besoin.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2 mt-6">
          {conference.status !== "archived" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("Archiver cette conférence ? Le lien deviendra inaccessible.")) {
                  onArchive(conference.id);
                  onClose();
                }
              }}
              className="text-destructive hover:bg-destructive/10"
            >
              <Archive className="size-4 mr-1.5" />
              Archiver
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
