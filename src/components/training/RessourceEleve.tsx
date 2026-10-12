// Une ressource sous une vidéo ou un chapitre, côté élève.
//   - fichier déposé sur la plateforme : « Télécharger » d'un clic (lien signé de
//     quelques minutes, nom de fichier = titre de la ressource), aperçu des PDF/images ;
//   - lien : s'ouvre dans un nouvel onglet ;
//   - ancien PDF/image en URL publique : aperçu, comme avant.
import { useState } from "react";
import {
  Download,
  ExternalLink,
  FileArchive,
  FileAudio,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  STOCKAGE_RESSOURCES,
  cheminStockage,
  estFichierStocke,
  libelleFormat,
  nomDeTelechargement,
} from "@/lib/ressourcesFormation";

export interface RessourceAffichee {
  id: string;
  titre: string;
  type: string;
  url: string;
}

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

async function lienSigne(chemin: string, telechargement?: string) {
  const { data, error } = await supabase.storage
    .from(STOCKAGE_RESSOURCES)
    .createSignedUrl(chemin, 300, telechargement ? { download: telechargement } : undefined);
  if (error || !data?.signedUrl) throw error ?? new Error("lien indisponible");
  return data.signedUrl;
}

function FichierStocke({ r }: { r: RessourceAffichee }) {
  const chemin = cheminStockage(r.url);
  const format = libelleFormat(chemin);
  const Icone = ICONES[format] ?? FileText;
  const apercuPossible = format === "PDF" || format === "Image";
  const [telechargement, setTelechargement] = useState(false);
  const [apercu, setApercu] = useState<string | null>(null);
  const [ouverture, setOuverture] = useState(false);

  async function telecharger() {
    setTelechargement(true);
    try {
      const url = await lienSigne(chemin, nomDeTelechargement(r.titre, chemin));
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error("Le téléchargement n'a pas pu démarrer. Réessaie dans un instant.");
    } finally {
      setTelechargement(false);
    }
  }

  async function basculerApercu() {
    if (apercu) {
      setApercu(null);
      return;
    }
    setOuverture(true);
    try {
      setApercu(await lienSigne(chemin));
    } catch {
      toast.error("L'aperçu n'a pas pu s'ouvrir.");
    } finally {
      setOuverture(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card" data-testid="ressource-fichier">
      <div className="flex items-center gap-3 p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icone className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-medium text-foreground">{r.titre}</p>
          <p className="text-xs text-muted-foreground">{format}</p>
        </div>
        {apercuPossible && (
          <Button variant="ghost" size="sm" onClick={basculerApercu} disabled={ouverture} className="hidden sm:inline-flex">
            {ouverture ? <Loader2 className="h-4 w-4 animate-spin" /> : apercu ? "Fermer" : "Aperçu"}
          </Button>
        )}
        <Button size="sm" onClick={telecharger} disabled={telechargement} className="gap-2">
          {telechargement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Télécharger
        </Button>
      </div>
      {apercu && (
        <div className="border-t border-border bg-muted/30">
          {format === "PDF" ? (
            <iframe src={apercu} className="h-[600px] w-full" title={r.titre} />
          ) : (
            <img src={apercu} alt={r.titre} className="max-h-[600px] w-full bg-black/5 object-contain" />
          )}
        </div>
      )}
    </div>
  );
}

function AncienFichierPublic({ r }: { r: RessourceAffichee }) {
  const [ouvert, setOuvert] = useState(false);
  const Icone = r.type === "pdf" ? FileText : ImageIcon;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        onClick={() => setOuvert((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-secondary"
      >
        <Icone className="h-4 w-4 shrink-0 text-primary" />
        <span className="line-clamp-1 flex-1 text-sm text-foreground">{r.titre}</span>
        <span className="text-xs uppercase text-muted-foreground">{r.type}</span>
        <span className="text-xs text-primary">{ouvert ? "Fermer" : "Aperçu"}</span>
      </button>
      {ouvert && (
        <div className="border-t border-border bg-muted/30">
          {r.type === "pdf" ? (
            <iframe src={r.url} className="h-[600px] w-full" title={r.titre} />
          ) : (
            <img src={r.url} alt={r.titre} className="max-h-[600px] w-full bg-black/5 object-contain" />
          )}
          <div className="p-2 text-right">
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
              Ouvrir dans un nouvel onglet ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export function RessourceEleve({ ressource: r }: { ressource: RessourceAffichee }) {
  if (estFichierStocke(r.url)) return <FichierStocke r={r} />;
  if (r.type === "pdf" || r.type === "image") return <AncienFichierPublic r={r} />;
  if (!r.url) return null; // lien pas encore renseigné par le formateur
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <LinkIcon className="h-4 w-4" />
      </span>
      <span className="line-clamp-1 flex-1 text-sm font-medium text-foreground">{r.titre}</span>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
    </a>
  );
}
