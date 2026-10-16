"""Studio vidéo AL BARAKA : le travail d'une machine de montage (Vercel Sandbox).

Lancé par /api/studio/demarrer avec, en variables d'environnement :
  MONTAGE_ID, JETON           le montage et son jeton à usage unique
  MODE                        preparation | complet | rendu
  REGLAGES                    réglages de l'élève (JSON), vides en préparation
  LIENS                       liens signés : {"source": url, "lire": {nom: url}, "deposer": {nom: url}}
  SUPABASE_URL, SUPABASE_ANON pour signaler l'avancement (fonctions studio_job_*)
  OPENROUTER_API_KEY          transcription (Whisper) et IA (Claude)
  STOP_URL, STOP_TOKEN        pour éteindre la machine en fin de travail

La machine n'a accès qu'à ce montage : liens signés pour les fichiers, jeton
pour l'avancement. Le moteur de Sidali (studio/moteur) est utilisé tel quel ;
les corrections de la plateforme sont ici :
  1. transcription par prises (voir transcrire_par_prises) ;
  2. seuil de voix à -24 dB (voir seuil_voix) ;
  3. floutage et animations en une passe répartie sur tous les processeurs (voir rendre_images) ;
  4. mot clé des sous-titres en minuscules, comme l'aperçu validé ;
  5. flou naturel du visage (sans bulle) ;
  6. motion design piloté par un plan d'animation de l'IA (voir animations.py) ;
  7. motion design Hyperframes (dossier hf/) : l'IA choisit des recettes dans la bibliothèque
     AL BARAKA, la composition est vérifiée puis rendue. animations.py reste en secours.
  8. rythme des coupes réglable, et coupes ajustées à la main (vocal de Sidali, 12/10) : le
     moteur supprimait toute pause de plus de 120 ms. Changer les coupes ne refait ni la
     transcription ni les phrases ratées (voir monter et coupes_a_refaire).

  preparation : son (réglage « normal »), aperçu, transcription, phrases ratées,
                coupes, montage brut, sous-titres. Si l'élève a déjà lancé le
                montage, enchaîne le rendu.
  complet     : la même chose avec le réglage de son choisi, puis le rendu.
  rendu       : floutage et incrustation seulement, à partir de la préparation
                (les coupes sont refaites d'abord si l'élève les a changées).
"""
from __future__ import annotations

import base64
import concurrent.futures as cf
import dataclasses
import io
import json
import multiprocessing as mp
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import traceback
import urllib.request

# Hyperframes ne doit ni se mettre à jour en plein montage, ni envoyer de télémétrie
# (le 12/10, une mise à jour automatique a remplacé ses fichiers pendant un rendu).
for _var in ("HYPERFRAMES_NO_UPDATE_CHECK", "HYPERFRAMES_NO_AUTO_INSTALL", "HYPERFRAMES_NO_TELEMETRY", "DO_NOT_TRACK"):
    os.environ.setdefault(_var, "1")

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ICI, "moteur"))
sys.path.insert(0, os.path.join(ICI, "hf"))

import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
import pipeline as P  # noqa: E402

DUREE_MAX = 5 * 60 + 5            # 5 min (cahier des charges), petite marge
DUREE_MAX_VOIX_OFF = 3 * 60 + 5   # 3 min en voix off (Sidali, 13/10/2026)
STT = os.environ.get("STT_MODELE", "openai/whisper-large-v3-turbo")
LLM = os.environ.get("LLM_MODELE", "anthropic/claude-sonnet-5.5")
PRIVE = {"zdr": True, "data_collection": "deny"}
COUT = {"transcription": 0.0, "ia": 0.0}


# ---------------------------------------------------------------- échanges
def _http(url, corps=None, methode=None, entetes=None, delai=120):
    donnees = corps if isinstance(corps, (bytes, type(None))) else json.dumps(corps).encode()
    r = urllib.request.Request(url, data=donnees, method=methode, headers=entetes or {})
    with urllib.request.urlopen(r, timeout=delai) as rep:
        return rep.read()


def rpc(fonction, **params):
    cle = os.environ["SUPABASE_ANON"]
    brut = _http(f"{os.environ['SUPABASE_URL']}/rest/v1/rpc/{fonction}", {**params},
                 entetes={"apikey": cle, "Authorization": f"Bearer {cle}", "Content-Type": "application/json"})
    return json.loads(brut) if brut else None


MONTAGE, JETON = os.environ.get("MONTAGE_ID", ""), os.environ.get("JETON", "")

# Outil Voix off (cahier des charges, sections 3 et 8) : la source est un enregistrement
# de la voix, le script lu sert aux phrases ratées et à l'orthographe des sous-titres,
# l'image est faite de plans de la banque (voir voixoff.py).
VOIX_OFF = os.environ.get("OUTIL") == "voix_off"
SCRIPT = os.environ.get("SCRIPT") or ""
THEME, THEME_NOM = os.environ.get("THEME") or "", os.environ.get("THEME_NOM") or ""


def etape(nom, apercu=None):
    print(f"[{time.strftime('%H:%M:%S')}] {nom}", flush=True)
    rpc("studio_job_maj", p_id=MONTAGE, p_jeton=JETON, p_etape=nom, p_apercu=apercu)


def telecharger(url, chemin):
    with urllib.request.urlopen(url, timeout=600) as rep, open(chemin, "wb") as f:
        while bloc := rep.read(1 << 20):
            f.write(bloc)


def deposer(url, chemin, type_mime):
    with open(chemin, "rb") as f:
        _http(url, f.read(), methode="PUT", entetes={"Content-Type": type_mime, "x-upsert": "true"}, delai=600)


def openrouter(chemin, corps, essais=3):
    for k in range(essais):
        try:
            return json.loads(_http("https://openrouter.ai/api/v1" + chemin, {**corps, "provider": PRIVE},
                                    entetes={"Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}",
                                             "Content-Type": "application/json"}, delai=90))
        except Exception:
            if k == essais - 1:
                raise
            time.sleep(2 * (k + 1))


REPONSES_IA = []  # gardées dans travail.json pour comprendre un montage raté


def objets_json(texte):
    """Tous les objets JSON lisibles du texte (Claude ajoute parfois du texte autour)."""
    dec, out, i = json.JSONDecoder(), [], 0
    while (i := texte.find("{", i)) != -1:
        try:
            objet, fin = dec.raw_decode(texte, i)
            if isinstance(objet, dict):
                out.append(objet)
            i = fin
        except ValueError:
            i += 1
    return out


