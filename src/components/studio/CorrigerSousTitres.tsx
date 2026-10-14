// « Corriger les sous-titres » (demande de Sidali, 14/10/2026) : la liste des sous-titres
// de l'IA, chacun modifiable (petite ligne et mot clé), avec la vidéo montée et le
// sous-titre corrigé dessiné par-dessus. Un clic sur l'heure fait écouter ce passage.
// Un mot corrigé l'est partout dans la vidéo (voir lib/studio/sousTitres.ts).
// Rien n'est envoyé tant que l'élève ne valide pas.
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Pause, Play, Search, Undo2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { lienStudio } from "@/hooks/useStudio";
import { memesPlages, minutage, type Plage } from "@/lib/studio/coupes";
import { chargerPolices, dessinerSousTitre, dessinerSousTitreAnime, H, W } from "@/lib/studio/apercu";
import { couleursDesign, type Montage, type Reglages } from "@/lib/studio/reglages";
import {
  appliquer,
  correctionDe,
  correctionsValides,
  corriger,
  corrigesAEnregistrer,
  corrigesOrphelins,
  indexAuTemps,
  MAX_GRAND,
  MAX_PETIT,
  sousTitreVide,
  type CorrectionSousTitre,
  type SousTitre,
} from "@/lib/studio/sousTitres";

interface TravailSousTitres {
  sous_titres: SousTitre[];
  rythme?: string;
  plages?: Plage[] | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  montage: Pick<Montage, "id" | "user_id">;
  reglages: Reglages;
  onValider: (corrections: CorrectionSousTitre[]) => void;
  libelleValider: string;
}

