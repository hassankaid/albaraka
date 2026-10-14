"""Sous-titres corrigés par l'élève (demande de Sidali, 14/10/2026).

Les sous-titres de l'IA restent dans travail.json ; l'élève enregistre ses corrections dans
ses réglages (sous_titres.corrections), appliquées à chaque rendu :
  - une correction vise le sous-titre de l'IA qui a exactement le même texte ;
  - si les sous-titres ont été regroupés (coupes changées), les mots corrigés sont repris
    là où ils réapparaissent (mots de 4 lettres et plus : « Sidaly » → « Sidali »).
Même logique côté site : src/lib/studio/sousTitres.ts (les deux doivent rester identiques).
"""
import re

MAX_PETIT, MAX_GRAND, MAX_CORRECTIONS = 90, 40, 400
PONCTUATION = ".,;:!?«»\"'’()…-"


def nettoyer(texte, longueur):
    """Texte saisi par l'élève → texte sûr pour les sous-titres (pas de balise ASS ni de saut de ligne)."""
    t = re.sub(r"[{}\\<>\x00-\x1f\x7f]", " ", str(texte or ""))
    return re.sub(r"\s+", " ", t).strip()[:longueur].strip()


def _cle(petit, grand):
    return (str(petit or "").strip(), str(grand or "").strip())


def _coeur(mot):
    """« (Sidaly), » → ("(", "Sidaly", "),")"""
    debut = len(mot) - len(mot.lstrip(PONCTUATION))
    fin = len(mot.rstrip(PONCTUATION))
    if fin <= debut:
        return mot, "", ""
    return mot[:debut], mot[debut:fin], mot[fin:]


def _normal(mot):
    return _coeur(mot)[1].lower()


def corrections_valides(corrections):
    out = []
    for c in (corrections or [])[:MAX_CORRECTIONS]:
        if not isinstance(c, dict):
            continue
        out.append({"small_ia": str(c.get("small_ia") or ""), "big_ia": str(c.get("big_ia") or ""),
                    "small": nettoyer(c.get("small"), MAX_PETIT), "big": nettoyer(c.get("big"), MAX_GRAND)})
    return out


def mots_corriges(corrections):
    """Mots changés un pour un ({« sidaly »: « Sidali »}) ; un mot corrigé de deux façons est ignoré."""
    vus = {}
    for c in corrections:
        avant = (c["small_ia"] + " " + c["big_ia"]).split()
        apres = (c["small"] + " " + c["big"]).split()
        if len(avant) != len(apres):
            continue
        for a, b in zip(avant, apres):
            ka, cb = _normal(a), _coeur(b)[1]
            if len(ka) >= 4 and cb and _coeur(a)[1] != cb:
                vus.setdefault(ka, set()).add(cb)
    return {k: next(iter(v)) for k, v in vus.items() if len(v) == 1}


def remplacer_mots(texte, carte):
    if not carte or not texte:
        return texte
    out = []
    for mot in str(texte).split(" "):
        avant, coeur, apres = _coeur(mot)
        out.append(avant + carte[coeur.lower()] + apres if coeur and coeur.lower() in carte else mot)
    return " ".join(out)


def appliquer(sous_titres, corrections):
    """Sous-titres de l'IA + corrections de l'élève → sous-titres du rendu (mêmes temps)."""
    corrections = corrections_valides(corrections)
    if not corrections:
        return [dict(c) for c in sous_titres]
    exactes = {_cle(c["small_ia"], c["big_ia"]): c for c in corrections}
    carte = mots_corriges(corrections)
    out = []
    for c in sous_titres:
        k = exactes.get(_cle(c.get("small"), c.get("big")))
        if k is not None and (k["small"] or k["big"]):
            out.append({**c, "small": k["small"], "big": k["big"]})
        else:
            out.append({**c, "small": remplacer_mots(c.get("small"), carte), "big": remplacer_mots(c.get("big"), carte)})
    return out


def corriger_plan(plan, corrections):
    """Textes du motion design (mot géant, listes, cartes) : mêmes mots corrigés que les sous-titres."""
    carte = mots_corriges(corrections_valides(corrections))
    if not carte or not plan:
        return plan

    def visite(v, cle=None):
        if isinstance(v, dict):
            return {k: visite(x, k) for k, x in v.items()}
        if isinstance(v, list):
            return [visite(x) for x in v]
        if isinstance(v, str) and cle in ("texte", "titre", "legende"):
            return remplacer_mots(v, carte)
        return v

    return visite(plan)
