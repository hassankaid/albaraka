// Une coupe en plein écran (retour de Sidali du 20/10/2026, maquette validée) : son début
// et sa fin, chacun avec le dessin du son, les mots, le point de coupe à glisser et des
// boutons au pas d'une image (1/30 s) ou d'un dixième de seconde. Lâché à la main dans un
// mot, le point de coupe est ramené au bord du mot. Rien n'est envoyé : c'est la fenêtre
// « Ajuster les coupes » qui valide.
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Magnet, Scissors, Trash2, Undo2, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  calerSurLaVoix,
  deplacerBord,
  IMAGE,
  minutagePrecis,
  niveau,
  PLAGE_MIN,
  surImage,
  type Enveloppe,
  type MotTravail,
  type Plage,
} from "@/lib/studio/coupes";
import { debutsDansLeMontage, horsDesMots, motsDeLaCoupe, resumeCoupe } from "@/lib/studio/coupesParCoupe";

/** Largeur de temps montrée autour d'un point de coupe. */
const FENETRE = 2.4;

type Bord = "debut" | "fin";

interface Props {
  plages: Plage[];
  /** la coupe ouverte (index de la plage) */
  coupe: number;
  duree: number;
  mots: MotTravail[];
  /** null : le dessin du son n'est pas disponible (vidéo préparée avant le 12/10) */
  enveloppe: Enveloppe | null;
  /** la coupe telle qu'elle était à l'ouverture (pointillé « avant ») */
  origine: Plage | null;
  t: number;
  message: string | null;
  peutAnnuler: boolean;
  /** `nouvelle` = un nouveau réglage (annulable) ; false = la suite du même geste (on glisse) */
  onRegler: (plages: Plage[], nouvelle: boolean) => void;
  onAnnuler: () => void;
  /** écoute comme le montage, de `de` à `jusqua` (temps de la vidéo d'origine) */
  onEcouter: (de: number, jusqua: number) => void;
  /** écoute ce qui est retiré, tel quel */
  onEcouterRetire: (trou: Plage) => void;
  /** supprime toute la coupe ; absent quand c'est la dernière */
  onSupprimer?: () => void;
  onFermer: () => void;
}

const secondes = (s: number, signe = false) => `${signe && s > 0 ? "+" : ""}${s.toFixed(2).replace(".", ",")} s`;

