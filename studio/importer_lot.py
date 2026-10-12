"""Studio vidéo AL BARAKA, outil Voix off : import en lot dans la banque (vidéos et sons
du OneDrive de Sidali, téléchargés puis décompressés sur un poste de l'équipe).

    python3 -I studio/importer_lot.py videos <dossier>   # chaque sous-dossier = une catégorie (CASH, WORKING…)
    python3 -I studio/importer_lot.py sons <dossier>     # sous-dossiers Humming, Nasheed, Maher Zain, SFX

Variables d'environnement :
  JOB, JETON                   un job d'import (studio_banque_jobs, type « import ») et son jeton
  FONCTION_BANQUE              URL de l'edge function studio-banque (liens de dépôt)
  SUPABASE_URL, SUPABASE_ANON  pour enregistrer les fichiers (studio_banque_import_enregistrer)

Chaque fichier est rangé par son empreinte (sha256) : un doublon, dans le lot ou déjà en
banque, n'est déposé qu'une fois. Les images et les fichiers inconnus sont ignorés.
L'indexation se lance ensuite depuis la page Banque de vidéos.
"""
from __future__ import annotations

import concurrent.futures as cf
import hashlib
import json
import os
import subprocess
import sys
import time
import unicodedata
import urllib.request

VIDEOS = {".mp4", ".mov", ".m4v", ".webm"}
SONS = {".mp3", ".m4a", ".wav", ".aac", ".ogg", ".mp4"}
CATEGORIES_SONS = {"humming": "humming", "nasheed": "nasheed", "maher zain": "maher_zain", "sfx": "sfx"}
LOT = 40
TYPES = {".mp4": "video/mp4", ".m4v": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".mp3": "audio/mpeg",
         ".m4a": "audio/mp4", ".wav": "audio/wav", ".aac": "audio/aac", ".ogg": "audio/ogg"}


def _http(url, corps=None, methode=None, entetes=None, delai=120):
    donnees = corps if isinstance(corps, (bytes, type(None))) else json.dumps(corps).encode()
    r = urllib.request.Request(url, data=donnees, method=methode, headers=entetes or {})
    with urllib.request.urlopen(r, timeout=delai) as rep:
        return rep.read()


def rpc(fonction, **params):
    cle = os.environ["SUPABASE_ANON"]
    brut = _http(f"{os.environ['SUPABASE_URL']}/rest/v1/rpc/{fonction}", params,
                 entetes={"apikey": cle, "Authorization": f"Bearer {cle}", "Content-Type": "application/json"})
    return json.loads(brut) if brut else None


def depots(chemins):
    return json.loads(_http(os.environ["FONCTION_BANQUE"],
                            {"action": "import", "job": os.environ["JOB"], "jeton": os.environ["JETON"], "chemins": chemins},
                            entetes={"Content-Type": "application/json"}))["depots"]


def empreinte(chemin):
    h = hashlib.sha256()
    with open(chemin, "rb") as f:
        while bloc := f.read(1 << 20):
            h.update(bloc)
    return h.hexdigest()


def duree(chemin):
    try:
        return round(float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                                           "default=nw=1:nk=1", chemin], capture_output=True, text=True).stdout), 3)
    except ValueError:
        return None


def propre(nom):
    """Nom de dossier lisible : sans emoji ni symbole, espaces resserrés."""
    nom = unicodedata.normalize("NFC", nom)
    garde = "".join(c for c in nom if unicodedata.category(c)[0] in "LNZ" or c in "-&'_")
    return " ".join(garde.split())


def fichiers(racine, extensions):
    for d, _, noms in os.walk(racine):
        for n in sorted(noms):
            if not n.startswith(".") and os.path.splitext(n)[1].lower() in extensions:
                yield os.path.join(d, n)


def categorie_son(chemin, racine):
    haut = propre(os.path.relpath(chemin, racine).split(os.sep)[0]).lower()
    return next((v for k, v in CATEGORIES_SONS.items() if haut.startswith(k)), None)


def main(mode, racine):
    racine = os.path.abspath(racine)
    extensions = VIDEOS if mode == "videos" else SONS
    vus, lot = set(), []
    for chemin in fichiers(racine, extensions):
        rel = os.path.relpath(chemin, racine).split(os.sep)
        if mode == "videos":
            if len(rel) < 2:
                print("ignoré (pas dans un dossier) :", chemin)
                continue
            infos = {"dossier": propre(rel[0])}
        else:
            cat = categorie_son(chemin, racine)
            if not cat:
                print("ignoré (catégorie inconnue) :", chemin)
                continue
            infos = {"categorie": cat, "duree": duree(chemin)}
        h = empreinte(chemin)
        if h in vus:
            print("doublon :", os.path.join(*rel))
            continue
        vus.add(h)
        ext = os.path.splitext(chemin)[1].lower()
        lot.append({**infos, "local": chemin, "empreinte": h, "nom": rel[-1][:200],
                    "chemin": f"{'originaux' if mode == 'videos' else 'sons'}/{h}{ext}"})
    print(f"{len(lot)} fichiers à déposer", flush=True)

    total = {"videos": 0, "sons": 0}
    for k in range(0, len(lot), LOT):
        part = lot[k:k + LOT]
        liens = depots([x["chemin"] for x in part])

        def envoyer(x, essais=4):
            for e in range(essais):
                try:
                    return _envoyer(x)
                except OSError:
                    if e == essais - 1:
                        raise
                    time.sleep(5 * (e + 1))

        def _envoyer(x):
            with open(x["local"], "rb") as f:
                _http(liens[x["chemin"]], f.read(), methode="PUT", delai=1800,
                      entetes={"Content-Type": TYPES.get(os.path.splitext(x["chemin"])[1], "application/octet-stream"),
                               "x-upsert": "true"})

        with cf.ThreadPoolExecutor(4) as ex:
            list(ex.map(envoyer, part))
        public = [{c: x[c] for c in x if c != "local"} for x in part]
        n = rpc("studio_banque_import_enregistrer", p_job=os.environ["JOB"], p_jeton=os.environ["JETON"],
                p_videos=public if mode == "videos" else [], p_sons=public if mode == "sons" else [])
        total["videos"] += n["videos"]
        total["sons"] += n["sons"]
        print(f"{min(k + LOT, len(lot))}/{len(lot)} déposés ; nouveaux : {n}", flush=True)
    print(json.dumps(total))


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in ("videos", "sons"):
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
