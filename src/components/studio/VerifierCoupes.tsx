// « Ajuster les coupes », coupe par coupe (retour de Sidali du 20/10/2026, maquette validée :
// A oui · B vidéo finale · C réunir · D les deux pas).
//
// Une « coupe » = un morceau gardé de la vidéo finale, numéroté. En haut, la bande d'ensemble
// en lecture seule : la vidéo finale, coupes bout à bout ; un curseur affiche « Coupe 7 · 0:30 »
// pendant la lecture et quand on le glisse. Dessous, la liste des coupes. « Ouvrir » passe une
// coupe en plein écran pour régler son début et sa fin (EditeurCoupe). Rien n'est envoyé tant
// que l'élève ne valide pas. (Avant le 20/10 : frise modifiable et loupe sur les transitions.)
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mic, Pause, Play, RotateCcw, Undo2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { lienStudio } from "@/hooks/useStudio";
import { EditeurCoupe, EnteteCoupe } from "@/components/studio/EditeurCoupe";
import {
  dureeGardee,
  enveloppe as mesurerSon,
  memesPlages,
  minutage,
  motsAffiches,
  normaliser,
  tempsDeLecture,
  type Enveloppe,
  type Plage,
  type TravailCoupes,
} from "@/lib/studio/coupes";
import {
  apresReglage,
  coupeA,
  debutsDansLeMontage,
  minute,
  motsDeLaCoupe,
  phrasesRetireesAutour,
  resumeCoupe,
  versMontage,
  versSource,
} from "@/lib/studio/coupesParCoupe";
import { RYTHMES_COUPES, type Montage, type Reglages } from "@/lib/studio/reglages";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  montage: Pick<Montage, "id" | "user_id" | "source_path">;
  reglages: Reglages;
  /** null = coupes automatiques (le rythme choisi s'applique) ; sinon les passages gardés. */
  onValider: (plages: Plage[] | null) => void;
  libelleValider: string;
}

type Mode = "montage" | "tout";

const nomRythme = (id?: string) => RYTHMES_COUPES.find((r) => r.id === id)?.nom ?? "Dynamique";

