"""Studio vidéo AL BARAKA, outil Voix off : choix des plans et montage
(cahier des charges de Sidali, section 8).

La voix (déjà nettoyée, coupée et sous-titrée par le moteur commun, voir travail.py)
est découpée en moments de 1,2 à 4 s. Un seul appel à Claude reçoit le script, le thème
et les moments, et décrit pour chacun le plan à montrer. Chaque description est
transformée en vecteur et cherchée dans la banque (studio_job_chercher_plans) ; on
garde le meilleur plan restant, sans doublon ni deux plans d'affilée tirés de la même
vidéo, et les 3 suivants comme propositions pour « Changer ce plan ». Si rien n'atteint
le score minimum : un plan de secours « ambiance AL BARAKA ».

Chaque plan est coupé à la durée exacte de son moment (0,2 s après son début), avec
un léger zoom avant de 3 %, mis bout à bout en coupe franche sur la voix nettoyée.
Le reste (sous-titres, motion design) est fait par le moteur commun sur cette vidéo.
"""
from __future__ import annotations

import concurrent.futures as cf
import json
import math
import os
import re
import subprocess

FPS = 30
W, H = 1080, 1920
MOMENT_MIN, MOMENT_MAX = 1.2, 4.0
SCORE_MIN = 0.33          # sous ce score, un plan de secours plutôt qu'un plan hors sujet
EMBEDDING = "qwen/qwen3-embedding-8b"
DIMENSIONS = 1024
ZOOM = 0.03               # léger zoom avant sur chaque plan

PROMPT_PLANS = """Tu choisis les images d'une vidéo « voix off » AL BARAKA (format vertical 9:16).
L'élève lit son script ; on illustre chaque moment de sa voix par un plan d'une banque de vidéos
de stock (argent, entrepreneuriat, travail sur ordinateur, famille, foi, ville, nature, Dubaï…).

Thème principal du script : {theme}

Script complet :
{script}

Moments de la voix (index, début-fin en secondes, mots prononcés) :
{moments}

Thèmes possibles (identifiants) :
{themes}
{categories}
Pour CHAQUE moment, décris le plan à montrer :
- "requete" : ce qu'on voit, concret et filmable, en français (« homme fatigué dans les transports le matin »),
  pas d'idée abstraite ni de texte à l'écran ;
- "mots_cles" : 3 à 5 mots-clés concrets ;
- "themes" : 1 ou 2 identifiants de la liste ;
- "categories" : 0 à 2 dossiers de la banque où ce plan a le plus de chances de se trouver (noms exacts), ou [].
Tiens compte du contexte : « et là, tout a changé » doit montrer le changement dont parle le script.
Varie les images d'un moment à l'autre ; garde une ambiance cohérente.
{reglage_religieux}
Réponds UNIQUEMENT en JSON, exactement {n} éléments dans l'ordre des moments :
{{"moments": [{{"requete": "...", "mots_cles": ["...", "..."], "themes": ["..."], "categories": ["..."]}}, ...]}}"""

RELIGIEUX = ("Sujet religieux : images sobres et respectueuses (nature, lumière, lieux de prière), "
             "jamais de représentation de Dieu ni d'image décorative sur Son nom.")


# ---------------------------------------------------------------- audio seul
def sonder_audio(chemin):
    """Les informations du moteur pour un enregistrement sans image."""
    out = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", chemin],
                         check=True, capture_output=True, text=True).stdout
    info = json.loads(out)
    return {"width": W, "height": H, "duration": float(info["format"]["duration"]), "hdr": False,
            "has_audio": any(s["codec_type"] == "audio" for s in info["streams"]), "audio_seul": True}


def couper_audio(clean, coupes, dst, lufs=-14):
    """La voix nettoyée, coupée comme le montage, au volume des réseaux (-14 LUFS)."""
    f, cat = [], ""
    for i, (a, b) in enumerate(coupes):
        d = b - a
        f.append(f"[0:a]atrim={a:.4f}:{b:.4f},asetpts=PTS-STARTPTS,"
                 f"afade=t=in:d=0.012,afade=t=out:st={max(0, d - 0.02):.4f}:d=0.02[a{i}]")
        cat += f"[a{i}]"
    f.append(f"{cat}concat=n={len(coupes)}:v=0:a=1[ac]")
    f.append(f"[ac]loudnorm=I={lufs}:TP=-1.5:LRA=11,aresample=48000[ao]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", clean, "-filter_complex", ";".join(f),
                    "-map", "[ao]", "-c:a", "pcm_s16le", dst], check=True)


