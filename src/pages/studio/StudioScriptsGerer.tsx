// Studio, gestion de la bibliothèque de scripts (CEO) : Sidali ajoute, corrige,
// masque ou met en avant ses scripts lui-même, un par un ou plusieurs d'un coup.
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Layers, Loader2, Pencil, Plus, Search, Sparkles, Star, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { detecterTheme, useThemes } from "@/hooks/useStudio";
import { useGestionScriptsStudio, useScriptsStudio, type ScriptAEnregistrer } from "@/hooks/useStudioScripts";
import { decouperLot, proposerTitre, uniformiserTexte, type ScriptStudio } from "@/lib/studio/scripts";
import { dureeLecture, SCRIPT_MAX } from "@/lib/studio/voixoff";
import { useRechercheDifferee } from "./StudioScripts";

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const VIDE: ScriptAEnregistrer = { titre: "", accroche: null, texte: "", theme_id: null, mis_en_avant: false, publie: true };

function FormulaireScript({ initial, onFermer }: { initial: ScriptAEnregistrer | null; onFermer: () => void }) {
  const { toast } = useToast();
  const { data: themes = [] } = useThemes();
  const { enregistrer } = useGestionScriptsStudio();
  const [v, setV] = useState<ScriptAEnregistrer>(initial ?? VIDE);
  const [detection, setDetection] = useState(false);
  const maj = (champ: Partial<ScriptAEnregistrer>) => setV((p) => ({ ...p, ...champ }));

  async function suggererTheme() {
    if (!v.texte.trim()) return;
    setDetection(true);
    try {
      maj({ theme_id: await detecterTheme(v.texte) });
    } catch (e) {
      toast({ title: "Thème non détecté", description: message(e), variant: "destructive" });
    } finally {
      setDetection(false);
    }
  }

  async function valider() {
    const texte = uniformiserTexte(v.texte);
    if (!texte) return toast({ title: "Le script est vide", variant: "destructive" });
    try {
      await enregistrer.mutateAsync({
        ...v,
        texte,
        titre: v.titre.trim() || proposerTitre(texte),
        accroche: v.accroche?.trim() || null,
      });
      toast({ title: v.id ? "Script modifié" : "Script ajouté à la bibliothèque" });
      onFermer();
    } catch (e) {
      toast({ title: "Enregistrement impossible", description: message(e), variant: "destructive" });
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{v.id ? "Modifier le script" : "Ajouter un script"}</DialogTitle>
          <DialogDescription>Colle le script tel quel (Word, PDF, Google Docs) : la mise en forme est nettoyée.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="script-texte">Script</Label>
            <Textarea
              id="script-texte"
              value={v.texte}
              onChange={(e) => maj({ texte: e.target.value.slice(0, SCRIPT_MAX) })}
              rows={12}
              placeholder="Colle ici le texte du script…"
            />
            <p className="text-xs text-muted-foreground">environ {dureeLecture(v.texte)} de lecture</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="script-titre">Titre</Label>
              <Input
                id="script-titre"
                value={v.titre}
                onChange={(e) => maj({ titre: e.target.value })}
                placeholder={v.texte ? proposerTitre(v.texte) : "Laisse vide : on prend le début du script"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Thème</Label>
              <div className="flex gap-2">
                <Select value={v.theme_id ?? "aucun"} onValueChange={(t) => maj({ theme_id: t === "aucun" ? null : t })}>
                  <SelectTrigger aria-label="Thème du script">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aucun">Sans thème</SelectItem>
                    {themes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={suggererTheme} disabled={detection || !v.texte.trim()} title="Proposer un thème avec l'IA">
                  {detection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="script-accroche">Accroche affichée sur la carte (facultatif)</Label>
            <Input
              id="script-accroche"
              value={v.accroche ?? ""}
              onChange={(e) => maj({ accroche: e.target.value })}
              placeholder="Laisse vide : on prend la première phrase"
            />
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={v.publie} onCheckedChange={(c) => maj({ publie: c })} /> Visible par les membres
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={v.mis_en_avant} onCheckedChange={(c) => maj({ mis_en_avant: c })} /> Mettre en avant (en tête de liste)
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button onClick={valider} disabled={enregistrer.isPending} className="gap-2">
            {enregistrer.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AjoutEnLot({ onFermer }: { onFermer: () => void }) {
  const { toast } = useToast();
  const { data: themes = [] } = useThemes();
  const { ajouterLot } = useGestionScriptsStudio();
  const [brut, setBrut] = useState("");
  const [theme, setTheme] = useState<string | null>(null);
  const lot = decouperLot(brut);

  async function importer() {
    try {
      await ajouterLot.mutateAsync(
        lot.map((s) => ({ titre: s.titre, texte: s.texte, accroche: null, theme_id: theme, mis_en_avant: false, publie: true })),
      );
      toast({ title: `${lot.length} script${lot.length > 1 ? "s" : ""} ajouté${lot.length > 1 ? "s" : ""}` });
      onFermer();
    } catch (e) {
      toast({ title: "Ajout impossible", description: message(e), variant: "destructive" });
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter plusieurs scripts d'un coup</DialogTitle>
          <DialogDescription>
            Colle tes scripts les uns à la suite des autres, séparés par une ligne <b>---</b>. Pour donner un titre, commence le script par
            « Titre : … ».
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={brut}
          onChange={(e) => setBrut(e.target.value)}
          rows={14}
          placeholder={"Titre : Le salariat\nTu travailles 40 heures par semaine…\n---\nTitre : Mes dettes\nIl y a deux ans, j'avais…"}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Label className="shrink-0">Thème pour tout le lot</Label>
          <Select value={theme ?? "aucun"} onValueChange={(t) => setTheme(t === "aucun" ? null : t)}>
            <SelectTrigger className="w-64" aria-label="Thème du lot">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aucun">Sans thème (à classer ensuite)</SelectItem>
              {themes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {lot.length > 0 && (
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2 text-sm">
            {lot.map((s, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="truncate">{s.titre}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{dureeLecture(s.texte)}</span>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button onClick={importer} disabled={!lot.length || ajouterLot.isPending} className="gap-2">
            {ajouterLot.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Ajouter {lot.length || ""} script{lot.length > 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function StudioScriptsGerer() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: themes = [] } = useThemes();
  const { modifier, supprimer } = useGestionScriptsStudio();
  const [saisie, setSaisie] = useState("");
  const recherche = useRechercheDifferee(saisie);
  const [theme, setTheme] = useState<string | null>(null);
  const [edition, setEdition] = useState<ScriptAEnregistrer | null | "nouveau">(null);
  const [lot, setLot] = useState(false);
  const [aSupprimer, setASupprimer] = useState<ScriptStudio | null>(null);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useScriptsStudio({ recherche, theme, avecMasques: true });

  if (profile && profile.role !== "ceo") return <Navigate to="/studio/scripts" replace />;

  const scripts = data?.pages.flatMap((p) => p.scripts) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const nomTheme = (id: string | null) => themes.find((t) => t.id === id)?.nom ?? null;

  const basculer = async (s: ScriptStudio, champ: "publie" | "mis_en_avant") => {
    try {
      await modifier.mutateAsync({ id: s.id, [champ]: !s[champ] });
    } catch (e) {
      toast({ title: "Modification impossible", description: message(e), variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Link to="/studio/scripts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Bibliothèque de scripts
          </Link>
          <h1 className="font-heading text-3xl text-foreground">Gérer la bibliothèque</h1>
          <p className="text-sm text-muted-foreground">Ajoute tes scripts : ils apparaissent tout de suite chez les membres.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setLot(true)}>
            <Layers className="h-4 w-4" /> Ajouter plusieurs scripts
          </Button>
          <Button className="gap-2" onClick={() => setEdition("nouveau")}>
            <Plus className="h-4 w-4" /> Ajouter un script
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="Chercher un script…" className="pl-9" aria-label="Chercher un script" />
        </div>
        <Select value={theme ?? "tous"} onValueChange={(t) => setTheme(t === "tous" ? null : t)}>
          <SelectTrigger className="w-60" aria-label="Filtrer par thème">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les thèmes</SelectItem>
            {themes.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : scripts.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          {recherche || theme ? "Aucun script ne correspond." : "Aucun script pour l'instant : ajoute le premier."}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} script{total > 1 ? "s" : ""}
          </p>
          <ul className="divide-y rounded-xl border">
            {scripts.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 p-3" data-testid="ligne-script">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`truncate font-medium ${s.publie ? "" : "text-muted-foreground line-through"}`}>{s.titre}</span>
                    {!s.publie && <Badge variant="outline">masqué</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {nomTheme(s.theme_id) ?? "Sans thème"} · {dureeLecture(s.texte)}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => basculer(s, "mis_en_avant")} title={s.mis_en_avant ? "Ne plus mettre en avant" : "Mettre en avant"}>
                  <Star className={`h-4 w-4 ${s.mis_en_avant ? "fill-amber-400 text-amber-400" : ""}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => basculer(s, "publie")} title={s.publie ? "Masquer aux membres" : "Rendre visible"}>
                  {s.publie ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEdition({ id: s.id, titre: s.titre, accroche: s.accroche, texte: s.texte, theme_id: s.theme_id, mis_en_avant: s.mis_en_avant, publie: s.publie })}
                  title="Modifier"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setASupprimer(s)} title="Supprimer">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
          {hasNextPage && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="gap-2">
                {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />} Voir plus
              </Button>
            </div>
          )}
        </>
      )}

      {edition && <FormulaireScript initial={edition === "nouveau" ? null : edition} onFermer={() => setEdition(null)} />}
      {lot && <AjoutEnLot onFermer={() => setLot(false)} />}

      <AlertDialog open={!!aSupprimer} onOpenChange={(o) => !o && setASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {aSupprimer?.titre} » ?</AlertDialogTitle>
            <AlertDialogDescription>Le script disparaît de la bibliothèque. Pour le cacher sans le perdre, utilise plutôt l'œil (masquer).</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!aSupprimer) return;
                try {
                  await supprimer.mutateAsync(aSupprimer.id);
                  toast({ title: "Script supprimé" });
                } catch (e) {
                  toast({ title: "Suppression impossible", description: message(e), variant: "destructive" });
                }
                setASupprimer(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
