"""Studio vidéo AL BARAKA : le motion design (cahier des charges, section 10).

Version de production du prototype de Sidali (moteur/motion_design.py) : les
moments ne sont plus écrits en dur, ils viennent d'un plan d'animation produit
par l'IA à partir de la transcription (voir PLAN_PROMPT et nettoyer_plan). Le
dessin reprend les formes, durées et courbes du prototype validé.

  - recadrage alterné 100 % / 107 % à chaque coupe, centré sur le visage ;
  - zoom à 116 % sur 3 à 5 mots forts ;
  - carte de présentation (si un prénom est renseigné), 0,6 s → 4,2 s ;
  - icône animée sur un mot concret (au plus une toutes les 5 s) ;
  - liste animée quand l'orateur énumère 2 à 4 éléments ;
  - compteur quand un chiffre précis est prononcé ;
  - flash léger aux changements de partie (4 au plus) ;
  - bouton d'appel à l'action s'il est dit dans les 8 dernières secondes ;
  - barre de progression, bruitages discrets.

Zones imposées : rien sur la zone des sous-titres (y 1180 à 1460) ni sur le
visage ; tout reste entre y 160 et y 1700.
"""
from __future__ import annotations

import math
import os
from dataclasses import dataclass

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ICI = os.path.dirname(os.path.abspath(__file__))
POLICES = os.path.join(ICI, "moteur", "fonts")
W, H, FPS = 1080, 1920, 30
ZONE_HAUT, ZONE_SOUS_TITRES = 160, 1170   # les éléments restent entre ces deux lignes
MARGE_VISAGE = 24

# ---------------------------------------------------------------- couleurs
PALETTES = {
    "or_noir": ("#C9A45C", "#0F0F0F", "#FFFFFF"),
    "emeraude": ("#10B981", "#0B2E24", "#FFFFFF"),
    "rose_poudre": ("#F4A6B8", "#FFFFFF", "#1F1F1F"),
    "bleu_electrique": ("#3B82F6", "#0B1530", "#FFFFFF"),
    "rouge_passion": ("#E11D48", "#1A0A0F", "#FFFFFF"),
    "blanc_minimal": ("#111111", "#FFFFFF", "#111111"),
}


def rvb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _lum(c):
    return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255


@dataclass
class Couleurs:
    principale: tuple
    fond: tuple
    texte: tuple

    @property
    def sur_principale(self):
        """Texte posé sur la couleur principale (bouton, pastilles) : noir ou blanc."""
        return (18, 18, 18) if sum(self.principale) > 380 else (255, 255, 255)

    @property
    def principale_texte(self):
        """Sur un encadré clair, la couleur principale claire est assombrie pour rester lisible."""
        if _lum(self.fond) > 0.6 and _lum(self.principale) > 0.45:
            return tuple(int(v * 0.55) for v in self.principale)
        return self.principale


def couleurs_de(design: dict) -> Couleurs:
    p = PALETTES.get(design.get("palette") or "or_noir", PALETTES["or_noir"])
    if design.get("palette") == "personnalise":
        p = (design.get("principale") or p[0], design.get("fond") or p[1], design.get("texte") or p[2])
    return Couleurs(rvb(p[0]), rvb(p[1]), rvb(p[2]))


# ---------------------------------------------------------------- courbes (prototype)
def ease_out(x):
    x = min(1, max(0, x))
    return 1 - (1 - x) ** 3


def ease_in_out(x):
    x = min(1, max(0, x))
    return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2


def back_out(x, s=1.7):
    x = min(1, max(0, x)) - 1
    return x * x * ((s + 1) * x + s) + 1


_polices = {}


def police(nom, taille):
    cle = (nom, int(taille))
    if cle not in _polices:
        fichier = "Montserrat-Black.ttf" if nom == "titre" else "DMSerifDisplay-Italic.ttf"
        _polices[cle] = ImageFont.truetype(os.path.join(POLICES, fichier), max(8, int(taille)))
    return _polices[cle]