export function VerifierCoupes({ open, onOpenChange, montage, reglages, onValider, libelleValider }: Props) {
  const [travail, setTravail] = useState<TravailCoupes | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [plages, setPlages] = useState<Plage[]>([]);
  const [historique, setHistorique] = useState<Plage[][]>([]);
  const [lecture, setLecture] = useState(false);
  const [t, setT] = useState(0);
  const [son, setSon] = useState<Enveloppe | null>(null);
  // la coupe ouverte en plein écran, et ce qu'elle était à l'ouverture (pointillé « avant »)
  const [ouverte, setOuverte] = useState<number | null>(null);
  const [origine, setOrigine] = useState<Plage | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [glisse, setGlisse] = useState(false);
  const [largeurBande, setLargeurBande] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const bande = useRef<HTMLDivElement>(null);
  const liste = useRef<HTMLUListElement>(null);
  const plagesRef = useRef<Plage[]>([]);
  const finEcoute = useRef<number | null>(null);
  // l'état avant le geste en cours (glisser un point de coupe) : annulé d'un coup, au premier vrai changement
  const geste = useRef<Plage[] | null>(null);
  const modeRef = useRef<Mode>("montage");
  plagesRef.current = plages;

  const duree = travail?.meta.duration ?? 0;
  // Voix off : pas d'image, seulement la voix (la vidéo « d'aperçu » est noire)
  const voixSeule = !!travail?.meta.audio_seul;
  const dossier = `${montage.user_id}/${montage.id}`;

  // chargement : ce que la machine a préparé, et la vidéo légère (ou la source)
  useEffect(() => {
    if (!open || travail) return;
    let actif = true;
    (async () => {
      try {
        const url = await lienStudio(`${dossier}/travail/travail.json`);
        const rep = await fetch(url);
        if (!rep.ok) throw new Error("préparation introuvable");
        const tr = (await rep.json()) as TravailCoupes;
        if (!actif) return;
        setTravail(tr);
        const deja = reglages.coupes.plages;
        setPlages(normaliser(deja?.length ? deja : tr.coupes, tr.meta.duration));
        setVideo(await lienStudio(tr.apercu_video ? `${dossier}/travail/apercu.mp4` : montage.source_path!));
      } catch {
        if (actif) setErreur("La préparation de ta vidéo n'est pas encore disponible. Réessaie dans un instant.");
      }
    })();
    return () => {
      actif = false;
    };
  }, [open, travail, dossier, montage.source_path, reglages.coupes.plages]);

  // le dessin du son (éditeur), à partir de la vidéo légère (la source peut faire 1 Go)
  useEffect(() => {
    if (!open || son || !video || !travail?.apercu_video) return;
    const Contexte =
      window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    if (!Contexte) return;
    let actif = true;
    fetch(video)
      .then((r) => r.arrayBuffer())
      .then((b) => new Contexte(1, 1, 16000).decodeAudioData(b))
      .then((audio) => actif && setSon(mesurerSon(audio.getChannelData(0), audio.sampleRate)))
      .catch(() => undefined);
    return () => {
      actif = false;
    };
  }, [open, son, video, travail?.apercu_video]);

  // à la réouverture, on repart des réglages en cours
  useEffect(() => {
    if (open && travail) {
      const deja = reglages.coupes.plages;
      setPlages(normaliser(deja?.length ? deja : travail.coupes, travail.meta.duration));
      setHistorique([]);
      setOuverte(null);
      setMessage(null);
    }
    if (!open) {
      videoRef.current?.pause();
      setLecture(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // lecture : position, saut des parties retirées (comme le montage), arrêt en fin d'écoute
  useEffect(() => {
    if (!open) return;
    let id = 0;
    let dernier = -1;
    const tick = () => {
      const v = videoRef.current;
      if (v) {
        if (!v.paused) {
          const fin = finEcoute.current;
          if (fin !== null && v.currentTime >= fin) {
            v.pause();
            finEcoute.current = null;
          } else if (modeRef.current === "montage") {
            const suite = tempsDeLecture(v.currentTime, plagesRef.current);
            if (suite === null) v.pause();
            else if (suite - v.currentTime > 0.03) v.currentTime = suite;
          }
        }
        if (Math.abs(v.currentTime - dernier) > 0.04) {
          dernier = v.currentTime;
          setT(v.currentTime);
        }
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [open]);

  const debuts = useMemo(() => debutsDansLeMontage(plages), [plages]);
  const total = dureeGardee(plages);
  const enCours = coupeA(plages, t);
  const tMontage = versMontage(plages, t);
  const mots = useMemo(() => (travail ? motsAffiches(travail.mots) : []), [travail]);
  const resumes = useMemo(() => plages.map((p) => resumeCoupe(motsDeLaCoupe(mots, p))), [plages, mots]);
  const reperes = useMemo(
    () => (travail ? plages.map((_, i) => phrasesRetireesAutour(plages, i, travail, duree)) : []),
    [plages, travail, duree],
  );
  const rythmePrepa = travail?.plages ? null : travail?.rythme ?? "dynamique";
  const rythmeDiffere = !!travail && !reglages.coupes.plages?.length && !!rythmePrepa && rythmePrepa !== reglages.coupes.rythme;

  // largeur de la bande à l'écran : un numéro ne s'affiche que si sa coupe est assez large
  useEffect(() => {
    const el = bande.current;
    if (!el) return;
    const mesurer = () => setLargeurBande(el.clientWidth);
    mesurer();
    const obs = new ResizeObserver(mesurer);
    obs.observe(el);
    return () => obs.disconnect();
  }, [travail, ouverte, open]);

  // pendant la lecture, ou quand on glisse le curseur, la coupe en cours reste visible dans la liste
  useEffect(() => {
    if ((!lecture && !glisse) || ouverte !== null || enCours < 0) return;
    liste.current?.querySelector(`[data-coupe="${enCours}"]`)?.scrollIntoView({ block: "nearest" });
  }, [enCours, lecture, glisse, ouverte]);

  /** Un réglage : `nouvelle` = annulable à part (false = la suite du même geste). */
  function regler(nouvelles: Plage[], nouvelle: boolean) {
    const avant = plagesRef.current;
    if (nouvelle) geste.current = avant;
    if (memesPlages(avant, nouvelles)) return;
    const instantane = geste.current;
    if (instantane) {
      setHistorique((h) => [...h.slice(-49), instantane]);
      geste.current = null;
    }
    setPlages(nouvelles);
    if (ouverte !== null && avant[ouverte]) {
      const milieu = (avant[ouverte][0] + avant[ouverte][1]) / 2;
      const { coupe, reunies } = apresReglage(avant, nouvelles, milieu);
      if (reunies) {
        setMessage(`Les coupes ${coupe + 1} et ${coupe + 2} sont réunies : elles n'en font plus qu'une.`);
        setOrigine(nouvelles[coupe]);
      } else setMessage(null);
      setOuverte(coupe);
    }
  }

  function annuler() {
    if (!historique.length) return;
    const precedent = historique[historique.length - 1];
    setHistorique((h) => h.slice(0, -1));
    setPlages(precedent);
    setMessage(null);
    if (ouverte !== null && ouverte >= precedent.length) setOuverte(precedent.length - 1);
  }

  function aller(temps: number, jouer = false) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(duree, temps));
    setT(v.currentTime);
    if (jouer) v.play().catch(() => undefined);
  }

  function basculerLecture() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      finEcoute.current = null;
      modeRef.current = "montage";
      if (tempsDeLecture(v.currentTime, plages) === null) v.currentTime = plages[0]?.[0] ?? 0;
      v.play().catch(() => undefined);
    } else v.pause();
  }

  /** Écouter comme le montage (les parties retirées sautées), de `de` à `jusqua`. */
  function ecouter(de: number, jusqua: number) {
    modeRef.current = "montage";
    finEcoute.current = Math.min(duree, jusqua);
    aller(de, true);
  }

  /** Écouter une partie retirée telle qu'elle est (avec 0,5 s autour). */
  function ecouterRetire([a, b]: Plage) {
    modeRef.current = "tout";
    finEcoute.current = Math.min(duree, b + 0.5);
    aller(Math.max(0, a - 0.5), true);
  }

  function ouvrir(i: number) {
    videoRef.current?.pause();
    setOrigine(plages[i]);
    setMessage(null);
    setOuverte(i);
    aller(plages[i][0]);
  }

  // la bande : un instant de la vidéo finale sous le pointeur
  const montageDuPointeur = (clientX: number) => {
    const r = bande.current?.getBoundingClientRect();
    return r && total ? Math.max(0, Math.min(total, ((clientX - r.left) / r.width) * total)) : 0;
  };

  function valider() {
    if (!travail) return;
    const auto = !travail.plages && memesPlages(plages, normaliser(travail.coupes, duree));
    onValider(auto ? null : plages);
    onOpenChange(false);
  }

  const graduation = total > 120 ? 20 : total > 40 ? 10 : 5;
  const pourcent = (s: number) => (total ? (s / total) * 100 : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* téléphone : la fenêtre défile ; ordinateur : tout reste à l'écran, seule la liste défile */}
      <DialogContent className="flex h-[94vh] max-w-6xl flex-col gap-3 overflow-y-auto md:overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Ajuster les coupes</DialogTitle>
          <DialogDescription>
            Écoute ta vidéo, repère la coupe à corriger, puis ouvre-la pour régler son début et sa fin.
          </DialogDescription>
        </DialogHeader>

        {erreur ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">{erreur}</p>
        ) : !travail ? (
          <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex flex-col gap-4 md:min-h-0 md:flex-1" data-testid="verifier-coupes">
            <div className="grid shrink-0 items-center gap-4 md:grid-cols-[auto_1fr]">
              {/* la vidéo reste montée (c'est elle qui joue le son) ; plus petite quand une coupe est ouverte */}
              <div
                className={cn(
                  "relative mx-auto aspect-[9/16] overflow-hidden rounded-xl border border-border bg-black",
                  ouverte !== null ? "h-[15vh] min-h-[100px]" : "h-[26vh] max-h-[260px] min-h-[150px]",
                )}
              >
                {video ? (
                  <video
                    ref={videoRef}
                    src={video}
                    playsInline
                    preload="auto"
                    className={cn("h-full w-full object-contain", voixSeule && "hidden")}
                    onPlay={() => setLecture(true)}
                    onPause={() => setLecture(false)}
                    data-testid="coupes-video"
                  />
                ) : (
                  <Loader2 className="m-auto mt-16 h-6 w-6 animate-spin text-muted-foreground" />
                )}
                {voixSeule && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-primary/15 to-black p-3 text-center" data-testid="coupes-voix">
                    <span className={cn("rounded-full bg-primary/20 p-3", lecture && "animate-pulse")}>
                      <Mic className="h-6 w-6 text-primary" />
                    </span>
                    <p className="text-xs font-medium text-foreground">Ta voix</p>
                  </div>
                )}
              </div>

              {ouverte !== null ? (
                <EnteteCoupe plages={plages} coupe={ouverte} mots={mots} onAller={ouvrir} onFermer={() => setOuverte(null)} />
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                    <p className="text-2xl font-semibold tabular-nums text-foreground">
                      {minutage(total)} <span className="text-sm font-normal text-muted-foreground">gardées</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      sur {minutage(duree)} filmées · {plages.length} coupe{plages.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  {rythmeDiffere && (
                    <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      Ces coupes sont celles du rythme « {nomRythme(rythmePrepa!)} ». Le rythme « {nomRythme(reglages.coupes.rythme)} »
                      s'appliquera au prochain montage, sauf si tu ajustes ici : tes ajustements le remplacent.
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={basculerLecture} className="gap-2" disabled={!video} data-testid="coupes-lecture">
                      {lecture ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {lecture ? "Pause" : "Lecture"}
                    </Button>
                    <span className="font-mono text-sm tabular-nums text-muted-foreground">
                      {minute(tMontage)} / {minute(total)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {ouverte !== null ? (
              <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
                <EditeurCoupe
                  plages={plages}
                  coupe={ouverte}
                  duree={duree}
                  mots={mots}
                  enveloppe={son}
                  origine={origine}
                  t={t}
                  message={message}
                  peutAnnuler={historique.length > 0}
                  onRegler={regler}
                  onAnnuler={annuler}
                  onEcouter={ecouter}
                  onEcouterRetire={ecouterRetire}
                  onFermer={() => setOuverte(null)}
                />
              </div>
            ) : (
              <>
                {/* la bande d'ensemble : la vidéo finale, en lecture seule */}
                <div className="shrink-0 space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Vue d'ensemble · ta vidéo finale{" "}
                    <span className="text-xs font-normal text-muted-foreground">(on écoute, on repère : rien ne se modifie ici)</span>
                  </p>
                  <div className="relative pt-8">
                    {enCours >= 0 && (
                      <span
                        className="pointer-events-none absolute top-0 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-2 py-0.5 text-xs font-bold text-black shadow"
                        style={{ left: `clamp(48px, ${pourcent(tMontage)}%, calc(100% - 48px))` }}
                        data-testid="coupe-en-cours"
                      >
                        Coupe {enCours + 1} · {minute(tMontage)}
                      </span>
                    )}
                    <div
                      ref={bande}
                      className="relative h-12 cursor-pointer touch-none select-none"
                      onPointerDown={(e) => {
                        (e.target as Element).setPointerCapture?.(e.pointerId);
                        setGlisse(true);
                        aller(versSource(plages, montageDuPointeur(e.clientX)));
                      }}
                      onPointerMove={(e) => glisse && aller(versSource(plages, montageDuPointeur(e.clientX)))}
                      onPointerUp={() => {
                        setGlisse(false);
                        // un geste rapide (glisser et lâcher dans la même image) : la liste rattrape le curseur
                        const i = coupeA(plagesRef.current, videoRef.current?.currentTime ?? 0);
                        liste.current?.querySelector(`[data-coupe="${i}"]`)?.scrollIntoView({ block: "nearest" });
                      }}
                      onPointerCancel={() => setGlisse(false)}
                      role="slider"
                      aria-label="Position dans la vidéo finale"
                      aria-valuenow={tMontage}
                      data-testid="coupes-bande"
                    >
                      {plages.map(([a, b], i) => (
                        <div
                          key={`${i}-${a}`}
                          className={cn(
                            "absolute inset-y-0 flex items-center justify-center overflow-hidden rounded-[5px] border border-primary text-[11px] font-bold",
                            i === enCours ? "bg-primary text-primary-foreground" : "bg-primary/30 text-foreground",
                          )}
                          style={{ left: `calc(${pourcent(debuts[i])}% + 1px)`, width: `calc(${pourcent(b - a)}% - 2px)` }}
                        >
                          {((b - a) / (total || 1)) * largeurBande >= 7 + 7 * String(i + 1).length ? i + 1 : ""}
                        </div>
                      ))}
                      <div className="pointer-events-none absolute -bottom-2 -top-2 z-10 w-[3px] -translate-x-1/2 rounded bg-white shadow" style={{ left: `${pourcent(tMontage)}%` }} />
                    </div>
                    <div className="relative mt-1.5 h-4 text-[10px] text-muted-foreground">
                      {Array.from({ length: Math.floor(total / graduation) + 1 }, (_, k) => k * graduation).map((s) => (
                        <span key={s} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `clamp(10px, ${pourcent(s)}%, calc(100% - 10px))` }}>
                          {minute(s)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* la liste des coupes */}
                <div className="flex flex-col gap-2 md:min-h-[120px] md:flex-1">
                  <p className="shrink-0 text-sm font-medium text-foreground">Les coupes</p>
                  <ul ref={liste} className="divide-y divide-border rounded-lg border border-border md:min-h-0 md:flex-1 md:overflow-y-auto" data-testid="coupes-liste">
                    {plages.map(([a, b], i) => {
                      const r = reperes[i];
                      return (
                        <li
                          key={`${i}-${a}`}
                          data-coupe={i}
                          className={cn(
                            "flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm transition-colors hover:bg-muted/40",
                            i === enCours && "bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary))]",
                          )}
                          onClick={() => aller(a)}
                        >
                          <span className={cn("w-[74px] shrink-0 font-semibold", i === enCours ? "text-primary" : "text-foreground")}>Coupe {i + 1}</span>
                          <span className="w-[86px] shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                            {minute(debuts[i])} → {minute(debuts[i] + b - a)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs text-foreground/90">« {resumes[i]} »</span>
                          {(r?.avant || r?.apres) && (
                            <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                              phrase recommencée {r.avant && r.apres ? "avant et après" : r.avant ? "avant" : "après"}
                            </span>
                          )}
                          {i === enCours && lecture && <span className="shrink-0 text-[11px] font-semibold text-primary">▶ en lecture</span>}
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn("h-8 shrink-0", i === enCours && "border-primary/70 text-primary")}
                            onClick={(e) => {
                              e.stopPropagation();
                              ouvrir(i);
                            }}
                            data-testid="coupe-ouvrir"
                          >
                            Ouvrir
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}

            <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border pt-3">
              <Button variant="ghost" className="gap-2" disabled={!historique.length} onClick={annuler}>
                <Undo2 className="h-4 w-4" /> Annuler
              </Button>
              {(!!reglages.coupes.plages?.length || !!travail.plages) && (
                <Button
                  variant="ghost"
                  className="gap-2 text-muted-foreground"
                  onClick={() => {
                    onValider(null);
                    onOpenChange(false);
                  }}
                >
                  <RotateCcw className="h-4 w-4" /> Revenir aux coupes automatiques
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fermer
                </Button>
                <Button onClick={valider}>{libelleValider}</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
