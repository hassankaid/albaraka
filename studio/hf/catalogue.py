"""Bibliothèque AL BARAKA : les recettes de motion design que l'IA peut choisir.

Claude ne dessine rien : il choisit dans ce catalogue une recette de moment fort et
quelques appuis, à des mots précis de la transcription. nettoyer() ne garde que ce qui
respecte les règles (index valides, durées, écarts, nombre d'éléments), assembler.py
calcule les positions et socle.js anime.
"""
from __future__ import annotations

import json
import os

ICI = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(ICI, "icones.json"), encoding="utf-8") as f:
    ICONES = sorted(json.load(f))

STYLES = ("sobre", "signature", "energique")
FORTS = ("mot_derriere", "carte_reduite", "ambiance")
APPUIS = ("punch", "entoure", "icone_carte", "liste", "compteur", "bandeau", "poussee", "flash", "citation")
AMBIANCES = ("pluie", "lumiere", "nuit", "poussiere")

PROMPT = """Tu es le directeur artistique des vidéos verticales AL BARAKA (Reels, TikTok).
On te donne la transcription horodatée d'une vidéo face caméra déjà montée. Tu choisis
le motion design dans notre bibliothèque. Tu ne dessines rien : tu choisis des recettes
et le mot exact où chacune démarre.

Règle d'or : la parole reste au premier plan. UN moment fort, et peu d'appuis.

MOMENT FORT (exactement un, sur l'idée centrale de la vidéo) :
- "mot_derriere" : NOTRE SIGNATURE, à choisir par défaut. Un mot géant apparaît DERRIÈRE
  l'orateur (effet de profondeur). Idéal quand un mot concret ou imagé porte l'idée (pluie, route, merci…).
  {{"recette": "mot_derriere", "mot": i, "fin_mot": j, "texte": "un seul mot dit dans la vidéo, 12 lettres max, casse naturelle", "echo_mot": k ou null}}
  echo_mot : si ce même mot est redit plus tard, il réapparaît à cet index.
- "carte_reduite" : la vidéo se réduit en carte, 1 ou 2 tuiles illustrées apparaissent à côté.
  {{"recette": "carte_reduite", "mot": i, "fin_mot": j, "tuiles": [{{"icone": "...", "legende": "2 mots max", "mot": k}}]}}
  Seulement pour une comparaison ou deux idées opposées (ex. glace / parapluie). Peut aussi
  servir d'APPUI (même format) quand le moment fort est un mot_derriere.
- "ambiance" : tout un passage est habillé d'une atmosphère.
  {{"recette": "ambiance", "type": "pluie|lumiere|nuit|poussiere", "mot": i, "fin_mot": j, "eclat_mot": k ou null}}
  pluie : épreuve, difficulté (eclat_mot = coup de tonnerre sur un mot fort). lumiere : espoir,
  foi, gratitude. nuit : solitude, doute. poussiere (d'or) : réussite, valeur, baraka.
Durée du moment fort : 1,5 à 5 s. Si l'idée forte est dite dès le début, fais-le commencer au mot 0
(la première image sert de miniature et doit déjà être forte).

APPUIS ({nb_appuis} au maximum, chacun à au moins 1,5 s du précédent, jamais pendant le moment fort) :
- "punch" {{"mot": i}} : coup de zoom sur un mot qui claque.
- "entoure" {{"sous_titre": s}} : le mot clé du sous-titre s est entouré à la main.
- "icone_carte" {{"mot": i, "fin_mot": j, "icone": "...", "legende": "2 mots max"}} : sur un mot concret.
- "liste" {{"titre": "3 mots max", "points": [{{"texte": "3 mots max", "mot": k}}]}} : seulement si l'orateur énumère 2 à 4 éléments.
- "compteur" {{"mot": i, "valeur": nombre, "prefixe": "", "suffixe": "", "legende": "2 mots max"}} : seulement si un chiffre précis est dit.
- "bandeau" {{"mot": i, "fin_mot": j, "texte": "1 ou 2 mots"}} : un mot d'ordre qui défile (énergie, pas pour un sujet grave).
- "poussee" {{"mot": i, "fin_mot": j}} : la caméra s'approche lentement sur une phrase émouvante.
- "flash" {{"mot": i}} : flash léger quand la vidéo change de partie.
- "citation" {{"mot": i, "fin_mot": j, "texte": "la phrase à retenir, 12 mots max"}}.

Icônes disponibles (nom exact obligatoire) : {icones}

Règles :
- Sujet religieux ou grave : sobriété. Pas de punch, bandeau, flash ni énergie ; préfère
  mot_derriere, ambiance lumiere ou poussiere, citation, poussee. Ne décore jamais le nom de Dieu
  (pas de mot géant, pas d'icône, pas d'entourage sur ce nom).
- Rien sur les 0,4 premières secondes sauf le moment fort.
- Les textes reprennent les mots de l'orateur, en français correct, courts.
- "cta" : seulement si l'orateur appelle à agir dans les 8 dernières secondes (abonne-toi,
  commente, lien en bio…) : {{"texte": "20 caractères max", "mot": i}}, sinon null.
- "ton" : le style qui convient au propos : "sobre" (grave, intime, religieux), "signature"
  (par défaut) ou "energique" (motivation, business, rythme rapide).

Durée de la vidéo : {duree:.1f} s.

Mots (index: mot [début en secondes]) :
{mots}

Sous-titres (s: petite ligne | MOT CLÉ) :
{sous_titres}

Réponds UNIQUEMENT en JSON :
{{"ton": "...", "fort": {{...}}, "appuis": [{{"recette": "...", ...}}], "cta": null}}"""


