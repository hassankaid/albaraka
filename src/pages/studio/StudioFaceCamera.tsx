// Studio vidéo, outil Face caméra : import, floutage du visage, réglages, lancement.
// Tous les choix se font AVANT le traitement. Pendant que l'élève règle, la
// machine prépare déjà la vidéo (son, transcription, coupes, sous-titres).
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Upload, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { demarrer, importerVideo, lienStudio, useMontage } from "@/hooks/useStudio";
import {
  completerReglages,
  DUREE_MAX_S,
  REGLAGES_PAR_DEFAUT,
  verifierFichier,
  type Reglages,
} from "@/lib/studio/reglages";
import { ApercuStudio } from "@/components/studio/ApercuStudio";
import { imageDuFichier } from "@/lib/studio/image";
import { Bloc, BlocDesign, BlocSon, BlocSousTitres, BlocVisage } from "@/components/studio/Reglages";

type Ecran = "import" | "visage" | "reglages";

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Durée lue par le navigateur, ou null s'il ne sait pas lire la vidéo (ex. HEVC) :
 *  le moteur vérifie de toute façon. Jamais plus de 5 s d'attente avant l'envoi. */
function dureeVideo(f: File): Promise<number | null> {
  return new Promise((ok) => {
    const url = URL.createObjectURL(f);
    const v = document.createElement("video");
    const fin = (d: number | null) => {
      URL.revokeObjectURL(url);
      ok(d);
    };
    v.preload = "metadata";
    v.onloadedmetadata = () => fin(Number.isFinite(v.duration) ? v.duration : null);
    v.onerror = () => fin(null);
    setTimeout(() => fin(null), 5000);
    v.src = url;
  });
}

export default function StudioFaceCamera() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const id = params.get("id") ?? undefined;
  const { data: montage } = useMontage(id);
  const [ecran, setEcran] = useState<Ecran>(id ? "visage" : "import");
  const [reglages, setReglages] = useState<Reglages>(REGLAGES_PAR_DEFAUT);
  const [progres, setProgres] = useState<number | null>(null);
  const [imageLocale, setImageLocale] = useState<HTMLCanvasElement | null>(null);
  const [imageServeur, setImageServeur] = useState<string | null>(null);
  const [lancement, setLancement] = useState(false);
  const charge = useRef(false);

  // reprise d'un montage commencé : ses réglages enregistrés
  useEffect(() => {
    if (montage && !charge.current) {
      charge.current = true;
      if (Object.keys(montage.reglages ?? {}).length) setReglages(completerReglages(montage.reglages));
    }
  }, [montage]);

  // l'image préparée par la machine (cadre exact + visages repérés)
  useEffect(() => {
    if (montage?.apercu?.fichier && user && !imageServeur) {
      lienStudio(`${montage.user_id}/${montage.id}/${montage.apercu.fichier}`)
        .then(setImageServeur)
        .catch(() => undefined);
    }
  }, [montage, user, imageServeur]);

  async function choisir(f: File | undefined) {
    if (!f) return;
    const refus = verifierFichier(f);
    if (refus) return toast({ title: "Vidéo refusée", description: refus, variant: "destructive" });
    const duree = await dureeVideo(f);
    if (duree && duree > DUREE_MAX_S + 5) {
      return toast({ title: "Vidéo trop longue", description: "5 minutes maximum : coupe-la en plusieurs parties.", variant: "destructive" });
    }
    imageDuFichier(f).then(setImageLocale);
    setProgres(0);
    try {
      const nouvelId = await importerVideo(f, setProgres);
      setParams({ id: nouvelId }, { replace: true });
      setEcran("visage");
      await demarrer(nouvelId, "preparer");
    } catch (e) {
      setProgres(null);
      toast({ title: "Import impossible", description: message(e), variant: "destructive" });
    }
  }

  async function lancer() {
    if (!id) return;
    setLancement(true);
    try {
      await demarrer(id, "lancer", reglages);
      navigate(`/studio/montage/${id}`);
    } catch (e) {
      setLancement(false);
      toast({ title: "Lancement impossible", description: message(e), variant: "destructive" });
    }
  }

  const image = imageServeur ?? imageLocale;
  const visages = montage?.apercu?.visages ?? null;
  const preparationEchouee = montage?.statut === "erreur";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/studio">
            <ArrowLeft className="h-4 w-4" /> Studio
          </Link>
        </Button>
        <h1 className="font-heading text-2xl text-foreground">Face caméra</h1>
      </div>

      <ol className="flex gap-2 text-xs">
        {(["import", "visage", "reglages"] as Ecran[]).map((e, i) => (
          <li
            key={e}
            className={`flex-1 rounded-full px-3 py-1.5 text-center ${ecran === e ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {i + 1}. {e === "import" ? "Ta vidéo" : e === "visage" ? "Ton visage" : "Son et sous-titres"}
          </li>
        ))}
      </ol>

      {ecran === "import" && (
        <div className="space-y-4">
          {progres === null ? (
            <label
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border px-6 py-16 text-center transition-colors hover:border-primary/60"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                choisir(e.dataTransfer.files?.[0]);
              }}
            >
              <Upload className="h-10 w-10 text-primary" />
              <span className="text-base font-semibold text-foreground">Dépose ta vidéo ici ou clique pour la choisir</span>
              <span className="text-sm text-muted-foreground">MP4 ou MOV, iPhone ou Android · 5 minutes et 1 Go maximum</span>
              <input
                type="file"
                accept="video/mp4,video/quicktime,.mp4,.mov"
                className="hidden"
                onChange={(e) => choisir(e.target.files?.[0])}
                data-testid="studio-fichier"
              />
            </label>
          ) : (
            <div className="space-y-3 rounded-2xl border border-border p-6">
              <p className="text-sm font-medium text-foreground">Envoi de ta vidéo… {progres} %</p>
              <Progress value={progres} />
              <p className="text-xs text-muted-foreground">Garde cette page ouverte jusqu'à la fin de l'envoi.</p>
            </div>
          )}
        </div>
      )}

      {ecran !== "import" && (
        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            {preparationEchouee && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                {montage?.erreur ?? "La préparation a échoué."} Tu peux quand même lancer le montage : il reprendra depuis le
                début.
              </div>
            )}
            {ecran === "visage" ? (
              <>
                <Bloc titre="Visage">
                  <BlocVisage reglages={reglages} onChange={setReglages} />
                </Bloc>
                <div className="flex justify-end">
                  <Button onClick={() => setEcran("reglages")}>Continuer</Button>
                </div>
              </>
            ) : (
              <>
                <Bloc titre="Son">
                  <BlocSon reglages={reglages} onChange={setReglages} />
                </Bloc>
                <Bloc titre="Sous-titres">
                  <BlocSousTitres reglages={reglages} onChange={setReglages} />
                </Bloc>
                <Bloc titre="Design">
                  <BlocDesign />
                </Bloc>
                <div className="flex flex-wrap justify-between gap-2">
                  <Button variant="outline" onClick={() => setEcran("visage")}>
                    Retour
                  </Button>
                  <Button onClick={lancer} disabled={lancement || !id} className="gap-2" size="lg">
                    {lancement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    Lancer le montage
                  </Button>
                </div>
              </>
            )}
          </div>
          <div className="md:sticky md:top-4 md:self-start">
            <ApercuStudio
              image={image}
              visages={visages}
              reglages={reglages}
              flou
              sousTitre={ecran === "reglages"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
