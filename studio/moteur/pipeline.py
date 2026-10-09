"""
AL BARAKA — Pipeline de montage automatique (implémentation de référence)

Étapes :
  1. probe      : lecture des métadonnées (résolution, HDR, fps)
  2. transcribe : transcription mot à mot (faster-whisper, word_timestamps)
  3. retakes    : détection des phrases ratées / répétées (LLM -> mots à supprimer)
  4. tighten    : coupe des blancs au plus près de la voix (analyse d'énergie audio)
  5. captions   : découpage en sous-titres « éditorial » (LLM) + recalage des temps
  1b. audio     : (option, activée par défaut) débruitage + voix plus claire (FFmpeg arnndn/afftdn/EQ/compresseur)
  6. render     : montage FFmpeg (coupes + HDR->SDR + 1080x1920 + loudnorm)
  7. mask       : (option) masquage des visages : style, couleur, intensité du flou et de la couleur (face_effects.py)
  8. burn       : incrustation des sous-titres (libass) avec les couleurs choisies

Usage :
  python pipeline.py input.mov output.mp4 --text-color "#FFFFFF" \
      --outline-color "#000000" --shadow-color "#000000" \
      [--mask-faces --mask-style verre --mask-color "#10B981" --mask-intensity 4 --mask-color-intensity 3]

Dépendances : ffmpeg (avec libass + zscale), python 3.10+, voir requirements.txt
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import subprocess
import tempfile
from dataclasses import dataclass, field

import sys

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
FONTS_DIR = os.path.join(HERE, "fonts")
YUNET_MODEL = os.path.join(HERE, "models", "face_detection_yunet_2023mar.onnx")
RNNOISE_MODEL = os.path.join(HERE, "models", "std.rnnn")  # RNNoise (github.com/richardpl/arnndn-models)

# --------------------------------------------------------------------------
# Paramètres FIGÉS (identiques pour tous les élèves)
# --------------------------------------------------------------------------
OUT_W, OUT_H, OUT_FPS = 1080, 1920, 30

# Coupe des blancs
CUT_MIN_GAP = 0.12      # toute pause > 120 ms est supprimée
CUT_PRE_PAD = 0.05      # marge conservée avant chaque prise de parole
CUT_POST_PAD = 0.08     # marge conservée après (fin de mot, consonnes douces)
CUT_MIN_SPEECH = 0.06   # ignore les bruits < 60 ms (clics, bouche)

# Sous-titres — style « Éditorial » validé
CAP_POS_X, CAP_POS_Y = 540, 1320          # position imposée (centre, ~69 % hauteur)
CAP_SMALL_FONT = "Montserrat Black"
CAP_SMALL_SIZE = 82                        # petite ligne, MAJUSCULES espacées
CAP_SMALL_SPACING = 7
CAP_BIG_FONT = "DM Serif Display"
CAP_BIG_SIZE = 205                         # mot clé, italique
CAP_MAX_WIDTH = 920                        # px, réduction auto au-delà
CAP_LEAD = 0.12                            # le sous-titre apparaît 120 ms avant la voix
CAP_OUTLINE = 3                            # contour fin
CAP_DROP_SHADOW = 4                        # ombre portée légère
LOUDNESS_LUFS = -14


# --------------------------------------------------------------------------
# Structures
# --------------------------------------------------------------------------
@dataclass
class Word:
    text: str
    start: float
    end: float


@dataclass
class Caption:
    small: str
    big: str
    start: float
    end: float


@dataclass
class StyleOptions:
    text_color: str = "#FFFFFF"
    outline_color: str = "#000000"
    shadow_color: str = "#000000"


# --------------------------------------------------------------------------
# Utilitaires
# --------------------------------------------------------------------------
def run(cmd: list[str]) -> str:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"Commande échouée : {' '.join(cmd[:6])}...\n{r.stderr[-2000:]}")
    return r.stdout + r.stderr


def hex_to_ass(color: str) -> str:
    """#RRGGBB -> &HBBGGRR& (format ASS)"""
    c = color.lstrip("#")
    if not re.fullmatch(r"[0-9a-fA-F]{6}", c):
        raise ValueError(f"Couleur invalide : {color}")
    r, g, b = c[0:2], c[2:4], c[4:6]
    return f"&H{b}{g}{r}&".upper()


