"""Assemble une vidéo Hyperframes à partir du plan de l'IA (catalogue.nettoyer).

Tout ce qui demande de voir l'image se calcule ici, pas dans le navigateur :
  - la position de chaque carte (loin du visage, dans les zones sûres TikTok / Instagram) ;
  - la taille et la hauteur du mot géant (au-dessus de la tête si la place le permet) ;
  - sa couleur (encre sur un mur clair, couleur principale sur un fond sombre) ;
  - les passages détourés (seulement sous le mot géant, le détourage coûte cher) ;
  - les bruitages, choisis par recette et par style, 20 dB environ sous la voix.

construire() écrit le dossier de la composition, rendre() produit le MP4 final
(son à -14 LUFS, cahier des charges), verifier() lance le contrôle de mise en page.
"""
from __future__ import annotations

import json
import re
import os
import shutil
import subprocess

import numpy as np

ICI = os.path.dirname(os.path.abspath(__file__))
FPS, W, H = 30, 1080, 1920
ZONE = (40, 230, 940, 1150)          # x0, y0, x1, y1 : ni sous-titres, ni bords cachés par l'appli
HF = os.environ.get("HYPERFRAMES", "hyperframes").split()
POLICES = [os.path.join(ICI, "..", "moteur", "fonts", f) for f in ("Montserrat-Black.ttf", "DMSerifDisplay-Italic.ttf")]
DOSSIERS_SONS = [d for d in os.environ.get("STUDIO_SONS", "").split(":") if d] + [os.path.join(ICI, "sons")]
PALETTES = {
    "or_noir": ("#C9A45C", "#0F0F0F", "#FFFFFF"),
    "emeraude": ("#10B981", "#0B2E24", "#FFFFFF"),
    "rose_poudre": ("#F4A6B8", "#FFFFFF", "#1F1F1F"),
    "bleu_electrique": ("#3B82F6", "#0B1530", "#FFFFFF"),
    "rouge_passion": ("#E11D48", "#1A0A0F", "#FFFFFF"),
    "blanc_minimal": ("#111111", "#FFFFFF", "#111111"),
}


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw).stdout


# ---------------------------------------------------------------- couleurs
def rvb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def hexa(c):
    return "#" + "".join(f"{max(0, min(255, int(v))):02x}" for v in c)


def lum(c):
    return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255


def couleurs(design, st):
    p = PALETTES.get(design.get("palette") or "or_noir", PALETTES["or_noir"])
    if design.get("palette") == "personnalise":
        p = (design.get("principale") or p[0], design.get("fond") or p[1], design.get("texte") or p[2])
    pr, fond, texte = (rvb(x) for x in p)
    clair = tuple(v + (255 - v) * 0.45 for v in pr) if lum(pr) < 0.75 else pr
    pr_texte = tuple(v * 0.55 for v in pr) if lum(fond) > 0.6 and lum(pr) > 0.45 else pr
    return {
        "--principale": hexa(pr), "--principale-clair": hexa(clair), "--principale-texte": hexa(pr_texte),
        "--principale-voile": f"rgba({pr[0]},{pr[1]},{pr[2]},.34)",
        "--sur-principale": "#121212" if sum(pr) > 380 else "#ffffff",
        "--fond": hexa(fond), "--texte": hexa(texte), "--encre": "#17120d",
        "--st-texte": st.get("texte") or "#FFFFFF", "--st-contour": st.get("contour") or "#000000",
        "--st-ombre": st.get("ombre") or "#000000",
        # le mot clé prend la couleur principale (claire) quand le motion design est actif
        "--st-grand": hexa(clair) if design.get("actif", True) is not False else (st.get("texte") or "#FFFFFF"),
    }