export function EditeurCoupe({
  plages, coupe, duree, mots, enveloppe, origine, t, message, peutAnnuler,
  onRegler, onAnnuler, onEcouter, onEcouterRetire, onSupprimer, onFermer,
}: Props) {
  const [actif, setActif] = useState<Bord>("debut");
  const [note, setNote] = useState<string | null>(null);
  const plage = plages[coupe];
  const precedente = plages[coupe - 1];
  const suivante = plages[coupe + 1];
  const debuts = debutsDansLeMontage(plages);

  useEffect(() => setNote(null), [coupe]);

  function decaler(bord: Bord, delta: number) {
    if (!plage) return;
    setActif(bord);
    setNote(null);
    onRegler(deplacerBord(plages, coupe, bord, surImage(plage[bord === "fin" ? 1 : 0] + delta), duree), true);
  }

  function placer(bord: Bord, x: number, lache: boolean, debutDuGeste: boolean) {
    setActif(bord);
    setNote(null);
    // lâché dans un mot : ramené au bord du mot (jamais un mot coupé en deux)
    const cible = lache ? horsDesMots(mots, x) : x;
    if (lache && Math.abs(cible - x) > 0.005) setNote("Point de coupe ramené au bord du mot : un mot n'est jamais coupé en deux.");
    onRegler(deplacerBord(plages, coupe, bord, surImage(cible), duree), debutDuGeste);
  }

  function caler(bord: Bord) {
    if (!plage || !enveloppe) return;
    setActif(bord);
    const actuel = plage[bord === "fin" ? 1 : 0];
    const min = bord === "fin" ? plage[0] + PLAGE_MIN : (precedente?.[1] ?? 0) + 0.01;
    const max = bord === "fin" ? (suivante?.[0] ?? duree) - 0.01 : plage[1] - PLAGE_MIN;
    const cible = calerSurLaVoix(enveloppe, bord, actuel, min, max);
    if (cible === null) {
      setNote("Pas de voix près de ce point de coupe : rien à caler.");
      return;
    }
    setNote(Math.abs(cible - actuel) < 0.005 ? "Ce point de coupe est déjà calé sur la voix." : `Calé sur la voix (${secondes(cible - actuel, true)}).`);
    onRegler(deplacerBord(plages, coupe, bord, cible, duree), true);
  }

  // clavier : ← → une image sur le point de coupe choisi, avec Maj un dixième de seconde
  const decalerRef = useRef(decaler);
  decalerRef.current = decaler;
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if ((e.target as HTMLElement)?.closest("input, textarea")) return;
      e.preventDefault();
      decalerRef.current(actif, (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 0.1 : IMAGE));
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [actif]);

  if (!plage) return null;
  const ecart = (bord: Bord) => {
    if (!origine) return null;
    const d = plage[bord === "fin" ? 1 : 0] - origine[bord === "fin" ? 1 : 0];
    if (Math.abs(d) < 0.005) return null;
    return `${bord === "debut" ? "Début décalé" : "Fin décalée"} de ${secondes(Math.abs(d))} ${d < 0 ? "plus tôt" : "plus tard"}`;
  };

  return (
    <div className="flex flex-col gap-4" data-testid="editeur-coupe">
      <div className="grid gap-3 md:grid-cols-2">
        <BordCoupe
          titre="Début de la coupe"
          bord="debut"
          position={plage[0]}
          heure={minutagePrecis(debuts[coupe])}
          origine={origine?.[0] ?? null}
          ecart={ecart("debut")}
          plages={plages}
          mots={mots}
          enveloppe={enveloppe}
          t={t}
          actif={actif === "debut"}
          onActiver={() => setActif("debut")}
          onDecaler={(d) => decaler("debut", d)}
          onPlacer={(x, lache, premier) => placer("debut", x, lache, premier)}
          onCaler={() => caler("debut")}
          ecoute={coupe === 0 ? "Écouter le début" : "Écouter le début (raccord)"}
          onEcouter={() =>
            onEcouter(precedente ? Math.max(precedente[0], precedente[1] - 1.5) : plage[0], Math.min(plage[1], plage[0] + 1.5))
          }
          retire={plage[0] - (precedente?.[1] ?? 0) > 0.03 ? [precedente?.[1] ?? 0, plage[0]] : null}
          onEcouterRetire={onEcouterRetire}
        />
        <BordCoupe
          titre="Fin de la coupe"
          bord="fin"
          position={plage[1]}
          heure={minutagePrecis(debuts[coupe] + plage[1] - plage[0])}
          origine={origine?.[1] ?? null}
          ecart={ecart("fin")}
          plages={plages}
          mots={mots}
          enveloppe={enveloppe}
          t={t}
          actif={actif === "fin"}
          onActiver={() => setActif("fin")}
          onDecaler={(d) => decaler("fin", d)}
          onPlacer={(x, lache, premier) => placer("fin", x, lache, premier)}
          onCaler={() => caler("fin")}
          ecoute={suivante ? "Écouter la fin (raccord)" : "Écouter la fin"}
          onEcouter={() =>
            onEcouter(Math.max(plage[0], plage[1] - 1.5), suivante ? Math.min(suivante[1], suivante[0] + 1.5) : plage[1])
          }
          retire={(suivante?.[0] ?? duree) - plage[1] > 0.03 ? [plage[1], suivante?.[0] ?? duree] : null}
          onEcouterRetire={onEcouterRetire}
        />
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {message ?? note ??
          "Glisse le trait or, ou utilise les boutons : une image (1/30 s) est le plus petit écart visible. Sur ordinateur : flèches ← → pour une image, avec Maj pour 0,1 s."}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" className="gap-2" disabled={!peutAnnuler} onClick={onAnnuler}>
          <Undo2 className="h-4 w-4" /> Annuler la modification
        </Button>
        <Button className="gap-2" onClick={() => onEcouter(plage[0], plage[1])} data-testid="ecouter-coupe">
          <Volume2 className="h-4 w-4" /> Écouter toute la coupe
        </Button>
        <Button variant="outline" className="gap-2 border-primary/60 text-primary" onClick={onFermer}>
          Terminé
        </Button>
        {onSupprimer && (
          <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-destructive" onClick={onSupprimer} data-testid="supprimer-coupe">
            <Trash2 className="h-4 w-4" /> Supprimer cette coupe
          </Button>
        )}
      </div>
    </div>
  );
}