def ombre(img, rayon=18, alpha=110, decalage=(0, 8)):
    """Ombre douce sous une image RGBA (renvoie l'image agrandie et sa marge)."""
    pad = rayon * 2
    grand = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sh.putalpha(img.getchannel("A").point(lambda v: v * alpha // 255))
    grand.paste(sh, (pad + decalage[0], pad + decalage[1]), sh)
    grand = grand.filter(ImageFilter.GaussianBlur(rayon))
    grand.alpha_composite(img, (pad, pad))
    return grand, pad


def coller(frame_bgr, img: Image.Image, x, y, opacite=1.0):
    """Colle une image RGBA (coin haut gauche en x, y) sur l'image BGR."""
    a = np.asarray(img, dtype=np.uint8)
    h, w = a.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0:
        return
    sub = a[y0 - y:y1 - y, x0 - x:x1 - x].astype(np.float32)
    al = sub[..., 3:4] / 255 * opacite
    roi = frame_bgr[y0:y1, x0:x1].astype(np.float32)
    frame_bgr[y0:y1, x0:x1] = (sub[..., 2::-1] * al + roi * (1 - al)).astype(np.uint8)


# ---------------------------------------------------------------- le plan d'animation (IA)
ICONES = {
    "horloge": "une heure, un horaire, le temps qui passe",
    "argent": "argent, salaire, revenus, euros, prix",
    "telephone": "téléphone, appel, smartphone",
    "ordinateur": "ordinateur, PC, travail en ligne",
    "calendrier": "date, jour, semaine, mois, planning",
    "maison": "maison, chez soi, logement, famille à la maison",
    "avion": "voyage, avion, partir à l'étranger",
    "graphique": "croissance, résultats, chiffres qui montent",
    "ampoule": "idée, déclic, astuce",
    "cible": "objectif, but, viser",
    "coeur": "amour, passion, cœur",
    "message": "message, discussion, DM, conversation",
    "trophee": "réussite, victoire, gagner",
    "cadenas": "sécurité, bloqué, verrouillé",
    "sablier": "attendre, patience, durée",
    "voiture": "voiture, trajet, route",
    "livre": "apprendre, formation, lire",
    "etoile": "qualité, avis, excellence",
    "valise": "travail, emploi, business",
    "eclair": "énergie, rapidité, choc",
}

PLAN_PROMPT = """Tu es motion designer pour des vidéos Reels / TikTok en français (format vertical).
Voici la transcription mot à mot d'une vidéo déjà montée : « index: mot [début-fin en secondes] ».
Choisis les animations qui soulignent le propos, sans en abuser : la vidéo doit rester sobre et lisible.

Règles :
- "zooms" : 3 à 5 mots forts (émotion, promesse, chiffre), espacés d'au moins 3 secondes, jamais un mot outil.
- "icones" : uniquement sur un mot CONCRET qui correspond exactement à une icône, au plus une toutes les
  5 secondes (dans le doute, aucune), choisie dans cette liste :
@ICONES@
  Pour "horloge", ajoute "heure" (« 23:00 ») si une heure précise est dite.
- "listes" : seulement si l'orateur ÉNUMÈRE 2 à 4 éléments. Titre court en majuscules (28 caractères max),
  chaque point en 24 caractères max, avec l'index du mot où il commence à être dit.
- "compteurs" : seulement si un nombre précis est prononcé (« 3 000 élèves ») : valeur numérique,
  texte du nombre tel qu'affiché, libellé court (18 caractères max).
- "parties" : index du premier mot de chaque changement de partie (problème, solution, appel à l'action),
  3 au plus, jamais le mot 0.
- "cta" : seulement si un appel à l'action est dit dans les 8 dernières secondes : texte du bouton
  en majuscules (20 caractères max) et index du mot. Sinon null.
N'invente rien qui ne soit pas dit. Une rubrique sans rien qui convienne reste vide.

Mots :
@MOTS@

Durée totale : @DUREE@ s.

Réponds UNIQUEMENT en JSON :
{"zooms": [12, 40], "icones": [{"icone": "horloge", "mot": 7, "heure": "23:00"}], "listes": [{"titre": "...", "points": [{"texte": "...", "mot": 20}]}], "compteurs": [{"mot": 31, "valeur": 3000, "texte": "3 000", "libelle": "élèves"}], "parties": [18], "cta": {"texte": "...", "mot": 60}}"""


def prompt_plan(mots, duree):
    liste = "\n".join(f"{i}: {w['text']} [{w['start']:.2f}-{w['end']:.2f}]" for i, w in enumerate(mots))
    icones = "\n".join(f"  {k} ({v})" for k, v in ICONES.items())
    return PLAN_PROMPT.replace("@ICONES@", icones).replace("@MOTS@", liste).replace("@DUREE@", f"{duree:.1f}")


def nettoyer_plan(brut: dict, mots, duree) -> dict:
    """Ne garde du plan de l'IA que ce qui respecte le cahier des charges ; transforme
    les index de mots en instants. Un élément douteux est écarté, jamais deviné."""
    n = len(mots)

    def idx(v):
        try:
            i = int(v)
        except (TypeError, ValueError):
            return None
        return i if 0 <= i < n else None

    plan = {"zooms": [], "icones": [], "listes": [], "compteurs": [], "parties": [], "cta": None}
    for v in brut.get("zooms") or []:
        i = idx(v)
        if i is not None and all(abs(mots[i]["start"] - z["debut"]) >= 3 for z in plan["zooms"]):
            plan["zooms"].append({"debut": mots[i]["start"], "fin": mots[i]["end"]})
    plan["zooms"] = sorted(plan["zooms"], key=lambda z: z["debut"])[:5]

    for ic in sorted(brut.get("icones") or [], key=lambda x: idx(x.get("mot")) or 0):
        i = idx(ic.get("mot"))
        if i is None or ic.get("icone") not in ICONES:
            continue
        t = mots[i]["start"]
        if t + 1.5 > duree or any(abs(t - x["debut"]) < 5 for x in plan["icones"]):
            continue
        heure = str(ic.get("heure") or "")
        plan["icones"].append({"icone": ic["icone"], "debut": t, "heure": heure if len(heure) <= 5 else ""})

    for li in brut.get("listes") or []:
        points = []
        for p in li.get("points") or []:
            i = idx(p.get("mot"))
            texte = str(p.get("texte") or "").strip()[:24]
            if i is not None and texte and (not points or mots[i]["start"] > points[-1]["debut"]):
                points.append({"texte": texte, "debut": mots[i]["start"]})
        if 2 <= len(points) <= 4:
            plan["listes"].append({"titre": str(li.get("titre") or "").strip().upper()[:28], "points": points,
                                   "fin": min(duree, points[-1]["debut"] + 3.0)})
    plan["listes"] = plan["listes"][:2]

    for c in brut.get("compteurs") or []:
        i = idx(c.get("mot"))
        try:
            valeur = float(c.get("valeur"))
        except (TypeError, ValueError):
            continue
        if i is not None and valeur > 0:
            plan["compteurs"].append({"debut": mots[i]["start"], "valeur": valeur,
                                      "texte": str(c.get("texte") or "")[:12],
                                      "libelle": str(c.get("libelle") or "")[:18]})
    plan["compteurs"] = plan["compteurs"][:3]

    for v in brut.get("parties") or []:
        i = idx(v)
        if i and i > 0:
            plan["parties"].append(mots[i]["start"])
    plan["parties"] = sorted(set(plan["parties"]))[:4]

    cta = brut.get("cta") or None
    if isinstance(cta, dict):
        i = idx(cta.get("mot"))
        texte = str(cta.get("texte") or "").strip().upper()[:20]
        if i is not None and texte and mots[i]["start"] >= duree - 8:
            plan["cta"] = {"texte": texte, "debut": mots[i]["start"]}
    return plan


# ---------------------------------------------------------------- visages et placement
def contient(a, b):
    """Les rectangles (x, y, w, h) se chevauchent-ils ?"""
    return not (a[0] + a[2] <= b[0] or b[0] + b[2] <= a[0] or a[1] + a[3] <= b[1] or b[1] + b[3] <= a[1])


def placer(taille, visage, preferences, obstacles=(), echelles=(1.0, 0.85, 0.72, 0.6)):
    """Première position libre parmi les préférences : ni sur le visage, ni sur les
    sous-titres, ni sur un autre élément à l'écran au même moment, dans la zone
    visible. Sinon l'élément est réduit, jusqu'à la plus petite échelle permise."""
    w0, h0 = taille

    def libre(x, y, w, h):
        boite = (x, y, w, h)
        dans_zone = x >= 0 and x + w <= W and y >= ZONE_HAUT and y + h <= ZONE_SOUS_TITRES
        hors_visage = not visage or not contient(boite, (visage[0] - MARGE_VISAGE, visage[1] - MARGE_VISAGE,
                                                         visage[2] + 2 * MARGE_VISAGE, visage[3] + 2 * MARGE_VISAGE))
        return dans_zone and hors_visage and not any(
            contient(boite, (o[0] - 16, o[1] - 16, o[2] + 32, o[3] + 32)) for o in obstacles)

    for echelle in echelles:
        w, h = int(w0 * echelle), int(h0 * echelle)
        for pref in preferences:
            if pref == "cote_visage":
                # le long du visage, du côté le plus large d'abord, de haut en bas
                cx = (visage[0] + visage[2] / 2) if visage else W / 2
                cotes = [40, W - 40 - w] if cx > W / 2 else [W - 40 - w, 40]
                for x in cotes:
                    for y in range(ZONE_HAUT + 10, ZONE_SOUS_TITRES - h + 1, 30):
                        if libre(x, y, w, h):
                            return x, y, echelle
                continue
            if pref == "haut_gauche":
                x, y = 50, ZONE_HAUT + 10
            elif pref == "haut_droite":
                x, y = W - 50 - w, ZONE_HAUT + 10
            elif pref == "sous_visage":
                x = (W - w) // 2
                y = int((visage[1] + visage[3] + MARGE_VISAGE) if visage else 900)
            elif pref == "au_dessus_sous_titres":
                x, y = (W - w) // 2, ZONE_SOUS_TITRES - h - 10
            else:
                continue
            if libre(x, y, w, h):
                return x, y, echelle
    return None


# ---------------------------------------------------------------- dessin des éléments
def carte_presentation(prenom, titre, c: Couleurs):
    f1, f2 = police("titre", 52), police("serif", 40)
    largeur = int(max(f1.getlength(prenom.upper()), f2.getlength(titre) if titre else 0) + 90)
    w, h = max(360, min(900, largeur)), 150 if titre else 104
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w, h), 26, fill=c.fond + (215,))
    d.rounded_rectangle((0, 0, 14, h), 7, fill=c.principale + (255,))
    d.text((44, 22), prenom.upper(), font=f1, fill=c.texte + (255,))
    if titre:
        d.text((46, 84), titre, font=f2, fill=c.principale_texte + (255,))
    return ombre(im)


