// Voix off : enregistrement de la voix dans le navigateur, avec le script qui défile
// comme un prompteur (vitesse réglable), un indicateur de niveau du micro qui passe
// au rouge, Pause / Recommencer, puis réécoute et validation (cahier, section 3).
// Si l'élève se trompe, il reprend simplement sa phrase : l'IA garde la dernière version.
import { useEffect, useRef, useState } from "react";
import { Check, Mic, Pause, Play, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  chrono,
  CONSEIL_NIVEAU,
  dbfs,
  ENREGISTREMENT_MAX_S,
  formatEnregistrement,
  niveauMicro,
  type NiveauMicro,
} from "@/lib/studio/voixoff";

type Phase = "pret" | "enregistrement" | "pause" | "fini";

export function EnregistreurVoix({
  script,
  onValider,
  dureeMax = ENREGISTREMENT_MAX_S,
}: {
  script: string;
  onValider: (voix: Blob) => void;
  /** 3 min, ou 1 min en version gratuite (29/10/2026). */
  dureeMax?: number;
}) {
  const [phase, setPhase] = useState<Phase>("pret");
  const [erreur, setErreur] = useState<string | null>(null);
  const [vitesse, setVitesse] = useState(30); // pixels par seconde
  const [duree, setDuree] = useState(0);
  const [niveau, setNiveau] = useState<{ db: number; n: NiveauMicro }>({ db: -100, n: "silence" });
  const [ecoute, setEcoute] = useState<string | null>(null);

  const prompteur = useRef<HTMLDivElement>(null);
  const flux = useRef<MediaStream | null>(null);
  const enregistreur = useRef<MediaRecorder | null>(null);
  const morceaux = useRef<Blob[]>([]);
  const blob = useRef<Blob | null>(null);
  const contexte = useRef<AudioContext | null>(null);
  const analyseur = useRef<AnalyserNode | null>(null);
  const phaseRef = useRef<Phase>("pret");
  // durée réelle : début du passage en cours + temps des passages d'avant (Pause / Reprendre).
  // On ne cumule pas le temps entre deux images : un onglet en arrière-plan n'en dessine plus.
  const debutPassage = useRef<number | null>(null);
  const cumul = useRef(0);
  const vitesseRef = useRef(vitesse);
  phaseRef.current = phase;
  vitesseRef.current = vitesse;

  // la formule de l'élève peut arriver après le premier affichage : la boucle lit la valeur à jour
  const dureeMaxRef = useRef(dureeMax);
  dureeMaxRef.current = dureeMax;

  // boucle : défilement du prompteur, niveau du micro, chrono, arrêt à 3 min (1 min en gratuit)
  useEffect(() => {
    let id = 0;
    let avant = performance.now();
    const tampon = new Float32Array(2048);
    const tick = (maintenant: number) => {
      // au retour d'un onglet en arrière-plan, le prompteur reprend sans sauter tout le texte
      const dt = Math.min(0.1, Math.max(0, (maintenant - avant) / 1000));
      avant = maintenant;
      if (phaseRef.current === "enregistrement") {
        if (prompteur.current) prompteur.current.scrollTop += vitesseRef.current * dt;
        const n = dureeEcoulee();
        setDuree(n);
        if (n >= dureeMaxRef.current) terminer();
      }
      const a = analyseur.current;
      if (a && phaseRef.current !== "fini") {
        a.getFloatTimeDomainData(tampon);
        const db = dbfs(tampon);
        setNiveau((avantN) => (Math.abs(avantN.db - db) > 1.5 ? { db, n: niveauMicro(db) } : avantN));
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- terminer ne lit que des refs

  // libère le micro en quittant
  useEffect(
    () => () => {
      flux.current?.getTracks().forEach((t) => t.stop());
      contexte.current?.close().catch(() => undefined);
    },
    [],
  );

  function dureeEcoulee() {
    return cumul.current + (debutPassage.current !== null ? (performance.now() - debutPassage.current) / 1000 : 0);
  }

  async function micro(): Promise<MediaStream | null> {
    if (flux.current) return flux.current;
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true, channelCount: 1 },
      });
      flux.current = s;
      const ctx = new AudioContext();
      const a = ctx.createAnalyser();
      a.fftSize = 2048;
      ctx.createMediaStreamSource(s).connect(a);
      analyseur.current = a;
      contexte.current = ctx;
      return s;
    } catch {
      setErreur("Le micro n'est pas accessible. Autorise-le dans ton navigateur, puis réessaie.");
      return null;
    }
  }

  async function demarrer() {
    setErreur(null);
    const s = await micro();
    if (!s) return;
    const type = formatEnregistrement((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(s, type ? { mimeType: type, audioBitsPerSecond: 128000 } : undefined);
    morceaux.current = [];
    rec.ondataavailable = (e) => e.data.size && morceaux.current.push(e.data);
    rec.onstop = () => {
      blob.current = new Blob(morceaux.current, { type: rec.mimeType || type || "audio/webm" });
      setEcoute(URL.createObjectURL(blob.current));
    };
    rec.start(1000);
    enregistreur.current = rec;
    if (prompteur.current) prompteur.current.scrollTop = 0;
    cumul.current = 0;
    debutPassage.current = performance.now();
    setDuree(0);
    setPhase("enregistrement");
  }

  function pause() {
    enregistreur.current?.pause();
    cumul.current = dureeEcoulee();
    debutPassage.current = null;
    setDuree(cumul.current);
    setPhase("pause");
  }

  function reprendre() {
    enregistreur.current?.resume();
    debutPassage.current = performance.now();
    setPhase("enregistrement");
  }

  function terminer() {
    if (enregistreur.current && enregistreur.current.state !== "inactive") enregistreur.current.stop();
    cumul.current = dureeEcoulee();
    debutPassage.current = null;
    setDuree(cumul.current);
    setPhase("fini");
  }

  function recommencer() {
    if (enregistreur.current && enregistreur.current.state !== "inactive") {
      enregistreur.current.onstop = null;
      enregistreur.current.stop();
    }
    if (ecoute) URL.revokeObjectURL(ecoute);
    setEcoute(null);
    blob.current = null;
    cumul.current = 0;
    debutPassage.current = null;
    setDuree(0);
    if (prompteur.current) prompteur.current.scrollTop = 0;
    setPhase("pret");
  }

  const largeurNiveau = Math.max(0, Math.min(100, ((niveau.db + 60) / 60) * 100));
  const couleurNiveau = niveau.n === "fort" ? "bg-red-500" : niveau.n === "bon" ? "bg-emerald-500" : "bg-amber-500";

  return (
    <div className="space-y-4" data-testid="enregistreur-voix">
      {/* le prompteur */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
        <div
          ref={prompteur}
          className="h-[46vh] min-h-[280px] overflow-y-auto px-6 py-[18vh] text-center font-heading text-2xl leading-relaxed text-white md:text-3xl"
          style={{ scrollbarWidth: "none" }}
        >
          {script}
          <div className="h-[30vh]" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-[40%] h-[20%] border-y border-primary/40 bg-primary/5" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent" />
        {phase !== "pret" && (
          <span
            className={cn(
              "absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs",
              phase === "enregistrement" ? "bg-red-600 text-white" : "bg-muted text-foreground",
            )}
          >
            {phase === "enregistrement" && <span className="h-2 w-2 animate-pulse rounded-full bg-white" />}
            {chrono(duree)} / {chrono(dureeMax)}
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Vitesse du prompteur</span>
            <span className="text-muted-foreground">{vitesse < 22 ? "Lente" : vitesse > 42 ? "Rapide" : "Normale"}</span>
          </div>
          <Slider min={10} max={70} step={2} value={[vitesse]} onValueChange={([v]) => setVitesse(v)} aria-label="Vitesse du prompteur" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Micro</span>
            <span className={cn(niveau.n === "fort" ? "text-red-400" : niveau.n === "bon" ? "text-emerald-400" : "text-amber-300")}>
              {flux.current ? CONSEIL_NIVEAU[niveau.n] : "Activé au début de l'enregistrement"}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="meter" aria-valuenow={Math.round(niveau.db)} aria-label="Niveau du micro">
            <div className={cn("h-full rounded-full transition-[width] duration-75", couleurNiveau)} style={{ width: `${largeurNiveau}%` }} />
          </div>
        </div>
      </div>

      {erreur && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{erreur}</p>}

      {phase === "pret" && (
        <Button size="lg" onClick={demarrer} className="h-14 w-full gap-2 text-base">
          <Mic className="h-5 w-5" /> Appuie pour lire ton script
        </Button>
      )}
      {(phase === "enregistrement" || phase === "pause") && (
        <div className="grid grid-cols-3 gap-2">
          {phase === "enregistrement" ? (
            <Button variant="outline" size="lg" onClick={pause} className="gap-2">
              <Pause className="h-4 w-4" /> Pause
            </Button>
          ) : (
            <Button variant="outline" size="lg" onClick={reprendre} className="gap-2">
              <Play className="h-4 w-4" /> Reprendre
            </Button>
          )}
          <Button variant="outline" size="lg" onClick={recommencer} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Recommencer
          </Button>
          <Button size="lg" onClick={terminer} className="gap-2">
            <Square className="h-4 w-4" /> Terminer
          </Button>
        </div>
      )}
      {phase === "fini" && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Réécoute ta voix ({chrono(duree)})</p>
          {ecoute ? <audio src={ecoute} controls className="w-full" /> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={recommencer} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Recommencer
            </Button>
            <Button onClick={() => blob.current && onValider(blob.current)} disabled={!ecoute} className="gap-2">
              <Check className="h-4 w-4" /> Valider ma voix
            </Button>
          </div>
        </div>
      )}
      {phase !== "fini" && (
        <p className="text-xs text-muted-foreground">
          Tu t'es trompé ? Pas besoin de tout recommencer : reprends simplement ta phrase, l'IA gardera la dernière version.
        </p>
      )}
    </div>
  );
}
