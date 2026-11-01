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
import difflib
import json
import math
import os
import re
import subprocess
import unicodedata

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

# Format hybride (Sidali, 01/11/2026) : le visage d'abord, un plan seulement là où il apporte quelque chose.
HYBRIDE_DOSE = 0.30       # part de la vidéo couverte par des plans, au plus
HYBRIDE_MARGE = 3.0       # le visage au début (l'accroche) et à la fin (l'appel à l'action)
HYBRIDE_VISAGE_MIN = 1.5  # toujours un temps de visage entre deux plans
HYBRIDE_DUREE_MIN = 3.0   # retour de Sidali, 01/11/2026 : 2 s, c'était trop court
HYBRIDE_DUREE_MAX = 5.0
HYBRIDE_CONCRET_MIN = 5   # un moment abstrait reste sur le visage
CONSIGNE_HYBRIDE = ("Cette vidéo montre la personne face caméra ; un plan ne remplacera son visage que sur quelques moments. "
                    "Pour chaque moment, ajoute aussi \"concret\" : une note de 0 à 10. 10 : les mots décrivent quelque chose "
                    "qu'on peut montrer (la plage, le bureau, l'argent, une famille). 0 : idée abstraite, émotion ou appel "
                    "direct à la caméra, où le visage est préférable. Le plan doit aller dans le sens de la phrase : une "
                    "difficulté ne se montre pas avec des images de réussite. Jamais d'images clinquantes : liasses de billets, "
                    "voitures de luxe, yachts, jets, montres, villas. Préfère des images simples du quotidien, du travail, de la vie.")

RELIGIEUX = ("Sujet religieux : images sobres et respectueuses (nature, lumière, lieux de prière), "
             "jamais de représentation de Dieu ni d'image décorative sur Son nom.")


# ---------------------------------------------------------------- audio seul
def sonder_audio(chemin):
    """Les informations du moteur pour un enregistrement sans image."""
    out = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", chemin],
                         check=True, capture_output=True, text=True).stdout
    info = json.loads(out)
    duree = (info.get("format") or {}).get("duration")
    if duree is None:  # enregistré dans le navigateur (WebM en flux) : l'en-tête n'a pas de durée
        duree = mesurer_duree(chemin)
    return {"width": W, "height": H, "duration": float(duree), "hdr": False,
            "has_audio": any(s["codec_type"] == "audio" for s in info["streams"]), "audio_seul": True}


