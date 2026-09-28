// ─────────────────────────────────────────────────────────────────────────
// Section « Renvois » de l'éditeur de chapitre.
//
// Un renvoi dit à l'élève, à un endroit précis : « pour aller plus loin, va
// sur tel chapitre ». Il part de tout le chapitre ou d'une de ses vidéos, et
// mène à un chapitre de n'importe quelle formation — éventuellement à une
// vidéo précise. Une phrase libre, facultative, l'introduit.
//
// On enregistre des identifiants, jamais des titres : renommer ou déplacer un
// chapitre ne casse aucun renvoi. La section montre aussi l'inverse — les
// chapitres qui renvoient ICI — pour ne pas supprimer un chapitre à l'aveugle.
// ─────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CornerDownLeft, CornerDownRight, EyeOff, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cleRenvois, useRenvoisDuChapitre, type Renvoi } from "@/hooks/useRenvois";
import { cheminCible } from "@/components/training/Renvois";

// La table n'est pas encore dans les types générés.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const TOUT_LE_CHAPITRE = "__chapitre__";
const DEBUT_DU_CHAPITRE = "__debut__";
export const MESSAGE_MAX = 280;

interface VideoSource {
  id: string;
  titre: string;
  ordre: number;
}

interface Catalogue {
  formations: { id: string; slug: string; titre: string; ordre: number }[];
  modules: { id: string; formation_id: string; titre: string; ordre: number }[];
  chapitres: { id: string; module_id: string; titre: string; ordre: number; status: string }[];
  videos: { id: string; chapitre_id: string; titre: string; ordre: number }[];
}

/**
 * Toutes les formations, modules, chapitres et vidéos, pour choisir une cible.
 * ⚠️ PostgREST plafonne chaque réponse à 1 000 lignes, sans erreur. On en est
 * loin (178 vidéos le 28/09/2026) ; au-delà, il faudrait paginer.
 */
function useCatalogue() {
  return useQuery({
    queryKey: ["admin-training", "catalogue-renvois"],
    staleTime: 60_000,
    queryFn: async (): Promise<Catalogue> => {
      const [f, m, c, v] = await Promise.all([
        db.from("formations").select("id, slug, titre, ordre").order("ordre"),
        db.from("formation_modules").select("id, formation_id, titre, ordre").order("ordre"),
        db.from("formation_chapitres").select("id, module_id, titre, ordre, status").order("ordre"),
        db.from("chapitre_videos").select("id, chapitre_id, titre, ordre").order("ordre"),
      ]);
      for (const r of [f, m, c, v]) if (r.error) throw r.error;
      return { formations: f.data, modules: m.data, chapitres: c.data, videos: v.data };
    },
  });
}

/** Les chapitres qui renvoient vers celui-ci. */
function useRenvoisEntrants(chapitreId: string) {
  return useQuery({
    queryKey: ["admin-training", "renvois-entrants", chapitreId],
    queryFn: async () => {
      const { data, error } = await db
        .from("chapitre_renvois")
        .select(
          `id, chapitre_id,
          source:formation_chapitres!chapitre_renvois_chapitre_id_fkey(titre,
            formation_modules(formations(slug, titre)))`,
        )
        .eq("cible_chapitre_id", chapitreId);
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        chapitre_id: string;
        source: { titre: string; formation_modules: { formations: { slug: string; titre: string } } };
      }[];
    },
  });
}

const num = (i: number) => String(i + 1).padStart(2, "0");

