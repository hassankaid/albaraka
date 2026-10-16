// La loupe de coupe (vocal de Sidali, 16/10/2026) : une coupe sélectionnée, vue de près.
// Deux panneaux — la fin du passage d'avant, la reprise après la coupe — avec le dessin
// du son, les mots, et des boutons au pas d'une image (1/30 s, le plus petit écart qui
// change la vidéo) ou d'un dixième de seconde. « Caler sur la voix » place le bord juste
// après la fin réelle du son. Rien n'est envoyé : c'est « Vérifier les coupes » qui valide.
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Magnet, Scissors, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  calerSurLaVoix,
  coupeApres,
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

/** Largeur de temps montrée dans un panneau. */
const FENETRE = 1.6;

type Bord = "fin" | "debut";

interface Props {
  plages: Plage[];
  /** n° du passage qui précède la coupe (-1 : la coupe ouvre la vidéo) */
  passage: number;
  duree: number;
  mots: MotTravail[];
  /** null : le dessin du son n'est pas disponible (vidéo préparée avant le 12/10) */
  enveloppe: Enveloppe | null;
  t: number;
  onModifier: (plages: Plage[]) => void;
  onEcouterTransition: (coupe: Plage) => void;
  onEcouterCoupe: (coupe: Plage) => void;
  onGarder: (coupe: Plage) => void;
  onFermer: () => void;
}

/** « 1,23 s » ; « +0,10 s » avec le signe. */
const secondes = (s: number, signe = false) =>
  `${signe && s > 0 ? "+" : ""}${s.toFixed(2).replace(".", ",")} s`;