def mesurer_duree(chemin):
    """Durée réelle en lisant tout le fichier (dernier « time= » de FFmpeg)."""
    err = subprocess.run(["ffmpeg", "-v", "info", "-nostats", "-stats", "-i", chemin, "-vn", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    temps = re.findall(r"time=(\d+):(\d+):(\d+(?:\.\d+)?)", err)
    if not temps:
        raise ValueError("Durée de l'enregistrement illisible.")
    h, m, sec = temps[-1]
    return int(h) * 3600 + int(m) * 60 + float(sec)


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


# ---------------------------------------------------------------- mots calés sur le script
def _cle(mot):
    """« T'as » → « tas », « Été, » → « ete » : pour comparer l'oral transcrit et le script."""
    m = unicodedata.normalize("NFD", mot.lower())
    return "".join(c for c in m if c.isalnum())


def caler_sur_script(mots, script):
    """Whisper écrit ce qu'il entend (« Taviyu » pour « T'as vu ») ; l'élève a écrit son script.
    On garde les mots et leurs temps, mais on reprend l'orthographe du script partout où les deux
    s'alignent. Les reprises (phrases recommencées) ne sont pas dans le script : elles restent
    telles quelles. Un mot transcrit peut recevoir plusieurs mots du script (« T'as vu »),
    jamais l'inverse : le nombre de mots ne change pas (les index servent aux coupes)."""
    jetons = [j for j in re.split(r"\s+", script or "") if _cle(j)]
    if not mots or not jetons:
        return 0
    a, b = [_cle(m.text) for m in mots], [_cle(j) for j in jetons]
    corriges = 0
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op == "equal":
            paires = zip(range(i1, i2), range(j1, j2))
        elif op == "replace" and i2 - i1 == j2 - j1 and i2 - i1 <= 3:
            # mot mal entendu à la même place (« Taviyu » / « T'as ») : proche à l'écrit, ou seul
            paires = [(i, j) for i, j in zip(range(i1, i2), range(j1, j2))
                      if i2 - i1 == 1 or difflib.SequenceMatcher(None, a[i], b[j]).ratio() >= 0.5]
        elif op == "replace" and i2 - i1 == 1 and j2 - j1 <= 3 and \
                difflib.SequenceMatcher(None, a[i1], "".join(b[j1:j2])).ratio() >= 0.5:
            mots[i1].text = " ".join(jetons[j1:j2])
            corriges += 1
            continue
        else:
            continue
        for i, j in paires:
            if mots[i].text != jetons[j]:
                mots[i].text = jetons[j]
                corriges += 1
    return corriges


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
    colles = {round(w["start"], 3) for w in gardes if re.match(r"^['’-]", w["text"].strip())}
    bornes = sorted({0.0, round(total, 3)} | {round(c["start"], 3) for c in sous_titres
                                              if 0.05 < c["start"] < total - 0.05 and round(c["start"], 3) not in colles})
    morceaux = []
    for a, b in zip(bornes, bornes[1:]):
        if morceaux and (morceaux[-1][1] - morceaux[-1][0] < MOMENT_MIN):
            morceaux[-1][1] = b
        else:
            morceaux.append([a, b])
    if len(morceaux) > 1 and morceaux[-1][1] - morceaux[-1][0] < MOMENT_MIN:
        morceaux[-2][1] = morceaux[-1][1]
        morceaux.pop()
    # jamais de coupure juste avant « 'ala » ou « -les » : le mot resterait coupé en deux
    debuts = [w["start"] for w in gardes if not re.match(r"^['’-]", w["text"].strip())]
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


def prompt_plans(script, theme_nom, liste, themes, categories=None, consigne=""):
    echapper = lambda s: s.replace("{", "{{").replace("}", "}}")
    lignes = "\n".join(f"M{i} [{m['debut']:.1f}-{m['fin']:.1f}] : {m['texte'] or '(silence)'}" for i, m in enumerate(liste))
    religieux = RELIGIEUX if any(k in (script or "").lower() for k in ("allah", "dieu", "invocation", "prière", "coran")) else ""
    return PROMPT_PLANS.format(theme=echapper(theme_nom or "non précisé"), script=echapper((script or "")[:5000]),
                               moments=echapper(lignes), themes="\n".join(f"- {k} : {v}" for k, v in themes.items()),
                               categories=echapper(texte_categories(categories)),
                               reglage_religieux=" ".join(x for x in (religieux, consigne) if x), n=len(liste))


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


def moments_hybrides(liste, total):
    """Les moments où un plan est permis : ni au début ni à la fin, et assez longs pour être vus.
    Les moments voisins sont réunis de 3 à 5 s : un plan commence et finit toujours sur un sous-titre."""
    marge = min(HYBRIDE_MARGE, total * 0.15)
    permis = [m for m in liste if m["debut"] >= marge and m["fin"] <= total - marge]
    out, cours = [], None
    for m in permis:
        if cours and m["debut"] <= cours["fin"] + 0.05 and cours["fin"] - cours["debut"] < HYBRIDE_DUREE_MIN \
                and m["fin"] - cours["debut"] <= HYBRIDE_DUREE_MAX:
            cours = {**cours, "fin": m["fin"], "texte": recoller(f"{cours['texte']} {m['texte']}")}
        else:
            if cours:
                out.append(cours)
            cours = dict(m)
    if cours:
        out.append(cours)
    return [m for m in out if m["fin"] - m["debut"] >= HYBRIDE_DUREE_MIN and m.get("texte")]


def choisir_hybrides(liste, demandes, candidats, total, dose=HYBRIDE_DOSE):
    """Les plans du format hybride. Contrairement à la voix off, rien n'oblige à remplir : un moment
    sans bon plan garde le visage, sans plan de secours. Les meilleurs moments d'abord, jusqu'à la
    dose voulue, avec toujours un temps de visage entre deux plans."""
    possibles = []
    for i, m in enumerate(liste):
        concret = float((demandes[i] or {}).get("concret") or 0)
        bons = sorted((c for c in candidats[i] if float(c["score"]) >= SCORE_MIN), key=lambda c: -float(c["score"]))
        if concret >= HYBRIDE_CONCRET_MIN and bons:
            possibles.append((float(bons[0]["score"]) + concret * 0.02, i, bons))
    gardes, utilises, duree = [], set(), 0.0
    for _, i, bons in sorted(possibles, key=lambda x: -x[0]):
        m = liste[i]
        d = m["fin"] - m["debut"]
        if duree + d > dose * total:
            continue
        voisins = [g for g in gardes if m["debut"] - HYBRIDE_VISAGE_MIN < g["fin"] and g["debut"] < m["fin"] + HYBRIDE_VISAGE_MIN]
        if voisins:
            continue
        plan = next((c for c in bons if c["id"] not in utilises), None)
        if plan is None:
            continue
        utilises.add(plan["id"])
        duree += d
        gardes.append({**m, "requete": demandes[i], "plan": {**_plan(plan), "source": "banque"},
                       "propositions": [_plan(c) for c in bons if c["id"] != plan["id"]][:3]})
    return sorted(gardes, key=lambda g: g["debut"])


def sans_effets_du_visage(plan, moments):
    """Le mot géant derrière le sujet et la vidéo réduite en carte supposent le visage à l'écran :
    on les retire là où un plan le remplace."""
    if not plan or not moments:
        return plan
    sur_un_plan = lambda e: any(e["t"] < m["fin"] and m["debut"] < e.get("fin", e["t"]) for m in moments)
    return {**plan, "elements": [e for e in plan["elements"]
                                 if not (e.get("recette") in ("mot_derriere", "carte_reduite") and sur_un_plan(e))]}


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
def clips_des_plans(liste, liens, dossier):
    """Chaque plan à la durée exacte de son moment (0,2 s après son début, zoom de 3 %). Les images
    sont comptées à partir des temps cumulés, pour ne jamais dériver de la voix."""
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
        return list(ex.map(un, range(len(liste))))


def incruster_plans(liste, liens, video, dossier, dst):
    """Format hybride : les plans posés sur la vidéo à leur moment, le son de la vidéo ne bouge pas."""
    clips = clips_des_plans(liste, liens, dossier)
    entrees, filtres, sortie = ["-i", video], [], "0:v"
    k = 0
    for m, clip in zip(liste, clips):
        if not clip:
            continue
        k += 1
        entrees += ["-i", clip]
        filtres.append(f"[{k}:v]setpts=PTS-STARTPTS+{m['debut']:.3f}/TB[p{k}];"
                       f"[{sortie}][p{k}]overlay=eof_action=pass:enable='between(t,{m['debut']:.3f},{m['fin']:.3f})'[v{k}]")
        sortie = f"v{k}"
    if not k:
        return video
    subprocess.run(["ffmpeg", "-v", "error", "-y", *entrees, "-filter_complex", ";".join(filtres), "-map", f"[{sortie}]",
                    "-map", "0:a?", "-r", str(FPS), "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-g", "30",
                    "-pix_fmt", "yuv420p", "-c:a", "copy", dst], check=True)
    return dst


def monter_plans(liste, liens, voix_wav, dossier, dst):
    """Voix off : les plans bout à bout, en coupe franche, sur la voix."""
    morceaux = [m for m in clips_des_plans(liste, liens, dossier) if m]
    liste_concat = os.path.join(dossier, "plans.txt")
    with open(liste_concat, "w") as f:
        f.writelines(f"file '{m}'\n" for m in morceaux)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", liste_concat, "-i", voix_wav,
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", dst], check=True)
    return dst
