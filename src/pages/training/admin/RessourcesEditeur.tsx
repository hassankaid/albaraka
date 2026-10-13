// Ressources d'une vidéo ou d'un chapitre, côté formateur (demande de Sidali, 11/10/2026).
//
// Déposer des fichiers (cliquer ou glisser, plusieurs à la fois) : chacun devient une
// ressource que l'élève télécharge d'un clic. Ajouter un lien reste possible.
// Le titre se modifie sur place (enregistré en quittant le champ) ; un fichier peut
// être remplacé sans perdre sa place ; supprimer une ressource supprime son fichier.
import { createContext, useContext, useRef, useState } from "react";
import {
  Check,
  Download,
  ExternalLink,
  FileArchive,
  FileAudio,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Plus,
  Presentation,
  RefreshCw,
  Trash2,
  Upload,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  ACCEPT_RESSOURCE,
  PREFIXE_STOCKAGE,
  STOCKAGE_RESSOURCES,
  cheminStockage,
  estFichierStocke,
  libelleFormat,
  nomDeStockage,
  nomDeTelechargement,
  titreDepuisNom,
  typeDuFichier,
  verifierRessource,
} from "@/lib/ressourcesFormation";
import { supprimerFichiersStockes } from "@/lib/ressourcesStockage";
import type { RubriqueRessource } from "@/lib/ressourcesPhases";

export interface RessourceEditee {
  id: string;
  titre: string;
  type: string;
  url: string;
  ordre: number;
  video_id: string | null;
  rubrique?: RubriqueRessource | null;
}

// Parcours Setting/Closing (Sidali, 13/10/2026) : chaque ressource peut être
// rangée dans « Scripts internes AL BARAKA » ou « Scripts templates » de la page
// Ressources des élèves. Le sélecteur n'apparaît que dans ce parcours.
export const AvecRubriqueContext = createContext(false);

const RUBRIQUES: { valeur: string; libelle: string }[] = [
  { valeur: "aucune", libelle: "Autre ressource" },
  { valeur: "script_interne", libelle: "Script interne AL BARAKA" },
  { valeur: "script_template", libelle: "Script template" },
];

const ICONES: Record<string, LucideIcon> = {
  PDF: FileText,
  Word: FileText,
  Texte: FileText,
  Excel: FileSpreadsheet,
  PowerPoint: Presentation,
  ZIP: FileArchive,
  Image: ImageIcon,
  Audio: FileAudio,
  Pages: FileText,
  Numbers: FileSpreadsheet,
  Keynote: Presentation,
};

async function deposer(fichier: File, chapitreId: string): Promise<string> {
  const chemin = `${chapitreId}/${crypto.randomUUID().slice(0, 8)}-${nomDeStockage(fichier.name)}`;
  const { error } = await supabase.storage
    .from(STOCKAGE_RESSOURCES)
    .upload(chemin, fichier, { contentType: typeDuFichier(fichier.name), upsert: false });
  if (error) throw error;
  return chemin;
}