/** L'en-tête de l'éditeur : coupe précédente / suivante, numéro, heures, texte. */
export function EnteteCoupe({
  plages, coupe, mots, onAller, onFermer,
}: { plages: Plage[]; coupe: number; mots: MotTravail[]; onAller: (i: number) => void; onFermer: () => void }) {
  const plage = plages[coupe];
  if (!plage) return null;
  const debuts = debutsDansLeMontage(plages);
  const texte = motsDeLaCoupe(mots, plage);
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" className="gap-1 px-2.5" disabled={coupe === 0} onClick={() => onAller(coupe - 1)}>
          <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Coupe</span> {coupe > 0 ? coupe : ""}
        </Button>
        <div className="text-center">
          <p className="text-xl font-bold text-foreground" data-testid="editeur-titre">
            Coupe {coupe + 1} <span className="text-sm font-medium text-muted-foreground">sur {plages.length}</span>
          </p>
          <p className="whitespace-nowrap font-mono text-[11px] tabular-nums text-muted-foreground sm:text-xs">
            {minutagePrecis(debuts[coupe])} → {minutagePrecis(debuts[coupe] + plage[1] - plage[0])}
            <span className="hidden sm:inline"> · {secondes(plage[1] - plage[0])}</span>
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="gap-1 px-2.5" disabled={coupe >= plages.length - 1} onClick={() => onAller(coupe + 1)}>
            <span className="hidden sm:inline">Coupe</span> {coupe < plages.length - 1 ? coupe + 2 : ""} <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFermer} aria-label="Fermer la coupe">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="text-center text-sm text-foreground">« {resumeCoupe(texte, 10)} »</p>
    </div>
  );
}

interface PropsBord {
  titre: string;
  bord: Bord;
  position: number;
  /** l'heure du point de coupe dans la vidéo finale */
  heure: string;
  origine: number | null;
  ecart: string | null;
  plages: Plage[];
  mots: MotTravail[];
  enveloppe: Enveloppe | null;
  t: number;
  actif: boolean;
  onActiver: () => void;
  onDecaler: (delta: number) => void;
  onPlacer: (t: number, lache: boolean, debutDuGeste: boolean) => void;
  onCaler: () => void;
  ecoute: string;
  onEcouter: () => void;
  retire: Plage | null;
  onEcouterRetire: (trou: Plage) => void;
}