const sansAccents = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function CorrigerSousTitres({ open, onOpenChange, montage, reglages, onValider, libelleValider }: Props) {
  const [travail, setTravail] = useState<TravailSousTitres | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<CorrectionSousTitre[]>([]);
  const [recherche, setRecherche] = useState("");
  const [t, setT] = useState(0);
  const [lecture, setLecture] = useState(false);
  const [polices, setPolices] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const toile = useRef<HTMLCanvasElement>(null);
  const finEcoute = useRef<number | null>(null);
  const lignes = useRef<(HTMLLIElement | null)[]>([]);
  const dossier = `${montage.user_id}/${montage.id}`;

  useEffect(() => {
    chargerPolices().then(() => setPolices(true)).catch(() => setPolices(true));
  }, []);

  // chargement : les sous-titres de l'IA et la vidéo montée (sans sous-titres)
  useEffect(() => {
    if (!open || travail) return;
    let actif = true;
    (async () => {
      try {
        const rep = await fetch(await lienStudio(`${dossier}/travail/travail.json`));
        if (!rep.ok) throw new Error("préparation introuvable");
        const tr = (await rep.json()) as TravailSousTitres;
        if (!actif) return;
        setTravail(tr);
        setVideo(await lienStudio(`${dossier}/travail/cut.mp4`));
      } catch {
        if (actif) setErreur("La préparation de ta vidéo n'est pas encore disponible. Réessaie dans un instant.");
      }
    })();
    return () => {
      actif = false;
    };
  }, [open, travail, dossier]);

  // à chaque ouverture, on repart des corrections enregistrées
  useEffect(() => {
    if (open) {
      setCorrections(correctionsValides(reglages.sous_titres.corrections));
      setRecherche("");
    } else {
      videoRef.current?.pause();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const ia = useMemo(() => travail?.sous_titres ?? [], [travail]);
  const affiches = useMemo(() => appliquer(ia, corrections), [ia, corrections]);
  const courant = indexAuTemps(affiches, t);
  const orphelins = useMemo(() => corrigesOrphelins(ia, reglages.sous_titres.corrections), [ia, reglages.sous_titres.corrections]);
  const nbCorriges = affiches.filter((c, i) => c.small !== ia[i].small || c.big !== ia[i].big).length;
  const vides = affiches.some((c) => sousTitreVide(c));

  // coupes changées depuis la préparation : les sous-titres seront recalculés au montage
  const coupesChangees = useMemo(() => {
    if (!travail) return false;
    const voulues = reglages.coupes.plages;
    if (voulues?.length) return !memesPlages(voulues, travail.plages);
    return !!travail.plages?.length || (travail.rythme ?? "dynamique") !== reglages.coupes.rythme;
  }, [travail, reglages.coupes]);

  const visibles = useMemo(() => {
    const q = sansAccents(recherche.trim());
    return ia
      .map((_, i) => i)
      .filter((i) => !q || sansAccents(`${ia[i].small} ${ia[i].big} ${affiches[i].small} ${affiches[i].big}`).includes(q));
  }, [ia, affiches, recherche]);

  // position de lecture, arrêt à la fin du sous-titre écouté
  useEffect(() => {
    if (!open) return;
    let id = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v) {
        if (finEcoute.current !== null && v.currentTime >= finEcoute.current) {
          v.pause();
          finEcoute.current = null;
        }
        setT(v.currentTime);
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [open]);

  // le sous-titre corrigé, dessiné par-dessus la vidéo (comme dans la vidéo finale)
  useEffect(() => {
    const ctx = toile.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    const c = affiches[courant];
    if (!c || !polices) return;
    if (reglages.design?.actif) {
      dessinerSousTitreAnime(ctx, c.small, c.big, reglages.sous_titres, couleursDesign(reglages.design).principale);
    } else dessinerSousTitre(ctx, c.small, c.big, reglages.sous_titres);
  }, [affiches, courant, polices, reglages, video]);

  // pendant la lecture, la liste suit la vidéo (sauf si l'élève est en train d'écrire)
  useEffect(() => {
    if (!lecture || courant < 0) return;
    if (document.activeElement instanceof HTMLInputElement && document.activeElement.dataset.sousTitre) return;
    lignes.current[courant]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [courant, lecture]);

  function ecouter(i: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = ia[i].start + 0.01;
    finEcoute.current = (ia[i + 1]?.start ?? ia[i].end) + 0.05;
    v.play().catch(() => undefined);
  }

  function lireOuPause() {
    const v = videoRef.current;
    if (!v) return;
    finEcoute.current = null;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  }

  function modifier(i: number, champ: "small" | "big", valeur: string) {
    const deja = correctionDe(ia[i], corrections);
    const base = deja ?? affiches[i];
    setCorrections((cs) => corriger(cs, ia[i], { small: base.small, big: base.big, [champ]: valeur }));
  }

  function valider() {
    onValider(corrigesAEnregistrer(ia, corrections));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[94vh] max-w-5xl flex-col gap-3 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Corriger les sous-titres</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Corrige la petite ligne ou le mot clé d'un sous-titre. Clique sur l'heure pour réécouter ce passage. Un mot corrigé
            l'est partout dans la vidéo, animations comprises.
          </DialogDescription>
        </DialogHeader>

        {erreur ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">{erreur}</p>
        ) : !travail ? (
          <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3" data-testid="corriger-sous-titres">
            {/* sur téléphone, tout défile et la vidéo reste collée en haut ; sur ordinateur, seule la liste défile */}
            <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto md:grid-cols-[auto_1fr] md:gap-4 md:overflow-hidden">
              <div className="sticky top-0 z-10 flex shrink-0 flex-col items-center gap-2 bg-background pb-2 md:static md:pb-0">
                <div className="relative aspect-[9/16] h-[22vh] min-h-[150px] overflow-hidden rounded-xl border border-border bg-black md:h-[min(560px,62vh)]">
                  {video ? (
                    <video
                      ref={videoRef}
                      src={video}
                      playsInline
                      preload="auto"
                      className="h-full w-full object-contain"
                      onPlay={() => setLecture(true)}
                      onPause={() => setLecture(false)}
                      data-testid="sous-titres-video"
                    />
                  ) : (
                    <Loader2 className="m-auto mt-16 h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                  <canvas ref={toile} width={W} height={H} className="pointer-events-none absolute inset-0 h-full w-full" />
                  <span className="absolute bottom-2 right-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Aperçu
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={lireOuPause} disabled={!video} className="gap-2">
                  {lecture ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {lecture ? "Pause" : "Lire"}{" "}
                  <span className="tabular-nums text-muted-foreground">{minutage(t)}</span>
                </Button>
              </div>

              <div className="flex flex-col gap-2 md:min-h-0">
                {coupesChangees && (
                  <p className="flex shrink-0 gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Tu as changé les coupes : les sous-titres seront recalculés au montage. Tes mots corrigés seront repris ;
                    vérifie-les quand la vidéo sera prête.
                  </p>
                )}
                {orphelins > 0 && !coupesChangees && (
                  <p className="flex shrink-0 gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Tes coupes ont changé depuis tes dernières corrections : les sous-titres ont été recalculés. Les mots corrigés
                    sont repris ci-dessous ; vérifie le reste.
                  </p>
                )}
                <div className="relative shrink-0">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    placeholder="Chercher un mot…"
                    className="pl-9"
                    aria-label="Chercher un mot dans les sous-titres"
                  />
                </div>
                <ul className="space-y-1.5 pr-1 md:min-h-0 md:flex-1 md:overflow-y-auto" data-testid="liste-sous-titres">
                  {visibles.map((i) => {
                    const c = affiches[i];
                    const exacte = correctionDe(ia[i], corrections);
                    const valeur = exacte ?? c;
                    const change = c.small !== ia[i].small || c.big !== ia[i].big;
                    const vide = sousTitreVide(c);
                    return (
                      <li
                        key={i}
                        ref={(el) => (lignes.current[i] = el)}
                        className={cn(
                          "rounded-lg border p-2 transition-colors",
                          i === courant ? "border-primary bg-primary/5" : change ? "border-emerald-500/40" : "border-border",
                          vide && "border-red-500/60",
                        )}
                        data-testid="ligne-sous-titre"
                      >
                        {/* téléphone : heure et retour en haut, les deux cases en dessous, pleine largeur */}
                        <div className="grid grid-cols-[1fr_auto] items-center gap-1.5 sm:flex sm:gap-2">
                          <button
                            type="button"
                            onClick={() => ecouter(i)}
                            className="flex shrink-0 items-center gap-1 justify-self-start rounded-md px-1.5 py-1 text-xs tabular-nums text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={`Écouter le sous-titre de ${minutage(ia[i].start)}`}
                          >
                            <Play className="h-3 w-3" /> {minutage(ia[i].start)}
                          </button>
                          <Input
                            value={valeur.small}
                            onChange={(e) => modifier(i, "small", e.target.value)}
                            maxLength={MAX_PETIT}
                            className="col-span-2 h-8 min-w-0 text-sm uppercase sm:flex-[3]"
                            aria-label="Petite ligne"
                            data-sous-titre="1"
                          />
                          <Input
                            value={valeur.big}
                            onChange={(e) => modifier(i, "big", e.target.value)}
                            maxLength={MAX_GRAND}
                            className="col-span-2 h-8 min-w-0 font-serif text-sm italic sm:flex-[2]"
                            aria-label="Mot clé"
                            data-sous-titre="1"
                          />
                          {exacte ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 sm:order-last"
                              onClick={() => setCorrections((cs) => corriger(cs, ia[i], { small: ia[i].small, big: ia[i].big }))}
                              aria-label="Revenir au texte d'origine"
                              title="Revenir au texte d'origine"
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="h-8 w-8 shrink-0 sm:order-last" />
                          )}
                        </div>
                        {(change || vide) && (
                          <p className={cn("mt-1 pl-1 text-[11px]", vide ? "text-red-400" : "text-emerald-500")}>
                            {vide ? (
                              "Un sous-titre doit garder du texte."
                            ) : (
                              <>
                                <CheckCircle2 className="mr-1 inline h-3 w-3" />
                                {exacte ? "Corrigé" : "Mot corrigé repris automatiquement"} · avant : « {ia[i].small} {ia[i].big} »
                              </>
                            )}
                          </p>
                        )}
                      </li>
                    );
                  })}
                  {visibles.length === 0 && <p className="p-3 text-xs text-muted-foreground">Aucun sous-titre ne contient ce mot.</p>}
                </ul>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">
                {nbCorriges === 0
                  ? "Aucun sous-titre corrigé"
                  : `${nbCorriges} sous-titre${nbCorriges > 1 ? "s" : ""} corrigé${nbCorriges > 1 ? "s" : ""}`}
              </span>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fermer
                </Button>
                <Button onClick={valider} disabled={vides}>
                  {libelleValider}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