export function RessourcesEditeur({
  ressources,
  chapitreId,
  videoId,
  vide,
  onChanged,
}: {
  ressources: RessourceEditee[];
  chapitreId: string;
  videoId: string | null;
  /** Phrase affichée quand il n'y a encore aucune ressource. */
  vide: string;
  onChanged: () => void;
}) {
  const [envois, setEnvois] = useState<string[]>([]);
  const [survol, setSurvol] = useState(false);
  const [lienOuvert, setLienOuvert] = useState(false);
  const [lienTitre, setLienTitre] = useState("");
  const [lienUrl, setLienUrl] = useState("");
  const [aSupprimer, setASupprimer] = useState<RessourceEditee | null>(null);
  const champ = useRef<HTMLInputElement>(null);
  const prochainOrdre = () => (ressources.length ? Math.max(...ressources.map((r) => r.ordre)) + 1 : 0);

  async function importer(fichiers: FileList | File[]) {
    const liste = Array.from(fichiers);
    const refuses = liste.map((f) => verifierRessource(f)).filter(Boolean) as string[];
    refuses.forEach((m) => toast.error(m));
    const acceptes = liste.filter((f) => !verifierRessource(f));
    if (!acceptes.length) return;
    setEnvois(acceptes.map((f) => f.name));
    let ordre = prochainOrdre();
    let reussis = 0;
    for (const f of acceptes) {
      try {
        const chemin = await deposer(f, chapitreId);
        const { error } = await supabase.from("chapitre_ressources").insert({
          chapitre_id: chapitreId,
          video_id: videoId,
          titre: titreDepuisNom(f.name),
          type: "fichier",
          url: PREFIXE_STOCKAGE + chemin,
          ordre: ordre++,
        });
        if (error) {
          await supabase.storage.from(STOCKAGE_RESSOURCES).remove([chemin]);
          throw error;
        }
        reussis++;
      } catch {
        toast.error(`« ${f.name} » n'a pas pu être envoyé. Réessaie.`);
      }
      setEnvois((e) => e.filter((n) => n !== f.name));
    }
    if (reussis) toast.success(reussis > 1 ? `${reussis} fichiers ajoutés` : "Fichier ajouté");
    onChanged();
  }

  async function ajouterLien() {
    const url = lienUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Le lien doit commencer par https://");
      return;
    }
    const { error } = await supabase.from("chapitre_ressources").insert({
      chapitre_id: chapitreId,
      video_id: videoId,
      titre: lienTitre.trim() || "Lien",
      type: "link",
      url,
      ordre: prochainOrdre(),
    });
    if (error) {
      toast.error("Le lien n'a pas pu être ajouté.");
      return;
    }
    setLienOuvert(false);
    setLienTitre("");
    setLienUrl("");
    toast.success("Lien ajouté");
    onChanged();
  }

  async function supprimer(r: RessourceEditee) {
    const { error } = await supabase.from("chapitre_ressources").delete().eq("id", r.id);
    if (error) {
      toast.error("La ressource n'a pas pu être supprimée.");
      return;
    }
    await supprimerFichiersStockes([r]);
    setASupprimer(null);
    toast.success("Ressource supprimée");
    onChanged();
  }

  return (
    <div className="space-y-3">
      {ressources.length === 0 && envois.length === 0 && <p className="text-sm text-muted-foreground">{vide}</p>}

      {ressources.map((r) => (
        <LigneRessource key={r.id} ressource={r} chapitreId={chapitreId} onSupprimer={() => setASupprimer(r)} onChanged={onChanged} />
      ))}

      {envois.map((nom) => (
        <div key={nom} className="flex items-center gap-3 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Envoi de « {nom} »…
        </div>
      ))}

      <button
        type="button"
        onClick={() => champ.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvol(false);
          if (e.dataTransfer.files?.length) importer(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors",
          survol ? "border-primary bg-primary/10" : "border-border hover:border-primary/60 hover:bg-secondary/40",
        )}
        data-testid="zone-depot-ressources"
      >
        <UploadCloud className="h-6 w-6 text-primary" />
        <span className="text-sm font-medium text-foreground">Importer des fichiers</span>
        <span className="text-xs text-muted-foreground">
          Clique ou glisse tes fichiers ici · PDF, Word, Excel, PowerPoint, Pages, ZIP, image, audio… · 50 Mo max
        </span>
      </button>
      <input
        ref={champ}
        type="file"
        multiple
        accept={ACCEPT_RESSOURCE}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) importer(e.target.files);
          e.target.value = "";
        }}
      />

      {lienOuvert ? (
        <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1.4fr_auto]">
          <Input value={lienTitre} onChange={(e) => setLienTitre(e.target.value)} placeholder="Titre du lien" aria-label="Titre du lien" />
          <Input
            value={lienUrl}
            onChange={(e) => setLienUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ajouterLien()}
            placeholder="https://…"
            aria-label="Adresse du lien"
          />
          <div className="flex gap-1">
            <Button size="sm" onClick={ajouterLien}>
              Ajouter
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setLienOuvert(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => setLienOuvert(true)}>
          <Plus className="h-4 w-4" /> Ajouter un lien
        </Button>
      )}

      <AlertDialog open={!!aSupprimer} onOpenChange={(o) => !o && setASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {aSupprimer?.titre} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les élèves ne la verront plus{aSupprimer && estFichierStocke(aSupprimer.url) ? " et le fichier sera effacé" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => aSupprimer && supprimer(aSupprimer)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LigneRessource({
  ressource: r,
  chapitreId,
  onSupprimer,
  onChanged,
}: {
  ressource: RessourceEditee;
  chapitreId: string;
  onSupprimer: () => void;
  onChanged: () => void;
}) {
  const fichier = estFichierStocke(r.url);
  const format = fichier ? libelleFormat(cheminStockage(r.url)) : r.type === "pdf" ? "PDF" : r.type === "image" ? "Image" : "Lien";
  const Icone = fichier ? ICONES[format] ?? FileText : r.type === "pdf" ? FileText : r.type === "image" ? ImageIcon : LinkIcon;
  const [titre, setTitre] = useState(r.titre);
  const [url, setUrl] = useState(r.url);
  const [enregistre, setEnregistre] = useState(false);
  const [remplacement, setRemplacement] = useState(false);
  const champ = useRef<HTMLInputElement>(null);

  const avecRubrique = useContext(AvecRubriqueContext);

  async function enregistrer(maj: { titre?: string; url?: string; rubrique?: RubriqueRessource | null }) {
    const { error } = await (supabase.from("chapitre_ressources") as any).update(maj).eq("id", r.id);
    if (error) {
      toast.error("Modification non enregistrée.");
      return;
    }
    setEnregistre(true);
    setTimeout(() => setEnregistre(false), 1500);
    onChanged();
  }

  async function ouvrir() {
    if (!fichier) {
      window.open(r.url, "_blank", "noopener");
      return;
    }
    const chemin = cheminStockage(r.url);
    const { data, error } = await supabase.storage
      .from(STOCKAGE_RESSOURCES)
      .createSignedUrl(chemin, 300, { download: nomDeTelechargement(r.titre, chemin) });
    if (error || !data) toast.error("Fichier introuvable.");
    else window.location.assign(data.signedUrl);
  }

  async function remplacer(f: File) {
    const refus = verifierRessource(f);
    if (refus) {
      toast.error(refus);
      return;
    }
    setRemplacement(true);
    try {
      const chemin = await deposer(f, chapitreId);
      const { error } = await supabase
        .from("chapitre_ressources")
        .update({ url: PREFIXE_STOCKAGE + chemin, type: "fichier" })
        .eq("id", r.id);
      if (error) {
        await supabase.storage.from(STOCKAGE_RESSOURCES).remove([chemin]);
        throw error;
      }
      await supprimerFichiersStockes([r]);
      toast.success(fichier ? "Fichier remplacé" : "Lien remplacé par un fichier");
      onChanged();
    } catch {
      toast.error("Le fichier n'a pas pu être remplacé.");
    } finally {
      setRemplacement(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3 sm:flex-nowrap">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icone className="h-4 w-4" />
      </span>
      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <Input
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          onBlur={() => titre.trim() && titre.trim() !== r.titre && enregistrer({ titre: titre.trim() })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          aria-label="Titre de la ressource"
          className="h-9"
        />
        {fichier ? (
          <span className="text-xs text-muted-foreground">{format}</span>
        ) : (
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => url.trim() !== r.url && enregistrer({ url: url.trim() })}
            placeholder="https://…"
            aria-label="Adresse du lien"
            className="h-9 sm:w-64"
          />
        )}
      </div>
      {avecRubrique && (
        <Select
          value={r.rubrique ?? "aucune"}
          onValueChange={(v) => enregistrer({ rubrique: v === "aucune" ? null : (v as RubriqueRessource) })}
        >
          <SelectTrigger className="h-9 w-full text-xs sm:w-52" aria-label="Rubrique dans la page Ressources">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RUBRIQUES.map((o) => (
              <SelectItem key={o.valeur} value={o.valeur} className="text-xs">
                {o.libelle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="flex shrink-0 items-center gap-1">
        {enregistre && <Check className="h-4 w-4 text-emerald-500" aria-label="Enregistré" />}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={ouvrir} title={fichier ? "Télécharger" : "Ouvrir le lien"}>
          {fichier ? <Download className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
        </Button>
        <input
          ref={champ}
          type="file"
          accept={ACCEPT_RESSOURCE}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) remplacer(f);
            e.target.value = "";
          }}
        />
        <Button
          variant="ghost"
          size={fichier ? "icon" : "sm"}
          className={fichier ? "h-8 w-8" : "h-8 gap-1.5 px-2 text-xs"}
          onClick={() => champ.current?.click()}
          disabled={remplacement}
          title={fichier ? "Remplacer le fichier" : "Remplacer ce lien par un fichier (titre et place gardés)"}
        >
          {remplacement ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : fichier ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <>
              <Upload className="h-4 w-4" /> Remplacer par un fichier
            </>
          )}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onSupprimer} title="Supprimer">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