function BordCoupe({
  titre, bord, position, heure, origine, ecart, plages, mots, enveloppe, t, actif,
  onActiver, onDecaler, onPlacer, onCaler, ecoute, onEcouter, retire, onEcouterRetire,
}: PropsBord) {
  // la fenêtre suit le point de coupe, sauf pendant qu'on le tire (sinon le son glisserait sous le doigt)
  const [centre, setCentre] = useState(position);
  const [tire, setTire] = useState(false);
  useEffect(() => {
    if (!tire) setCentre(position);
  }, [position, tire]);
  const debut = Math.max(0, centre - FENETRE / 2);
  const fin = debut + FENETRE;
  const svg = useRef<SVGSVGElement>(null);
  const x = (s: number) => ((s - debut) / FENETRE) * 1000;
  const temps = (clientX: number) => {
    const r = svg.current?.getBoundingClientRect();
    return r ? debut + ((clientX - r.left) / r.width) * FENETRE : position;
  };

  const barres: { s: number; h: number; garde: boolean }[] = [];
  if (enveloppe) {
    for (let s = Math.ceil(debut / enveloppe.pas) * enveloppe.pas; s < fin; s += enveloppe.pas) {
      barres.push({ s, h: Math.max(0.03, niveau(enveloppe, s)), garde: plages.some(([a, b]) => s >= a && s < b) });
    }
  }
  const trous = [] as Plage[];
  let curseur = debut;
  for (const [a, b] of plages) {
    if (b <= debut) continue;
    if (a > curseur) trous.push([curseur, Math.min(a, fin)]);
    curseur = Math.max(curseur, b);
    if (curseur >= fin) break;
  }
  if (curseur < fin) trous.push([curseur, fin]);
  const largeurPx = svg.current?.clientWidth || 400;
  let droite = -Infinity;
  const motsVus = mots
    .filter((m) => m.end > debut && m.start < fin)
    .filter((m) => {
      const gauche = (Math.max(0, x(m.start)) / 1000) * largeurPx;
      if (gauche < droite) return false;
      droite = gauche + m.text.length * 6.5 + 6;
      return true;
    });
  const graduations = Array.from({ length: Math.floor(FENETRE * 10) + 2 }, (_, k) => Math.ceil(debut * 10) / 10 + k / 10).filter((s) => s <= fin);

  return (
    <section
      className={cn("space-y-2 rounded-xl border p-3", actif ? "border-primary/70 bg-primary/5" : "border-border bg-card")}
      onPointerDown={onActiver}
      data-testid={`bord-${bord}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">{titre}</p>
        <p className="font-mono text-sm tabular-nums text-foreground">{heure}</p>
      </div>
      <div
        className="relative touch-none select-none"
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setTire(true);
          onPlacer(temps(e.clientX), false, true);
        }}
        onPointerMove={(e) => {
          if (!tire) return;
          onPlacer(temps(e.clientX), false, false);
        }}
        onPointerUp={(e) => {
          if (!tire) return;
          setTire(false);
          onPlacer(temps(e.clientX), true, false);
        }}
        onPointerCancel={() => setTire(false)}
        role="slider"
        aria-label={titre}
        aria-valuenow={position}
      >
        <svg ref={svg} viewBox="0 0 1000 150" preserveAspectRatio="none" className="h-28 w-full rounded-md bg-muted/30 sm:h-32">
          {trous.map(([a, b]) => (
            <rect key={a} x={x(a)} y={0} width={Math.max(0, x(b) - x(a))} height={150} className="fill-red-500/15" />
          ))}
          {graduations.map((g) => (
            <line key={g.toFixed(2)} x1={x(g)} x2={x(g)} y1={0} y2={Math.round(g * 10) % 5 === 0 ? 14 : 7} className="stroke-muted-foreground/60" strokeWidth={2} />
          ))}
          {barres.map(({ s: b, h, garde }) => (
            <rect
              key={b.toFixed(3)}
              x={x(b)}
              y={80 - h * 62}
              width={1000 / (FENETRE / enveloppe!.pas) - 1}
              height={h * 124}
              className={garde ? "fill-primary" : "fill-red-400/60"}
            />
          ))}
          {origine !== null && Math.abs(origine - position) > 0.005 && origine >= debut && origine <= fin && (
            <line x1={x(origine)} x2={x(origine)} y1={0} y2={150} className="stroke-muted-foreground" strokeWidth={3} strokeDasharray="8 7" />
          )}
          {t >= debut && t <= fin && <line x1={x(t)} x2={x(t)} y1={0} y2={150} className="stroke-white/60" strokeWidth={2} />}
          <line x1={x(position)} x2={x(position)} y1={0} y2={150} className="stroke-primary" strokeWidth={7} />
        </svg>
        <span
          className="pointer-events-none absolute -top-1.5 h-4 w-6 -translate-x-1/2 rounded bg-primary shadow"
          style={{ left: `${x(position) / 10}%` }}
        />
        <span className="pointer-events-none absolute left-1.5 top-1 text-[10px] font-medium text-red-300">
          {bord === "debut" ? "retiré" : "gardé"}
        </span>
        <span className="pointer-events-none absolute right-1.5 top-1 text-[10px] font-medium text-primary">
          {bord === "debut" ? "gardé" : "retiré"}
        </span>
        {!enveloppe && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Dessin du son indisponible pour cette vidéo
          </p>
        )}
      </div>
      <div className="relative h-4 overflow-hidden">
        {motsVus.map((m) => {
          const garde = plages.some(([a, b]) => (m.start + m.end) / 2 >= a && (m.start + m.end) / 2 <= b);
          return (
            <span
              key={`${m.start}-${m.text}`}
              className={cn("absolute top-0 whitespace-nowrap text-[11px]", garde ? "text-foreground" : "text-red-300 line-through")}
              style={{ left: `${Math.max(0, x(m.start)) / 10}%` }}
            >
              {m.text}
            </span>
          );
        })}
      </div>
      <p className="min-h-4 text-xs text-emerald-400">{ecart ? `✓ ${ecart}` : ""}</p>
      <div className="grid grid-cols-4 gap-1.5">
        <Button variant="outline" size="sm" className="h-9 px-1" onClick={() => onDecaler(-0.1)} aria-label="0,1 s plus tôt">
          ◀◀ 0,1 s
        </Button>
        <Button variant="outline" size="sm" className="h-9 px-1" onClick={() => onDecaler(-IMAGE)} aria-label="Une image plus tôt">
          ◀ 1 image
        </Button>
        <Button variant="outline" size="sm" className="h-9 px-1" onClick={() => onDecaler(IMAGE)} aria-label="Une image plus tard">
          1 image ▶
        </Button>
        <Button variant="outline" size="sm" className="h-9 px-1" onClick={() => onDecaler(0.1)} aria-label="0,1 s plus tard">
          0,1 s ▶▶
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" className="h-9 flex-1 gap-1.5" onClick={onEcouter}>
          <Volume2 className="h-3.5 w-3.5" /> {ecoute}
        </Button>
        <Button variant="secondary" size="sm" className="h-9 gap-1.5" disabled={!enveloppe} onClick={onCaler}>
          <Magnet className="h-3.5 w-3.5" /> Caler sur la voix
        </Button>
        {retire && (
          <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground" onClick={() => onEcouterRetire(retire)}>
            <Scissors className="h-3.5 w-3.5" /> Écouter le retiré
          </Button>
        )}
      </div>
    </section>
  );
}
