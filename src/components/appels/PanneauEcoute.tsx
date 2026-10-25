// Le lecteur de l'appel et la transcription : le tour en cours est surligné et suit la
// lecture ; un clic sur un tour (ou sur ▶ d'une citation) fait écouter à partir de là.
import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { mmss, tourA, type Tour } from "@/lib/appels/retour";

export interface Lecteur {
  audio: React.RefObject<HTMLAudioElement>;
  temps: number;
  lecture: boolean;
  ecouter: (t: number) => void;
  basculer: () => void;
}

export function useLecteur(): Lecteur {
  const audio = useRef<HTMLAudioElement>(null);
  const [temps, setTemps] = useState(0);
  const [lecture, setLecture] = useState(false);
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const maj = () => setTemps(a.currentTime);
    const joue = () => setLecture(true);
    const pause = () => setLecture(false);
    a.addEventListener("timeupdate", maj);
    a.addEventListener("play", joue);
    a.addEventListener("pause", pause);
    return () => {
      a.removeEventListener("timeupdate", maj);
      a.removeEventListener("play", joue);
      a.removeEventListener("pause", pause);
    };
  });
  return {
    audio,
    temps,
    lecture,
    ecouter: (t) => {
      const a = audio.current;
      if (!a) return;
      a.currentTime = Math.max(0, t - 1);
      a.play().catch(() => undefined);
    },
    basculer: () => {
      const a = audio.current;
      if (!a) return;
      if (a.paused) a.play().catch(() => undefined);
      else a.pause();
    },
  };
}

export function PanneauEcoute({
  lecteur,
  src,
  tours,
  duree,
  prenomEleve,
  audioEfface,
}: {
  lecteur: Lecteur;
  src: string | undefined;
  tours: Tour[];
  duree: number;
  prenomEleve: string;
  audioEfface: boolean;
}) {
  const [q, setQ] = useState("");
  const liste = useRef<HTMLDivElement>(null);
  const enCours = tourA(tours, lecteur.temps);
  const visibles = useMemo(() => {
    const m = q.trim().toLowerCase();
    return m ? tours.filter((t) => t.texte.toLowerCase().includes(m)) : tours;
  }, [q, tours]);

  // pendant la lecture, le tour en cours reste visible
  useEffect(() => {
    if (!lecteur.lecture || q) return;
    const el = liste.current?.querySelector(`[data-tour="${enCours}"]`) as HTMLElement | null;
    if (el && liste.current) liste.current.scrollTo({ top: el.offsetTop - liste.current.clientHeight / 3, behavior: "smooth" });
  }, [enCours, lecteur.lecture, q]);

  return (
    <div className="flex h-full flex-col gap-3" data-testid="panneau-ecoute">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
        <Button size="icon" className="h-9 w-9 shrink-0" onClick={lecteur.basculer} disabled={!src} aria-label={lecteur.lecture ? "Pause" : "Écouter"}>
          {lecteur.lecture ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <input
          type="range"
          min={0}
          max={Math.max(1, duree)}
          step={0.5}
          value={Math.min(lecteur.temps, duree)}
          disabled={!src}
          onChange={(e) => {
            if (lecteur.audio.current) lecteur.audio.current.currentTime = Number(e.target.value);
          }}
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[hsl(var(--primary))]"
          aria-label="Position dans l'appel"
        />
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          {mmss(lecteur.temps)} / {mmss(duree)}
        </span>
        {src && <audio ref={lecteur.audio} src={src} preload="metadata" />}
      </div>
      {audioEfface && <p className="text-xs text-muted-foreground">L'audio a été effacé 30 jours après le dépôt ; la transcription reste.</p>}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher dans la transcription" className="h-9 pl-9" />
      </div>
      <div ref={liste} className="relative min-h-0 flex-1 space-y-1 overflow-y-auto pr-1" data-testid="transcription">
        {visibles.map((t) => (
          <button
            key={t.n}
            type="button"
            data-tour={t.n}
            onClick={() => lecteur.ecouter(t.t0 + 1)}
            className={cn(
              "block w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] leading-snug transition-colors hover:bg-muted/60",
              t.n === enCours && "bg-primary/15",
            )}
          >
            <span className="mr-1.5 font-mono text-[11px] text-muted-foreground">{mmss(t.t0)}</span>
            <span className={cn("font-semibold", t.loc === "SETTER" ? "text-primary" : "text-emerald-600 dark:text-emerald-400")}>
              {t.loc === "SETTER" ? prenomEleve || "Élève" : "Prospect"}
            </span>
            {t.doute && <span className="ml-1 text-[11px] text-muted-foreground">(voix incertaine)</span>} : {t.texte}
          </button>
        ))}
        {visibles.length === 0 && <p className="px-2 text-sm text-muted-foreground">Rien trouvé.</p>}
      </div>
    </div>
  );
}

/** Une citation cliquable : ▶ 2:58 « … » */
export function CitationEcoute({ texte, horodatage, onEcouter }: { texte?: string; horodatage?: number; onEcouter: (t: number) => void }) {
  if (!texte) return null;
  return (
    <button
      type="button"
      onClick={() => horodatage != null && onEcouter(horodatage)}
      disabled={horodatage == null}
      className="mt-1.5 flex w-full items-start gap-2 rounded-md border-l-2 border-primary/70 bg-primary/5 px-2.5 py-1.5 text-left text-[13px] italic text-foreground/90 hover:bg-primary/10"
    >
      {horodatage != null && (
        <span className="shrink-0 rounded bg-primary px-1.5 py-px font-mono text-[11px] font-bold not-italic text-primary-foreground">▶ {mmss(horodatage)}</span>
      )}
      <span>« {texte} »</span>
    </button>
  );
}
