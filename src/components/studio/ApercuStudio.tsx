// Aperçu en direct sur une image de la vidéo de l'élève, au cadre final 9:16.
// Image : celle préparée par la machine (cadre exact + position du visage) ;
// en attendant, une image tirée du fichier local, sans repérage du visage.
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { chargerPolices, dessinerCadre, dessinerFloutage, dessinerSousTitre, H, W } from "@/lib/studio/apercu";
import type { Reglages } from "@/lib/studio/reglages";

export function ApercuStudio({
  image,
  visages,
  reglages,
  flou,
  sousTitre = true,
}: {
  /** Image serveur (URL) ou image locale (canvas). */
  image: string | HTMLCanvasElement | null;
  visages: number[][] | null;
  reglages: Reglages;
  /** Afficher le floutage (étape « visage » ou réglages complets). */
  flou: boolean;
  sousTitre?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [polices, setPolices] = useState(false);

  useEffect(() => {
    chargerPolices().then(() => setPolices(true)).catch(() => setPolices(true));
  }, []);

  useEffect(() => {
    let annule = false;
    const prendre = (img: CanvasImageSource, iw: number, ih: number) => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      dessinerCadre(c.getContext("2d")!, img, iw, ih);
      if (!annule) setSource(c);
    };
    if (!image) setSource(null);
    else if (typeof image === "string") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => prendre(img, img.naturalWidth, img.naturalHeight);
      img.src = image;
    } else prendre(image, image.width, image.height);
    return () => {
      annule = true;
    };
  }, [image]);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx || !source) return;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(source, 0, 0);
    if (flou && reglages.visage.flouter && visages?.length) dessinerFloutage(ctx, source, visages, reglages.visage);
    if (sousTitre && polices) dessinerSousTitre(ctx, "voici tes", "sous-titres", reglages.sous_titres);
  }, [source, visages, reglages, flou, sousTitre, polices]);

  const attenteVisage = flou && reglages.visage.flouter && !visages;
  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-xl border border-border bg-muted">
      <canvas ref={ref} width={W} height={H} className="h-full w-full" data-testid="apercu-studio" />
      {!source && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Préparation de l'aperçu…
        </div>
      )}
      {source && attenteVisage && (
        <div className="absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-background/85 px-3 py-1 text-[11px] text-muted-foreground">
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
          Repérage de ton visage…
        </div>
      )}
      {source && flou && reglages.visage.flouter && visages && visages.length === 0 && (
        <div className="absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-background/85 px-3 py-1 text-[11px] text-muted-foreground">
          Aucun visage sur cette image : il sera flouté partout où il apparaît.
        </div>
      )}
      <span className="absolute bottom-2 right-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
        Aperçu
      </span>
    </div>
  );
}
