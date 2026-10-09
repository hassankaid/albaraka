// Aperçu en direct des réglages, dessiné dans le navigateur sur une image de la
// vidéo de l'élève (cadre final 1080 x 1920). C'est une reproduction de
// studio/moteur/face_effects.py et des sous-titres « Éditorial » : le rendu
// final est fait par le moteur, l'aperçu en donne l'allure.
import type { Reglages } from "./reglages";

export const W = 1080;
export const H = 1920;
// Sous-titres (constantes du moteur, pipeline.py)
const SOUS_TITRE_Y = 1320;
const PETITE_TAILLE = 82;
const GRANDE_TAILLE = 205;
const LARGEUR_MAX = 920;
const NIVEAUX_COULEUR = [0.35, 0.6, 1.0, 1.35, 1.7];

let policesChargees: Promise<void> | null = null;
/** Charge les deux polices du moteur (Montserrat Black, DM Serif Display Italic). */
export function chargerPolices(): Promise<void> {
  if (!policesChargees) {
    const polices = [
      new FontFace("StudioMontserrat", "url(/studio/fonts/Montserrat-Black.ttf)", { weight: "900" }),
      new FontFace("StudioSerif", "url(/studio/fonts/DMSerifDisplay-Italic.ttf)", { style: "italic" }),
    ];
    policesChargees = Promise.all(polices.map((p) => p.load().then((f) => document.fonts.add(f)))).then(() => undefined);
  }
  return policesChargees;
}