# ---------------------------------------------------------------- sous-titres mot par mot
def lignes_sous_titres(mots, sous_titres, duree):
    """Chaque sous-titre reçoit l'heure de chacun de ses mots (petite ligne) et du mot clé."""
    out = []
    for k, c in enumerate(sous_titres):
        fin = sous_titres[k + 1]["start"] if k + 1 < len(sous_titres) else duree
        dedans = [w for w in mots if c["start"] - 0.02 <= w["start"] < fin - 0.01]
        # la transcription coupe parfois avant l'apostrophe (« C 'est ») : on recolle
        petits, grand = re.sub(r"\s+(['’])", r"\1", c.get("small") or "").split(), re.sub(r"\s+(['’])", r"\1", c.get("big") or "")
        nb_grand = max(1, len(grand.split()))
        temps = [w["start"] for i, w in enumerate(dedans) if i == 0 or not w["text"][:1] in "'’"]
        if len(temps) >= len(petits) + nb_grand:
            tp, tg = temps[:len(petits)], temps[len(temps) - nb_grand]
        else:  # Claude a corrigé un mot : on répartit sur la durée du sous-titre
            pas = (fin - c["start"]) / (len(petits) + 1.5)
            tp, tg = [c["start"] + i * pas for i in range(len(petits))], c["start"] + len(petits) * pas
        # mêmes règles que les sous-titres validés : petite ligne 920 px, mot clé 900 px au plus
        texte_petit = " ".join(petits).upper()
        largeur_petit = largeur_texte(texte_petit, POLICES[0], 64) + 7 * len(texte_petit) + 16 * len(petits)
        out.append({"petit": [{"m": m, "t": round(t, 3)} for m, t in zip(petits, tp)],
                    "grand": grand, "tg": round(tg, 3), "fin": round(fin, 3),
                    "taillePetit": 64 if largeur_petit <= 920 else int(64 * 920 / largeur_petit),
                    "tailleGrand": taille_qui_tient(grand, 172, 900, police=POLICES[1])})
    return out


# ---------------------------------------------------------------- visage et placement
def visage_sur(visages, t, fin):
    """Boîte englobant le visage principal entre t et fin (pixels), ou None."""
    boites = [max(v, key=lambda b: b[2] * b[3]) for v in visages[int(t * FPS):int(fin * FPS) + 1] if v]
    if not boites:
        return None
    b = np.array(boites)
    x0, y0 = b[:, 0].min(), b[:, 1].min()
    x1, y1 = (b[:, 0] + b[:, 2]).max(), (b[:, 1] + b[:, 3]).max()
    # le visage détecté va des sourcils au menton : on ajoute cheveux et oreilles
    w, h = x1 - x0, y1 - y0
    return (x0 - 0.18 * w, y0 - 0.55 * h, x1 + 0.18 * w, y1 + 0.15 * h)


def recouvrement(a, b):
    return max(0, min(a[2], b[2]) - max(a[0], b[0])) * max(0, min(a[3], b[3]) - max(a[1], b[1]))


def placer(w, h, visage, autres, pref=(60, 260)):
    """Position (x, y) d'un élément w x h : dans la zone sûre, sans toucher le visage ni les
    autres éléments visibles au même moment ; à défaut, là où il cache le moins."""
    x0, y0, x1, y1 = ZONE
    meilleur, score_min = (x0, y0), None
    for y in range(y0, max(y0, y1 - h) + 1, 20):
        for x in range(x0, max(x0, x1 - w) + 1, 20):
            r = (x, y, x + w, y + h)
            score = 50 * (recouvrement(r, visage) if visage else 0) + sum(30 * recouvrement(r, o) for o in autres)
            score += abs(x - pref[0]) * 2 + abs(y - pref[1])
            if score_min is None or score < score_min:
                meilleur, score_min = (x, y), score
    return meilleur


def largeur_texte(texte, police, taille):
    from PIL import ImageFont
    return ImageFont.truetype(police, taille).getlength(texte)


def taille_qui_tient(texte, taille, largeur_max, espacement=0, police=None, mot_par_mot=False):
    """Taille de police (px) pour que le texte tienne dans sa largeur, mesurée avec la vraie police
    (le navigateur mesure avant d'avoir chargé les polices : on ne lui laisse pas ce calcul)."""
    police = police or POLICES[0]
    morceaux = texte.split() if mot_par_mot else [texte]
    plus_long = max((largeur_texte(m, police, taille) + espacement * len(m) for m in morceaux if m), default=0)
    return taille if plus_long <= largeur_max else max(10, int(taille * largeur_max / plus_long))


