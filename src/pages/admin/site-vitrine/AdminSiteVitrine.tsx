// ─────────────────────────────────────────────────────────────────────────
// Administration du site vitrine : les témoignages vidéo du carrousel.
//
// Cahier des charges du site, §5 : « prévoir la liste des 10 vidéos comme une
// liste modifiable dans la plateforme (ID Vimeo, prénom, activité, ordre
// d'affichage), pour pouvoir en ajouter ou en retirer sans toucher au code. »
//
// On colle le lien Vimeo tel qu'on le copie : l'identifiant et le hash en sont
// extraits. La miniature est récupérée ici, une fois pour toutes, et
// enregistrée : le site ne contacte pas Vimeo avant le clic du visiteur.
//
// Réservé au CEO — la base l'impose aussi (politique `temoignages_vitrine_ceo`).
// ─────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ExternalLink, Globe, Loader2, Plus, Trash2, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { lireLienVimeo } from "@/vitrine/temoignages";

interface Ligne {
  id: string;
  vimeo_id: string;
  hash: string | null;
  miniature: string | null;
  prenom: string;
  activite: string;
  ordre: number;
  visible: boolean;
}

/** Le texte du site annonce « Faites défiler pour voir les 10 témoignages ». */
const NOMBRE_ANNONCE = 10;
const CLE = ["temoignages_vitrine"];

// La table n'est pas encore dans les types générés (à régénérer avec le MCP
// Supabase) : sans cela, chaque appel serait typé `never`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => supabase.from("temoignages_vitrine" as never) as any;

/**
 * Miniature via l'oEmbed de Vimeo. Au mieux : une vidéo masquée n'autorise
 * l'oEmbed que depuis les domaines de sa liste blanche, et la plateforme en
 * fait partie. Échec → pas de miniature, la carte garde son fond doré.
 */