def ts(t: float) -> str:
    t = max(0.0, t)
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


# --------------------------------------------------------------------------
# 1. Probe
# --------------------------------------------------------------------------
def probe(path: str) -> dict:
    out = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", path])
    info = json.loads(out[out.index("{"):])
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    rot = 0
    for sd in v.get("side_data_list", []):
        if "rotation" in sd:
            rot = int(sd["rotation"])
    w, h = int(v["width"]), int(v["height"])
    if abs(rot) in (90, 270):
        w, h = h, w
    return {
        "width": w,
        "height": h,
        "duration": float(info["format"]["duration"]),
        "hdr": v.get("color_transfer") in ("arib-std-b67", "smpte2084"),
        "has_audio": any(s["codec_type"] == "audio" for s in info["streams"]),
    }


def extract_audio(path: str, wav: str) -> None:
    run(["ffmpeg", "-v", "error", "-y", "-i", path, "-ac", "1", "-ar", "16000", wav])


# --------------------------------------------------------------------------
# 1b. Amélioration du son (débruitage + voix)
# --------------------------------------------------------------------------
@dataclass
class AudioOptions:
    enabled: bool = True
    level: str = "normal"      # leger | normal | fort  (force du débruitage)


DENOISE_LEVELS = {  # mix RNNoise, réduction FFT résiduelle (dB)
    "leger": (0.7, 6),
    "normal": (0.9, 12),
    "fort": (1.0, 20),
}


def enhance_audio(src: str, dst_wav: str, analysis_wav: str, opts: AudioOptions) -> None:
    """Son de la vidéo source -> WAV 48 kHz mono nettoyé, même durée (les coupes restent alignées).
    Chaîne : passe-haut 80 Hz (grondements) -> RNNoise (bruits de fond : ventilo, clim, rue, souffle)
    -> débruitage FFT résiduel -> EQ voix (-2 dB à 250 Hz, +2,5 dB à 3,5 kHz) -> de-esser -> compresseur doux.
    Le volume final (-14 LUFS) est réglé plus tard, au montage.
    analysis_wav (16 kHz) = son seulement débruité, sans EQ ni compresseur : c'est lui qui sert
    à la transcription et à la détection des blancs (le compresseur allongerait les fins de mots)."""
    if not opts.enabled:
        run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "48000", dst_wav])
        run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", analysis_wav])
        return
    mix, nr = DENOISE_LEVELS[opts.level]
    chain = ",".join([
        "aresample=48000", "highpass=f=80",
        f"arnndn=m='{RNNOISE_MODEL}':mix={mix}",
        f"afftdn=nr={nr}:nf=-42:tn=1",
        "equalizer=f=250:t=q:w=1:g=-2",
        "equalizer=f=3500:t=q:w=1.2:g=2.5",
        "deesser=i=0.3",
        "acompressor=threshold=-22dB:ratio=3:attack=8:release=120:makeup=2",
    ])
    run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vn", "-ac", "1", "-af", chain, dst_wav])
    denoise_only = ",".join(chain.split(",")[:4]) + ",aresample=16000"
    run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vn", "-ac", "1", "-af", denoise_only, analysis_wav])


# --------------------------------------------------------------------------
# 2. Transcription mot à mot
# --------------------------------------------------------------------------
def transcribe(wav: str, model_size: str = "large-v3") -> list[Word]:
    """faster-whisper avec horodatage par mot. En prod : GPU conseillé.
    Alternative API : OpenAI Whisper (timestamp_granularities=word), Deepgram, AssemblyAI."""
    from faster_whisper import WhisperModel

    model = WhisperModel(model_size, device="auto", compute_type="auto")
    segs, _ = model.transcribe(
        wav, language="fr", word_timestamps=True, vad_filter=False,
        condition_on_previous_text=False,  # évite que Whisper « nettoie » les répétitions
    )
    words = []
    for s in segs:
        for w in s.words or []:
            words.append(Word(w.word.strip(), float(w.start), float(w.end)))
    return words


