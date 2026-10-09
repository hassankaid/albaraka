"""AL BARAKA — Prototype du motion design (validé sur la vidéo de démo de Sidali).
Les moments (PUNCH, ITEMS, FLASHES, CTA_T0, horloge) sont écrits en dur pour la vidéo de démo :
en production, ils viennent du plan d'animation JSON renvoyé par l'IA.
Usage : python motion_design.py --src cut.mp4 --ass subs.ass --cuts cuts.json --out sortie.mp4 \
          --accent "#C9A45C" --panel "#0F0F0F" --text "#FFFFFF" --name "Sidali" --title "Fondateur d'AL BARAKA"
Aperçu d'une image : ajouter --frame 25.2 --out apercu.png

Motion design test on Sidali's edited video (v2).
Layers: jump-cut reframing + punch-in zooms, progress bar, animated name tag, animated clock at "23h",
animated 3-item checklist ("Ton offre / ta présence en ligne / tes premiers clients"),
animated CTA button with bouncing arrow, light SFX (whoosh / pops). Subtitles burned last on top."""
import json, math, subprocess, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
import os
HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "fonts")
F_BLACK = os.path.join(FONTS, "Montserrat-Black.ttf")
F_SERIF = os.path.join(FONTS, "DMSerifDisplay-Italic.ttf")
import argparse, sys
def hex_rgb(h): h = h.lstrip("#"); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
_ap = argparse.ArgumentParser()
_ap.add_argument("--accent", default="#C9A45C")      # couleur principale : barre, pastilles, bouton, liserés
_ap.add_argument("--panel", default="#0F0F0F")       # fond des encadrés
_ap.add_argument("--text", default="#FFFFFF")        # texte des encadrés
_ap.add_argument("--name", default="SIDALI")
_ap.add_argument("--title", default="Fondateur d'AL BARAKA")
_ap.add_argument("--src", required=True)       # vidéo montée (sortie de render_cut)
_ap.add_argument("--ass", required=True)       # sous-titres (sortie de build_ass)
_ap.add_argument("--cuts", required=True)      # JSON {"new": [[debut, fin], ...]} des morceaux gardés
_ap.add_argument("--frame", type=float, default=None)  # rend une seule image (aperçu)
_ap.add_argument("--out", default=None)
ARGS = _ap.parse_args()
SRC, ASS = ARGS.src, ARGS.ass
OUT = ARGS.out or "video_motion_design.mp4"
GOLD = hex_rgb(ARGS.accent)
PANEL = hex_rgb(ARGS.panel)
TEXT = hex_rgb(ARGS.text)
# texte sur le bouton : noir ou blanc selon la clarté de la couleur principale
DARK = (18, 18, 18) if sum(GOLD) > 380 else (255, 255, 255)
def _lum(c): return (0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]) / 255
# règle de contraste : sur un encadré clair, le texte couleur principale est assombri pour rester lisible
ACCENT_TXT = tuple(int(v * 0.55) for v in GOLD) if (_lum(PANEL) > 0.6 and _lum(GOLD) > 0.45) else GOLD

# ---------------------------------------------------------------- timing helpers
def ease_out(x):  x = min(1, max(0, x)); return 1 - (1 - x) ** 3
def ease_in_out(x): x = min(1, max(0, x)); return 4*x**3 if x < .5 else 1 - (-2*x+2)**3/2
def back_out(x, s=1.7):
    x = min(1, max(0, x)); x -= 1; return x*x*((s+1)*x + s) + 1

cuts = json.load(open(ARGS.cuts))["new"]
bounds, acc = [], 0.0
for a, b in cuts:
    bounds.append(acc); acc += b - a
TOTAL = acc

def seg_index(t):
    i = 0
    for k, s in enumerate(bounds):
        if t >= s: i = k
    return i

# punch-in zooms on key words (start, end) in output time
PUNCH = [(10.92, 11.83), (19.52, 20.68), (26.28, 27.35), (40.38, 41.90)]

def zoom_at(t):
    base = 1.0 if seg_index(t) % 2 == 0 else 1.07          # alternate framing on each jump cut
    z = base
    for s, e in PUNCH:
        if s - 0.05 <= t <= e + 0.25:
            k = ease_out((t - s) / 0.22) * (1 - ease_in_out((t - e) / 0.25))
            z = max(z, base + (1.16 - base) * k)
    return z