def nb_appuis(duree):
    """2 appuis jusqu'à 20 s, puis un de plus par tranche de 15 s, 6 au plus."""
    return int(min(6, 2 + max(0, duree - 20) // 15))


def prompt(mots, sous_titres, duree):
    lignes = "\n".join(f"{i}: {w['text']} [{w['start']:.2f}]" for i, w in enumerate(mots))
    st = "\n".join(f"{k}: {c['small']} | {c['big'].upper()}" for k, c in enumerate(sous_titres))
    return PROMPT.format(nb_appuis=nb_appuis(duree), icones=", ".join(ICONES), duree=duree, mots=lignes, sous_titres=st)


def _court(v, n):
    """Texte court, coupé entre deux mots plutôt qu'au milieu d'un mot."""
    s = " ".join(str(v or "").split())
    if len(s) <= n:
        return s
    coupe = s[:n + 1].rsplit(" ", 1)[0]
    return (coupe if len(coupe) >= n // 2 else s[:n]).strip()


def nettoyer(brut, mots, sous_titres, duree):
    """Plan de l'IA → plan sûr. Les index de mots deviennent des temps ; tout ce qui
    sort des règles est retiré plutôt que corrigé au hasard."""
    n = len(mots)

    def t_mot(i):
        try:
            i = int(i)
        except (TypeError, ValueError):
            return None
        return mots[i]["start"] if 0 <= i < n else None

    def fin_mot(i, defaut):
        try:
            i = int(i)
        except (TypeError, ValueError):
            return defaut
        return mots[i]["end"] if 0 <= i < n else defaut

    ton = brut.get("ton") if brut.get("ton") in STYLES else "signature"

    def fort(f, principal):
        """Éléments d'une recette de moment fort (le principal, ou une carte réduite en appui)."""
        r = f.get("recette")
        t = t_mot(f.get("mot"))
        if r not in FORTS or t is None:
            return []
        if principal and t < 1.0:
            t = 0.0  # l'idée forte est au début : elle est déjà là sur la première image
        t = t if principal else max(0.4, t)
        fin = min(duree, max(t + 1.5, min(t + 5.0, fin_mot(f.get("fin_mot"), t + 3.0) + 0.3)))
        e = {"recette": r, "t": round(t, 2), "fin": round(fin, 2), "fort": principal}
        if r == "mot_derriere":
            texte = _court(f.get("texte"), 12).strip(".,;:!?«»\"'")
            if not texte:
                return []
            # « Ambulance » en début de phrase → « ambulance » ; un nom propre garde sa majuscule
            dits = {w["text"].strip(".,;:!?«»\"'").split("'")[-1] for w in mots}
            if texte[:1].isupper() and texte[1:].islower() and texte.lower() in dits and texte not in dits:
                texte = texte.lower()
            out = [{**e, "texte": texte}]
            te = t_mot(f.get("echo_mot"))
            if te is not None and te > fin + 1.0:
                out.append({**e, "t": round(te, 2), "fin": round(min(duree, te + 1.6), 2), "texte": texte, "echo": True})
            return out
        if r == "carte_reduite":
            tuiles = []
            for u in (f.get("tuiles") or [])[:2]:
                if isinstance(u, dict) and u.get("icone") in ICONES:
                    tu = t_mot(u.get("mot"))
                    tu = t + 0.3 + 0.6 * len(tuiles) if tu is None or not t <= tu < fin - 0.5 else tu
                    tuiles.append({"icone": u["icone"], "legende": _court(u.get("legende"), 22), "t": round(tu, 2)})
            return [{**e, "tuiles": tuiles}] if tuiles else []
        if r == "ambiance" and f.get("type") in AMBIANCES:
            ec = t_mot(f.get("eclat_mot"))
            return [{**e, "type": f["type"], **({"eclat": round(ec, 2)} if ec is not None and t <= ec < fin else {})}]
        return []

    elements = fort(brut.get("fort") if isinstance(brut.get("fort"), dict) else {}, True)

    occupe = [(e["t"], e["fin"]) for e in elements]
    pris = []
    for a in brut.get("appuis") or []:
        if not isinstance(a, dict) or a.get("recette") not in APPUIS + ("carte_reduite",) or len(pris) >= nb_appuis(duree):
            continue
        r = a["recette"]
        if r == "carte_reduite":
            if not elements or elements[0]["recette"] != "mot_derriere":
                continue
            carte = fort(a, False)
            if not carte:
                continue
            e = carte[0]
        elif r == "entoure":
            try:
                s = int(a.get("sous_titre"))
            except (TypeError, ValueError):
                continue
            if not 0 <= s < len(sous_titres):
                continue
            t = sous_titres[s]["start"] + 0.35
            e = {"recette": r, "st": s, "t": round(t, 2), "fin": round(t + 0.6, 2)}
        elif r == "liste":
            points = []
            for p in (a.get("points") or [])[:4]:
                tp = t_mot(p.get("mot")) if isinstance(p, dict) else None
                if tp is not None and _court(p.get("texte"), 28):
                    points.append({"texte": _court(p.get("texte"), 28), "t": round(tp, 2)})
            points.sort(key=lambda p: p["t"])
            if len(points) < 2:
                continue
            t = max(0.4, points[0]["t"] - 0.6)
            e = {"recette": r, "titre": _court(a.get("titre"), 24), "points": points, "t": round(t, 2),
                 "fin": round(min(duree, points[-1]["t"] + 1.8), 2)}
        else:
            t = t_mot(a.get("mot"))
            if t is None:
                continue
            t = max(0.4, t)
            if r in ("punch", "flash"):
                e = {"recette": r, "t": round(t, 2), "fin": round(t + 0.8, 2)}
            else:
                fin = min(duree, max(t + 1.4, min(t + 4.5, fin_mot(a.get("fin_mot"), t + 2.0) + 0.3)))
                e = {"recette": r, "t": round(t, 2), "fin": round(fin, 2)}
                if r == "icone_carte":
                    if a.get("icone") not in ICONES:
                        continue
                    e.update(icone=a["icone"], legende=_court(a.get("legende"), 18))
                elif r == "compteur":
                    try:
                        valeur = float(str(a.get("valeur")).replace(" ", "").replace(",", "."))
                    except ValueError:
                        continue
                    if not 0 < valeur < 1e9:
                        continue
                    e.update(valeur=valeur, prefixe=_court(a.get("prefixe"), 3), suffixe=_court(a.get("suffixe"), 6),
                             legende=_court(a.get("legende"), 18), fin=round(min(duree, t + 2.4), 2))
                elif r == "bandeau":
                    if not _court(a.get("texte"), 16):
                        continue
                    e["texte"] = _court(a.get("texte"), 16).upper()
                elif r == "citation":
                    if not _court(a.get("texte"), 90):
                        continue
                    e["texte"] = _court(a.get("texte"), 90)
                    e["fin"] = round(min(duree, max(e["fin"], t + 2.5)), 2)
                elif r == "poussee":
                    e["echelle"] = 1.07
        # écart d'1,5 s avec les autres appuis ; pas d'élément visuel par-dessus le moment fort
        # (sauf ceux qui ne cachent rien : entourer, pousser)
        if any(abs(e["t"] - p) < 1.5 for p in pris):
            continue
        if r not in ("entoure", "poussee", "punch") and any(a0 - 0.2 < e["fin"] and e["t"] < b0 + 0.2 for a0, b0 in occupe):
            continue
        if ton == "sobre" and r in ("punch", "bandeau", "flash"):
            continue
        pris.append(e["t"])
        elements.append(e)

    cta = None
    c = brut.get("cta")
    if isinstance(c, dict) and _court(c.get("texte"), 20):
        tc = t_mot(c.get("mot"))
        if tc is not None and tc >= duree - 8 and tc < duree - 1.2:
            cta = {"texte": _court(c.get("texte"), 20), "t": round(tc, 2)}
    elements.sort(key=lambda e: e["t"])
    return {"ton": ton, "elements": elements, "cta": cta}
