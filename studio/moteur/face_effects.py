"""
AL BARAKA — Masquage du visage (réglages au choix de l'élève)

Réglages élève :
  style              : flou | mosaique | verre | marqueur | sticker | neon
  couleur            : #RRGGBB
  intensite          : force du floutage, 1 (léger) à 5 (maximal).
                       Même au niveau 1 le visage reste méconnaissable.
  intensite_couleur  : présence de la couleur, 1 (touche discrète) à 5 (couleur franche)

Forme imposée : ovale, calé sur le visage détecté (un peu plus grand pour couvrir cheveux / menton).

API : apply(frame_bgr, box_xywh, style, couleur, intensite, intensite_couleur, frame_index)
"""
from __future__ import annotations

import math

import cv2
import numpy as np

STYLES = ["flou", "mosaique", "verre", "marqueur", "sticker", "neon"]
COLOR_LEVELS = [0.35, 0.6, 1.0, 1.35, 1.7]  # multiplicateur de la teinte selon intensite_couleur


def hex_to_bgr(color: str) -> tuple[int, int, int]:
    c = color.lstrip("#")
    return int(c[4:6], 16), int(c[2:4], 16), int(c[0:2], 16)


# ------------------------------------------------------------------ zone
def shape_polygon(box, shape: str = "ovale", grow: float = 1.0) -> np.ndarray:
    """Contour de la zone de masquage : ovale imposé (polygone Nx2, coordonnées image)."""
    x, y, w, h = box
    cx, cy = x + w / 2, y + h / 2
    ax, ay = w * 0.78 * grow, h * 0.85 * grow
    t = np.linspace(0, 2 * math.pi, 120, endpoint=False)
    return np.stack([cx + ax * np.cos(t), cy + ay * np.sin(t)], axis=1).astype(np.float32)


def _mask(shape_hw, poly, feather=0):
    m = np.zeros(shape_hw[:2], np.float32)
    cv2.fillPoly(m, [np.round(poly).astype(np.int32)], 1, cv2.LINE_AA)
    if feather:
        k = feather * 2 + 1
        m = cv2.GaussianBlur(m, (k, k), 0)
    return m[..., None]


def _outline(img, poly, color, thickness):
    cv2.polylines(img, [np.round(poly).astype(np.int32)], True, color, thickness, cv2.LINE_AA)


def _blend(frame, layer, mask):
    frame[:] = (layer.astype(np.float32) * mask + frame.astype(np.float32) * (1 - mask)).astype(np.uint8)


_CF = 1.0  # facteur d'intensité de couleur courant (fixé par apply)


def _tint(img, bgr, amount):
    amount = float(min(0.9, amount * _CF))
    col = np.empty_like(img)
    col[:] = bgr
    return cv2.addWeighted(img, 1 - amount, col, amount, 0)