# --------------------------------------------------------------------------
# 3. Détection des phrases ratées (LLM)
# --------------------------------------------------------------------------
RETAKE_PROMPT = """Tu es monteur vidéo. Voici la transcription mot à mot d'une vidéo face caméra
en français. L'orateur se trompe parfois et recommence sa phrase (prise ratée, bafouillage,
phrase répétée, mot de fin comme « OK », « c'est bon », « attends »).

Règle : quand une phrase est dite plusieurs fois, on GARDE LA DERNIÈRE VERSION COMPLÈTE
et on supprime les tentatives précédentes. On supprime aussi les mots parasites hors discours.
On ne supprime JAMAIS un contenu qui n'est dit qu'une seule fois.

Mots (index: texte [début-fin]) :
{words}

Réponds UNIQUEMENT en JSON : {{"remove": [[index_debut, index_fin], ...], "notes": "..."}}
(plages inclusives d'index de mots à supprimer)."""


def detect_retakes(words: list[Word], llm) -> list[tuple[int, int]]:
    """llm(prompt:str)->str. Ex. Claude API. Retourne les plages d'index à supprimer."""
    listing = "\n".join(f"{i}: {w.text} [{w.start:.2f}-{w.end:.2f}]" for i, w in enumerate(words))
    raw = llm(RETAKE_PROMPT.format(words=listing))
    data = json.loads(raw[raw.index("{"): raw.rindex("}") + 1])
    return [(int(a), int(b)) for a, b in data.get("remove", [])]


def kept_ranges_from_words(words: list[Word], remove: list[tuple[int, int]], duration: float) -> list[tuple[float, float]]:
    """Plages de temps source à conserver (avant resserrage des blancs)."""
    removed = set()
    for a, b in remove:
        removed.update(range(a, b + 1))
    ranges: list[list[float]] = []
    for i, w in enumerate(words):
        if i in removed:
            continue
        prev_removed = i > 0 and (i - 1) in removed
        next_removed = i + 1 < len(words) and (i + 1) in removed
        s = max(0.0, w.start - 0.15)
        e = min(duration, w.end + 0.15)
        if prev_removed:  # ne pas mordre sur la prise ratée juste avant
            s = max(s, (words[i - 1].end + w.start) / 2)
        if next_removed:
            e = min(e, (w.end + words[i + 1].start) / 2)
        if ranges and s <= ranges[-1][1] and (i - 1) not in removed:
            ranges[-1][1] = max(ranges[-1][1], e)
        else:
            ranges.append([s, e])
    # ne jamais faire chevaucher deux plages
    out = []
    for s, e in ranges:
        if out and s < out[-1][1]:
            s = out[-1][1]
        if e > s:
            out.append((s, e))
    return out


# --------------------------------------------------------------------------
# 4. Resserrage des blancs (énergie audio)
# --------------------------------------------------------------------------
def energy_db(wav: str, hop: float = 0.01) -> np.ndarray:
    a, sr = sf.read(wav, dtype="float32")
    if a.ndim > 1:
        a = a.mean(axis=1)
    h = int(sr * hop)
    n = len(a) // h
    frames = a[: n * h].reshape(n, h)
    db = 20 * np.log10(np.sqrt((frames ** 2).mean(axis=1)) + 1e-9)
    return np.convolve(db, np.ones(3) / 3, mode="same")  # lissage 30 ms


def speech_threshold(db: np.ndarray) -> float:
    """Seuil adaptatif entre le bruit de fond (10e centile) et la voix forte (90e centile).
    Réglé sur la vidéo de démo validée par Sidali (seuil obtenu : -37 dB sur le son brut)."""
    noise = np.percentile(db, 10)
    speech = np.percentile(db, 90)
    # borne basse : jamais plus de 14 dB sous la voix (utile quand le son a été débruité)
    return max(noise + 0.57 * (speech - noise), speech - 14)


def tighten(ranges: list[tuple[float, float]], db: np.ndarray, hop: float = 0.01) -> list[tuple[float, float]]:
    thr = speech_threshold(db)
    out: list[list[float]] = []
    for A, B in ranges:
        segs: list[list[float]] = []
        for f in range(int(A / hop), min(int(B / hop), len(db))):
            if db[f] <= thr:
                continue
            t = f * hop
            if segs and t - segs[-1][1] <= CUT_MIN_GAP:
                segs[-1][1] = t + hop
            else:
                segs.append([t, t + hop])
        for s0, s1 in segs:
            if s1 - s0 < CUT_MIN_SPEECH:
                continue
            x0 = math.floor(max(A, s0 - CUT_PRE_PAD) * OUT_FPS) / OUT_FPS   # calage sur l'image
            x1 = math.ceil(min(B, s1 + CUT_POST_PAD) * OUT_FPS) / OUT_FPS
            if out and x0 <= out[-1][1]:
                out[-1][1] = max(out[-1][1], x1)
            else:
                out.append([x0, x1])
    return [(a, b) for a, b in out]