def reponse_valide(prompt, objet):
    """La réponse couvre-t-elle bien les mots du prompt ? (sous-titres : tous les mots,
    dans l'ordre, sans trou ; phrases ratées : des plages d'index existants)."""
    n = len(re.findall(r"^\d+: \S", prompt, re.M))  # lignes « index: mot »
    if '"requete"' in prompt:  # Voix off : ce qu'il faut montrer, un élément par moment
        import voixoff as V
        return V.requetes_valides(objet, len(re.findall(r"^M\d+ \[", prompt, re.M)))
    if '"appuis"' in prompt:  # plan Hyperframes : le détail est filtré par hf/catalogue.nettoyer
        return isinstance(objet.get("fort"), dict) and isinstance(objet.get("appuis", []), list)
    if '"zooms"' in prompt:  # plan d'animation : le détail est filtré par nettoyer_plan
        return isinstance(objet.get("zooms"), list) and isinstance(objet.get("icones", []), list)
    if '"captions"' in prompt:
        caps = objet.get("captions")
        if not isinstance(caps, list) or not caps:
            return False
        attendu = 0
        for c in caps:
            if not isinstance(c, dict) or int(c.get("first", -1)) != attendu or int(c.get("last", -1)) < attendu:
                return False
            attendu = int(c["last"]) + 1
        return attendu == n
    plages = objet.get("remove")
    return isinstance(plages, list) and all(
        isinstance(p, list) and len(p) == 2 and 0 <= int(p[0]) <= int(p[1]) < n for p in plages)


def llm(prompt, essais=3):
    """Appel à Claude ; la réponse n'est acceptée que si elle est complète (voir reponse_valide)."""
    for k in range(essais):
        d = openrouter("/chat/completions", {"model": LLM, "max_tokens": 8000,
                                             "messages": [{"role": "user", "content": prompt}]})
        COUT["ia"] += (d.get("usage") or {}).get("cost") or 0
        texte = d["choices"][0]["message"]["content"] or ""
        REPONSES_IA.append(texte[:6000])
        for objet in objets_json(texte):
            try:
                if reponse_valide(prompt, objet):
                    return json.dumps(objet, ensure_ascii=False)
            except (TypeError, ValueError):
                continue
        print(f"réponse IA incomplète (essai {k + 1}) : {texte[:300]!r}", flush=True)
    raise ValueError("L'IA n'a pas renvoyé de réponse complète. Relance le montage.")


# ---------------------------------------------------------------- corrections du moteur
def seuil_voix(db):
    """Correctif 2 : le seuil d'origine (voix - 14 dB) rognait les syllabes douces."""
    bruit, voix = np.percentile(db, 10), np.percentile(db, 90)
    return max(bruit + 0.4 * (voix - bruit), voix - 24)


P.speech_threshold = seuil_voix

# Correctif 4 : le mot clé s'affiche en italique et en minuscules (aperçu validé).
P.CAPTION_PROMPT = P.CAPTION_PROMPT.replace(
    "Réponds UNIQUEMENT en JSON",
    "Écris le mot clé avec sa casse naturelle (minuscules, sauf noms propres et « AL BARAKA »), "
    "jamais tout en majuscules.\n\nRéponds UNIQUEMENT en JSON")


# Correctif 8 : rythme des coupes (pause gardée entière / marge avant / marge après la voix).
# « dynamique » est le réglage d'origine du moteur ; « naturel » garde les respirations.
RYTHMES = {
    "dynamique": (0.12, 0.05, 0.08),
    "naturel": (0.35, 0.08, 0.15),
    "pose": (0.70, 0.12, 0.25),
}
RYTHME_DEFAUT = "naturel"

# Correctif 9 (vocal de Sidali, 16/10) : « l'IA coupe la fin de certaines prononciations ».
# Le moteur bornait chaque passage à 0,15 s autour des temps de Whisper, qui date souvent
# trop tôt la fin du dernier mot d'une phrase (« concrètement. », « différence. ») : la fin
# du mot tombait dans la coupe, même quand la voix continuait. Mesuré sur 22 montages réels :
# 24 fins rognées → 3, 23 débuts → 8, pour 3 % de durée en plus. Désormais, chaque passage
# peut aller jusqu'à MARGE_LIBRE du mot, sans jamais toucher le mot voisin, et c'est
# l'énergie du son (tighten) qui place la coupe là où la voix s'arrête vraiment.
MARGE_LIBRE = 0.6
# version du calcul des coupes automatiques, gardée dans travail.json (2 = correctif 9)
COUPES_VERSION = 2


def plages_des_mots(words, remove, duration):
    """Plages de temps source à garder (avant resserrage des blancs), bornées par les mots
    voisins et non plus par 0,15 s autour de chaque mot. Une phrase ratée retirée juste à
    côté garde la règle du milieu de l'intervalle, comme dans le moteur d'origine."""
    retires = {i for a, b in remove for i in range(a, b + 1)}
    plages = []
    for i, w in enumerate(words):
        if i in retires:
            continue
        s, e = w.start - MARGE_LIBRE, w.end + MARGE_LIBRE
        # bornés par les mots voisins : deux passages qui se touchent fusionnent, et le
        # resserrage décide ensuite, au son, s'il y a une pause à couper entre eux
        if i > 0:
            s = max(s, words[i - 1].end)
        if i + 1 < len(words):
            e = min(e, words[i + 1].start)
        s, e = max(0.0, min(s, w.start)), min(duration, max(e, w.end))
        if i > 0 and (i - 1) in retires:  # ne pas mordre sur la prise ratée juste avant
            s = max(s, (words[i - 1].end + w.start) / 2)
        if i + 1 < len(words) and (i + 1) in retires:
            e = min(e, (w.end + words[i + 1].start) / 2)
        if plages and s <= plages[-1][1] and (i - 1) not in retires:
            plages[-1][1] = max(plages[-1][1], e)
        else:
            plages.append([s, e])
    out = []
    for s, e in plages:  # jamais deux plages qui se chevauchent
        if out and s < out[-1][1]:
            s = out[-1][1]
        if e > s:
            out.append((s, e))
    return out


P.kept_ranges_from_words = plages_des_mots


def coupes_reglees(reglages, duree):
    """(rythme, plages gardées à la main ou None) d'après les réglages de l'élève."""
    c = (reglages or {}).get("coupes") or {}
    rythme = c.get("rythme") if c.get("rythme") in RYTHMES else RYTHME_DEFAUT
    plages = []
    for p in c.get("plages") or []:
        try:
            a, b = max(0.0, float(p[0])), min(float(duree), float(p[1]))
        except (TypeError, ValueError, IndexError):
            continue
        a, b = np.floor(a * P.OUT_FPS) / P.OUT_FPS, np.ceil(b * P.OUT_FPS) / P.OUT_FPS
        if b - a >= 0.1:
            plages.append([round(float(a), 3), round(float(min(b, duree)), 3)])
    plages.sort()
    fusion = []
    for a, b in plages[:2000]:
        if fusion and a <= fusion[-1][1]:
            fusion[-1][1] = max(fusion[-1][1], b)
        else:
            fusion.append([a, b])
    return rythme, (fusion or None)


