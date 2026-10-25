// « Analyser un appel » : 3 informations (élève, type, fichier) et la case « prospect informé »,
// puis l'analyse se lance toute seule. Le coach suit l'avancement ou ferme la fenêtre.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FileAudio, Loader2, Search, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { chercherEleves, demarrerAppel, envoyerAppel, extension, EXTENSIONS_APPEL, TAILLE_MAX_APPEL, useAppel } from "@/hooks/useAppels";
import { TYPES_APPEL } from "@/lib/appels/retour";
import { SuiviAnalyse } from "@/components/appels/SuiviAnalyse";

type Eleve = { id: string; full_name: string | null; email: string | null };

const taille = (o: number) => (o > 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1).replace(".", ",")} Mo` : `${Math.round(o / 1024)} Ko`);

function ChoixEleve({ eleve, onChoisir }: { eleve: Eleve | null; onChoisir: (e: Eleve | null) => void }) {
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<Eleve[]>([]);
  const [charge, setCharge] = useState(false);
  useEffect(() => {
    if (eleve || q.trim().length < 2) {
      setResultats([]);
      return;
    }
    let actif = true;
    setCharge(true);
    const t = setTimeout(() => {
      chercherEleves(q)
        .then((r) => actif && setResultats(r))
        .catch(() => actif && setResultats([]))
        .finally(() => actif && setCharge(false));
    }, 250);
    return () => {
      actif = false;
      clearTimeout(t);
    };
  }, [q, eleve]);

  if (eleve)
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5" data-testid="eleve-choisi">
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium">{eleve.full_name}</span> <span className="text-sm text-muted-foreground">· {eleve.email}</span>
        </span>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-muted-foreground" onClick={() => onChoisir(null)}>
          <X className="h-3.5 w-3.5" /> Changer
        </Button>
      </div>
    );
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou e-mail de l'élève" className="pl-9" data-testid="recherche-eleve" />
      {(charge || resultats.length > 0 || q.trim().length >= 2) && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {charge && <p className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Recherche…</p>}
          {!charge && resultats.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Aucun élève trouvé.</p>}
          {resultats.map((r) => (
            <button
              key={r.id}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                onChoisir(r);
                setQ("");
              }}
            >
              <span className="font-medium">{r.full_name}</span> <span className="text-muted-foreground">· {r.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DeposerAppel({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [eleve, setEleve] = useState<Eleve | null>(null);
  const [type, setType] = useState("setting_ads");
  const [fichier, setFichier] = useState<File | null>(null);
  const [informe, setInforme] = useState(false);
  const [envoi, setEnvoi] = useState<number | null>(null);
  const [appelId, setAppelId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [survol, setSurvol] = useState(false);
  const champFichier = useRef<HTMLInputElement>(null);
  const { data: appel } = useAppel(appelId ?? undefined);

  useEffect(() => {
    if (open) return;
    // fenêtre fermée : on repart de zéro la prochaine fois (l'analyse continue sans elle)
    setEleve(null);
    setFichier(null);
    setInforme(false);
    setEnvoi(null);
    setAppelId(null);
    setErreur(null);
  }, [open]);

  function choisirFichier(f: File | undefined) {
    setErreur(null);
    if (!f) return;
    if (!EXTENSIONS_APPEL.includes(extension(f.name))) {
      setErreur("Format non pris en charge : MP3, M4A, WAV, OGG (note vocale WhatsApp), MP4 ou MOV.");
      return;
    }
    if (f.size > TAILLE_MAX_APPEL) {
      setErreur("Le fichier dépasse 500 Mo.");
      return;
    }
    setFichier(f);
  }

  async function lancer() {
    if (!eleve || !fichier) return;
    setErreur(null);
    setEnvoi(0);
    let id: string;
    try {
      id = await envoyerAppel({ fichier, eleveId: eleve.id, typeAppel: type, prospectInforme: informe }, setEnvoi);
    } catch (e) {
      setEnvoi(null);
      setErreur(e instanceof Error ? e.message : "L'envoi a échoué. Réessaie.");
      qc.invalidateQueries({ queryKey: ["appels"] });
      return;
    }
    setAppelId(id);
    setEnvoi(null);
    try {
      await demarrerAppel(id, "lancer");
    } catch (e) {
      setErreur(`${e instanceof Error ? e.message : "L'analyse n'a pas pu démarrer."} Le fichier est bien envoyé : tu peux relancer l'analyse depuis la fiche de l'appel.`);
    }
    qc.invalidateQueries({ queryKey: ["appels"] });
  }

  const suivi = envoi != null || appelId;
  const pret = appel?.statut === "a_valider";
  const echec = appel?.statut === "erreur";

  return (
    <Dialog open={open} onOpenChange={(o) => (envoi != null ? undefined : onOpenChange(o))}>
      <DialogContent className="max-h-[94vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{suivi ? `Analyse en cours · ${eleve?.full_name ?? ""}` : "Analyser un appel"}</DialogTitle>
          <DialogDescription>
            {suivi
              ? envoi != null
                ? "Garde cette fenêtre ouverte pendant l'envoi du fichier."
                : "Tu peux fermer cette fenêtre : l'appel apparaîtra dans « À valider » dès qu'il sera prêt."
              : "3 informations, puis l'analyse se lance toute seule (environ 3 minutes)."}
          </DialogDescription>
        </DialogHeader>

        {suivi ? (
          <div className="space-y-5">
            {echec || erreur ? (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">{appel?.erreur ?? erreur}</p>
            ) : (
              <SuiviAnalyse etape={appel?.etape ?? "demarrage"} envoi={envoi} />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={envoi != null} onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
              {(pret || echec || (erreur && appelId)) && (
                <Button onClick={() => navigate(`/coaching/analyse-appels/${appelId}`)} data-testid="ouvrir-analyse">
                  {pret ? "Ouvrir l'analyse" : "Voir l'appel"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold">1. Élève concerné</p>
              <ChoixEleve eleve={eleve} onChoisir={setEleve} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">2. Type d'appel</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {TYPES_APPEL.map((t) => (
                  <button
                    key={t.cle}
                    type="button"
                    disabled={!t.ouvert}
                    onClick={() => setType(t.cle)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left transition-colors",
                      t.ouvert && type === t.cle ? "border-primary bg-primary/10" : "border-border bg-muted/20",
                      !t.ouvert && "cursor-not-allowed opacity-45",
                    )}
                  >
                    <span className="block text-sm font-semibold">{t.nom}</span>
                    <span className="block text-xs text-muted-foreground">{t.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">3. L'enregistrement</p>
              <input
                ref={champFichier}
                type="file"
                className="hidden"
                accept={EXTENSIONS_APPEL.map((e) => `.${e}`).join(",") + ",audio/*,video/*"}
                onChange={(e) => choisirFichier(e.target.files?.[0])}
                data-testid="fichier-appel"
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => champFichier.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && champFichier.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setSurvol(true);
                }}
                onDragLeave={() => setSurvol(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setSurvol(false);
                  choisirFichier(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-4 transition-colors",
                  survol ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:bg-muted/40",
                )}
              >
                {fichier ? <FileAudio className="h-7 w-7 shrink-0 text-primary" /> : <Upload className="h-7 w-7 shrink-0 text-muted-foreground" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{fichier ? fichier.name : "Choisir le fichier, ou le glisser ici"}</p>
                  <p className="text-xs text-muted-foreground">{fichier ? `${taille(fichier.size)} · prêt` : "MP3, M4A, WAV, note vocale WhatsApp, MP4, MOV · 90 min max"}</p>
                </div>
                {fichier && <span className="text-xs font-medium text-muted-foreground">Changer</span>}
              </div>
              <p className="text-xs text-muted-foreground">Depuis le téléphone : choisis le fichier dans « Enregistrements », « Fichiers » ou WhatsApp.</p>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <Checkbox checked={informe} onCheckedChange={(v) => setInforme(v === true)} className="mt-0.5" data-testid="prospect-informe" />
              <span>
                Le prospect a été informé que l'appel était enregistré
                <span className="block text-xs text-muted-foreground">Sinon, l'analyse se fait quand même, avec quelques points en moins.</span>
              </span>
            </label>

            {erreur && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">{erreur}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button disabled={!eleve || !fichier} onClick={lancer} className="gap-2" data-testid="lancer-analyse">
                Lancer l'analyse
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