def apercu_audio(clean, dst):
    """Vidéo légère pour « Vérifier les coupes » : écran noir et la voix nettoyée."""
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=360x640:r=30",
                    "-i", clean, "-map", "0:v", "-map", "1:a", "-shortest", "-c:v", "libx264", "-preset", "veryfast",
                    "-crf", "35", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", dst], check=True)
    return dst


# ---------------------------------------------------------------- moments
def _decouper(a, b, debuts):
    if b - a <= MOMENT_MAX:
        return [(a, b)]
    n = math.ceil((b - a) / MOMENT_MAX)
    cible = a + (b - a) / n
    possibles = [t for t in debuts if a + MOMENT_MIN <= t <= b - MOMENT_MIN]
    t = min(possibles, key=lambda x: abs(x - cible)) if possibles else cible
    return [(a, t)] + _decouper(t, b, debuts)


def recoller(texte):
    """Whisper coupe « C'est » en « C » + « 'est » et « est-à-dire » en « est -à -dire » :
    on recolle apostrophes et traits d'union."""
    texte = re.sub(r"\s+(?=['’-])", "", texte)
    return re.sub(r"(['’])\s+", r"\1", texte).strip()


def moments(gardes, sous_titres, total):
    """Moments de 1,2 à 4 s qui couvrent toute la voix, calés sur les sous-titres
    (un changement de plan tombe sur une pause ou un début de phrase), puis sur les mots."""
    if total <= 0:
        return []
    bornes = sorted({0.0, round(total, 3)} | {round(c["start"], 3) for c in sous_titres if 0.05 < c["start"] < total - 0.05})
    morceaux = []
    for a, b in zip(bornes, bornes[1:]):
        if morceaux and (morceaux[-1][1] - morceaux[-1][0] < MOMENT_MIN):
            morceaux[-1][1] = b
        else:
            morceaux.append([a, b])
    if len(morceaux) > 1 and morceaux[-1][1] - morceaux[-1][0] < MOMENT_MIN:
        morceaux[-2][1] = morceaux[-1][1]
        morceaux.pop()
    debuts = [w["start"] for w in gardes]
    out = []
    for a, b in morceaux:
        for x, y in _decouper(a, b, debuts):
            texte = recoller(" ".join(w["text"] for w in gardes if x - 0.05 <= w["start"] < y - 0.05))
            out.append({"debut": round(x, 3), "fin": round(y, 3), "texte": texte})
    return out


# ---------------------------------------------------------------- ce qu'il faut montrer
def texte_categories(categories):
    """Les dossiers de la banque (classement de Sidali) et leur nombre de plans."""
    if not categories:
        return ""
    return ("\nDossiers de la banque (classement de l'équipe, nombre de plans) :\n"
            + "\n".join(f"- {c['dossier']} ({c['plans']})" for c in categories) + "\n")


def prompt_plans(script, theme_nom, liste, themes, categories=None):
    echapper = lambda s: s.replace("{", "{{").replace("}", "}}")
    lignes = "\n".join(f"M{i} [{m['debut']:.1f}-{m['fin']:.1f}] : {m['texte'] or '(silence)'}" for i, m in enumerate(liste))
    religieux = RELIGIEUX if any(k in (script or "").lower() for k in ("allah", "dieu", "invocation", "prière", "coran")) else ""
    return PROMPT_PLANS.format(theme=echapper(theme_nom or "non précisé"), script=echapper((script or "")[:5000]),
                               moments=echapper(lignes), themes="\n".join(f"- {k} : {v}" for k, v in themes.items()),
                               categories=echapper(texte_categories(categories)),
                               reglage_religieux=religieux, n=len(liste))


def requetes_valides(objet, n):
    ms = objet.get("moments")
    return isinstance(ms, list) and len(ms) == n and all(isinstance(m, dict) and str(m.get("requete") or "").strip() for m in ms)


def vecteurs(textes, openrouter, cout):
    out = []
    for k in range(0, len(textes), 64):
        d = openrouter("/embeddings", {"model": EMBEDDING, "input": textes[k:k + 64], "dimensions": DIMENSIONS})
        cout["ia"] += (d.get("usage") or {}).get("cost") or 0
        out += [x["embedding"] for x in sorted(d["data"], key=lambda x: x["index"])]
    return out