def coupes_a_refaire(travail, reglages):
    """Les coupes de la préparation gardée diffèrent-elles de celles demandées ?
    Des coupes automatiques calculées par un moteur plus ancien sont refaites aussi :
    « Refaire la vidéo » applique alors le correctif 9 (fins de mots protégées)."""
    rythme, plages = coupes_reglees(reglages, travail["meta"]["duration"])
    if plages:
        return plages != travail.get("plages")
    return (travail.get("plages") is not None or travail.get("rythme", "dynamique") != rythme
            or travail.get("coupes_version", 1) < COUPES_VERSION)


def plages_d_index(indices):
    """{2, 3, 4, 9} → [(2, 4), (9, 9)] (format de kept_ranges_from_words)."""
    out = []
    for i in sorted(indices):
        if out and i == out[-1][1] + 1:
            out[-1][1] = i
        else:
            out.append([i, i])
    return [tuple(p) for p in out]


def grouper_sous_titres(kept):
    """Comme P.group_captions, mais garde les index de mots de chaque sous-titre : si seules
    les coupes changent, les sous-titres sont recalés sans redemander l'IA."""
    listing = "\n".join(f"{i}: {w.text}" for i, w in enumerate(kept))
    data = json.loads(llm(P.CAPTION_PROMPT.format(words=listing)))
    textes, groupes = [], []
    for c in data["captions"]:
        groupes.append([int(c["first"]), int(c["last"])])
        textes.append({"small": c.get("small", ""), "big": casse_mot_cle(c.get("big", ""))})
    return textes, groupes


def caler_sous_titres(textes, groupes, kept, total):
    caps = [P.Caption(t["small"], t["big"], kept[f].start, kept[l].end) for t, (f, l) in zip(textes, groupes)]
    return P.finalize_timing(P.finalize_timing(caps), total)  # comme le moteur (group_captions puis préparation)


def prompts_voix_off(script):
    """Voix off : le script lu aide à repérer les phrases ratées (on sait ce que l'élève voulait
    dire) et donne l'orthographe exacte des sous-titres (cahier, section 6). Chaque ligne est
    citée (« > ») pour ne jamais être prise pour un mot numéroté de la transcription."""
    cite = "\n".join("> " + l for l in script.strip().splitlines() if l.strip())
    cite = cite.replace("{", "{{").replace("}", "}}")
    P.RETAKE_PROMPT = P.RETAKE_PROMPT.replace(
        "Mots (index: texte [début-fin]) :",
        "Le texte vient d'une voix off : l'élève lisait ce script (le texte voulu, il a pu le reprendre "
        "ou s'en écarter un peu) :\n" + cite + "\n\nMots (index: texte [début-fin]) :")
    P.CAPTION_PROMPT = P.CAPTION_PROMPT.replace(
        "Mots (index: texte) :",
        "Le texte lu suit ce script : reprends son orthographe exacte (noms propres, accents, chiffres), "
        "sans changer le nombre de mots :\n" + cite + "\n\nMots (index: texte) :")


if VOIX_OFF and SCRIPT.strip():
    prompts_voix_off(SCRIPT)


def casse_mot_cle(texte):
    lettres = [c for c in texte if c.isalpha()]
    if len(lettres) > 1 and all(c.isupper() for c in lettres) and "AL BARAKA" not in texte:
        return texte.lower()
    return texte


def prises(wav, pause=0.45):
    """Plages de voix séparées par une pause de plus de 0,45 s."""
    db = P.energy_db(wav)
    voix = db > P.speech_threshold(db)
    out, i, n = [], 0, len(voix)
    while i < n:
        if voix[i]:
            j = i
            while j < n and voix[j]:
                j += 1
            if out and (i - out[-1][1]) / 100 < pause:
                out[-1][1] = j
            else:
                out.append([i, j])
            i = j
        else:
            i += 1
    return [(max(0, a / 100 - 0.2), min(n / 100, b / 100 + 0.2)) for a, b in out if b - a >= 8]


def transcrire_par_prises(wav):
    """Correctif 1 : transcrite d'un bloc, la voix perdait ses phrases recommencées
    (Whisper fondait 5 tentatives dans un seul mot étiré sur 10 s). Chaque prise est
    transcrite seule : Whisper ne voit jamais deux tentatives ensemble."""
    audio, sr = sf.read(wav, dtype="float32")

    def une(p):
        buf = io.BytesIO()
        sf.write(buf, audio[int(p[0] * sr):int(p[1] * sr)], sr, format="WAV", subtype="PCM_16")
        d = openrouter("/audio/transcriptions", {
            "model": STT, "language": "fr", "response_format": "verbose_json", "timestamp_granularities": ["word"],
            "input_audio": {"data": base64.b64encode(buf.getvalue()).decode(), "format": "wav"}})
        COUT["transcription"] += (d.get("usage") or {}).get("cost") or 0
        return [P.Word(w["word"].strip(), round(p[0] + w["start"], 3), round(p[0] + w["end"], 3))
                for w in d.get("words") or [] if w.get("word", "").strip()]

    with cf.ThreadPoolExecutor(8) as ex:
        return [w for ws in ex.map(une, prises(wav)) for w in ws]


# ---------------------------------------------------------------- floutage naturel
def flou_naturel(frame, box, intensite):
    """Correctif 5 (demande de Hassan, 09/10) : seul le visage est flouté, sans bulle.
    Pas de couleur, pas de contour, et un bord qui se fond dans l'image : le cœur du
    visage est entièrement flouté, puis le flou s'estompe progressivement autour.
    Les 6 styles de Sidali (face_effects.py) restent disponibles mais ne sont plus proposés."""
    import cv2
    import face_effects as fx
    H, W = frame.shape[:2]
    x, y, w, h = box
    cx, cy = x + w / 2, y + h / 2 + h * 0.03
    ax, ay = w * 0.62, h * 0.78          # le visage, cheveux et menton compris
    pad = int(max(ax, ay) * 0.5)
    x0, y0 = int(max(0, cx - ax - pad)), int(max(0, cy - ay - pad))
    x1, y1 = int(min(W, cx + ax + pad)), int(min(H, cy + ay + pad))
    if x1 <= x0 or y1 <= y0:
        return
    roi = frame[y0:y1, x0:x1]
    flou = fx._blur(roi, w, intensite)
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    d = np.sqrt(((xx - cx) / ax) ** 2 + ((yy - cy) / ay) ** 2)
    m = np.clip((1.25 - d) / 0.45, 0, 1)  # plein jusqu'à 0,8 du rayon, nul à 1,25
    m = (m * m * (3 - 2 * m))[..., None]  # transition douce, sans arête
    frame[y0:y1, x0:x1] = (flou.astype(np.float32) * m + roi.astype(np.float32) * (1 - m)).astype(np.uint8)