/** Dessine l'image source « en couverture » sur le cadre 9:16 (comme le recadrage centré du moteur). */
export function dessinerCadre(ctx: CanvasRenderingContext2D, image: CanvasImageSource, iw: number, ih: number) {
  const k = Math.max(W / iw, H / ih);
  const dw = iw * k;
  const dh = ih * k;
  ctx.drawImage(image, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

type Boite = { x: number; y: number; w: number; h: number };

function ovale(ctx: CanvasRenderingContext2D, b: Boite, decalage = { x: 0, y: 0 }) {
  ctx.beginPath();
  ctx.ellipse(b.x + b.w / 2 + decalage.x, b.y + b.h / 2 + decalage.y, b.w * 0.78, b.h * 0.85, 0, 0, Math.PI * 2);
}

function rayonFlou(b: Boite, niveau: number) {
  return b.w * [0.1, 0.12, 0.14, 0.16, 0.19][niveau - 1];
}

/** Calque flouté de toute l'image (le découpage en ovale se fait ensuite). */
function calqueFlou(source: HTMLCanvasElement, rayon: number, assombrir = 1): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  x.filter = `blur(${rayon}px) brightness(${assombrir})`;
  x.drawImage(source, 0, 0);
  return c;
}

function teinter(ctx: CanvasRenderingContext2D, couleur: string, part: number) {
  ctx.globalAlpha = Math.min(0.9, part);
  ctx.fillStyle = couleur;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

/**
 * Applique le style de floutage choisi sur chaque visage. `source` contient
 * l'image non floutée ; `ctx` est le cadre d'aperçu.
 */
export function dessinerFloutage(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  visages: number[][],
  v: Reglages["visage"],
) {
  const cf = NIVEAUX_COULEUR[Math.min(5, Math.max(1, v.intensite_couleur)) - 1];
  const lvl = Math.min(5, Math.max(1, v.intensite));
  for (const [nx, ny, nw, nh] of visages) {
    const b = { x: nx * W, y: ny * H, w: nw * W, h: nh * H };
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    if (v.style === "naturel") {
      // comme flou_naturel (studio/travail.py) : plein au centre, fondu vers l'extérieur
      const ax = b.w * 0.62;
      const ay = b.h * 0.78;
      const calque = calqueFlou(source, rayonFlou(b, lvl));
      const x = calque.getContext("2d")!;
      x.globalCompositeOperation = "destination-in";
      x.translate(cx, cy + b.h * 0.03);
      x.scale(ax * 1.25, ay * 1.25);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.64, "rgba(0,0,0,1)");
      g.addColorStop(0.82, "rgba(0,0,0,0.5)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g;
      x.fillRect(-1, -1, 2, 2);
      ctx.drawImage(calque, 0, 0);
      continue;
    }
    ctx.save();
    if (v.style === "mosaique") {
      const px = Math.max(4, b.w / [7, 6, 5, 4.5, 4][lvl - 1]);
      const petit = document.createElement("canvas");
      petit.width = Math.max(1, Math.round(W / px));
      petit.height = Math.max(1, Math.round(H / px));
      petit.getContext("2d")!.drawImage(source, 0, 0, petit.width, petit.height);
      ovale(ctx, b);
      ctx.clip();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(petit, 0, 0, W, H);
      ctx.imageSmoothingEnabled = true;
      teinter(ctx, v.couleur, (0.3 + 0.05 * lvl) * cf);
      ctx.restore();
      continue;
    }
    if (v.style === "neon") {
      ovale(ctx, b);
      ctx.save();
      ctx.clip();
      ctx.drawImage(calqueFlou(source, rayonFlou(b, lvl), 0.55 - 0.03 * lvl), 0, 0);
      ctx.restore();
      const ep = Math.max(4, b.w / 26);
      ctx.shadowColor = v.couleur;
      ctx.shadowBlur = 40 * Math.min(1.7, cf);
      ctx.strokeStyle = v.couleur;
      ctx.lineWidth = ep * 1.5;
      ovale(ctx, b);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(2, ep / 2);
      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.stroke();
      ctx.restore();
      continue;
    }
    if (v.style === "sticker") {
      ctx.save();
      ctx.filter = "blur(14px)";
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ovale(ctx, b, { x: 6, y: 10 });
      ctx.fill();
      ctx.restore();
    }
    // flou, verre, marqueur, sticker : base floutée découpée en ovale
    ovale(ctx, b);
    ctx.clip();
    ctx.drawImage(calqueFlou(source, rayonFlou(b, lvl)), 0, 0);
    if (v.style === "flou") teinter(ctx, v.couleur, (0.12 + 0.05 * lvl) * cf);
    if (v.style === "verre") {
      teinter(ctx, v.couleur, (0.3 + 0.06 * lvl) * cf);
      ctx.save();
      ctx.filter = "blur(24px)";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.ellipse(cx - b.w * 0.2, cy - b.h * 0.3, b.w * 0.42, b.h * 0.18, (-25 * Math.PI) / 180, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (v.style === "marqueur") {
      const opacite = Math.min(1, [0.75, 0.82, 0.88, 0.94, 1][lvl - 1] * (0.55 + 0.3 * cf));
      const haut = b.y + b.h / 2 - b.h * 0.85;
      const bande = (b.h * 1.7) / 5;
      ctx.globalAlpha = opacite;
      ctx.strokeStyle = v.couleur;
      ctx.lineCap = "round";
      ctx.lineWidth = bande * 0.95;
      for (let k = 0; k < 5; k++) {
        const y = haut + bande * (k + 0.5);
        const pente = (k % 2 ? 1 : -1) * 0.03 * b.w;
        ctx.beginPath();
        ctx.moveTo(cx - b.w * 0.85, y - pente);
        ctx.lineTo(cx + b.w * 0.85, y + pente);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (v.style === "sticker") {
      ctx.globalAlpha = Math.min(1, [0.8, 0.86, 0.92, 0.96, 1][lvl - 1] * (0.55 + 0.3 * cf));
      ctx.fillStyle = v.couleur;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.ellipse(cx - b.w * 0.25, cy - b.h * 0.38, b.w * 0.26, b.h * 0.1, (-30 * Math.PI) / 180, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (v.style === "verre" || v.style === "sticker") {
      ctx.save();
      ctx.strokeStyle = v.style === "verre" ? "rgba(255,255,255,0.6)" : "#FFFFFF";
      ctx.lineWidth = v.style === "verre" ? 3 : Math.max(5, b.w / 22);
      ovale(ctx, b);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function taille(ctx: CanvasRenderingContext2D, texte: string, police: string, defaut: number, espacement = 0) {
  ctx.font = `${police.replace("{t}", String(defaut))}`;
  const largeur = ctx.measureText(texte).width + espacement * texte.length;
  return largeur > LARGEUR_MAX ? Math.floor((defaut * LARGEUR_MAX) / largeur) : defaut;
}

/** Sous-titre « Éditorial » : petite ligne en capitales + mot clé en italique. */
export function dessinerSousTitre(
  ctx: CanvasRenderingContext2D,
  petit: string,
  grand: string,
  c: Reglages["sous_titres"],
) {
  const p = petit.toUpperCase();
  const fp = taille(ctx, p, "900 {t}px StudioMontserrat", PETITE_TAILLE, 7);
  const fg = taille(ctx, grand, "italic {t}px StudioSerif", GRANDE_TAILLE);
  const hauteur = fp + fg * 0.95;
  const yPetit = SOUS_TITRE_Y - hauteur / 2 + fp / 2;
  const yGrand = yPetit + fp / 2 + fg * 0.5;
  const lignes: [string, string, number, number][] = [
    [p, `900 ${fp}px StudioMontserrat`, yPetit, 7],
    [grand, `italic ${fg}px StudioSerif`, yGrand, 0],
  ];
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const [texte, police, y, esp] of lignes) {
    ctx.font = police;
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${esp}px`;
    // halo d'ombre doux
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.filter = "blur(10px)";
    ctx.lineWidth = 20;
    ctx.strokeStyle = c.ombre;
    ctx.fillStyle = c.ombre;
    ctx.strokeText(texte, W / 2, y);
    ctx.restore();
    // ombre portée légère
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = c.ombre;
    ctx.fillText(texte, W / 2 + 4, y + 4);
    ctx.restore();
    // contour fin puis texte
    ctx.lineJoin = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = c.contour;
    ctx.strokeText(texte, W / 2, y);
    ctx.fillStyle = c.texte;
    ctx.fillText(texte, W / 2, y);
  }
  ctx.restore();
}

function rvb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) || 0) as [number, number, number];
}
const lum = ([r, g, b]: number[]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** Couleur principale lisible sur l'encadré (assombrie sur un fond clair), comme le moteur. */
export function principaleLisible(principale: string, fond: string): string {
  const p = rvb(principale);
  if (lum(rvb(fond)) > 0.6 && lum(p) > 0.45) return `rgb(${p.map((v) => Math.round(v * 0.55)).join(",")})`;
  return principale;
}

function arrondi(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * Allure du motion design (studio/animations.py) : barre de progression, carte de
 * présentation et une icône. Le placement réel évite le visage ; ici, positions types.
 */
export function dessinerDesign(
  ctx: CanvasRenderingContext2D,
  c: { principale: string; fond: string; texte: string },
  prenom: string,
  titre: string,
) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, W, 10);
  ctx.fillStyle = c.principale;
  ctx.fillRect(0, 0, W * 0.4, 10);
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 8;
  if (prenom.trim()) {
    ctx.font = "900 52px StudioMontserrat";
    const l1 = ctx.measureText(prenom.toUpperCase()).width;
    ctx.font = "italic 40px StudioSerif";
    const l2 = titre ? ctx.measureText(titre).width : 0;
    const w = Math.max(360, Math.min(900, Math.max(l1, l2) + 90));
    const h = titre ? 150 : 104;
    ctx.globalAlpha = 0.84;
    ctx.fillStyle = c.fond;
    arrondi(ctx, 50, 170, w, h, 26);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowColor = "transparent";
    ctx.fillStyle = c.principale;
    arrondi(ctx, 50, 170, 14, h, 7);
    ctx.fill();
    ctx.textBaseline = "top";
    ctx.fillStyle = c.texte;
    ctx.font = "900 52px StudioMontserrat";
    ctx.fillText(prenom.toUpperCase(), 94, 192);
    if (titre) {
      ctx.fillStyle = principaleLisible(c.principale, c.fond);
      ctx.font = "italic 40px StudioSerif";
      ctx.fillText(titre, 96, 254);
    }
  }
  // une icône animée type (étoile), à droite
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  const cx = W - 165;
  const cy = 320;
  ctx.fillStyle = c.fond;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(cx, cy, 95, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 9;
  ctx.strokeStyle = c.principale;
  ctx.stroke();
  ctx.fillStyle = c.principale;
  ctx.beginPath();
  for (let j = 0; j < 10; j++) {
    const a = (j / 10) * Math.PI * 2 - Math.PI / 2;
    const r = j % 2 === 0 ? 52 : 23;
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.fill();
  ctx.restore();
}