export default function RenvoisSection({ chapitreId, videos }: { chapitreId: string; videos: VideoSource[] }) {
  const qc = useQueryClient();
  const renvois = useRenvoisDuChapitre(chapitreId);
  const entrants = useRenvoisEntrants(chapitreId);
  const catalogue = useCatalogue();

  const [position, setPosition] = useState(TOUT_LE_CHAPITRE);
  const [formationId, setFormationId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [cibleChapitreId, setCibleChapitreId] = useState("");
  const [cibleVideoId, setCibleVideoId] = useState(DEBUT_DU_CHAPITRE);
  const [message, setMessage] = useState("");

  const cat = catalogue.data;
  const modules = useMemo(() => cat?.modules.filter((m) => m.formation_id === formationId) ?? [], [cat, formationId]);
  const chapitres = useMemo(() => cat?.chapitres.filter((c) => c.module_id === moduleId) ?? [], [cat, moduleId]);
  const videosCible = useMemo(() => cat?.videos.filter((v) => v.chapitre_id === cibleChapitreId) ?? [], [cat, cibleChapitreId]);
  const versSoi = cibleChapitreId === chapitreId;

  const rafraichir = () => {
    qc.invalidateQueries({ queryKey: cleRenvois(chapitreId) });
    qc.invalidateQueries({ queryKey: ["admin-training", "renvois-entrants"] });
  };
  const echec = (e: unknown) => toast.error((e as Error)?.message ?? "Opération impossible");

  const ajout = useMutation({
    mutationFn: async () => {
      if (!cibleChapitreId) throw new Error("Choisissez le chapitre vers lequel renvoyer.");
      if (versSoi && cibleVideoId === DEBUT_DU_CHAPITRE)
        throw new Error("Vers ce même chapitre, choisissez une autre vidéo.");
      const lignes = renvois.data ?? [];
      const ordre = lignes.reduce((m, r) => Math.max(m, r.ordre), 0) + 1;
      const texte = message.trim();
      const { error } = await db.from("chapitre_renvois").insert({
        chapitre_id: chapitreId,
        video_id: position === TOUT_LE_CHAPITRE ? null : position,
        cible_chapitre_id: cibleChapitreId,
        cible_video_id: cibleVideoId === DEBUT_DU_CHAPITRE ? null : cibleVideoId,
        message: texte || null,
        ordre,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      setCibleChapitreId("");
      setCibleVideoId(DEBUT_DU_CHAPITRE);
      rafraichir();
      toast.success("Renvoi ajouté");
    },
    onError: echec,
  });

  const majMessage = useMutation({
    mutationFn: async ({ id, texte }: { id: string; texte: string }) => {
      const { error } = await db.from("chapitre_renvois").update({ message: texte || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: rafraichir,
    onError: echec,
  });

  const suppression = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("chapitre_renvois").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      rafraichir();
      toast.success("Renvoi supprimé");
    },
    onError: echec,
  });

  /** Échange deux renvois voisins d'un même emplacement. */
  const deplacer = async (groupe: Renvoi[], i: number, sens: -1 | 1) => {
    const a = groupe[i];
    const b = groupe[i + sens];
    if (!a || !b) return;
    const oa = a.ordre === b.ordre ? i + 1 : a.ordre;
    const ob = a.ordre === b.ordre ? i + 1 + sens : b.ordre;
    const r1 = await db.from("chapitre_renvois").update({ ordre: ob }).eq("id", a.id);
    const r2 = await db.from("chapitre_renvois").update({ ordre: oa }).eq("id", b.id);
    if (r1.error || r2.error) echec(r1.error ?? r2.error);
    rafraichir();
  };

  const lignes = renvois.data ?? [];
  const groupes: { cle: string; libelle: string; renvois: Renvoi[] }[] = [
    { cle: TOUT_LE_CHAPITRE, libelle: "Tout le chapitre (après « À retenir »)", renvois: lignes.filter((r) => !r.video_id) },
    ...videos.map((v, i) => ({
      cle: v.id,
      libelle: `Sous la vidéo ${num(i)} · ${v.titre}`,
      renvois: lignes.filter((r) => r.video_id === v.id),
    })),
  ].filter((g) => g.renvois.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CornerDownRight className="h-4 w-4 text-primary" />
          Renvois vers d'autres chapitres ({lignes.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Affichés à l'élève dans « Pour aller plus loin ». Vers une formation qu'il n'a pas, le renvoi apparaît verrouillé.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Renvois existants, par emplacement */}
        {renvois.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : groupes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun renvoi pour l'instant.</p>
        ) : (
          <div className="space-y-4">
            {groupes.map((g) => (
              <div key={g.cle} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.libelle}</p>
                {g.renvois.map((r, i) => (
                  <div key={r.id} className="flex items-start gap-2 rounded-lg border p-3">
                    <div className="flex flex-col">
                      <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Monter" disabled={i === 0} onClick={() => deplacer(g.renvois, i, -1)}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Descendre" disabled={i === g.renvois.length - 1} onClick={() => deplacer(g.renvois, i, 1)}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {cheminCible(r)}
                        </span>
                        {!r.meme_formation && <Badge variant="outline">Autre formation</Badge>}
                        {!r.cible_publiee && (
                          <Badge variant="outline" className="gap-1 text-amber-600">
                            <EyeOff className="h-3 w-3" /> Cible en brouillon : invisible pour les élèves
                          </Badge>
                        )}
                      </div>
                      <MessageModifiable
                        valeur={r.message ?? ""}
                        onEnregistrer={(texte) => majMessage.mutate({ id: r.id, texte })}
                      />
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Supprimer le renvoi">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer ce renvoi ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Le lien vers « {r.cible_chapitre_titre} » disparaît de ce chapitre. Le chapitre cible n'est pas touché.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => suppression.mutate(r.id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Ajout */}
        <div className="space-y-3 rounded-lg border border-dashed p-4">
          <p className="text-sm font-medium">Ajouter un renvoi</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Où l'afficher dans ce chapitre</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger aria-label="Où l'afficher dans ce chapitre">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TOUT_LE_CHAPITRE}>Tout le chapitre</SelectItem>
                  {videos.map((v, i) => (
                    <SelectItem key={v.id} value={v.id}>
                      Sous la vidéo {num(i)} · {v.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Formation</Label>
              <Select
                value={formationId}
                onValueChange={(v) => {
                  setFormationId(v);
                  setModuleId("");
                  setCibleChapitreId("");
                  setCibleVideoId(DEBUT_DU_CHAPITRE);
                }}
              >
                <SelectTrigger aria-label="Formation cible">
                  <SelectValue placeholder={catalogue.isLoading ? "Chargement…" : "Choisir"} />
                </SelectTrigger>
                <SelectContent>
                  {cat?.formations.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Module</Label>
              <Select
                value={moduleId}
                disabled={!formationId}
                onValueChange={(v) => {
                  setModuleId(v);
                  setCibleChapitreId("");
                  setCibleVideoId(DEBUT_DU_CHAPITRE);
                }}
              >
                <SelectTrigger aria-label="Module cible">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Chapitre</Label>
              <Select
                value={cibleChapitreId}
                disabled={!moduleId}
                onValueChange={(v) => {
                  setCibleChapitreId(v);
                  setCibleVideoId(DEBUT_DU_CHAPITRE);
                }}
              >
                <SelectTrigger aria-label="Chapitre cible">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {chapitres.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.titre}
                      {c.id === chapitreId ? " (ce chapitre)" : ""}
                      {c.status !== "published" ? " — brouillon" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Vidéo (facultatif)</Label>
              <Select value={cibleVideoId} disabled={!cibleChapitreId || videosCible.length === 0} onValueChange={setCibleVideoId}>
                <SelectTrigger aria-label="Vidéo cible">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEBUT_DU_CHAPITRE}>{versSoi ? "Choisir une vidéo" : "Début du chapitre"}</SelectItem>
                  {videosCible.map((v, i) => (
                    <SelectItem key={v.id} value={v.id}>
                      Vidéo {num(i)} · {v.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="renvoi-message">Phrase d'introduction (facultatif)</Label>
              <Textarea
                id="renvoi-message"
                rows={2}
                maxLength={MESSAGE_MAX}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ex. : Si tu veux approfondir le traitement des objections, va sur ce chapitre."
              />
              <p className="text-right text-xs text-muted-foreground">
                {message.length}/{MESSAGE_MAX}
              </p>
            </div>
          </div>
          <Button onClick={() => ajout.mutate()} disabled={ajout.isPending || !cibleChapitreId} className="gap-2">
            {ajout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Ajouter le renvoi
          </Button>
        </div>

        {/* Renvois entrants */}
        {(entrants.data?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <CornerDownLeft className="h-3.5 w-3.5" />
              Ces chapitres renvoient ici ({entrants.data!.length})
            </p>
            <ul className="space-y-1 text-sm">
              {entrants.data!.map((e) => {
                const f = e.source?.formation_modules?.formations;
                return (
                  <li key={e.id}>
                    <Link to={`/admin/training/${f?.slug}/chapitre/${e.chapitre_id}`} className="text-primary hover:underline">
                      {f?.titre} › {e.source?.titre}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              Supprimer ce chapitre supprimerait aussi ces renvois.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MessageModifiable({ valeur, onEnregistrer }: { valeur: string; onEnregistrer: (v: string) => void }) {
  const [brouillon, setBrouillon] = useState(valeur);
  return (
    <Textarea
      aria-label="Phrase d'introduction"
      rows={2}
      maxLength={MESSAGE_MAX}
      value={brouillon}
      placeholder="Phrase d'introduction (facultatif)"
      onChange={(e) => setBrouillon(e.target.value)}
      onBlur={() => {
        if (brouillon.trim() !== valeur.trim()) onEnregistrer(brouillon.trim());
      }}
      className="text-sm"
    />
  );
}