FACE_C = (540, 560)   # zoom anchor near the face

def transform(frame, t):
    z = zoom_at(t)
    if z <= 1.0001: return frame
    cx, cy = FACE_C
    M = np.float32([[z, 0, cx - z*cx], [0, z, cy - z*cy]])
    return cv2.warpAffine(frame, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

# ---------------------------------------------------------------- overlay drawing (RGBA canvas, small regions)
fontA = lambda s: ImageFont.truetype(F_BLACK, s)
fontB = lambda s: ImageFont.truetype(F_SERIF, s)

def paste_rgba(frame_bgr, img_rgba, x, y):
    h, w = img_rgba.shape[:2]
    x0, y0 = max(0, x), max(0, y); x1, y1 = min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0: return
    sub = img_rgba[y0 - y:y1 - y, x0 - x:x1 - x]
    a = sub[..., 3:4].astype(np.float32) / 255
    rgb = sub[..., :3][..., ::-1].astype(np.float32)
    roi = frame_bgr[y0:y1, x0:x1].astype(np.float32)
    frame_bgr[y0:y1, x0:x1] = (rgb * a + roi * (1 - a)).astype(np.uint8)

def shadowed(img, radius=18, alpha=110, offset=(0, 8)):
    """add a soft drop shadow under an RGBA image (returns bigger image + offset)"""
    pad = radius * 2
    big = Image.new("RGBA", (img.width + pad*2, img.height + pad*2), (0, 0, 0, 0))
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sh.putalpha(img.getchannel("A").point(lambda v: v * alpha // 255))
    from PIL import ImageFilter
    big.paste(sh, (pad + offset[0], pad + offset[1]), sh)
    big = big.filter(ImageFilter.GaussianBlur(radius))
    big.alpha_composite(img, (pad, pad))
    return big, pad

# name tag (static image, animated by position/opacity)
def make_nametag():
    w, h = 560, 150
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w, h), 26, fill=PANEL + (215,))
    d.rounded_rectangle((0, 0, 14, h), 7, fill=GOLD + (255,))
    d.text((44, 22), ARGS.name.upper(), font=fontA(52), fill=TEXT + (255,))
    d.text((46, 84), ARGS.title, font=fontB(40), fill=ACCENT_TXT + (255,))
    return shadowed(im)
NAMETAG, NT_PAD = make_nametag()

def draw_nametag(frame, t):
    t0, t1 = 0.6, 4.2
    if not (t0 <= t <= t1 + 0.5): return
    k_in = back_out((t - t0) / 0.5); k_out = ease_in_out((t - t1) / 0.4)
    x = int(-620 + (60 + 620) * k_in - 700 * k_out)
    arr = np.array(NAMETAG); arr[..., 3] = (arr[..., 3] * (1 - k_out)).astype(np.uint8)
    paste_rgba(frame, arr, x - NT_PAD, 150 - NT_PAD)

# animated clock at "23h"
def draw_clock(frame, t):
    t0, t1 = 3.35, 4.9
    if not (t0 <= t <= t1 + 0.3): return
    s = back_out((t - t0) / 0.35) * (1 - ease_in_out((t - t1) / 0.3))
    if s <= 0.01: return
    R = int(95 * s); size = 260
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = size // 2
    d.ellipse((c-R, c-R, c+R, c+R), fill=PANEL + (225,), outline=GOLD + (255,), width=max(2, int(9*s)))
    for k in range(12):
        a = k / 12 * 2 * math.pi; r1, r2 = R * 0.78, R * 0.9
        d.line((c + r1*math.sin(a), c - r1*math.cos(a), c + r2*math.sin(a), c - r2*math.cos(a)), fill=TEXT + (200,), width=max(1, int(4*s)))
    # hands spin fast then settle on 11:00 (23h)
    p = ease_out((t - t0) / 1.0)
    hm = (1 - p) * 6 * 2 * math.pi + p * 0.0              # minute hand -> 12
    hh = (1 - p) * 1.5 * 2 * math.pi + p * (11/12 * 2*math.pi)  # hour hand -> 11
    d.line((c, c, c + R*0.72*math.sin(hm), c - R*0.72*math.cos(hm)), fill=TEXT + (255,), width=max(2, int(7*s)))
    d.line((c, c, c + R*0.5*math.sin(hh), c - R*0.5*math.cos(hh)), fill=GOLD + (255,), width=max(2, int(10*s)))
    d.ellipse((c-8*s, c-8*s, c+8*s, c+8*s), fill=GOLD + (255,))
    img, pad = shadowed(im, 14, 120)
    paste_rgba(frame, np.array(img), 800 - size//2 - pad, 330 - size//2 - pad)

# checklist
ITEMS = [("Ton offre", 22.60), ("Ta présence en ligne", 23.25), ("Tes premiers clients", 24.36)]
CL_END = 27.35
def draw_checklist(frame, t):
    t0 = ITEMS[0][1] - 0.15
    if not (t0 <= t <= CL_END + 0.4): return
    k_panel = ease_out((t - t0) / 0.35); k_out = ease_in_out((t - CL_END) / 0.35)
    pw, ph = 700, 330
    im = Image.new("RGBA", (pw, ph), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, pw, ph), 34, fill=PANEL + (int(205 * k_panel),))
    d.text((40, 26), "CE QU'ON CONSTRUIT ENSEMBLE", font=fontA(28), fill=ACCENT_TXT + (int(255 * k_panel),))
    for i, (label, ts) in enumerate(ITEMS):
        k = ease_out((t - ts) / 0.3)
        if k <= 0: continue
        y = 90 + i * 76; x = 40 + int((1 - k) * 60)
        a = int(255 * k)
        d.ellipse((x, y, x + 52, y + 52), fill=GOLD + (a,))
        kc = ease_out((t - ts - 0.12) / 0.25)           # check mark drawn progressively
        p1, p2, p3 = (x + 13, y + 27), (x + 23, y + 38), (x + 41, y + 15)
        if kc > 0:
            if kc < 0.4:
                q = kc / 0.4; d.line((p1, (p1[0] + (p2[0]-p1[0])*q, p1[1] + (p2[1]-p1[1])*q)), fill=DARK + (a,), width=7)
            else:
                q = (kc - 0.4) / 0.6
                d.line((p1, p2), fill=DARK + (a,), width=7)
                d.line((p2, (p2[0] + (p3[0]-p2[0])*q, p2[1] + (p3[1]-p2[1])*q)), fill=DARK + (a,), width=7)
        d.text((x + 78, y - 2), label, font=fontB(50), fill=TEXT + (a,))
    img, pad = shadowed(im, 20, 120)
    arr = np.array(img)
    if k_out > 0: arr[..., 3] = (arr[..., 3] * (1 - k_out)).astype(np.uint8)
    y_off = int((1 - k_panel) * 40 + k_out * 40)
    paste_rgba(frame, arr, (W - pw)//2 - pad, 845 + y_off - pad)

# CTA button + bouncing arrow
CTA_T0 = 38.26
def draw_cta(frame, t):
    if t < CTA_T0: return
    k = back_out((t - CTA_T0) / 0.45)
    pulse = 1 + 0.035 * math.sin((t - CTA_T0) * 2 * math.pi * 1.4)
    s = k * pulse
    bw, bh = int(640 * s), int(120 * s)
    if bw < 20: return
    im = Image.new("RGBA", (720, 330), (0, 0, 0, 0)); d = ImageDraw.Draw(im); cx = 360
    d.rounded_rectangle((cx - bw//2, 20, cx + bw//2, 20 + bh), bh // 2, fill=GOLD + (255,))
    fs = max(10, int(46 * s)); f = fontA(fs); txt = "RÉSERVE TON APPEL"
    tw = d.textlength(txt, font=f); d.text((cx - tw/2, 20 + bh/2 - fs*0.62), txt, font=f, fill=DARK + (255,))
    bounce = abs(math.sin((t - CTA_T0) * math.pi * 2.2)) * 26
    ay = 20 + bh + 40 + bounce; a = int(255 * min(1, k))
    d.polygon([(cx - 34, ay), (cx + 34, ay), (cx, ay + 44)], fill=TEXT + (a,))
    d.rectangle((cx - 11, ay - 44, cx + 11, ay + 2), fill=TEXT + (a,))
    img, pad = shadowed(im, 18, 120)
    paste_rgba(frame, np.array(img), (W - 720)//2 - pad, 1500 - pad)

def draw_progress(frame, t):
    w = int(W * t / TOTAL)
    frame[0:10, 0:W] = (frame[0:10, 0:W] * 0.55).astype(np.uint8)
    frame[0:10, 0:w] = (GOLD[2], GOLD[1], GOLD[0])

# light flash on section changes (hook -> problem -> solution -> CTA)
FLASHES = [10.17, 19.52, 38.26]
def draw_flash(frame, t):
    for f in FLASHES:
        if 0 <= t - f < 0.18:
            a = 0.35 * (1 - (t - f) / 0.18)
            frame[:] = (frame * (1 - a) + 255 * a).astype(np.uint8)

# ---------------------------------------------------------------- SFX
def sfx_track(path):
    sr = 48000; n = int(TOTAL * sr) + sr; out = np.zeros(n, np.float32)
    rng = np.random.default_rng(1)
    def add(t, sig, gain):
        i = int(t * sr); j = min(n, i + len(sig)); out[i:j] += sig[:j - i] * gain
    def pop(f0=900):
        tt = np.arange(int(0.09 * sr)) / sr
        return np.sin(2*np.pi*(f0 + 900*np.exp(-tt*40))*tt) * np.exp(-tt * 45)
    def whoosh(dur=0.45):
        m = int(dur * sr); x = rng.normal(0, 1, m)
        env = np.sin(np.linspace(0, np.pi, m)) ** 2
        # sweeping band-pass approximation: moving average of different widths
        y = np.zeros(m); win = np.linspace(40, 6, m).astype(int)
        cs = np.cumsum(np.concatenate([[0], x]))
        for k in range(m):
            w_ = win[k]; a0 = max(0, k - w_); y[k] = (cs[k] - cs[a0]) / max(1, k - a0)
        return y / (np.abs(y).max() + 1e-9) * env
    add(0.6, whoosh(), 0.10)                 # name tag in
    add(3.35, pop(700), 0.16)                # clock
    for _, ts in ITEMS: add(ts, pop(1000), 0.16)
    for f in FLASHES: add(f - 0.2, whoosh(0.35), 0.08)
    add(CTA_T0, pop(600), 0.18)
    import soundfile as sf; sf.write(path, out, sr)

# ---------------------------------------------------------------- render
def render_frame(t):
    cap = cv2.VideoCapture(SRC); cap.set(cv2.CAP_PROP_POS_FRAMES, int(t * FPS)); ok, fr = cap.read()
    fr = cv2.resize(fr, (W, H), interpolation=cv2.INTER_LANCZOS4); fr = transform(fr, t)
    for f in (draw_progress, draw_nametag, draw_clock, draw_checklist, draw_cta): f(fr, t)
    cv2.imwrite(ARGS.out, fr)

if __name__ == "__main__" and ARGS.frame is not None:
    render_frame(ARGS.frame); sys.exit(0)

if __name__ == "__main__":
    if ARGS.out: OUT = ARGS.out
    sfx = OUT + ".sfx.wav"; sfx_track(sfx)
    cap = cv2.VideoCapture(SRC)
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-i", SRC, "-i", sfx,
                           "-filter_complex", f"[0:v]ass={ASS}:fontsdir={FONTS}[v];[1:a][2:a]amix=inputs=2:duration=first:normalize=0[a]",
                           "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
                           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    i = 0
    while True:
        ok, fr = cap.read()
        if not ok: break
        t = i / FPS
        fr = cv2.resize(fr, (W, H), interpolation=cv2.INTER_LANCZOS4)
        fr = transform(fr, t)
        draw_flash(fr, t)
        draw_progress(fr, t)
        draw_nametag(fr, t)
        draw_clock(fr, t)
        draw_checklist(fr, t)
        draw_cta(fr, t)
        ff.stdin.write(fr.tobytes()); i += 1
    ff.stdin.close(); ff.wait(); print("frames", i)