# ---------------------------------------------------------------- passe image : floutage + motion design
def analyser_visages(src):
    """Visages image par image, en une lecture rapide (image réduite au tiers, comme la
    détection du moteur), avec le lissage et le maintien de 0,5 s du moteur. Fait une
    seule fois avant la passe parallèle : chaque morceau utilise exactement les mêmes boîtes."""
    import cv2
    W, H, FPS, DS = P.OUT_W, P.OUT_H, P.OUT_FPS, 3
    w, h = W // DS, H // DS
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-vf", f"scale={w}:{h}:flags=area",
                            "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
    det = cv2.FaceDetectorYN.create(P.YUNET_MODEL, "", (w, h), 0.6, 0.3, 50)
    visages, last, miss, sans = [], None, 0, 0
    HOLD = int(FPS * 0.5)
    while len(brut := dec.stdout.read(w * h * 3)) == w * h * 3:
        _, faces = det.detect(np.frombuffer(brut, np.uint8).reshape(h, w, 3))
        boxes = [] if faces is None else [np.array(fc[:4], float) * DS for fc in faces]
        if boxes:
            if last is not None and len(last) == len(boxes):
                boxes = [0.6 * b + 0.4 * l for b, l in zip(boxes, last)]
            last, miss = boxes, 0
        else:
            miss += 1
            sans += 1
        visages.append([list(map(float, b)) for b in last] if last is not None and miss < HOLD else [])
    dec.wait()
    return visages, sans


def _images_morceau(args):
    import cv2
    import face_effects as fx
    import animations as A
    cv2.setNumThreads(1)
    src, dst, debut, fin, flou, scene_args, visages = args
    W, H, FPS = P.OUT_W, P.OUT_H, P.OUT_FPS
    scene = A.Scene(**scene_args) if scene_args else None
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{max(0, debut / FPS - 0.5 / FPS):.4f}", "-i", src,
                            "-frames:v", str(fin - debut), "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                           stdout=subprocess.PIPE)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}",
                            "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "17",
                            "-pix_fmt", "yuv420p", dst], stdin=subprocess.PIPE)
    n, taille = debut, W * H * 3
    while n < fin:
        brut = dec.stdout.read(taille)
        if len(brut) < taille:
            break
        frame = np.frombuffer(brut, np.uint8).reshape(H, W, 3).copy()
        boites = visages[n] if n < len(visages) else []
        if flou:
            for box in boites:
                if flou["style"] == "naturel":
                    flou_naturel(frame, box, flou["intensite"])
                else:
                    fx.apply(frame, box, flou["style"], flou["couleur"], flou["intensite"], flou["intensite_couleur"], n)
        if scene:
            t = n / FPS
            frame = scene.transformer(frame, t)
            scene.dessiner(frame, t)
        enc.stdin.write(frame.tobytes())
        n += 1
    dec.stdout.close()
    dec.wait()
    enc.stdin.close()
    enc.wait()
    return n - debut


def nombre_images(chemin):
    out = P.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets",
                 "-show_entries", "stream=nb_read_packets", "-of", "default=nw=1:nk=1", chemin])
    # Vidéo filmée en portrait sur iPhone (rotation enregistrée) : ffprobe ajoute
    # les données annexes à la ligne (« 404, » en CSV, 16/10/2026). On garde le
    # premier nombre.
    m = re.search(r"\d+", out)
    if not m:
        raise RuntimeError(f"nombre d'images illisible : {out.strip()[:80]!r}")
    return int(m.group())


def principal(boites):
    """Le visage principal (le plus grand) d'une image, ou None."""
    return max(boites, key=lambda b: b[2] * b[3]) if boites else None


def rendre_images(src, dst, flou, scene_args, dossier):
    """Correctif 3 : le floutage d'origine tournait sur un seul processeur (57 s pour 9 s
    de vidéo). Floutage, recadrage et animations se font en une passe, répartie en
    morceaux traités en même temps sur tous les processeurs."""
    total = nombre_images(src)
    visages, sans = analyser_visages(src)
    if scene_args is not None:
        scene_args = {**scene_args, "visages": [principal(v) for v in visages]}
    parts = max(1, min(os.cpu_count() or 1, total // 30))
    bornes = [round(total * k / parts) for k in range(parts + 1)]
    morceaux = [(src, os.path.join(dossier, f"m{k:02d}.mp4"), bornes[k], bornes[k + 1], flou, scene_args, visages)
                for k in range(parts)]
    with mp.get_context("spawn").Pool(parts) as pool:
        images = sum(pool.map(_images_morceau, morceaux))
    if images != total:
        raise RuntimeError(f"Passe image incomplète : {images} images sur {total}")
    liste = os.path.join(dossier, "morceaux.txt")
    with open(liste, "w") as f:
        f.writelines(f"file '{m[1]}'\n" for m in morceaux)
    if scene_args is not None:
        import animations as A
        sfx = os.path.join(dossier, "bruitages.wav")
        A.bruitages(scene_args["plan"], scene_args["duree"], sfx,
                    carte=bool((scene_args["design"].get("prenom") or "").strip()))
        P.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", liste, "-i", src, "-i", sfx,
               "-filter_complex", "[1:a][2:a]amix=inputs=2:duration=first:normalize=0[a]",
               "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", dst])
    else:
        P.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", liste, "-i", src,
               "-map", "0:v", "-map", "1:a", "-c", "copy", dst])
    return {"images": images, "images_sans_visage": sans, "morceaux": parts}


# ---------------------------------------------------------------- les deux temps du montage
def options_son(reglages):
    son = (reglages or {}).get("son") or {}
    ameliorer = son.get("ameliorer", True) is not False
    niveau = son.get("niveau", "normal") if son.get("niveau") in P.DENOISE_LEVELS else "normal"
    return P.AudioOptions(ameliorer, niveau), (niveau if ameliorer else "off")