def map_time(t: float, cuts: list[tuple[float, float]], side: str = "start") -> float | None:
    """Temps source -> temps de la vidéo montée. None si t tombe dans une coupe (selon side)."""
    acc = 0.0
    for a, b in cuts:
        if t < a:
            return acc if side == "start" else (acc if acc > 0 else 0.0)
        if t <= b:
            return acc + (t - a)
        acc += b - a
    return acc


# --------------------------------------------------------------------------
# 5. Sous-titres
# --------------------------------------------------------------------------
CAPTION_PROMPT = """Découpe ce texte parlé en sous-titres courts façon Reels, style « éditorial » :
chaque sous-titre = une petite ligne (contexte, 0 à 26 caractères) + un MOT CLÉ en grand (1 à 3 mots,
16 caractères max). Le mot clé est la partie la plus forte / émotionnelle, et termine le sous-titre.
Respecte l'ordre exact des mots et couvre TOUS les mots, sans en sauter ni en ajouter.
Tu peux corriger l'orthographe (ex. noms de marque : « AL BARAKA ») sans changer le nombre de mots.

Mots (index: texte) :
{words}

Réponds UNIQUEMENT en JSON :
{{"captions": [{{"first": i, "last": j, "small": "...", "big": "..."}}, ...]}}"""


def group_captions(words: list[Word], llm) -> list[Caption]:
    listing = "\n".join(f"{i}: {w.text}" for i, w in enumerate(words))
    raw = llm(CAPTION_PROMPT.format(words=listing))
    data = json.loads(raw[raw.index("{"): raw.rindex("}") + 1])
    caps = []
    for c in data["captions"]:
        f, l = int(c["first"]), int(c["last"])
        caps.append(Caption(c.get("small", ""), c.get("big", ""), words[f].start, words[l].end))
    return finalize_timing(caps)


def finalize_timing(caps: list[Caption], total: float | None = None) -> list[Caption]:
    for c in caps:
        c.start = max(0.0, c.start - CAP_LEAD)
    for i, c in enumerate(caps):
        nxt = caps[i + 1].start if i + 1 < len(caps) else (total or c.end + 0.25)
        c.end = nxt if nxt - c.end < 0.5 else c.end + 0.25   # pas de « trou » entre sous-titres
    return caps


def _fit(text: str, size: int, char_w: float) -> int:
    if not text:
        return size
    return min(size, int(CAP_MAX_WIDTH / (len(text) * char_w)))


