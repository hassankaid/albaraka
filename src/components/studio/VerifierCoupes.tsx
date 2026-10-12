// « Vérifier les coupes » (vocal de Sidali, 12/10/2026) : la vidéo d'origine, la frise
// des passages gardés (en or) et des coupes (hachurées), des poignées pour prolonger
// ou raccourcir un passage, et la liste des coupes avec « Écouter » et « Garder ».
// La lecture « comme le montage » saute les coupes : on entend le rythme final
// avant de relancer. Rien n'est envoyé tant que l'élève ne valide pas.
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mic, Pause, Play, RotateCcw, Undo2, Volume2, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { lienStudio } from "@/hooks/useStudio";
import {
  coupesEntre,
  deplacerBord,
  dureeGardee,
  garderCoupe,
  memesPlages,
  minutage,
  motsAffiches,
  natureCoupe,
  normaliser,
  tempsDeLecture,
  type Plage,
  type TravailCoupes,
} from "@/lib/studio/coupes";
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
  const [mode, setMode] = useState<Mode>("montage");
  const [lecture, setLecture] = useState(false);
  const [t, setT] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [largeur, setLargeur] = useState(0);
  const [glisse, setGlisse] = useState<{ i: number; bord: "debut" | "fin"; base: Plage[] } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const frise = useRef<HTMLDivElement>(null);
  const cadre = useRef<HTMLDivElement>(null);
  const plagesRef = useRef<Plage[]>([]);
  const finEcoute = useRef<number | null>(null);
  const modeRef = useRef<Mode>("montage");
  plagesRef.current = plages;
  modeRef.current = mode;

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

  // à la réouverture, on repart des réglages en cours
  useEffect(() => {
    if (open && travail) {
      const deja = reglages.coupes.plages;
      setPlages(normaliser(deja?.length ? deja : travail.coupes, travail.meta.duration));
      setHistorique([]);
    }
    if (!open) {
      videoRef.current?.pause();
      setLecture(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // largeur visible de la frise (zoom 1 = toute la vidéo tient à l'écran)
  useEffect(() => {
    if (!open) return;
    const el = cadre.current;
    if (!el) return;
    const mesurer = () => setLargeur(el.clientWidth);
    mesurer();
    const obs = new ResizeObserver(mesurer);
    obs.observe(el);
    return () => obs.disconnect();
  }, [open, travail]);

  // lecture : position, saut des coupes en mode « montage », arrêt après « Écouter »
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
          } else if (fin === null && modeRef.current === "montage") {
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

  const pxParS = duree ? (Math.max(largeur, 300) / duree) * zoom : 0;
  const coupes = useMemo(() => coupesEntre(plages, duree).filter(([a, b]) => b - a > 0.03), [plages, duree]);
  const gardee = dureeGardee(plages);
  // les mots sous la frise : seulement ceux qui tiennent sans se chevaucher (zoomer en montre plus)
  const motsVisibles = useMemo(() => {
    if (!travail || !pxParS) return [];
    let droite = -Infinity;
    return motsAffiches(travail.mots.map((m, k) => ({ ...m, k })))
      .filter((m) => {
        const x = m.start * pxParS;
        if (x < droite) return false;
        droite = x + Math.min(120, m.text.length * 5.6 + 6);
        return true;
      });
  }, [travail, pxParS]);
  const rythmePrepa = travail?.plages ? null : travail?.rythme ?? "dynamique";
  const rythmeDiffere = !!travail && !reglages.coupes.plages?.length && !!rythmePrepa && rythmePrepa !== reglages.coupes.rythme;

  function modifier(nouvelles: Plage[]) {
    setHistorique((h) => [...h.slice(-49), plages]);
    setPlages(nouvelles);
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
      if (mode === "montage" && tempsDeLecture(v.currentTime, plages) === null) v.currentTime = plages[0]?.[0] ?? 0;
      v.play().catch(() => undefined);
    } else v.pause();
  }

  function ecouter(coupe: Plage) {
    setMode("tout");
    finEcoute.current = Math.min(duree, coupe[1] + 1);
    aller(coupe[0] - 1.5, true);
  }

  const tempsDuPointeur = (clientX: number) => {
    const r = frise.current?.getBoundingClientRect();
    return r ? (clientX - r.left) / pxParS : 0;
  };

  function valider() {
    if (!travail) return;
    const auto = !travail.plages && memesPlages(plages, normaliser(travail.coupes, duree));
    onValider(auto ? null : plages);
    onOpenChange(false);
  }

  const graduation = duree > 120 ? 10 : duree > 40 ? 5 : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[94vh] max-w-6xl flex-col gap-3 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Vérifier les coupes</DialogTitle>
          <DialogDescription>
            En or, les passages gardés ; hachurées, les coupes. Tire les poignées pour prolonger un passage, ou garde
            une coupe entière depuis la liste.
          </DialogDescription>
        </DialogHeader>

        {erreur ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">{erreur}</p>
        ) : !travail ? (
          <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          // la vidéo, la frise et les boutons restent à l'écran ; seule la liste des coupes défile
          <div className="flex min-h-0 flex-1 flex-col gap-4" data-testid="verifier-coupes">
            <div className="grid shrink-0 gap-4 md:grid-cols-[auto_1fr]">
              <div className="relative mx-auto aspect-[9/16] h-[30vh] max-h-[300px] min-h-[170px] overflow-hidden rounded-xl border border-border bg-black">
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
                  <Loader2 className="m-auto mt-24 h-6 w-6 animate-spin text-muted-foreground" />
                )}
                {voixSeule && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-primary/15 to-black p-4 text-center"
                    data-testid="coupes-voix"
                  >
                    <span className={cn("rounded-full bg-primary/20 p-4", lecture && "animate-pulse")}>
                      <Mic className="h-7 w-7 text-primary" />
                    </span>
                    <p className="text-sm font-medium text-foreground">Ta voix</p>
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      Ici, tu règles les coupes de ta voix. Les images de la banque sont choisies au montage.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  <p className="text-2xl font-semibold tabular-nums text-foreground">
                    {minutage(gardee)} <span className="text-sm font-normal text-muted-foreground">gardées</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    sur {minutage(duree)} filmées · {coupes.length} coupe{coupes.length > 1 ? "s" : ""}
                  </p>
                </div>

                {rythmeDiffere && (
                  <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    Ces coupes sont celles du rythme « {nomRythme(rythmePrepa!)} ». Le rythme « {nomRythme(reglages.coupes.rythme)} »
                    s'appliquera au prochain montage, sauf si tu ajustes ici : tes ajustements le remplacent.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={basculerLecture} className="gap-2" disabled={!video}>
                    {lecture ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {lecture ? "Pause" : "Lecture"}
                  </Button>
                  <div className="flex rounded-lg border border-border p-0.5 text-xs">
                    {(
                      [
                        { id: "montage", nom: "Comme le montage" },
                        { id: "tout", nom: voixSeule ? "Voix entière" : "Vidéo entière" },
                      ] as { id: Mode; nom: string }[]
                    ).map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => {
                          finEcoute.current = null;
                          setMode(o.id);
                        }}
                        aria-pressed={mode === o.id}
                        className={cn(
                          "rounded-md px-3 py-1.5 font-medium transition-colors",
                          mode === o.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {o.nom}
                      </button>
                    ))}
                  </div>
                  <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">{minutage(t)}</span>
                </div>

                <p className="text-xs text-muted-foreground">
                  « Comme le montage » saute les coupes : tu entends le rythme final. « {voixSeule ? "Voix entière" : "Vidéo entière"} »
                  joue tout, pour repérer ce qui a été coupé.
                </p>
              </div>
            </div>

            {/* la frise */}
            <div className="shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Frise du montage</p>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(1, z / 1.6))} disabled={zoom <= 1} aria-label="Dézoomer">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(12, z * 1.6))} disabled={zoom >= 12} aria-label="Zoomer">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div ref={cadre} className="overflow-x-auto rounded-lg border border-border bg-muted/20 pb-2">
                <div style={{ width: duree * pxParS }} className="relative select-none px-0">
                  <div className="relative h-5 text-[10px] text-muted-foreground">
                    {Array.from({ length: Math.floor(duree / graduation) + 1 }, (_, k) => k * graduation).map((s) => (
                      <span key={s} className="absolute top-1 -translate-x-1/2 tabular-nums" style={{ left: s * pxParS }}>
                        {minutage(s).replace(/,\d$/, "")}
                      </span>
                    ))}
                  </div>
                  <div
                    ref={frise}
                    className="relative h-14 cursor-pointer bg-[repeating-linear-gradient(135deg,rgba(239,68,68,0.18)_0_6px,transparent_6px_12px)]"
                    onPointerDown={(e) => aller(tempsDuPointeur(e.clientX))}
                    data-testid="coupes-frise"
                  >
                    {plages.map(([a, b], i) => (
                      <div
                        key={`${i}-${a}`}
                        className="absolute inset-y-1 rounded-md border border-primary bg-primary/70"
                        style={{ left: a * pxParS, width: Math.max(2, (b - a) * pxParS) }}
                      >
                        {(["debut", "fin"] as const).map((bord) => (
                          <span
                            key={bord}
                            role="slider"
                            aria-label={`${bord === "debut" ? "Début" : "Fin"} du passage ${i + 1}`}
                            aria-valuenow={bord === "debut" ? a : b}
                            className={cn(
                              "absolute inset-y-0 z-10 flex w-3 cursor-ew-resize touch-none items-center justify-center bg-primary-foreground/90 hover:bg-white",
                              bord === "debut" ? "-left-1 rounded-l-md" : "-right-1 rounded-r-md",
                            )}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              (e.target as HTMLElement).setPointerCapture(e.pointerId);
                              setGlisse({ i, bord, base: plages });
                            }}
                            onPointerMove={(e) => {
                              if (!glisse) return;
                              setPlages(deplacerBord(glisse.base, glisse.i, glisse.bord, tempsDuPointeur(e.clientX), duree));
                            }}
                            onPointerUp={(e) => {
                              if (!glisse) return;
                              const fin = tempsDuPointeur(e.clientX);
                              if (!memesPlages(glisse.base, plagesRef.current)) setHistorique((h) => [...h.slice(-49), glisse.base]);
                              setGlisse(null);
                              aller(glisse.bord === "fin" ? fin - 1.5 : fin - 0.3);
                            }}
                          >
                            <span className="h-5 w-0.5 rounded bg-primary" />
                          </span>
                        ))}
                      </div>
                    ))}
                    <div className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-white shadow" style={{ left: t * pxParS }} />
                  </div>
                  <div className="relative h-5">
                    {motsVisibles.map((m) => {
                      const retire = !plages.some(([a, b]) => (m.start + m.end) / 2 >= a && (m.start + m.end) / 2 <= b);
                      return (
                        <span
                          key={m.k}
                          className={cn(
                            "absolute top-1 max-w-[120px] truncate whitespace-nowrap text-[10px]",
                            retire ? "text-red-300/80 line-through" : "text-muted-foreground",
                          )}
                          style={{ left: m.start * pxParS }}
                        >
                          {m.text}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* la liste des coupes */}
            <div className="flex min-h-[120px] flex-1 flex-col gap-2">
              <p className="shrink-0 text-sm font-medium text-foreground">Les coupes</p>
              {coupes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Plus aucune coupe : toute la vidéo est gardée.</p>
              ) : (
                <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                  {coupes.map((c) => {
                    const n = natureCoupe(c, travail);
                    const bord = c[0] <= 0.001 ? "Début de la vidéo" : c[1] >= duree - 0.001 ? "Fin de la vidéo" : null;
                    return (
                      <li key={`${c[0]}-${c[1]}`} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                        <span className="w-28 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                          {minutage(c[0])} · {(c[1] - c[0]).toFixed(1).replace(".", ",")} s
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            n.phraseRatee ? "bg-amber-500/15 text-amber-300" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {n.phraseRatee ? "Phrase recommencée" : bord ?? "Blanc"}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                          {n.avant && <>…{n.avant} </>}
                          {n.mots ? <span className="text-red-300 line-through">{n.mots}</span> : <span className="text-foreground">‖</span>}
                          {n.apres && <> {n.apres}…</>}
                        </span>
                        <span className="flex shrink-0 gap-1">
                          <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => ecouter(c)}>
                            <Volume2 className="h-3.5 w-3.5" /> Écouter
                          </Button>
                          <Button variant="outline" size="sm" className="h-8" onClick={() => modifier(garderCoupe(plages, c, duree))}>
                            Garder
                          </Button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border pt-3">
              <Button
                variant="ghost"
                className="gap-2"
                disabled={!historique.length}
                onClick={() => {
                  setPlages(historique[historique.length - 1]);
                  setHistorique((h) => h.slice(0, -1));
                }}
              >
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