def apercu(src, meta, dossier):
    """Image de la vidéo au cadre final (1080 x 1920) et position des visages,
    pour l'aperçu des réglages dans le navigateur."""
    import cv2
    t = round(min(meta["duration"] * 0.3, max(0.0, meta["duration"] - 0.5)), 2)
    vf = []
    if meta["hdr"]:
        vf.append("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv")
    vf.append(f"scale={P.OUT_W}:{P.OUT_H}:force_original_aspect_ratio=increase,crop={P.OUT_W}:{P.OUT_H},setsar=1")
    image = os.path.join(dossier, "apercu.jpg")
    P.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", src, "-frames:v", "1", "-vf", ",".join(vf),
           "-q:v", "3", image])
    frame = cv2.imread(image)
    DS = 3
    det = cv2.FaceDetectorYN.create(P.YUNET_MODEL, "", (P.OUT_W // DS, P.OUT_H // DS), 0.6, 0.3, 50)
    _, faces = det.detect(cv2.resize(frame, (P.OUT_W // DS, P.OUT_H // DS), interpolation=cv2.INTER_AREA))
    visages = [] if faces is None else [
        [round(float(v) * DS / d, 4) for v, d in zip(fc[:4], (P.OUT_W, P.OUT_H, P.OUT_W, P.OUT_H))] for fc in faces]
    return image, {"t": t, "visages": visages}


def recoller_mots(words):
    """Whisper coupe « C'est » en « C » + « 'est », « ta'ala » en « ta » + « 'ala », « Nourris-les »
    en « Nourris » + « -les » : on recolle avant que quoi que ce soit ne numérote les mots
    (sous-titres, coupes, moments), sinon un sous-titre ou un plan commencerait par « 'ala »."""
    out = []
    for w in words:
        t = w.text.strip()
        colle = t[:1] in ("'", "’") or (t[:1] == "-" and t[1:2].isalpha())
        if out and t and (colle or out[-1].text.strip()[-1:] in ("'", "’")):
            out[-1] = dataclasses.replace(out[-1], text=out[-1].text.strip() + t, end=w.end)
        else:
            out.append(w)
    return out


def preparer(src, dossier, liens, reglages, avec_apercu):
    chrono = {}

    def top(cle, t0):
        chrono[cle] = round(time.time() - t0, 1)
        return time.time()

    meta = __import__("voixoff").sonder_audio(src) if VOIX_OFF else P.probe(src)
    if VOIX_OFF and meta["duration"] > DUREE_MAX_VOIX_OFF:
        raise ValueError("La voix off dépasse 3 minutes. Raccourcis le script ou coupe-la en plusieurs parties.")
    if meta["duration"] > DUREE_MAX:
        raise ValueError("La vidéo dépasse 5 minutes. Coupe-la en plusieurs parties.")
    if not meta["has_audio"]:
        raise ValueError("La vidéo n'a pas de son.")
    t = time.time()
    if avec_apercu and not VOIX_OFF and "apercu.jpg" in liens["deposer"]:
        image, infos = apercu(src, meta, dossier)
        deposer(liens["deposer"]["apercu.jpg"], image, "image/jpeg")
        etape("son", {**infos, "fichier": "apercu.jpg"})
    else:
        etape("son")
    son, cle_son = options_son(reglages)
    clean, wav = os.path.join(dossier, "clean48k.wav"), os.path.join(dossier, "a.wav")
    P.enhance_audio(src, clean, wav, son)
    t = top("son", t)
    etape("transcription")
    words = recoller_mots(transcrire_par_prises(wav))
    if not words:
        raise ValueError("Aucune parole n'a été entendue dans la vidéo.")
    cales = None
    if VOIX_OFF and SCRIPT:  # l'orthographe du script (« T'as vu », pas « Taviyu »)
        try:
            cales = __import__("voixoff").caler_sur_script(words, SCRIPT)
        except Exception:
            traceback.print_exc()
    t = top("transcription", t)
    etape("phrases_ratees")
    remove = P.detect_retakes(words, llm)
    t = top("phrases_ratees", t)
    removed = {i for a, b in remove for i in range(a, b + 1)}
    travail = {"meta": meta, "audio": cle_son, "mots": [dataclasses.asdict(w) for w in words],
               "retires_ia": sorted(removed), "chrono": chrono, "mots_cales_script": cales}
    if "travail/apercu.mp4" in liens["deposer"]:
        try:  # vidéo légère pour « Vérifier les coupes » (la source peut faire 1 Go)
            fichier = (__import__("voixoff").apercu_audio(clean, os.path.join(dossier, "apercu.mp4")) if VOIX_OFF
                       else video_apercu(src, clean, meta, dossier))
            deposer(liens["deposer"]["travail/apercu.mp4"], fichier, "video/mp4")
            travail["apercu_video"] = True
        except Exception:
            traceback.print_exc()
    monter(src, dossier, liens, travail, reglages, chrono=chrono)
    return travail, cle_son


def video_apercu(src, clean, meta, dossier):
    """La vidéo entière au cadre final, en petit (360 x 640), avec le son nettoyé."""
    vf = []
    if meta["hdr"]:
        vf.append("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv")
    vf.append(f"scale={P.OUT_W}:{P.OUT_H}:force_original_aspect_ratio=increase,crop={P.OUT_W}:{P.OUT_H},"
              "scale=360:640,setsar=1,format=yuv420p")
    sortie = os.path.join(dossier, "apercu.mp4")
    P.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-i", clean, "-map", "0:v:0", "-map", "1:a:0",
           "-vf", ",".join(vf), "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "30", "-g", "30",
           "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "-shortest", sortie])
    return sortie


def monter(src, dossier, liens, travail, reglages, chrono=None, precedent=None):
    """Coupes → montage brut → sous-titres → plan d'animation, à partir des mots transcrits.
    `precedent` : la préparation d'avant, quand seules les coupes changent. Si les mots
    gardés sont les mêmes, sous-titres et plan sont recalés sans redemander l'IA."""
    chrono = chrono if chrono is not None else {}
    t = time.time()

    def top(cle):
        nonlocal t
        chrono[cle] = round(time.time() - t, 1)
        t = time.time()

    meta = travail["meta"]
    clean, wav = os.path.join(dossier, "clean48k.wav"), os.path.join(dossier, "a.wav")
    words = [P.Word(**w) for w in travail["mots"]]
    rythme, plages = coupes_reglees(reglages, meta["duration"])
    etape("coupes")
    retires = set(travail.get("retires_ia", travail.get("retires", [])))
    if plages:
        cuts = [tuple(p) for p in plages]
        # un mot est gardé si son milieu est dans une plage gardée (l'élève peut remettre
        # une phrase que l'IA avait jugée ratée, ou couper un mot)
        retires = {i for i, w in enumerate(words) if not any(a <= (w.start + w.end) / 2 <= b for a, b in cuts)}
    else:
        P.CUT_MIN_GAP, P.CUT_PRE_PAD, P.CUT_POST_PAD = RYTHMES[rythme]
        cuts = P.tighten(P.kept_ranges_from_words(words, plages_d_index(retires), meta["duration"]), P.energy_db(wav))
    kept = []
    for i, w in enumerate(words):
        if i in retires:
            continue
        s, e = P.map_time(w.start, cuts, "start"), P.map_time(w.end, cuts, "end")
        kept.append(P.Word(w.text, s, max(e, s + 0.05)))
    if not kept:
        raise ValueError("Avec ces coupes, plus aucune parole n'est gardée. Remets au moins un passage.")
    top("coupes")
    etape("montage")
    cut = os.path.join(dossier, "cut.mp4")
    voix = os.path.join(dossier, "voix.wav")
    if VOIX_OFF:  # la vidéo est faite plus bas, avec les plans de la banque
        __import__("voixoff").couper_audio(clean, cuts, voix)
    else:
        P.render_cut(src, clean, cuts, meta, cut)
    total = sum(b - a for a, b in cuts)
    top("montage")
    etape("sous_titres")
    memes_mots = bool(precedent and precedent.get("groupes") and sorted(retires) == precedent.get("retires"))
    if memes_mots:
        textes = [{"small": c["small"], "big": c["big"]} for c in precedent["sous_titres"]]
        groupes = precedent["groupes"]
    else:
        textes, groupes = grouper_sous_titres(kept)
    caps = caler_sous_titres(textes, groupes, kept, total)
    top("sous_titres")
    gardes = [dataclasses.asdict(w) for w in kept]
    sous_titres = [dataclasses.asdict(c) for c in caps]
    if VOIX_OFF:
        etape("plans")
        travail["moments"] = choisir_plans(gardes, sous_titres, total)
        travail["remplacements"] = {}
        monter_plans_banque(travail["moments"], voix, dossier, cut)
        top("plans")
    etape("animations")
    brut = precedent.get("plan_hf_brut") if memes_mots else None
    try:
        brut, plan = plan_hf(gardes, sous_titres, total, brut)
    except Exception:  # le plan sera redemandé au rendu (ou le motion design classique prendra le relais)
        traceback.print_exc()
        brut = plan = None
    top("animations")
    travail.update({
        "rythme": rythme, "plages": plages, "duree_sortie": round(total, 2), "coupes": cuts,
        "coupes_version": COUPES_VERSION,
        "retires": sorted(retires), "sous_titres": sous_titres, "groupes": groupes, "chrono": chrono,
        "mots_gardes": gardes, "plan_hf": plan, "plan_hf_brut": brut, "plan": None,
        "cout_usd": dict(COUT), "reponses_ia": REPONSES_IA[-4:],
    })
    chemin = os.path.join(dossier, "travail.json")
    with open(chemin, "w", encoding="utf-8") as f:
        json.dump(travail, f, ensure_ascii=False)
    deposer(liens["deposer"]["travail/cut.mp4"], cut, "video/mp4")
    deposer(liens["deposer"]["travail/travail.json"], chemin, "application/json")
    return travail


def liens_banque(chemins):
    """Liens signés des plans de la banque (edge function studio-banque, jeton du montage)."""
    rep = json.loads(_http(os.environ["FONCTION_BANQUE"],
                           {"action": "montage", "montage_id": MONTAGE, "jeton": JETON, "chemins": sorted(set(chemins))},
                           entetes={"Content-Type": "application/json"}))
    return rep["liens"]


FONDS = ("humming", "nasheed", "maher_zain")


def mixer_fond(video, fond, dst):
    """Fond sonore sous la voix : niveau ramené à -24 LUFS, fondu d'entrée et de sortie, et
    baissé automatiquement quand la voix parle (compression par la voix, « ducking »)."""
    d = float(P.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", video]))
    filtre = (
        "[0:a]aresample=48000,aformat=channel_layouts=stereo,asplit=2[voix][cle];"
        "[1:a]loudnorm=I=-24:TP=-3:LRA=11,aresample=48000,aformat=channel_layouts=stereo,"
        f"afade=t=in:d=1.5,afade=t=out:st={max(0.0, d - 2):.2f}:d=2[fond];"
        "[fond][cle]sidechaincompress=threshold=0.1:ratio=3:attack=20:release=500[baisse];"
        "[voix][baisse]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95:level=0[a]")
    P.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-stream_loop", "-1", "-i", fond,
           "-filter_complex", filtre, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
           "-movflags", "+faststart", "-t", f"{d:.3f}", dst])


def ajouter_fond(sortie, reglages, dossier):
    """« Fond sonore » choisi par l'élève (un son au hasard dans la catégorie). Ne fait jamais
    échouer le montage : en cas de souci, la vidéo part avec la voix seule."""
    fond = ((reglages or {}).get("son") or {}).get("fond")
    if fond not in FONDS:
        return None
    try:
        son = (rpc("studio_job_fond_sonore", p_id=MONTAGE, p_jeton=JETON, p_categorie=fond) or [None])[0]
        if not son:
            return None
        local = os.path.join(dossier, "fond" + os.path.splitext(son["chemin"])[1])
        telecharger(liens_banque([son["chemin"]])[son["chemin"]], local)
        mixe = os.path.join(dossier, "sortie_fond.mp4")
        mixer_fond(sortie, local, mixe)
        os.replace(mixe, sortie)
        return son["nom"]
    except Exception:
        traceback.print_exc()
        return None


def choisir_plans(gardes, sous_titres, total):
    """Voix off : moments → ce qu'il faut montrer (Claude) → recherche par le sens → choix."""
    import voixoff as V
    from banque import THEMES
    liste = V.moments(gardes, sous_titres, total)
    categories = rpc("studio_job_categories", p_id=MONTAGE, p_jeton=JETON) or []
    noms = {c["dossier"] for c in categories}
    demandes = json.loads(llm(V.prompt_plans(SCRIPT, THEME_NOM or THEMES.get(THEME, ""), liste, THEMES,
                                             categories)))["moments"]
    for d in demandes:
        d["categories"] = [c for c in d.get("categories") or [] if c in noms][:2]
        d["themes"] = [t for t in d.get("themes") or [] if t in THEMES][:2] or ([THEME] if THEME in THEMES else [])
        d["mots_cles"] = [str(m).lower()[:40] for m in d.get("mots_cles") or []][:5]
    vecs = V.vecteurs([f"{d['requete']}. Mots-clés : {', '.join(d['mots_cles'])}." for d in demandes], openrouter, COUT)

    def chercher(i):
        return rpc("studio_job_chercher_plans", p_id=MONTAGE, p_jeton=JETON, p_embedding=json.dumps(vecs[i]),
                   p_mots=demandes[i]["mots_cles"], p_themes=demandes[i]["themes"],
                   p_duree=round(liste[i]["fin"] - liste[i]["debut"], 3), p_exclure=[], p_limite=20,
                   p_dossiers=demandes[i]["categories"]) or []

    with cf.ThreadPoolExecutor(6) as ex:
        candidats = list(ex.map(chercher, range(len(liste))))

    def secours(i, exclus):
        return [c for c in rpc("studio_job_plans_secours", p_id=MONTAGE, p_jeton=JETON,
                                p_duree=round(liste[i]["fin"] - liste[i]["debut"], 3), p_exclure=exclus) or []]

    return V.choisir(liste, demandes, lambda i: [dict(c) for c in candidats[i]], secours)


def monter_plans_banque(liste, voix, dossier, dst):
    import voixoff as V
    chemins = [m["plan"]["chemin_travail"] for m in liste]
    return V.monter_plans(liste, liens_banque(chemins), voix, dossier, dst)


def plans_a_refaire(travail, reglages):
    """Voix off : l'élève a-t-il changé un plan (« Changer ce plan ») depuis la préparation ?"""
    voulus = ((reglages or {}).get("voix_off") or {}).get("remplacements") or {}
    return VOIX_OFF and bool(travail.get("moments")) and voulus != (travail.get("remplacements") or {})


def refaire_plans(src, dossier, liens, travail, reglages):
    """« Changer ce plan » : seul le montage des plans est refait (pas de transcription ni d'IA)."""
    import voixoff as V
    etape("plans")
    clean = os.path.join(dossier, "clean48k.wav")
    if not os.path.exists(clean):
        if not os.path.exists(src):
            telecharger(liens["source"], src)
        P.enhance_audio(src, clean, os.path.join(dossier, "a.wav"), options_son(reglages)[0])
    voix = os.path.join(dossier, "voix.wav")
    V.couper_audio(clean, [tuple(c) for c in travail["coupes"]], voix)
    voulus = ((reglages or {}).get("voix_off") or {}).get("remplacements") or {}
    # on repart des plans choisis par la préparation, puis on applique les choix de l'élève
    moments = json.loads(json.dumps(travail.get("moments_ia") or travail["moments"]))
    travail["moments_ia"] = travail.get("moments_ia") or json.loads(json.dumps(travail["moments"]))
    travail["moments"] = V.appliquer_remplacements(moments, voulus)
    travail["remplacements"] = voulus
    cut = os.path.join(dossier, "cut.mp4")
    monter_plans_banque(travail["moments"], voix, dossier, cut)
    chemin = os.path.join(dossier, "travail.json")
    with open(chemin, "w", encoding="utf-8") as f:
        json.dump(travail, f, ensure_ascii=False)
    deposer(liens["deposer"]["travail/cut.mp4"], cut, "video/mp4")
    deposer(liens["deposer"]["travail/travail.json"], chemin, "application/json")


def plan_hf(gardes, sous_titres, duree, brut=None):
    """Plan du motion design Hyperframes : l'IA choisit dans la bibliothèque (hf/catalogue.py).
    Renvoie (plan brut de l'IA, plan nettoyé) ; un plan brut déjà connu est seulement recalé."""
    import catalogue as HC
    if brut is None:
        brut = json.loads(llm(HC.prompt(gardes, sous_titres, duree)))
    return brut, HC.nettoyer(brut, gardes, sous_titres, duree)


def hyperframes_present():
    return shutil.which("hyperframes") is not None or bool(os.environ.get("HYPERFRAMES"))


def rendre_hf(dossier, liens, reglages, travail, flou):
    """Motion design Hyperframes : composition, vérification, rendu (sous-titres compris)."""
    import assembler as HA
    t0 = time.time()
    etape("motion_design")
    cut = video = os.path.join(dossier, "cut.mp4")
    stats = None
    if flou:  # le visage est flouté d'abord ; visages et détourage se calculent sur l'original
        floute = os.path.join(dossier, "floute.mp4")
        stats = rendre_images(cut, floute, flou, None, dossier)
        video = floute
    visages, _ = analyser_visages(cut)
    mots = mots_gardes(travail)
    plan = travail.get("plan_hf")
    if plan is None:
        travail["plan_hf_brut"], plan = plan_hf(mots, travail["sous_titres"], travail["duree_sortie"])
        travail["plan_hf"] = plan
    compo = os.path.join(dossier, "hf")
    donnees = HA.construire(compo, video, travail, plan, reglages, visages, mots, original=cut if flou else None)
    etape("verification")
    problemes = HA.verifier(compo)
    bloquants = [p for p in problemes if p.get("partie") in ("lint", "runtime")]
    if bloquants:
        raise RuntimeError(f"composition invalide : {json.dumps(bloquants, ensure_ascii=False)[:400]}")
    etape("incrustation")
    sortie = os.path.join(dossier, "sortie.mp4")
    HA.rendre(compo, sortie)
    fond = ajouter_fond(sortie, reglages, dossier)
    etape("envoi")
    deposer(liens["deposer"]["sortie.mp4"], sortie, "video/mp4")
    return {"moteur": "hyperframes", "fond_sonore": fond, "passe_image": stats, "style": donnees["style"],
            "motion_design": donnees["elements"], "cta": donnees["cta"], "verification": problemes,
            "rendu_s": round(time.time() - t0, 1)}


def plan_animation(gardes, duree):
    """Plan du motion design (zooms, icônes, listes…) demandé à Claude, puis filtré."""
    import animations as A
    brut = json.loads(llm(A.prompt_plan(gardes, duree)))
    return A.nettoyer_plan(brut, gardes, duree)


def mots_gardes(travail):
    """Mots de la vidéo montée (temps de sortie) ; recalculés pour les montages d'avant la phase 2."""
    if travail.get("mots_gardes"):
        return travail["mots_gardes"]
    retires, coupes = set(travail["retires"]), [tuple(c) for c in travail["coupes"]]
    out = []
    for i, w in enumerate(travail["mots"]):
        if i in retires:
            continue
        s, e = P.map_time(w["start"], coupes, "start"), P.map_time(w["end"], coupes, "end")
        out.append({"text": w["text"], "start": s, "end": max(e, s + 0.05)})
    return out


def couleur(v, defaut):
    v = str(v or "")
    return v if len(v) == 7 and v.startswith("#") and all(c in "0123456789abcdefABCDEF" for c in v[1:]) else defaut


def rendre(dossier, liens, reglages, travail):
    t0 = time.time()
    st = (reglages or {}).get("sous_titres") or {}
    # sous-titres corrigés par l'élève (corrections.py) : appliqués au rendu seulement,
    # travail.json garde ceux de l'IA (les corrections la visent par leur texte)
    import corrections as C
    if st.get("corrections"):
        travail = {**travail, "sous_titres": C.appliquer(travail["sous_titres"], st["corrections"]),
                   "plan_hf": C.corriger_plan(travail.get("plan_hf"), st["corrections"]),
                   "plan": C.corriger_plan(travail.get("plan"), st["corrections"])}
    style = P.StyleOptions(couleur(st.get("texte"), "#FFFFFF"), couleur(st.get("contour"), "#000000"),
                           couleur(st.get("ombre"), "#000000"))
    caps = [P.Caption(**c) for c in travail["sous_titres"]]
    ass = os.path.join(dossier, "subs.ass")
    with open(ass, "w", encoding="utf-8") as f:
        f.write(P.build_ass(caps, style))
    cut = os.path.join(dossier, "cut.mp4")
    v = (reglages or {}).get("visage") or {}
    flou = None
    if v.get("flouter"):
        styles = ("naturel", "flou", "mosaique", "verre", "marqueur", "sticker", "neon")
        flou = {"style": v.get("style") if v.get("style") in styles else "naturel",
                "couleur": couleur(v.get("couleur"), "#C9A45C"),
                "intensite": int(min(5, max(1, int(v.get("intensite") or 3)))),
                "intensite_couleur": int(min(5, max(1, int(v.get("intensite_couleur") or 3))))}
    # motion design : activé par défaut (cahier des charges, section 4). Hyperframes d'abord ;
    # en cas d'échec, le motion design classique (animations.py) : l'élève a toujours sa vidéo.
    d = (reglages or {}).get("design") or {}
    secours = None
    if d.get("actif", True) is not False and hyperframes_present():
        try:
            return rendre_hf(dossier, liens, reglages, travail, flou)
        except Exception as e:
            traceback.print_exc()
            secours = f"{type(e).__name__}: {e}"[:400]
    scene = None
    if d.get("actif", True) is not False:
        design = {"palette": d.get("palette") or "or_noir", "principale": couleur(d.get("principale"), ""),
                  "fond": couleur(d.get("fond"), ""), "texte": couleur(d.get("texte"), ""),
                  "prenom": str(d.get("prenom") or "")[:24], "titre": str(d.get("titre") or "")[:40]}
        plan = travail.get("plan")
        if plan is None:  # montage préparé avant la phase 2
            plan = travail["plan"] = plan_animation(mots_gardes(travail), travail["duree_sortie"])
        scene = {"plan": plan, "design": design, "coupes": travail["coupes"], "duree": travail["duree_sortie"]}
    stats = None
    etape_video = cut
    if flou or scene:
        etape("motion_design" if scene else "floutage")
        etape_video = os.path.join(dossier, "images.mp4")
        stats = rendre_images(cut, etape_video, flou, scene, dossier)
    etape("incrustation")
    sortie = os.path.join(dossier, "sortie.mp4")
    P.burn(etape_video, ass, sortie)
    fond = ajouter_fond(sortie, reglages, dossier)
    etape("envoi")
    deposer(liens["deposer"]["sortie.mp4"], sortie, "video/mp4")
    return {"moteur": "classique", "fond_sonore": fond, "passe_image": stats, "motion_design": scene["plan"] if scene else None,
            "secours_hyperframes": secours, "rendu_s": round(time.time() - t0, 1)}


# ---------------------------------------------------------------- orchestration
def eteindre():
    if os.environ.get("STOP_URL"):
        try:
            _http(os.environ["STOP_URL"], b"{}", methode="POST",
                  entetes={"Authorization": f"Bearer {os.environ['STOP_TOKEN']}", "Content-Type": "application/json"})
        except Exception as e:  # la machine s'arrêtera de toute façon à son délai
            print("arrêt impossible :", e, flush=True)


def main():
    debut = time.time()
    mode = os.environ["MODE"]
    reglages = json.loads(os.environ.get("REGLAGES") or "{}")
    liens = json.loads(os.environ["LIENS"])
    with tempfile.TemporaryDirectory() as dossier:
        src = os.path.join(dossier, "source")
        travail = None
        if mode in ("preparation", "complet"):
            etape("reception")
            telecharger(liens["source"], src)
            travail, cle_son = preparer(src, dossier, liens, reglages, avec_apercu=(mode == "preparation"))
            if mode == "preparation":
                suite = rpc("studio_job_fin_preparation", p_id=MONTAGE, p_jeton=JETON, p_audio=cle_son)
                if not suite.get("continuer"):
                    print("préparation terminée, en attente des réglages", flush=True)
                    return
                reglages = suite["reglages"]
                if suite["mode"] == "complet":
                    travail, _ = preparer(src, dossier, liens, reglages, avec_apercu=False)
        else:
            etape("reception")
            telecharger(liens["lire"]["travail/cut.mp4"], os.path.join(dossier, "cut.mp4"))
            telecharger(liens["lire"]["travail/travail.json"], os.path.join(dossier, "travail.json"))
            with open(os.path.join(dossier, "travail.json"), encoding="utf-8") as f:
                travail = json.load(f)
            # la préparation gardée a-t-elle le réglage du son demandé ? Sinon, tout est refait.
            if travail.get("audio") != options_son(reglages)[1] and liens.get("source"):
                telecharger(liens["source"], src)
                travail, _ = preparer(src, dossier, liens, reglages, avec_apercu=False)
        # coupes changées (rythme ou ajustées à la main) : seules les coupes et la suite sont refaites
        if coupes_a_refaire(travail, reglages):
            if not os.path.exists(src):
                telecharger(liens["source"], src)
            if not os.path.exists(os.path.join(dossier, "clean48k.wav")):
                etape("son")
                P.enhance_audio(src, os.path.join(dossier, "clean48k.wav"), os.path.join(dossier, "a.wav"),
                                options_son(reglages)[0])
            precedent = json.loads(json.dumps(travail))
            monter(src, dossier, liens, travail, reglages, precedent=precedent)
        if plans_a_refaire(travail, reglages):
            refaire_plans(src, dossier, liens, travail, reglages)
        rendu = rendre(dossier, liens, reglages, travail)
        rapport = {
            "entree_s": round(travail["meta"]["duration"], 2), "sortie_s": travail["duree_sortie"],
            "morceaux": len(travail["coupes"]), "sous_titres": len(travail["sous_titres"]),
            "sous_titres_corriges": len(((reglages or {}).get("sous_titres") or {}).get("corrections") or []),
            "mots_retires": len(travail["retires"]), "chrono_preparation": travail.get("chrono"),
            **rendu, "total_s": round(time.time() - debut, 1),
            # en « rendu », la préparation a été payée par une autre machine
            "cout_usd": {k: round(v + (travail.get("cout_usd") or {}).get(k, 0) * (mode == "rendu"), 5)
                         for k, v in COUT.items()},
        }
        rpc("studio_job_terminer", p_id=MONTAGE, p_jeton=JETON, p_sortie_path=liens["sortie_path"], p_rapport=rapport)
        print(json.dumps(rapport, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        traceback.print_exc()
        message = str(e) if isinstance(e, ValueError) else f"Erreur pendant le montage ({type(e).__name__}: {str(e)[:300]})"
        try:
            rpc("studio_job_erreur", p_id=MONTAGE, p_jeton=JETON, p_message=message)
        except Exception:
            traceback.print_exc()
    finally:
        eteindre()