def build_ass(caps: list[Caption], style: StyleOptions) -> str:
    txt_c = hex_to_ass(style.text_color)
    out_c = hex_to_ass(style.outline_color)
    sh_c = hex_to_ass(style.shadow_color)
    head = f"""[Script Info]
PlayResX: {OUT_W}
PlayResY: {OUT_H}
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: T,{CAP_SMALL_FONT},{CAP_SMALL_SIZE},&H00FFFFFF,&H00FFFFFF,&H00000000,&H90000000,0,0,0,0,100,100,0,0,1,{CAP_OUTLINE},0,5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for c in caps:
        small = c.small.upper()
        fs_s = _fit(small, CAP_SMALL_SIZE, 0.46)
        fs_b = _fit(c.big, CAP_BIG_SIZE, 0.36)
        parts = []
        if small:
            parts.append(r"{\fn%s\fs%d\fsp%d\i0}%s" % (CAP_SMALL_FONT, fs_s, CAP_SMALL_SPACING, small))
        if c.big:
            parts.append(r"{\fn%s\i1\fs%d\fsp0\fscx92\fscy92\t(0,140,\fscx100\fscy100)}%s" % (CAP_BIG_FONT, fs_b, c.big))
        body = r"\N".join(parts)
        pos = r"\an5\pos(%d,%d)\fad(70,40)" % (CAP_POS_X, CAP_POS_Y)
        # Calque 0 : halo d'ombre doux (couleur d'ombre)
        lines.append(f"Dialogue: 0,{ts(c.start)},{ts(c.end)},T,,0,0,0,,"
                     + "{" + pos + rf"\1c{sh_c}\3c{sh_c}\bord10\blur14\alpha&H80&\shad0" + "}" + body)
        # Calque 1 : texte (couleur texte) + contour fin (couleur contour) + ombre portée légère
        lines.append(f"Dialogue: 1,{ts(c.start)},{ts(c.end)},T,,0,0,0,,"
                     + "{" + pos + rf"\1c{txt_c}\3c{out_c}\bord{CAP_OUTLINE}\blur1.2\shad{CAP_DROP_SHADOW}\4c{sh_c}\4a&H90&" + "}" + body)
    return head + "\n".join(lines) + "\n"


# --------------------------------------------------------------------------
# 6. Rendu du montage
# --------------------------------------------------------------------------
def render_cut(src: str, audio_wav: str, cuts: list[tuple[float, float]], meta: dict, dst: str) -> None:
    f, cat = [], ""
    for i, (a, b) in enumerate(cuts):
        d = b - a
        f.append(f"[0:v]trim={a:.4f}:{b:.4f},setpts=PTS-STARTPTS[v{i}]")
        f.append(f"[1:a]atrim={a:.4f}:{b:.4f},asetpts=PTS-STARTPTS,"
                 f"afade=t=in:d=0.012,afade=t=out:st={max(0, d - 0.02):.4f}:d=0.02[a{i}]")
        cat += f"[v{i}][a{i}]"
    f.append(f"{cat}concat=n={len(cuts)}:v=1:a=1[vc][ac]")
    vf = []
    if meta["hdr"]:  # iPhone HDR (HLG/PQ) -> SDR bt709
        vf.append("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,"
                  "tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv")
    # Cadre 9:16 imposé : recadrage centré si la source n'est pas verticale
    vf.append(f"scale={OUT_W}:{OUT_H}:force_original_aspect_ratio=increase:flags=lanczos,"
              f"crop={OUT_W}:{OUT_H},setsar=1,format=yuv420p")
    f.append(f"[vc]{','.join(vf)}[vo]")
    f.append(f"[ac]loudnorm=I={LOUDNESS_LUFS}:TP=-1.5:LRA=11,aresample=48000[ao]")
    run(["ffmpeg", "-v", "error", "-y", "-i", src, "-i", audio_wav, "-filter_complex", ";".join(f),
         "-map", "[vo]", "-map", "[ao]", "-r", str(OUT_FPS),
         "-c:v", "libx264", "-preset", "medium", "-crf", "17",
         "-c:a", "aac", "-b:a", "192k", dst])


# --------------------------------------------------------------------------
# 7. Floutage des visages (option)
# --------------------------------------------------------------------------
@dataclass
class FaceMaskOptions:
    enabled: bool = False
    style: str = "flou"        # flou | mosaique | verre | marqueur | sticker | neon
    color: str = "#C9A45C"
    intensity: int = 3         # force du floutage, 1 à 5
    color_intensity: int = 3   # présence de la couleur, 1 à 5


def mask_faces(src: str, dst: str, opts: FaceMaskOptions) -> dict:
    """Détecte et suit les visages image par image, puis applique le masquage choisi."""
    import cv2
    import face_effects as fx

    cap = cv2.VideoCapture(src)
    W, H, fps = int(cap.get(3)), int(cap.get(4)), cap.get(5)
    DS = 3  # détection sur une image réduite (x9 plus rapide), coordonnées remises à l'échelle
    det = cv2.FaceDetectorYN.create(YUNET_MODEL, "", (W // DS, H // DS), 0.6, 0.3, 50)
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24",
                          "-s", f"{W}x{H}", "-r", str(fps), "-i", "-", "-i", src,
                          "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "17",
                          "-pix_fmt", "yuv420p", "-c:a", "copy", dst], stdin=subprocess.PIPE)
    last, miss, n, missed = None, 0, 0, 0
    HOLD = int(fps * 0.5)  # si la détection décroche, le masque reste en place 0,5 s
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        _, faces = det.detect(cv2.resize(frame, (W // DS, H // DS), interpolation=cv2.INTER_AREA))
        boxes = [] if faces is None else [np.array(fc[:4], float) * DS for fc in faces]
        if boxes:
            if last is not None and len(last) == len(boxes):
                boxes = [0.6 * b + 0.4 * l for b, l in zip(boxes, last)]  # lissage anti-tremblement
            last, miss = boxes, 0
        else:
            miss += 1
            missed += 1
        if last is not None and miss < HOLD:
            for box in last:
                fx.apply(frame, box, opts.style, opts.color, opts.intensity, opts.color_intensity, n)
        p.stdin.write(frame.tobytes())
        n += 1
    p.stdin.close()
    p.wait()
    return {"frames": n, "frames_without_face": missed}


# --------------------------------------------------------------------------
# 8. Incrustation
# --------------------------------------------------------------------------
def burn(src: str, ass_path: str, dst: str) -> None:
    run(["ffmpeg", "-v", "error", "-y", "-i", src,
         "-vf", f"ass={ass_path}:fontsdir={FONTS_DIR}",
         "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
         "-c:a", "copy", "-movflags", "+faststart", dst])


# --------------------------------------------------------------------------
# Orchestration
# --------------------------------------------------------------------------
def process(src: str, dst: str, style: StyleOptions, face: FaceMaskOptions, llm,
            audio: AudioOptions | None = None) -> dict:
    audio = audio or AudioOptions()
    meta = probe(src)
    with tempfile.TemporaryDirectory() as tmp:
        clean = os.path.join(tmp, "clean48k.wav")   # son amélioré : utilisé au rendu
        wav = os.path.join(tmp, "a.wav")            # son débruité 16 kHz : transcription + coupes
        enhance_audio(src, clean, wav, audio)
        words = transcribe(wav)
        remove = detect_retakes(words, llm)
        ranges = kept_ranges_from_words(words, remove, meta["duration"])
        cuts = tighten(ranges, energy_db(wav))

        # mots conservés, remappés sur la timeline montée
        removed = {i for a, b in remove for i in range(a, b + 1)}
        kept = []
        for i, w in enumerate(words):
            if i in removed:
                continue
            s, e = map_time(w.start, cuts, "start"), map_time(w.end, cuts, "end")
            kept.append(Word(w.text, s, max(e, s + 0.05)))

        cut_path = os.path.join(tmp, "cut.mp4")
        render_cut(src, clean, cuts, meta, cut_path)
        total = sum(b - a for a, b in cuts)

        caps = group_captions(kept, llm)
        caps = finalize_timing(caps, total) if caps else caps
        ass_path = os.path.join(tmp, "subs.ass")
        with open(ass_path, "w", encoding="utf-8") as fh:
            fh.write(build_ass(caps, style))

        stage = cut_path
        blur_stats = None
        if face.enabled:
            stage = os.path.join(tmp, "masked.mp4")
            blur_stats = mask_faces(cut_path, stage, face)
        burn(stage, ass_path, dst)
    return {"input_duration": meta["duration"], "output_duration": total,
            "segments": len(cuts), "captions": len(caps), "face_mask": blur_stats}


def claude_llm(prompt: str) -> str:
    """Appel Claude API (clé dans ANTHROPIC_API_KEY)."""
    import anthropic

    client = anthropic.Anthropic()
    msg = client.messages.create(model=os.environ.get("CLAUDE_MODEL", "claude-sonnet-5-5"),
                                 max_tokens=8000, messages=[{"role": "user", "content": prompt}])
    return msg.content[0].text


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--text-color", default="#FFFFFF")
    ap.add_argument("--outline-color", default="#000000")
    ap.add_argument("--shadow-color", default="#000000")
    ap.add_argument("--no-audio-enhance", action="store_true", help="désactive l'amélioration du son")
    ap.add_argument("--audio-level", default="normal", choices=list(DENOISE_LEVELS))
    ap.add_argument("--mask-faces", action="store_true")
    ap.add_argument("--mask-style", default="flou")
    ap.add_argument("--mask-color", default="#C9A45C")
    ap.add_argument("--mask-intensity", type=int, default=3)
    ap.add_argument("--mask-color-intensity", type=int, default=3)
    a = ap.parse_args()
    report = process(a.input, a.output,
                     StyleOptions(a.text_color, a.outline_color, a.shadow_color),
                     FaceMaskOptions(a.mask_faces, a.mask_style, a.mask_color, a.mask_intensity, a.mask_color_intensity),
                     claude_llm,
                     AudioOptions(not a.no_audio_enhance, a.audio_level))
    print(json.dumps(report, indent=2, ensure_ascii=False))