def _pastille(R, c: Couleurs, s, epaisseur=9):
    taille = 2 * R + 40
    im = Image.new("RGBA", (taille, taille), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    m = taille // 2
    r = int(R * s)
    d.ellipse((m - r, m - r, m + r, m + r), fill=c.fond + (230,), outline=c.principale + (255,),
              width=max(2, int(epaisseur * s)))
    return im, d, m, r


def icone(nom, t, c: Couleurs, heure=""):
    """Icône animée, t en secondes depuis son apparition (durée 1,5 s)."""
    s = back_out(t / 0.35) * (1 - ease_in_out((t - 1.2) / 0.3))
    if s <= 0.02:
        return None
    im, d, m, r = _pastille(95, c, s)
    p = ease_out(t / 1.0)                # progression de l'animation intérieure
    A, T, F = c.principale + (255,), c.texte + (255,), c.fond + (255,)
    lw = max(2, int(7 * s))

    def L(*pts, col=T, w=lw):
        d.line([(m + x * r, m + y * r) for x, y in pts], fill=col, width=w, joint="curve")

    def rect(x0, y0, x1, y1, col=T, fill=None, w=lw, rad=0.08):
        d.rounded_rectangle((m + x0 * r, m + y0 * r, m + x1 * r, m + y1 * r), int(rad * r),
                            outline=col, fill=fill, width=w)

    def cercle(x, y, rr, col=T, fill=None, w=lw):
        d.ellipse((m + (x - rr) * r, m + (y - rr) * r, m + (x + rr) * r, m + (y + rr) * r), outline=col, fill=fill, width=w)

    if nom == "horloge":
        for k in range(12):
            a = k / 12 * 2 * math.pi
            L((0.78 * math.sin(a), -0.78 * math.cos(a)), (0.9 * math.sin(a), -0.9 * math.cos(a)), w=max(1, int(4 * s)))
        hh, mm = 11, 0
        if heure and ":" in heure:
            try:
                hh, mm = int(heure.split(":")[0]) % 12, int(heure.split(":")[1]) % 60
            except ValueError:
                pass
        am = (1 - p) * 6 * 2 * math.pi + p * (mm / 60 * 2 * math.pi)
        ah = (1 - p) * 1.5 * 2 * math.pi + p * ((hh + mm / 60) / 12 * 2 * math.pi)
        L((0, 0), (0.72 * math.sin(am), -0.72 * math.cos(am)))
        L((0, 0), (0.5 * math.sin(ah), -0.5 * math.cos(ah)), col=A, w=max(2, int(10 * s)))
        cercle(0, 0, 0.08, col=A, fill=A)
    elif nom == "argent":
        dy = -0.12 * math.sin(p * math.pi)
        rect(-0.6, -0.32 + dy, 0.6, 0.32 + dy, col=A, fill=A, rad=0.1)
        cercle(0, dy, 0.18, col=c.sur_principale + (255,), w=max(2, int(5 * s)))
        d.text((m, m + dy * r), "€", font=police("titre", 0.3 * r), fill=c.sur_principale + (255,), anchor="mm")
    elif nom == "telephone":
        dx = 0.06 * math.sin(t * 40) * (1 - p)
        rect(-0.3 + dx, -0.55, 0.3 + dx, 0.55, rad=0.15)
        L((-0.1 + dx, 0.4), (0.1 + dx, 0.4), col=A)
        for k in (1, 2):
            if p > 0.3 * k:
                d.arc((m + (0.25 + 0.15 * k) * r - 0.2 * r, m - 0.3 * r, m + (0.25 + 0.15 * k) * r + 0.2 * r, m + 0.1 * r),
                      -60, 60, fill=A, width=max(2, int(5 * s)))
    elif nom == "ordinateur":
        rect(-0.55, -0.4, 0.55, 0.25, fill=(c.principale + (int(200 * p),)), rad=0.06)
        L((-0.7, 0.4), (0.7, 0.4))
    elif nom == "calendrier":
        rect(-0.5, -0.45, 0.5, 0.5, rad=0.1)
        rect(-0.5, -0.45, 0.5, -0.18, col=A, fill=A, rad=0.1)
        L((-0.25, -0.58), (-0.25, -0.35), col=T)
        L((0.25, -0.58), (0.25, -0.35), col=T)
        for k in range(int(p * 6)):
            cercle(-0.28 + (k % 3) * 0.28, 0.02 + (k // 3) * 0.25, 0.06, col=A, fill=A, w=1)
    elif nom == "maison":
        L((-0.6, -0.02), (0, -0.55), (0.6, -0.02))
        rect(-0.42, -0.08, 0.42, 0.5, rad=0.02)
        rect(-0.12, 0.15, 0.12, 0.5, col=A, fill=A if p > 0.6 else None, rad=0.02)
    elif nom == "avion":
        x = -0.9 + 1.6 * p
        L((x - 0.35, 0), (x + 0.35, 0), col=T, w=max(2, int(9 * s)))
        L((x - 0.05, 0), (x - 0.22, -0.4), col=A)
        L((x - 0.05, 0), (x - 0.22, 0.4), col=A)
        L((x - 0.32, 0), (x - 0.42, -0.18), col=A)
    elif nom == "graphique":
        for k, haut in enumerate((0.25, 0.45, 0.7)):
            hk = haut * min(1, max(0, p * 3 - k))
            rect(-0.5 + k * 0.38, 0.45 - hk, -0.26 + k * 0.38, 0.45, col=A, fill=A, rad=0.03)
        if p > 0.7:
            L((-0.55, 0.0), (-0.1, -0.25), (0.15, -0.1), (0.55, -0.55), col=T)
    elif nom == "ampoule":
        cercle(0, -0.12, 0.38, col=A, fill=(c.principale + (int(255 * p),)))
        rect(-0.18, 0.28, 0.18, 0.5, rad=0.05)
        for k in range(5):
            a = (-0.9 + k * 0.45)
            if p > 0.5:
                L((0.55 * math.sin(a), -0.12 - 0.55 * math.cos(a)), (0.72 * math.sin(a), -0.12 - 0.72 * math.cos(a)), col=A)
    elif nom == "cible":
        for rr in (0.6, 0.4, 0.2):
            cercle(0, 0, rr, col=A if rr == 0.2 else T)
        x = 0.9 - 0.9 * p
        L((x, -x), (x + 0.45, -x - 0.45), col=T)
    elif nom == "coeur":
        k = 1 + 0.12 * math.sin(t * 9) * (1 - ease_in_out((t - 1.0) / 0.3))
        pts = [(16 * math.sin(u) ** 3 / 18 * k * 0.6, -(13 * math.cos(u) - 5 * math.cos(2 * u) - 2 * math.cos(3 * u)
                                                       - math.cos(4 * u)) / 18 * k * 0.6) for u in np.linspace(0, 2 * math.pi, 40)]
        d.polygon([(m + x * r, m + y * r) for x, y in pts], fill=A)
    elif nom == "message":
        rect(-0.6, -0.4, 0.6, 0.3, fill=c.principale + (255,), col=A, rad=0.2)
        d.polygon([(m - 0.3 * r, m + 0.25 * r), (m - 0.45 * r, m + 0.55 * r), (m - 0.05 * r, m + 0.28 * r)], fill=A)
        for k in range(3):
            on = (int(t * 4) % 3) >= k
            cercle(-0.28 + k * 0.28, -0.05, 0.07, col=c.sur_principale + (255,), fill=c.sur_principale + (255 if on else 90,), w=1)
    elif nom == "trophee":
        d.chord((m - 0.4 * r, m - 0.75 * r, m + 0.4 * r, m + 0.2 * r), 0, 180, fill=A)
        rect(-0.08, 0.15, 0.08, 0.38, col=A, fill=A)
        rect(-0.3, 0.38, 0.3, 0.5, col=A, fill=A)
        if p > 0.6:
            d.text((m, m - 0.42 * r), "★", font=police("titre", 0.3 * r), fill=c.sur_principale + (255,), anchor="mm")
    elif nom == "cadenas":
        ouvert = 0.2 * (1 - p)
        d.arc((m - 0.3 * r, m - (0.7 + ouvert) * r, m + 0.3 * r, m - (0.1 + ouvert) * r), 180, 360, fill=T, width=lw)
        rect(-0.42, -0.15, 0.42, 0.5, col=A, fill=A, rad=0.1)
    elif nom == "sablier":
        a = math.pi * ease_in_out((t - 0.6) / 0.5)
        pts = [(-0.4, -0.55), (0.4, -0.55), (0, 0), (0.4, 0.55), (-0.4, 0.55), (0, 0)]
        rot = [(x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)) for x, y in pts]
        d.polygon([(m + x * r, m + y * r) for x, y in rot[:3]], outline=T, fill=A, width=lw)
        d.polygon([(m + x * r, m + y * r) for x, y in rot[2:5] + [rot[5]]], outline=T, width=lw)
    elif nom == "voiture":
        x = -0.5 + 0.5 * p
        rect(x - 0.6, -0.1, x + 0.6, 0.3, col=A, fill=A, rad=0.1)
        rect(x - 0.35, -0.35, x + 0.3, -0.08, rad=0.1)
        for k in (-0.35, 0.35):
            cercle(x + k, 0.33, 0.13, col=T, fill=F)
    elif nom == "livre":
        ouvre = 0.5 * p
        d.polygon([(m, m - 0.4 * r), (m - (0.15 + ouvre) * r, m - 0.5 * r), (m - (0.15 + ouvre) * r, m + 0.4 * r), (m, m + 0.5 * r)],
                  fill=A)
        d.polygon([(m, m - 0.4 * r), (m + (0.15 + ouvre) * r, m - 0.5 * r), (m + (0.15 + ouvre) * r, m + 0.4 * r), (m, m + 0.5 * r)],
                  outline=T, width=lw)
    elif nom == "etoile":
        k = 0.55 * (0.6 + 0.4 * p)
        pts = []
        for j in range(10):
            a = j / 10 * 2 * math.pi - math.pi / 2 + p * 0.6
            rr = k if j % 2 == 0 else k * 0.45
            pts.append((m + rr * math.cos(a) * r, m + rr * math.sin(a) * r))
        d.polygon(pts, fill=A)
    elif nom == "valise":
        rect(-0.55, -0.25, 0.55, 0.45, col=A, fill=A, rad=0.1)
        rect(-0.2, -0.45, 0.2, -0.25, rad=0.05)
        L((-0.55, 0.05), (0.55, 0.05), col=c.sur_principale + (255,), w=max(2, int(5 * s)))
    elif nom == "eclair":
        e = 1 + 0.15 * math.sin(t * 25) * (1 - p)
        pts = [(0.1, -0.6), (-0.3, 0.08), (0.0, 0.08), (-0.12, 0.6), (0.32, -0.12), (0.02, -0.12)]
        d.polygon([(m + x * r * e, m + y * r * e) for x, y in pts], fill=A)
    return ombre(im, 14, 120)


def liste(titre, points, t, fin, c: Couleurs):
    """Encadré qui apparaît, puis chaque point qui se coche au moment où il est dit."""
    t0 = points[0]["debut"] - 0.15
    k_panneau = ease_out((t - t0) / 0.35)
    k_sortie = ease_in_out((t - fin) / 0.35)
    if k_panneau <= 0 or k_sortie >= 1:
        return None
    ft, fp = police("titre", 28), police("serif", 50)
    largeur = int(max(ft.getlength(titre) + 80, max(fp.getlength(p["texte"]) for p in points) + 170))
    pw, ph = max(520, min(960, largeur)), 90 + 76 * len(points)
    im = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, pw, ph), 34, fill=c.fond + (int(205 * k_panneau),))
    if titre:
        d.text((40, 26), titre, font=ft, fill=c.principale_texte + (int(255 * k_panneau),))
    for i, p in enumerate(points):
        k = ease_out((t - p["debut"]) / 0.3)
        if k <= 0:
            continue
        y, x, a = 80 + i * 76, 40 + int((1 - k) * 60), int(255 * k)
        d.ellipse((x, y, x + 52, y + 52), fill=c.principale + (a,))
        kc = ease_out((t - p["debut"] - 0.12) / 0.25)
        p1, p2, p3 = (x + 13, y + 27), (x + 23, y + 38), (x + 41, y + 15)
        coche = c.sur_principale + (a,)
        if 0 < kc < 0.4:
            q = kc / 0.4
            d.line((p1, (p1[0] + (p2[0] - p1[0]) * q, p1[1] + (p2[1] - p1[1]) * q)), fill=coche, width=7)
        elif kc >= 0.4:
            q = (kc - 0.4) / 0.6
            d.line((p1, p2), fill=coche, width=7)
            d.line((p2, (p2[0] + (p3[0] - p2[0]) * q, p2[1] + (p3[1] - p2[1]) * q)), fill=coche, width=7)
        d.text((x + 78, y - 2), p["texte"], font=fp, fill=c.texte + (a,))
    img, pad = ombre(im, 20, 120)
    if k_sortie > 0:
        img.putalpha(img.getchannel("A").point(lambda v: int(v * (1 - k_sortie))))
    return img, pad, int((1 - k_panneau) * 40 + k_sortie * 40)