export function LoupeCoupe({ plages, passage, duree, mots, enveloppe, t, onModifier, onEcouterTransition, onEcouterCoupe, onGarder, onFermer }: Props) {
  const coupe = coupeApres(plages, passage, duree);
  const [actif, setActif] = useState<Bord>(passage < 0 ? "debut" : "fin");
  const [note, setNote] = useState<string | null>(null);

  // le bord d'un côté de la coupe : la fin du passage d'avant, ou le début de celui d'après
  const bords: { bord: Bord; i: number; titre: string }[] = [];
  if (coupe && passage >= 0) bords.push({ bord: "fin", i: passage, titre: "Fin du passage d'avant" });
  if (coupe && passage + 1 < plages.length) bords.push({ bord: "debut", i: passage + 1, titre: "Reprise après la coupe" });

  function decaler(bord: Bord, delta: number) {
    const b = bords.find((x) => x.bord === bord);
    if (!b) return;
    const actuel = plages[b.i][bord === "fin" ? 1 : 0];
    setActif(bord);
    setNote(null);
    onModifier(deplacerBord(plages, b.i, bord, surImage(actuel + delta), duree));
  }

  function caler(bord: Bord) {
    const b = bords.find((x) => x.bord === bord);
    if (!b || !enveloppe) return;
    setActif(bord);
    const actuel = plages[b.i][bord === "fin" ? 1 : 0];
    // sans jamais toucher le passage voisin
    const min = bord === "fin" ? plages[b.i][0] + PLAGE_MIN : (plages[b.i - 1]?.[1] ?? 0) + 0.01;
    const max = bord === "fin" ? (plages[b.i + 1]?.[0] ?? duree) - 0.01 : plages[b.i][1] - PLAGE_MIN;
    const cible = calerSurLaVoix(enveloppe, bord, actuel, min, max);
    if (cible === null) {
      setNote("Pas de voix près de ce bord : rien à caler.");
      return;
    }
    setNote(Math.abs(cible - actuel) < 0.005 ? "Ce bord est déjà calé sur la voix." : `Calé sur la voix (${secondes(cible - actuel, true)}).`);
    onModifier(deplacerBord(plages, b.i, bord, cible, duree));
  }

  // sur téléphone, la loupe s'ouvre sous la frise : on la fait venir à l'écran
  const cadre = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.innerWidth < 768) cadre.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [passage]);

  // clavier : ← → une image, avec Maj un dixième de seconde
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

  if (!coupe) {
    return (
      <div className="space-y-3 rounded-lg border border-border p-4 text-sm" data-testid="loupe-coupe">
        <p className="text-foreground">Cette coupe n'existe plus : les deux passages se rejoignent.</p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onFermer}>
          <ArrowLeft className="h-3.5 w-3.5" /> Toutes les coupes
        </Button>
      </div>
    );
  }

  return (
    <div ref={cadre} className="flex scroll-mt-2 flex-col gap-3 md:min-h-0 md:flex-1 md:overflow-y-auto" data-testid="loupe-coupe">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-1.5 px-2" onClick={onFermer}>
          <ArrowLeft className="h-4 w-4" /> Toutes les coupes
        </Button>
        <p className="text-sm text-foreground">
          Coupe à <span className="font-mono tabular-nums">{minutagePrecis(coupe[0])}</span> ·{" "}
          <span className="font-medium">{secondes(coupe[1] - coupe[0])}</span> enlevées
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" className="gap-1.5" onClick={() => onEcouterTransition(coupe)} data-testid="loupe-transition">
            <Volume2 className="h-3.5 w-3.5" /> Écouter la transition
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEcouterCoupe(coupe)}>
            <Scissors className="h-3.5 w-3.5" /> Écouter ce qui est coupé
          </Button>
          <Button variant="outline" size="sm" onClick={() => onGarder(coupe)}>
            Garder toute la coupe
          </Button>
        </div>
      </div>

      <div className={cn("grid gap-3", bords.length > 1 && "md:grid-cols-2")}>
        {bords.map(({ bord, i, titre }) => (
          <Panneau
            key={bord}
            titre={titre}
            bord={bord}
            position={plages[i][bord === "fin" ? 1 : 0]}
            plages={plages}
            mots={mots}
            enveloppe={enveloppe}
            t={t}
            actif={actif === bord}
            onActiver={() => setActif(bord)}
            onDecaler={(d) => decaler(bord, d)}
            onPlacer={(x) => {
              setActif(bord);
              setNote(null);
              onModifier(deplacerBord(plages, i, bord, surImage(x), duree));
            }}
            onCaler={() => caler(bord)}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {note ??
          "Un pas d'une image (1/30 s) est le plus petit écart visible dans la vidéo. Sur ordinateur : flèches ← → pour une image, avec Maj pour 0,1 s."}
      </p>
    </div>
  );
}

interface PropsPanneau {
  titre: string;
  bord: Bord;
  position: number;
  plages: Plage[];
  mots: MotTravail[];
  enveloppe: Enveloppe | null;
  t: number;
  actif: boolean;
  onActiver: () => void;
  onDecaler: (delta: number) => void;
  onPlacer: (t: number) => void;
  onCaler: () => void;
}

function Panneau({ titre, bord, position, plages, mots, enveloppe, t, actif, onActiver, onDecaler, onPlacer, onCaler }: PropsPanneau) {
  // la fenêtre suit le bord, sauf pendant qu'on le tire (sinon le son glisserait sous le doigt)
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
      const garde = plages.some(([a, b]) => s >= a && s < b);
      barres.push({ s, h: Math.max(0.03, niveau(enveloppe, s)), garde });
    }
  }
  const coupes = [] as Plage[];
  let curseur = debut;
  for (const [a, b] of plages) {
    if (b <= debut) continue;
    if (a > curseur) coupes.push([curseur, Math.min(a, fin)]);
    curseur = Math.max(curseur, b);
    if (curseur >= fin) break;
  }
  if (curseur < fin) coupes.push([curseur, fin]);
  const motsVus = mots.filter((m) => m.end > debut && m.start < fin);
  const graduations = Array.from({ length: Math.floor(FENETRE * 10) + 2 }, (_, k) => Math.ceil(debut * 10) / 10 + k / 10).filter((s) => s <= fin);

  return (
    <section
      className={cn("space-y-2 rounded-lg border p-3", actif ? "border-primary/70 bg-primary/5" : "border-border")}
      onPointerDown={onActiver}
      data-testid={`loupe-${bord}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{titre}</p>
        <p className="font-mono text-xs tabular-nums text-muted-foreground">{minutagePrecis(position)}</p>
      </div>
      {/* le dessin s'étire en largeur : les textes et la poignée sont posés par-dessus, en HTML, pour rester nets */}
      <div
        className="relative touch-none select-none"
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setTire(true);
          onPlacer(temps(e.clientX));
        }}
        onPointerMove={(e) => tire && onPlacer(temps(e.clientX))}
        onPointerUp={() => setTire(false)}
        onPointerCancel={() => setTire(false)}
        role="slider"
        aria-label={titre}
        aria-valuenow={position}
      >
        <svg ref={svg} viewBox="0 0 1000 150" preserveAspectRatio="none" className="h-24 w-full rounded-md bg-muted/30 sm:h-28">
          {coupes.map(([a, b]) => (
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
          {t >= debut && t <= fin && <line x1={x(t)} x2={x(t)} y1={0} y2={150} className="stroke-white/70" strokeWidth={2} />}
          <line x1={x(position)} x2={x(position)} y1={0} y2={150} className="stroke-white" strokeWidth={5} />
        </svg>
        {graduations
          .filter((g) => Math.round(g * 10) % 5 === 0)
          .map((g) => (
            <span key={g.toFixed(2)} className="pointer-events-none absolute top-0.5 text-[10px] text-muted-foreground" style={{ left: `calc(${x(g) / 10}% + 3px)` }}>
              {g.toFixed(1).replace(".", ",")}
            </span>
          ))}
        <span
          className="pointer-events-none absolute top-3 h-6 w-3 rounded-sm bg-white shadow"
          style={{ left: `calc(${x(position) / 10}% - ${bord === "fin" ? 12 : 0}px)` }}
        />
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
      <div className="flex flex-wrap items-center gap-1.5">
        <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => onDecaler(-0.1)} aria-label="Reculer de 0,1 s">
          −0,1 s
        </Button>
        <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => onDecaler(-IMAGE)} aria-label="Reculer d'une image">
          −1 image
        </Button>
        <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => onDecaler(IMAGE)} aria-label="Avancer d'une image">
          +1 image
        </Button>
        <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => onDecaler(0.1)} aria-label="Avancer de 0,1 s">
          +0,1 s
        </Button>
        <Button variant="secondary" size="sm" className="ml-auto h-8 gap-1.5" disabled={!enveloppe} onClick={onCaler}>
          <Magnet className="h-3.5 w-3.5" /> Caler sur la voix
        </Button>
      </div>
    </section>
  );
}