def image_a(video, t):
    import cv2
    cap = cv2.VideoCapture(video)
    cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
    ok, frame = cap.read()
    cap.release()
    return frame if ok else None


def mot_geant(e, video, visages):
    """Taille, hauteur et couleur du mot géant. Au-dessus de la tête si la place le permet ;
    sinon derrière la tête, assez grand pour se lire des deux côtés."""
    police = POLICES[1]
    taille = int(min(470, max(170, 470 * 1000 / max(1, largeur_texte(e["texte"], police, 470)))))
    v = visage_sur(visages, e["t"], e["fin"])
    haut_tete = v[1] if v else 700
    place = haut_tete - ZONE[1]
    if place >= 0.8 * taille:
        top = haut_tete - 0.92 * taille
    elif place >= 150:
        taille = int(place / 0.8)
        top = haut_tete - 0.92 * taille
    else:
        top = ZONE[1] - 10
    e.update(taille=taille, top=int(max(ZONE[1] - 20, top)))


def couleur_mot(e, video, visages):
    """Encre sur un mur clair, couleur principale (claire) sur un fond sombre."""
    v = visage_sur(visages, e["t"], e["fin"])
    taille = e["taille"]
    frame = image_a(video, e["t"] + 0.3)
    if frame is not None:
        bande = frame[e["top"]:e["top"] + taille].astype(float)
        if v:
            bande[:, int(max(0, v[0])):int(min(W, v[2]))] = np.nan
        clarte = np.nanmean(bande[..., ::-1] @ np.array([0.2126, 0.7152, 0.0722])) / 255
        e["couleur"] = "encre" if clarte > 0.55 else "principale"
    else:
        e["couleur"] = "encre"


TAILLES = {"icone_carte": (250, 300), "compteur": (440, 250), "citation": (920, 0), "liste": (600, 0)}


def placer_elements(elements, video, visages, presentation=None):
    poses = []  # (t, fin, rectangle) des éléments déjà placés
    if presentation:  # la carte du prénom (bas gauche, au-dessus des sous-titres)
        poses.append((presentation["debut"], presentation["fin"] + 0.3, (60, 940, 640, 1120)))
    for e in elements:
        r = e["recette"]
        v = visage_sur(visages, e["t"], e["fin"])
        if r == "mot_derriere":
            mot_geant(e, video, visages)
        elif r in TAILLES:
            w, h = TAILLES[r]
            if e.get("legende"):
                e["tailleLegende"] = taille_qui_tient(e["legende"].upper(), 26, 206 if r == "icone_carte" else 300, 3, mot_par_mot=True)
            if r == "compteur":
                texte = f"{e.get('prefixe', '')}{int(e['valeur']):,}{e.get('suffixe', '')}".replace(",", " ")
                w = int(max(300, min(860, largeur_texte(texte, POLICES[1], 150) + 100)))
                e["largeur"] = w
            if r == "liste":
                h = 34 * 2 + 70 + 70 * len(e["points"])
            if r == "citation":
                lignes = max(1, -(-len(e["texte"]) // 26))
                h = 46 * 2 + 70 + 70 * lignes
            autres = [p for a, b, p in poses if a < e["fin"] and e["t"] < b]
            x, y = placer(w, h, v, autres, pref=(60 if r != "citation" else 80, 260))
            if r == "citation":
                x = 80
            e.update(x=x, y=y)
            poses.append((e["t"], e["fin"], (x, y, x + w, y + h)))
        elif r == "bandeau":
            autres = [p for a, b, p in poses if a < e["fin"] and e["t"] < b]
            _, y = placer(1000, 150, v, autres, pref=(40, 980))
            e["y"] = y
        elif r == "carte_reduite":
            e["cote"] = "gauche"
            for u in e["tuiles"]:
                u["tailleLegende"] = taille_qui_tient(u["legende"].upper(), 28, 292, 3, mot_par_mot=True)
    return elements


# ---------------------------------------------------------------- détourage (sous le mot géant seulement)
def passages_detoures(elements, duree):
    plages = sorted((max(0.0, e["t"] - 0.25), min(duree, e["fin"] + 0.1))
                    for e in elements if e["recette"] == "mot_derriere")
    out = []
    for a, b in plages:
        if out and a <= out[-1][1] + 0.3:
            out[-1] = (out[-1][0], max(out[-1][1], b))
        else:
            out.append((a, b))
    return [(round(a * FPS) / FPS, round(b * FPS) / FPS) for a, b in out]


def detourer(video, a, b, dossier, k, original=None):
    """Passage [a, b] détouré (WebM transparent). Si le visage est flouté, la silhouette est
    calculée sur la vidéo d'origine (un visage flou trompe le détourage) puis appliquée à
    l'image floutée : l'orateur reste flouté, et rien ne passe jamais devant son visage."""
    def extraire(src, nom):
        chemin = os.path.join(dossier, nom)
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{a:.3f}", "-i", src, "-t", f"{b - a:.3f}", "-an",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-g", "30", chemin])
        return chemin
    extrait = extraire(original or video, f"extrait{k}.mp4")
    sortie = os.path.join(dossier, f"detoure{k}.webm")
    silhouette = os.path.join(dossier, f"silhouette{k}.webm") if original else sortie
    run(HF + ["remove-background", extrait, "-o", silhouette, "--quality", "balanced"], env={**os.environ, "DO_NOT_TRACK": "1"})
    if original:
        floute = extraire(video, f"extrait_floute{k}.mp4")
        run(["ffmpeg", "-v", "error", "-y", "-c:v", "libvpx-vp9", "-i", silhouette, "-i", floute, "-filter_complex",
             "[0:v]alphaextract[a];[1:v][a]alphamerge,format=yuva420p", "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "28",
             "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1", "-auto-alt-ref", "0", "-g", "30", sortie])
        for f in (floute, silhouette):
            os.remove(f)
    os.remove(extrait)
    return os.path.basename(sortie)