def compteur(valeur, texte, libelle, t, c: Couleurs):
    """Le chiffre défile de 0 à sa valeur en 0,8 s, visible 2,2 s."""
    s = back_out(t / 0.35) * (1 - ease_in_out((t - 1.9) / 0.3))
    if s <= 0.02:
        return None
    v = valeur * ease_out(t / 0.8)
    entier = valeur == int(valeur)
    nombre = f"{int(round(v)):,}".replace(",", " ") if entier else f"{v:.1f}".replace(".", ",")
    if t >= 0.8 and texte:
        nombre = texte
    f1, f2 = police("titre", 120 * s), police("serif", 44 * s)
    w = int(max(f1.getlength(nombre), f2.getlength(libelle) if libelle else 0) + 80)
    h = int(150 * s + (60 * s if libelle else 0))
    if w < 20 or h < 20:
        return None
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w, h), int(30 * s), fill=c.fond + (215,))
    d.text((w / 2, 80 * s), nombre, font=f1, fill=c.principale_texte + (255,), anchor="mm")
    if libelle:
        d.text((w / 2, 165 * s), libelle, font=f2, fill=c.texte + (255,), anchor="mm")
    return ombre(im, 16, 120)


def bouton(texte, t, c: Couleurs):
    """Bouton d'appel à l'action qui pulse, avec une flèche qui rebondit."""
    k = back_out(t / 0.45)
    s = k * (1 + 0.035 * math.sin(t * 2 * math.pi * 1.4))
    f = police("titre", 46)
    bw0 = max(420, int(f.getlength(texte) + 120))
    bw, bh = int(bw0 * s), int(120 * s)
    if bw < 20:
        return None
    im = Image.new("RGBA", (bw0 + 80, 330), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = im.width // 2
    d.rounded_rectangle((cx - bw // 2, 20, cx + bw // 2, 20 + bh), bh // 2, fill=c.principale + (255,))
    fs = police("titre", max(10, 46 * s))
    d.text((cx, 20 + bh / 2), texte, font=fs, fill=c.sur_principale + (255,), anchor="mm")
    rebond = abs(math.sin(t * math.pi * 2.2)) * 26
    ay, a = 20 + bh + 40 + rebond, int(255 * min(1, k))
    d.polygon([(cx - 34, ay), (cx + 34, ay), (cx, ay + 44)], fill=c.texte + (a,))
    d.rectangle((cx - 11, ay - 44, cx + 11, ay + 2), fill=c.texte + (a,))
    return ombre(im, 18, 120)


# ---------------------------------------------------------------- la scène complète
class Scene:
    """Tout ce qui se dessine sur une vidéo, à partir du plan et des visages.

    coupes   : morceaux gardés (temps de la vidéo montée), pour le recadrage alterné
    visages  : boîte du visage (x, y, w, h) par image, ou None (analyse préalable)
    """

    def __init__(self, plan, design, coupes, visages, duree, recadrage=True):
        self.plan, self.c, self.duree = plan, couleurs_de(design), duree
        self.recadrage = recadrage
        self.bornes, acc = [], 0.0
        for a, b in coupes:
            self.bornes.append(acc)
            acc += b - a
        self.visages = visages
        # point d'ancrage du zoom : centre du visage, fixe sur chaque morceau (pas de tremblement)
        self.ancres = []
        for k, debut in enumerate(self.bornes):
            fin = self.bornes[k + 1] if k + 1 < len(self.bornes) else duree
            boites = [v for v in visages[int(debut * FPS):int(fin * FPS)] if v is not None]
            if boites:
                b = np.median(np.array(boites), axis=0)
                self.ancres.append((b[0] + b[2] / 2, b[1] + b[3] / 2))
            else:
                self.ancres.append((W / 2, 600))
        prenom = (design.get("prenom") or "").strip()
        self.carte = carte_presentation(prenom, (design.get("titre") or "").strip(), self.c) if prenom else None
        self.positions = {}

    def morceau(self, t):
        k = 0
        for i, s in enumerate(self.bornes):
            if t >= s:
                k = i
        return k

    def zoom(self, t):
        base = 1.07 if self.recadrage and self.morceau(t) % 2 else 1.0
        z = base
        for p in self.plan.get("zooms", []):
            s, e = p["debut"], p["fin"]
            if s - 0.05 <= t <= e + 0.25:
                k = ease_out((t - s) / 0.22) * (1 - ease_in_out((t - e) / 0.25))
                z = max(z, base + (1.16 - base) * k)
        return z

    def visage_ecran(self, n, t):
        """Boîte du visage dans l'image finale (après recadrage)."""
        v = self.visages[min(n, len(self.visages) - 1)] if self.visages else None
        if v is None:
            return None
        z = self.zoom(t)
        cx, cy = self.ancres[self.morceau(t)]
        return (cx + (v[0] - cx) * z, cy + (v[1] - cy) * z, v[2] * z, v[3] * z)

    def position(self, cle, taille, debut, fin, preferences, echelles=(1.0, 0.85, 0.72, 0.6)):
        """Position choisie une fois pour toutes à l'apparition de l'élément, en évitant
        les éléments déjà placés qui sont à l'écran en même temps."""
        if cle not in self.positions:
            self._placer_tout()
        return self.positions.get(cle)

    def _placer_tout(self):
        """Place tous les éléments dans l'ordre d'apparition (déterministe : chaque
        morceau de la passe parallèle obtient exactement les mêmes positions)."""
        if self.positions:
            return
        p, c = self.plan, self.c
        elements = []
        if self.carte:
            img, pad = self.carte
            elements.append((0.6, 4.7, "carte", (img.width - 2 * pad, img.height - 2 * pad),
                             ["haut_gauche", "haut_droite", "sous_visage"], (1.0, 0.85, 0.72, 0.6)))
        for i, ic in enumerate(p.get("icones", [])):
            elements.append((ic["debut"], ic["debut"] + 1.55, ("icone", i), (230, 230),
                             ["cote_visage", "haut_droite", "haut_gauche", "sous_visage"], (1.0, 0.85, 0.72, 0.6)))
        for i, cp in enumerate(p.get("compteurs", [])):
            elements.append((cp["debut"], cp["debut"] + 2.2, ("compteur", i), (420, 230),
                             ["cote_visage", "haut_droite", "haut_gauche", "sous_visage"], (1.0, 0.85, 0.72, 0.6)))
        for i, li in enumerate(p.get("listes", [])):
            rendu = liste(li["titre"], li["points"], li["points"][-1]["debut"] + 1, li["fin"], c)
            if rendu:
                img, pad, _ = rendu
                elements.append((li["points"][0]["debut"] - 0.2, li["fin"] + 0.4, ("liste", i),
                                 (img.width - 2 * pad, img.height - 2 * pad),
                                 ["sous_visage", "au_dessus_sous_titres", "haut_gauche", "haut_droite", "cote_visage"],
                                 (1.0, 0.85, 0.72, 0.6, 0.52, 0.45)))
        places = []
        for debut, fin, cle, taille, prefs, echelles in sorted(elements, key=lambda e: e[0]):
            obstacles = [b for (d, f, b) in places if d < fin and debut < f]
            pos = placer(taille, self.visage_ecran(int(debut * FPS), debut), prefs, obstacles, echelles)
            self.positions[cle] = pos
            if pos:
                places.append((debut, fin, (pos[0], pos[1], int(taille[0] * pos[2]), int(taille[1] * pos[2]))))

    def transformer(self, frame, t):
        import cv2
        z = self.zoom(t)
        if z <= 1.0001:
            return frame
        cx, cy = self.ancres[self.morceau(t)]
        M = np.float32([[z, 0, cx - z * cx], [0, z, cy - z * cy]])
        return cv2.warpAffine(frame, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

    def dessiner(self, frame, t):
        c = self.c
        # flash aux changements de partie
        for f in self.plan.get("parties", []):
            if 0 <= t - f < 0.18:
                a = 0.35 * (1 - (t - f) / 0.18)
                frame[:] = (frame * (1 - a) + 255 * a).astype(np.uint8)
        # barre de progression
        w = int(W * min(1, t / self.duree))
        frame[0:10, 0:W] = (frame[0:10, 0:W] * 0.55).astype(np.uint8)
        frame[0:10, 0:w] = c.principale[::-1]
        # carte de présentation
        if self.carte and 0.6 <= t <= 4.7:
            img, pad = self.carte
            taille = (img.width - 2 * pad, img.height - 2 * pad)
            pos = self.position("carte", taille, 0.6, 4.7, [])
            if pos:
                if pos[2] < 1:
                    img = img.resize((int(img.width * pos[2]), int(img.height * pos[2])))
                    pad = int(pad * pos[2])
                k_in, k_out = back_out((t - 0.6) / 0.5), ease_in_out((t - 4.2) / 0.4)
                # glisse depuis la gauche avec un léger rebond, ressort par la gauche
                x = int(-img.width + (pos[0] + pad + img.width) * k_in - (pos[0] + img.width) * k_out)
                coller(frame, img, x - pad, pos[1] - pad, 1 - k_out)
        # icônes
        for i, ic in enumerate(self.plan.get("icones", [])):
            dt = t - ic["debut"]
            if 0 <= dt <= 1.55:
                rendu = icone(ic["icone"], dt, c, ic.get("heure", ""))
                pos = self.position(("icone", i), (230, 230), ic["debut"], ic["debut"] + 1.55, [])
                if rendu and pos:
                    img, pad = rendu
                    if pos[2] < 1:
                        img = img.resize((int(img.width * pos[2]), int(img.height * pos[2])))
                    coller(frame, img, pos[0] - int(pad * pos[2]) - 20, pos[1] - int(pad * pos[2]) - 20)
        # compteurs
        for i, cp in enumerate(self.plan.get("compteurs", [])):
            dt = t - cp["debut"]
            if 0 <= dt <= 2.2:
                rendu = compteur(cp["valeur"], cp["texte"], cp["libelle"], dt, c)
                pos = self.position(("compteur", i), (420, 230), cp["debut"], cp["debut"] + 2.2, [])
                if rendu and pos:
                    img, pad = rendu
                    if pos[2] < 1:
                        img = img.resize((int(img.width * pos[2]), int(img.height * pos[2])))
                    coller(frame, img, pos[0] - int(pad * pos[2]), pos[1] - int(pad * pos[2]))
        # listes
        for i, li in enumerate(self.plan.get("listes", [])):
            if li["points"][0]["debut"] - 0.2 <= t <= li["fin"] + 0.4:
                rendu = liste(li["titre"], li["points"], t, li["fin"], c)
                if rendu:
                    img, pad, dy = rendu
                    taille = (img.width - 2 * pad, img.height - 2 * pad)
                    pos = self.position(("liste", i), taille, li["points"][0]["debut"], li["fin"], [])
                    if pos:
                        if pos[2] < 1:
                            img = img.resize((int(img.width * pos[2]), int(img.height * pos[2])))
                        coller(frame, img, pos[0] - int(pad * pos[2]), pos[1] + dy - int(pad * pos[2]))
        # bouton d'appel à l'action
        cta = self.plan.get("cta")
        if cta and t >= cta["debut"]:
            rendu = bouton(cta["texte"], t - cta["debut"], c)
            if rendu:
                img, pad = rendu
                # sous les sous-titres : seule place sûre en fin de vidéo, jamais sur le visage
                coller(frame, img, (W - img.width) // 2, 1462 - pad)
        return frame


# ---------------------------------------------------------------- bruitages
def bruitages(plan, duree, chemin, carte=False):
    """Piste de bruitages discrets (souffle, « pop ») environ 20 dB sous la voix."""
    import soundfile as sf
    sr = 48000
    n = int(duree * sr) + sr
    out = np.zeros(n, np.float32)
    rng = np.random.default_rng(1)

    def ajouter(t, sig, gain):
        i = int(max(0, t) * sr)
        j = min(n, i + len(sig))
        if j > i:
            out[i:j] += sig[:j - i] * gain

    def pop(f0=900):
        tt = np.arange(int(0.09 * sr)) / sr
        return np.sin(2 * np.pi * (f0 + 900 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 45)

    def souffle(d=0.45):
        m = int(d * sr)
        x = rng.normal(0, 1, m)
        env = np.sin(np.linspace(0, np.pi, m)) ** 2
        cs = np.cumsum(np.concatenate([[0], x]))
        larg = np.linspace(40, 6, m).astype(int)
        idx = np.arange(m)
        a0 = np.maximum(0, idx - larg)
        y = (cs[idx] - cs[a0]) / np.maximum(1, idx - a0)
        return y / (np.abs(y).max() + 1e-9) * env

    if carte:
        ajouter(0.6, souffle(), 0.10)
    for ic in plan.get("icones", []):
        ajouter(ic["debut"], pop(700), 0.14)
    for cp in plan.get("compteurs", []):
        ajouter(cp["debut"], pop(1100), 0.12)
    for li in plan.get("listes", []):
        for p in li["points"]:
            ajouter(p["debut"], pop(1000), 0.14)
    for f in plan.get("parties", []):
        ajouter(f - 0.2, souffle(0.35), 0.08)
    if plan.get("cta"):
        ajouter(plan["cta"]["debut"], pop(600), 0.16)
    sf.write(chemin, out, sr)