def _blur(img, face_w, level):
    """Flou d'intensité 1..5 : réduction forte + flou sur la petite image, puis agrandissement doux."""
    div = [16, 20, 25, 31, 38][level - 1]
    sw, sh = max(2, img.shape[1] // div), max(2, img.shape[0] // div)
    small = cv2.resize(img, (sw, sh), interpolation=cv2.INTER_AREA)
    k = max(3, (int(face_w / div * [0.55, 0.7, 0.85, 1.0, 1.2][level - 1]) // 2) * 2 + 1)
    small = cv2.GaussianBlur(small, (k, k), 0)
    big = cv2.resize(small, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_CUBIC)
    return cv2.GaussianBlur(big, (15, 15), 0)


def _center(poly):
    return poly[:, 0].mean(), poly[:, 1].mean()


# ------------------------------------------------------------------ styles
def fx_flou(frame, box, poly, color, lvl, i):
    layer = _tint(_blur(frame, box[2], lvl), hex_to_bgr(color), 0.12 + 0.05 * lvl)
    _blend(frame, layer, _mask(frame.shape, poly, feather=12))


def fx_mosaique(frame, box, poly, color, lvl, i):
    cells = [7, 6, 5, 4.5, 4][lvl - 1]  # carrés sur la largeur du visage
    px = max(4, int(box[2] / cells))
    small = cv2.resize(frame, (max(1, frame.shape[1] // px), max(1, frame.shape[0] // px)), interpolation=cv2.INTER_AREA)
    mos = cv2.resize(small, (frame.shape[1], frame.shape[0]), interpolation=cv2.INTER_NEAREST)
    _blend(frame, _tint(mos, hex_to_bgr(color), 0.3 + 0.05 * lvl), _mask(frame.shape, poly))


def fx_verre(frame, box, poly, color, lvl, i):
    cx, cy = _center(poly)
    layer = _tint(_blur(frame, box[2], lvl), hex_to_bgr(color), 0.3 + 0.06 * lvl)
    hl = np.zeros(frame.shape[:2], np.float32)  # reflet diagonal
    cv2.ellipse(hl, (int(cx - box[2] * 0.2), int(cy - box[3] * 0.3)), (int(box[2] * 0.42), int(box[3] * 0.18)),
                -25, 0, 360, 1, -1)
    hl = cv2.GaussianBlur(hl, (61, 61), 0)[..., None] * 0.35
    layer = (layer * (1 - hl) + 255 * hl).astype(np.uint8)
    _blend(frame, layer, _mask(frame.shape, poly, feather=3))
    ring = frame.copy()
    _outline(ring, poly, (255, 255, 255), 3)
    cv2.addWeighted(ring, 0.6, frame, 0.4, 0, frame)


def fx_marqueur(frame, box, poly, color, lvl, i):
    bgr = hex_to_bgr(color)
    _blend(frame, _blur(frame, box[2], lvl), _mask(frame.shape, poly, feather=8))
    rng = np.random.default_rng(i // 4)  # légère variation toutes les 4 images = effet « fait main »
    x0, y0 = poly.min(axis=0)
    x1, y1 = poly.max(axis=0)
    n = 5
    band = (y1 - y0) / n
    strokes = frame.copy()
    for k in range(n):
        yy = y0 + band * (k + 0.5)
        tilt = rng.uniform(-0.05, 0.05) * (x1 - x0)
        cv2.line(strokes, (int(x0 - 10 + rng.normal(0, 6)), int(yy - tilt)),
                 (int(x1 + 10 + rng.normal(0, 6)), int(yy + tilt)), bgr, int(band * 0.95), cv2.LINE_AA)
    noise = rng.normal(0, 10, frame.shape).astype(np.int16)  # grain de feutre
    strokes = np.clip(strokes.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    opacity = min(1.0, [0.75, 0.82, 0.88, 0.94, 1.0][lvl - 1] * (0.55 + 0.3 * _CF))
    _blend(frame, strokes, _mask(frame.shape, poly, feather=1) * opacity)


def fx_sticker(frame, box, poly, color, lvl, i):
    bgr = hex_to_bgr(color)
    # sous-couche floutée : si l'opacité est < 100 %, on ne voit qu'un flou
    _blend(frame, _blur(frame, box[2], lvl), _mask(frame.shape, poly))
    shadow = frame.copy()
    cv2.fillPoly(shadow, [np.round(poly + [6, 10]).astype(np.int32)], (0, 0, 0), cv2.LINE_AA)
    cv2.addWeighted(cv2.GaussianBlur(shadow, (31, 31), 0), 0.45, frame, 0.55, 0, frame)
    border = max(5, int(box[2] / 22))
    fill = frame.copy()
    cv2.fillPoly(fill, [np.round(poly).astype(np.int32)], bgr, cv2.LINE_AA)
    opacity = min(1.0, [0.8, 0.86, 0.92, 0.96, 1.0][lvl - 1] * (0.55 + 0.3 * _CF))
    _blend(frame, fill, _mask(frame.shape, poly) * opacity)
    _outline(frame, poly, (255, 255, 255), border)
    cx, cy = _center(poly)
    hl = frame.copy()  # brillance
    cv2.ellipse(hl, (int(cx - box[2] * 0.25), int(cy - box[3] * 0.38)), (int(box[2] * 0.26), int(box[3] * 0.1)),
                -30, 0, 360, (255, 255, 255), -1, cv2.LINE_AA)
    inside = _mask(frame.shape, poly)
    _blend(frame, cv2.addWeighted(hl, 0.35, frame, 0.65, 0), inside)


def fx_neon(frame, box, poly, color, lvl, i):
    bgr = hex_to_bgr(color)
    dark = (_blur(frame, box[2], lvl) * (0.55 - 0.03 * lvl)).astype(np.uint8)
    _blend(frame, dark, _mask(frame.shape, poly, feather=4))
    pulse = 0.75 + 0.25 * math.sin(i / 30 * 2 * math.pi * 0.8)
    th = max(4, int(box[2] / 26))
    glow = np.zeros_like(frame)
    _outline(glow, poly, bgr, th * 3)
    glow = cv2.GaussianBlur(glow, (41, 41), 0)
    frame[:] = np.clip(frame.astype(np.int16) + (glow * pulse * 1.6 * _CF).astype(np.int16), 0, 255).astype(np.uint8)
    _outline(frame, poly, tuple(int(255 - (255 - c) * 0.35) for c in bgr), max(2, th // 2))


EFFECTS = {"flou": fx_flou, "mosaique": fx_mosaique, "verre": fx_verre,
           "marqueur": fx_marqueur, "sticker": fx_sticker, "neon": fx_neon}


def apply(frame, box, style: str = "flou", color: str = "#C9A45C", intensity: int = 3,
          color_intensity: int = 3, frame_index: int = 0) -> None:
    global _CF
    if style not in EFFECTS:
        raise ValueError(f"Style inconnu : {style}")
    lvl = int(min(5, max(1, intensity)))
    _CF = COLOR_LEVELS[int(min(5, max(1, color_intensity))) - 1]
    poly = shape_polygon(box, "ovale")
    # on ne traite que la zone autour du visage (x10 plus rapide qu'en plein cadre)
    H, W = frame.shape[:2]
    pad = int(max(box[2], box[3]) * 0.35) + 40
    x0, y0 = [int(max(0, v - pad)) for v in poly.min(axis=0)]
    x1, y1 = int(min(W, poly[:, 0].max() + pad)), int(min(H, poly[:, 1].max() + pad))
    if x1 <= x0 or y1 <= y0:
        return
    roi = np.ascontiguousarray(frame[y0:y1, x0:x1])
    local_box = (box[0] - x0, box[1] - y0, box[2], box[3])
    EFFECTS[style](roi, local_box, poly - [x0, y0], color, lvl, frame_index)
    frame[y0:y1, x0:x1] = roi