async function chercherMiniature(vimeoId: string, hash: string | null): Promise<string | null> {
  try {
    const lien = `https://vimeo.com/${vimeoId}${hash ? `/${hash}` : ""}`;
    const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(lien)}&width=640`);
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail_url?: string };
    const url = data.thumbnail_url ?? null;
    return url && url.startsWith("https://i.vimeocdn.com/") ? url : null;
  } catch {
    return null;
  }
}

function ChampModifiable({
  valeur,
  libelle,
  max,
  onEnregistrer,
}: {
  valeur: string;
  libelle: string;
  max: number;
  onEnregistrer: (v: string) => void;
}) {
  const [brouillon, setBrouillon] = useState(valeur);
  return (
    <Input
      aria-label={libelle}
      value={brouillon}
      maxLength={max}
      onChange={(e) => setBrouillon(e.target.value)}
      onBlur={() => {
        const v = brouillon.trim();
        if (!v) return setBrouillon(valeur);
        if (v !== valeur) onEnregistrer(v);
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="h-9"
    />
  );
}

export default function AdminSiteVitrine() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [lien, setLien] = useState("");
  const [prenom, setPrenom] = useState("");
  const [activite, setActivite] = useState("");

  const requete = useQuery({
    queryKey: CLE,
    enabled: profile?.role === "ceo",
    queryFn: async (): Promise<Ligne[]> => {
      const { data, error } = await table().select("*").order("ordre").order("created_at");
      if (error) throw error;
      return (data ?? []) as Ligne[];
    },
  });
  const lignes = requete.data ?? [];

  const echec = (e: unknown) =>
    toast({ title: "Erreur", description: (e as Error)?.message ?? "Opération impossible", variant: "destructive" });
  const rafraichir = () => qc.invalidateQueries({ queryKey: CLE });

  const ajout = useMutation({
    mutationFn: async () => {
      const lu = lireLienVimeo(lien);
      if (!lu) throw new Error("Lien Vimeo non reconnu. Collez le lien de partage ou d'intégration de la vidéo.");
      if (!prenom.trim() || !activite.trim()) throw new Error("Le prénom et l'activité sont obligatoires.");
      const miniature = await chercherMiniature(lu.vimeoId, lu.hash);
      const ordre = lignes.reduce((m, l) => Math.max(m, l.ordre), 0) + 1;
      const { error } = await table().insert({
        vimeo_id: lu.vimeoId,
        hash: lu.hash,
        miniature,
        prenom: prenom.trim(),
        activite: activite.trim(),
        ordre,
      });
      if (error) throw error;
      return { miniature, hash: lu.hash };
    },
    onSuccess: ({ miniature, hash }) => {
      setLien("");
      setPrenom("");
      setActivite("");
      rafraichir();
      toast({
        title: "Témoignage ajouté",
        description: [
          !hash && "Aucun hash dans le lien : si la vidéo est masquée de Vimeo, le lecteur refusera de démarrer.",
          !miniature && "Miniature introuvable : la carte gardera son fond doré.",
        ]
          .filter(Boolean)
          .join(" ") || undefined,
      });
    },
    onError: echec,
  });

  const maj = useMutation({
    mutationFn: async ({ id, champs }: { id: string; champs: Partial<Ligne> }) => {
      const { error } = await table().update(champs).eq("id", id);
      if (error) throw error;
    },
    onSuccess: rafraichir,
    onError: echec,
  });

  const suppression = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await table().delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      rafraichir();
      toast({ title: "Témoignage supprimé" });
    },
    onError: echec,
  });

  /** Échange la place de deux témoignages voisins. */
  const deplacer = async (i: number, sens: -1 | 1) => {
    const a = lignes[i];
    const b = lignes[i + sens];
    if (!a || !b) return;
    // Ordres égaux (lignes ajoutées à la main) : on renumérote d'abord.
    const oa = a.ordre === b.ordre ? i + 1 : a.ordre;
    const ob = a.ordre === b.ordre ? i + 1 + sens : b.ordre;
    try {
      const r1 = await table().update({ ordre: ob }).eq("id", a.id);
      const r2 = await table().update({ ordre: oa }).eq("id", b.id);
      if (r1.error || r2.error) throw r1.error ?? r2.error;
    } catch (e) {
      echec(e);
    }
    rafraichir();
  };

  if (profile?.role !== "ceo") {
    return <div className="p-6 text-center text-muted-foreground">Accès réservé au CEO.</div>;
  }

  const visibles = lignes.filter((l) => l.visible).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" />
          Site vitrine
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Les témoignages vidéo du carrousel « Ils nous ont fait confiance ». Tant qu'aucun n'est visible, le site
          affiche des cartes de réserve.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter un témoignage</CardTitle>
          <CardDescription>
            Collez le lien Vimeo tel que vous le copiez : lien de partage (<code>vimeo.com/123…/abc…</code>) ou
            d'intégration (<code>player.vimeo.com/video/123…?h=abc…</code>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              ajout.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="sv-lien">Lien Vimeo</Label>
              <Input id="sv-lien" value={lien} onChange={(e) => setLien(e.target.value)} placeholder="https://vimeo.com/…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sv-prenom">Prénom</Label>
              <Input id="sv-prenom" value={prenom} maxLength={40} onChange={(e) => setPrenom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sv-activite">Activité</Label>
              <Input id="sv-activite" value={activite} maxLength={80} onChange={(e) => setActivite(e.target.value)} />
            </div>
            <Button type="submit" disabled={ajout.isPending || !lien.trim()}>
              {ajout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Ajouter
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Témoignages</CardTitle>
            <CardDescription>Dans l'ordre d'affichage sur le site.</CardDescription>
          </div>
          <Badge variant={visibles === NOMBRE_ANNONCE ? "secondary" : "outline"}>
            {visibles} visible{visibles > 1 ? "s" : ""} sur {NOMBRE_ANNONCE} annoncés
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibles > 0 && visibles !== NOMBRE_ANNONCE && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Le site indique « Faites défiler pour voir les 10 témoignages » (texte du cahier des charges) : avec{" "}
              {visibles} vidéo{visibles > 1 ? "s" : ""} visible{visibles > 1 ? "s" : ""}, la phrase est inexacte.
            </p>
          )}
          {requete.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : lignes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun témoignage pour l'instant.</p>
          ) : (
            <ol className="space-y-2">
              {lignes.map((l, i) => (
                <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                  <div className="flex flex-col">
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Monter" disabled={i === 0} onClick={() => deplacer(i, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Descendre" disabled={i === lignes.length - 1} onClick={() => deplacer(i, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="h-16 w-9 shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                    {l.miniature ? (
                      <img src={l.miniature} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Video className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="grid min-w-[240px] flex-1 gap-2 sm:grid-cols-2">
                    <ChampModifiable valeur={l.prenom} libelle="Prénom" max={40} onEnregistrer={(v) => maj.mutate({ id: l.id, champs: { prenom: v } })} />
                    <ChampModifiable valeur={l.activite} libelle="Activité" max={80} onEnregistrer={(v) => maj.mutate({ id: l.id, champs: { activite: v } })} />
                  </div>
                  <a
                    href={`https://vimeo.com/${l.vimeo_id}${l.hash ? `/${l.hash}` : ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Vimeo {l.vimeo_id}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {!l.hash && <Badge variant="outline">sans hash</Badge>}
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={l.visible} onCheckedChange={(v) => maj.mutate({ id: l.id, champs: { visible: v } })} />
                    Visible
                  </label>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Supprimer le témoignage de ${l.prenom}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer le témoignage de {l.prenom} ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Il disparaît du site. La vidéo reste sur Vimeo. Pour le retirer seulement un temps, décochez
                          plutôt « Visible ».
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => suppression.mutate(l.id)}>Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ol>
          )}
          <p className="pt-2 text-xs text-muted-foreground">
            Côté Vimeo, chaque vidéo doit autoriser l'intégration sur <code>albarakaecosysteme.com</code> et{" "}
            <code>www.albarakaecosysteme.com</code> (Paramètres de la vidéo → Intégration → domaines autorisés), sinon le
            lecteur refuse de s'ouvrir sur le site.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