def masque(webm, t):
    """Silhouette détourée (0 à 1) à l'instant t du passage, au quart de la résolution."""
    p = subprocess.run(["ffmpeg", "-v", "error", "-c:v", "libvpx-vp9", "-ss", f"{max(0.0, t):.3f}", "-i", webm,
                        "-vf", f"alphaextract,scale={W // 4}:{H // 4}", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                       capture_output=True)
    if len(p.stdout) != (W // 4) * (H // 4):
        return None
    return np.frombuffer(p.stdout, np.uint8).reshape(H // 4, W // 4).astype(np.float32) / 255


def couverture(texte, taille, top, masques):
    """Part du mot géant cachée par l'orateur (0 = entièrement lisible), au pixel près, et part
    cachée de ses deux extrémités : un mot dont on voit le début et la fin se lit encore."""
    from PIL import Image, ImageDraw, ImageFont
    police = ImageFont.truetype(POLICES[1], max(8, taille // 4))
    asc, desc = police.getmetrics()
    largeur = police.getlength(texte)
    calque = Image.new("L", (W // 4, H // 4), 0)
    ImageDraw.Draw(calque).text(((W // 4 - largeur) / 2, top / 4 + (taille / 4 - asc - desc) / 2), texte, font=police, fill=255)
    lettres = np.asarray(calque, np.float32) / 255
    total = lettres.sum()
    if total < 1:
        return 1.0, 1.0
    cols = np.where(lettres.sum(axis=0) > 0)[0]
    x0, x1 = cols.min(), cols.max() + 1
    bord = max(1, int((x1 - x0) / max(3, len(texte))))
    bords = np.zeros_like(lettres)
    bords[:, x0:x0 + bord] = lettres[:, x0:x0 + bord]
    bords[:, x1 - bord:x1] = lettres[:, x1 - bord:x1]
    cache = float(np.mean([(lettres * (m > 0.5)).sum() / total for m in masques]))
    cache_bords = float(np.mean([(bords * (m > 0.5)).sum() / max(1, bords.sum()) for m in masques]))
    return cache, cache_bords


def ajuster_mots(elements, passages, dossier, visages):
    """Le mot géant reste-t-il lisible derrière l'orateur ? On essaie plusieurs hauteurs et
    tailles et on garde la plus lisible. S'il reste trop caché (plus de 65 %, ou sa première ou
    dernière lettre), il devient un simple coup de zoom : un mot illisible fait plus amateur que rien."""
    for e in elements:
        if e["recette"] != "mot_derriere":
            continue
        passage = next(((a, b, f) for a, b, f in passages if a <= e["t"] + 0.01 and e["fin"] <= b + 0.2), None)
        if not passage:
            continue
        a, b, fichier = passage
        instants = [e["t"] + (e["fin"] - e["t"]) * k for k in (0.2, 0.5, 0.8)]
        masques = [m for m in (masque(os.path.join(dossier, fichier), t - a) for t in instants) if m is not None]
        if not masques:
            continue
        # sécurité : si le détourage n'a pas reconnu le visage, le mot pourrait passer devant lui
        visage = [max(v, key=lambda x: x[2] * x[3]) for v in visages[int(e["t"] * FPS):int(e["fin"] * FPS) + 1] if v]
        if visage:
            x, y, w, h = visage[len(visage) // 2]
            coeur = [m[int(y / 4 + h / 16):int((y + h) / 4), int(x / 4 + w / 16):int((x + w) / 4 - w / 16)] for m in masques]
            if min(float((c > 0.5).mean()) if c.size else 0 for c in coeur) < 0.85:
                t = max(0.4, e["t"])
                e.clear()
                e.update(recette="punch", t=round(t, 2), fin=round(t + 0.8, 2), remplace="mot_derriere (visage mal détouré)")
                continue
        essais = []
        for taille in sorted({e["taille"], int(e["taille"] * 0.85), int(e["taille"] * 0.7)}, reverse=True):
            if taille < 150:
                continue
            for top in range(ZONE[1] - 20, 1160 - taille - 40, 30):
                c, cb = couverture(e["texte"], taille, top, masques)
                # préférence : lisible d'abord (extrémités comprises), puis grand, puis haut dans l'image
                essais.append((round(c + cb, 2) + (e["taille"] - taille) / 2000 + (top - ZONE[1]) / 8000, c, cb, taille, top))
        if not essais:
            continue
        _, c, cb, taille, top = min(essais)
        e.update(taille=taille, top=top, couverture=round(c, 2), couverture_bords=round(cb, 2))
        if c > 0.65 or cb > 0.4:
            t = max(0.4, e["t"])
            e.clear()
            e.update(recette="punch", t=round(t, 2), fin=round(t + 0.8, 2), remplace="mot_derriere")


# ---------------------------------------------------------------- bruitages
_DUREES = {}


def son(nom):
    for d in DOSSIERS_SONS:
        for ext in (".wav", ".mp3"):
            p = os.path.join(d, nom + ext)
            if os.path.exists(p):
                if p not in _DUREES:
                    _DUREES[p] = float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]))
                return p, _DUREES[p]
    return None, 0


def bruitages(elements, cta, presentation, style):
    """(son, début, volume, durée max) par élément, selon le style. Sobre : très peu, jamais d'impact."""
    s = []
    fort = {"sobre": 0.6, "signature": 1.0, "energique": 1.25}[style]

    def a(nom, t, vol, duree=None):
        s.append((nom, max(0.0, t), round(min(0.6, vol * fort), 3), duree))

    if presentation:
        a("whoosh-short", presentation["debut"] - 0.05, 0.16)
    for e in elements:
        r, t = e["recette"], e["t"]
        if r == "mot_derriere":
            if style == "energique":
                a("impact-bass-1", t, 0.3)
            elif style == "signature":
                a("whoosh-short", t - 0.1, 0.18)
                a("sparkle", t + 0.1, 0.16)
            else:
                a("chime", t, 0.2)
        elif r == "carte_reduite":
            a("whoosh-short", t - 0.05, 0.2)
            for u in e["tuiles"]:
                a("pop", u["t"], 0.22)
            a("whoosh-short", e["fin"] - 0.25, 0.14)
        elif r == "ambiance":
            if e["type"] == "pluie":
                a("pluie", t, 0.32, e["fin"] - t)
                if "eclat" in e and style != "sobre":
                    a("tonnerre", e["eclat"], 0.4)
            elif e["type"] == "nuit":
                a("houle", t, 0.3)
            else:
                a("sparkle", t, 0.18)
                a("houle", t + 0.2, 0.22)
        elif r == "punch":
            a("impact-bass-1", t, 0.26)
        elif r == "entoure":
            a("click-soft", t, 0.18)
        elif r == "icone_carte":
            a("pop", t, 0.22)
        elif r == "liste":
            a("whoosh-short", t, 0.14)
            for p in e["points"]:
                a("tic", p["t"] + 0.1, 0.3)
        elif r == "compteur":
            a("pop", t, 0.2)
            for k in range(4):
                a("tic", t + 0.15 + 0.2 * k, 0.18)
        elif r == "bandeau":
            a("whoosh-short", t, 0.2)
        elif r == "poussee":
            a("montee", t, 0.12)
        elif r == "flash":
            a("whoosh-short", t - 0.04, 0.2)
        elif r == "citation":
            a("chime", t, 0.18)
    if cta:
        a("pop", cta["t"], 0.24)
        a("ping", cta["t"] + 0.15, 0.16)
    return s


# ---------------------------------------------------------------- composition
MODELE = """<!doctype html>
<html lang="fr" data-resolution="portrait">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<link rel="stylesheet" href="socle.css" />
<style>:root {{ {vars} }}</style>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script src="icones.js"></script>
<script src="socle.js"></script>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{duree}" data-width="1080" data-height="1920">
  <div id="scene"><div id="pousse" style="position:absolute;inset:0;transform-origin:540px 700px"><div id="cadre">
    <video id="base" class="clip{etalonne}" src="base.mp4" data-start="0" data-duration="{duree}" data-track-index="0" data-has-audio="true"></video>
    <div id="derriere"></div>
{detoures}
    <div id="devant"></div>
  </div></div></div>
  <div id="presente"><div class="nom"></div><div class="role"></div><div class="souligne"></div></div>
  <div id="cta"><div class="bouton"><span class="texte"></span><span class="fleche"></span></div></div>
  <div id="st"></div>
  <div id="progression"></div><div id="vignette"></div><div id="grain"></div><div id="fuite"></div><div id="flash"></div>
{sons}
</div>
<script>
  window.PLAN = {plan};
  const tl = gsap.timeline({{ paused: true }});
  AB.monter(tl, window.PLAN);
  window.__timelines = window.__timelines || {{}};
  window.__timelines["main"] = tl;
  tl.seek(0);
</script>
</body>
</html>
"""


def construire(dossier, video, travail, plan, reglages, visages, mots, original=None):
    """Écrit la composition dans dossier/ ; video = vidéo montée (floutée si demandé), original =
    la même sans floutage (détourage), visages = détectés sur l'original."""
    os.makedirs(dossier, exist_ok=True)
    duree = round(travail["duree_sortie"], 3)
    reglages = reglages or {}
    design = reglages.get("design") or {}
    style = design.get("style") if design.get("style") in ("sobre", "signature", "energique") else plan["ton"]
    # vidéo de base à GOP court : sans cela, Hyperframes fige des images au rendu
    base = os.path.join(dossier, "base.mp4")
    run(["ffmpeg", "-v", "error", "-y", "-i", video, "-c:v", "libx264", "-preset", "veryfast", "-crf", "17",
         "-g", "30", "-keyint_min", "30", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", base])
    for f in POLICES + [os.path.join(ICI, "socle.css"), os.path.join(ICI, "socle.js")]:
        shutil.copy(f, dossier)
    with open(os.path.join(ICI, "icones.json"), encoding="utf-8") as f:
        icones = f.read()
    with open(os.path.join(dossier, "icones.js"), "w", encoding="utf-8") as f:
        f.write(f"window.AB_ICONES = {icones};\n")

    # carte de présentation de 0,6 à 4,2 s (cahier) ; décalée après une carte réduite du début
    prenom = str(design.get("prenom") or "").strip()[:24]
    presentation = {"nom": prenom, "role": str(design.get("titre") or "").strip()[:40], "debut": 0.6, "fin": 4.2} if prenom else None
    cartes = [e for e in plan["elements"] if e["recette"] == "carte_reduite" and e["t"] < 4.5]
    if presentation and cartes:
        debut = cartes[0]["fin"] + 0.3
        presentation = {**presentation, "debut": debut, "fin": debut + 3.0} if debut + 2.5 < duree else None
    elements = placer_elements([dict(e) for e in plan["elements"]], base, visages, presentation)

    detoures, passages = [], []
    for k, (a, b) in enumerate(passages_detoures(elements, duree)):
        nom = detourer(base, a, b, dossier, k, original)
        passages.append((a, b, nom))
        detoures.append(f'    <video id="detoure{k}" class="clip detoure{" etalonne" if style != "sobre" else ""}" src="{nom}" '
                        f'data-start="{a:.3f}" data-duration="{b - a:.3f}" data-track-index="{1 + k}" muted></video>')

    ajuster_mots(elements, passages, dossier, visages)
    for e in elements:  # couleur du mot à sa position finale
        if e["recette"] == "mot_derriere":
            couleur_mot(e, base, visages)

    sons, piste = [], 10
    for nom, t, vol, duree_max in bruitages(elements, plan.get("cta"), presentation, style):
        chemin, d = son(nom)
        if not chemin or t >= duree - 0.1:
            continue
        restant = min(duree - t, duree_max or d)
        while restant > 0.05:  # un son plus court que le passage (pluie) est répété
            fichier = os.path.basename(chemin)
            shutil.copy(chemin, os.path.join(dossier, fichier))
            long = min(d, restant)
            sons.append(f'  <audio id="s{piste}" class="clip" src="{fichier}" data-start="{t:.3f}" data-duration="{long:.3f}" '
                        f'data-volume="{vol}" data-track-index="{piste}"></audio>')
            piste += 1
            t, restant = t + long, restant - long

    st = (reglages.get("sous_titres") or {})
    vars_css = couleurs(design, st)
    donnees = {
        "duree": duree, "style": style, "presentation": presentation, "cta": plan.get("cta"),
        "sousTitres": lignes_sous_titres(mots, travail["sous_titres"], duree),
        "elements": elements, "progression": bool(design.get("progression", False)),
    }
    html = MODELE.format(
        vars=" ".join(f"{k}: {v};" for k, v in vars_css.items()), duree=duree,
        etalonne=" etalonne" if style != "sobre" else "", detoures="\n".join(detoures), sons="\n".join(sons),
        plan=json.dumps(donnees, ensure_ascii=False).replace("</", "<\\/"))
    with open(os.path.join(dossier, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)
    return donnees


def verifier(dossier):
    """Contrôle de Hyperframes : lint, erreurs, texte qui déborde ou caché sous un autre élément.
    Le mot géant derrière l'orateur est caché exprès : il ne compte que s'il l'est trop."""
    p = subprocess.run(HF + ["check", dossier, "--json", "--samples", "12", "--at-transitions", "--max-transition-samples", "24", "--no-contrast"],
                       capture_output=True, text=True, env={**os.environ, "DO_NOT_TRACK": "1"})
    try:
        d = json.loads(p.stdout)
    except ValueError:
        return [{"partie": "check", "code": "check_illisible", "message": (p.stdout + p.stderr)[-400:]}]
    out = []
    for partie in ("lint", "runtime", "layout"):
        for f in (d.get(partie) or {}).get("findings") or []:
            if f.get("severity") != "error":
                continue
            if f.get("code") == "text_occluded" and str(f.get("containerSelector", "")).startswith("#detoure") \
                    and (f.get("coveredFraction") or 0) <= 0.45:
                continue
            out.append({"partie": partie, **{k: f.get(k) for k in ("code", "time", "selector", "message", "text", "coveredFraction")}})
    return out


def rendre(dossier, sortie):
    brut = os.path.join(dossier, "rendu.mp4")
    run(HF + ["render", dossier, "--output", brut, "--fps", "30", "--quiet"], env={**os.environ, "DO_NOT_TRACK": "1"})
    # volume final -14 LUFS (cahier des charges), l'image n'est pas réencodée
    run(["ffmpeg", "-v", "error", "-y", "-i", brut, "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1:LRA=11", "-ar", "48000",
         "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", sortie])