# ---------------------------------------------------------------- choix des plans
def choisir(liste, demandes, chercher, secours):
    """Pour chaque moment : le meilleur plan restant, ni déjà utilisé, ni de la même vidéo
    que le plan d'avant ; les 3 suivants en propositions. `chercher(i)` et `secours(i, exclus)`
    interrogent la banque (fonctions SQL, jeton du montage). Si la banque est encore petite,
    on assouplit dans l'ordre : même vidéo source permise, puis plan déjà utilisé."""
    utilises, precedent = set(), None
    for i, m in enumerate(liste):
        tous = chercher(i)
        autre = (precedent or {}).get("video_id")

        def garde(c, unique=True, autre_video=True):
            return (not unique or c["id"] not in utilises) and (not autre_video or c["video_id"] != autre)

        candidats = [c for c in tous if garde(c)]
        for c in candidats:  # ambiance cohérente : petit avantage à l'ambiance du plan d'avant
            bonus = 0.02 if precedent and c.get("ambiance") and c["ambiance"] == precedent.get("ambiance") else 0
            c["score_final"] = float(c["score"]) + bonus
        candidats.sort(key=lambda c: -c["score_final"])
        meilleur = candidats[0] if candidats else None
        source = "banque"
        if meilleur is None or float(meilleur["score"]) < SCORE_MIN:
            de_secours = [c for c in secours(i, list(utilises)) if garde(c)]
            if de_secours:
                meilleur, source = de_secours[0], "secours"
        if meilleur is None:
            for unique, autre_video in ((True, False), (False, True), (False, False)):
                assouplis = [c for c in tous if garde(c, unique, autre_video)]
                if assouplis:
                    meilleur = max(assouplis, key=lambda c: float(c["score"]))
                    break
        if meilleur is None:
            raise ValueError("La banque de vidéos n'a pas encore assez de plans pour monter cette vidéo.")
        utilises.add(meilleur["id"])
        m["requete"] = demandes[i]
        m["plan"] = {**_plan(meilleur), "source": source}
        m["propositions"] = [_plan(c) for c in (candidats or tous) if c["id"] != meilleur["id"]][:3]
        precedent = meilleur
    return liste


def _plan(c):
    return {k: c.get(k) for k in ("id", "video_id", "chemin_travail", "debut", "fin", "description", "ambiance", "score")}


def appliquer_remplacements(liste, remplacements):
    """« Changer ce plan » : le plan choisi par l'élève parmi les propositions du moment."""
    for cle, plan_id in (remplacements or {}).items():
        try:
            m = liste[int(cle)]
        except (ValueError, IndexError):
            continue
        choix = next((p for p in m.get("propositions") or [] if p["id"] == plan_id), None)
        if choix and choix["id"] != m["plan"]["id"]:
            ancien = m["plan"]
            m["plan"] = {**choix, "source": "eleve"}
            m["propositions"] = [p for p in m["propositions"] if p["id"] != plan_id] + [
                {k: v for k, v in ancien.items() if k != "source"}]
    return liste


# ---------------------------------------------------------------- montage des plans
def monter_plans(liste, liens, voix_wav, dossier, dst):
    """Les plans bout à bout (durée exacte de chaque moment, 0,2 s après leur début, zoom de
    3 %), en coupe franche, sur la voix. Les images sont comptées à partir des temps cumulés :
    la vidéo a exactement la durée de la voix."""
    def un(i):
        m = liste[i]
        p = m["plan"]
        images = round(m["fin"] * FPS) - round(m["debut"] * FPS)
        if images <= 0:
            return None
        out = os.path.join(dossier, f"plan{i:03d}.mp4")
        zoom = f"zoompan=z='1+{ZOOM}*on/{max(1, images - 1)}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS}"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{float(p['debut']) + 0.2:.3f}", "-i", liens[p["chemin_travail"]],
                        "-an", "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},{zoom},setsar=1,format=yuv420p",
                        "-frames:v", str(images), "-r", str(FPS), "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                        "-g", "30", out], check=True)
        return out

    with cf.ThreadPoolExecutor(min(8, os.cpu_count() or 4)) as ex:
        morceaux = [m for m in ex.map(un, range(len(liste))) if m]
    liste_concat = os.path.join(dossier, "plans.txt")
    with open(liste_concat, "w") as f:
        f.writelines(f"file '{m}'\n" for m in morceaux)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", liste_concat, "-i", voix_wav,
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", dst], check=True)
    return dst
