"""Studio vidéo AL BARAKA, outil Voix off : indexation de la banque de vidéos
(cahier des charges de Sidali, section 7). Tourne sur une machine de montage
(Vercel Sandbox), lancée par /api/studio/banque-indexer.

Variables d'environnement :
  JOB, JETON                 le job d'indexation et son jeton à usage unique
  FONCTION_BANQUE            URL de l'edge function studio-banque (liens signés)
  SUPABASE_URL, SUPABASE_ANON  pour écrire les fiches (fonctions studio_banque_job_*)
  OPENROUTER_API_KEY         fiche des plans (Claude, vision) et vecteurs de sens
  STOP_URL, STOP_TOKEN       pour éteindre la machine en fin de travail

Pour chaque vidéo :
  1. version de travail 1080×1920, 30 i/s, sans son, recadrée au centre (l'original est gardé) ;
  2. découpage en plans aux changements de scène (filtre « scene » de FFmpeg), plans de
     moins de 1,2 s écartés ;
  3. 3 images clés par plan (25, 50, 75 %) ;
  4. fiche par Claude (vision), avec le dossier de Sidali (CASH, WORKING…) comme indice : description, 1 à 3 thèmes AL BARAKA, 10 mots-clés, lieu,
     ambiance, personnes, visage reconnaissable, texte ou logo à l'écran, qualité ;
  5. vecteur de sens de la fiche (qwen3-embedding, 1024), pour la recherche « par le sens ».
"""
from __future__ import annotations

import base64
import concurrent.futures as cf
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import traceback
import urllib.request

ICI = os.path.dirname(os.path.abspath(__file__))
PRIVE = {"zdr": True, "data_collection": "deny"}
LLM = os.environ.get("INDEX_LLM", "anthropic/claude-sonnet-5.5")
EMBEDDING = "qwen/qwen3-embedding-8b"
DIMENSIONS = 1024
PLAN_MIN = 1.2          # cahier : plans de moins de 1,2 s écartés
SEUIL_SCENE = 0.30      # sensibilité du changement de scène (0 à 1)
COUT = {"ia": 0.0, "vecteurs": 0.0}

THEMES = {
    "argent": "Argent et revenus", "liberte_financiere": "Liberté financière", "salariat": "Salariat et routine",
    "galere": "Galère et fin de mois difficile", "declic": "Déclic et prise de décision",
    "entrepreneuriat": "Entrepreneuriat", "business_en_ligne": "Business en ligne et e-commerce",
    "travail_ecran": "Travail sur ordinateur et téléphone", "reseaux_sociaux": "Réseaux sociaux et création de contenu",
    "vente": "Vente et appels clients", "formation": "Apprentissage et formation", "discipline": "Discipline et sport",
    "reussite": "Réussite et célébration", "famille": "Famille et proches", "foi": "Foi et spiritualité",
    "voyage": "Voyage et liberté géographique", "dubai": "Dubaï et lifestyle", "nature": "Nature et sérénité",
    "ville": "Ville et énergie urbaine", "temps": "Temps qui passe",
}

FICHE = """Tu décris un plan vidéo de la banque AL BARAKA (vidéos de stock utilisées pour illustrer
des vidéos « voix off » sur l'argent, l'entrepreneuriat, la foi, la discipline…).
Voici 3 images du plan (à 25 %, 50 % et 75 % de sa durée).
{categorie}

Thèmes possibles (identifiants) :
{themes}

Réponds UNIQUEMENT en JSON :
{{"description": "1 à 2 phrases en français : ce qu'on voit et ce que ça évoque",
  "themes": ["1 à 3 identifiants de la liste, du plus au moins pertinent"],
  "mots_cles": ["10 mots-clés en français, concrets (objets, actions, lieux, émotions)"],
  "lieu": "intérieur / extérieur et type de lieu, court",
  "ambiance": "un mot : énergique, calme, sombre, lumineux, tendu, joyeux, inspirant, mélancolique…",
  "personnes": true ou false,
  "visage_reconnaissable": true si un visage est net et identifiable,
  "texte_ecran": true si un texte lisible est à l'écran,
  "logo": true seulement si le logo ou la marque d'une autre entreprise est BIEN VISIBLE ET CENTRAL (sujet principal du plan, grand, net, lisible) ; false si le logo est petit, en arrière-plan, sur le côté, flou ou partiel,
  "qualite": "nette", "floue" ou "sombre"}}"""


# ---------------------------------------------------------------- échanges
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


def banque(action, **params):
    return json.loads(_http(os.environ["FONCTION_BANQUE"],
                            {"action": action, "job": os.environ["JOB"], "jeton": os.environ["JETON"], **params},
                            entetes={"Content-Type": "application/json"}))


def openrouter(chemin, corps, essais=3):
    for k in range(essais):
        try:
            return json.loads(_http("https://openrouter.ai/api/v1" + chemin, {**corps, "provider": PRIVE},
                                    entetes={"Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}",
                                             "Content-Type": "application/json"}, delai=120))
        except Exception:
            if k == essais - 1:
                raise
            time.sleep(2 * (k + 1))


def telecharger(url, chemin):
    with urllib.request.urlopen(url, timeout=900) as rep, open(chemin, "wb") as f:
        while bloc := rep.read(1 << 20):
            f.write(bloc)


def deposer(url, chemin, type_mime):
    with open(chemin, "rb") as f:
        _http(url, f.read(), methode="PUT", entetes={"Content-Type": type_mime, "x-upsert": "true"}, delai=900)


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout


# ---------------------------------------------------------------- vidéo
def sonder(chemin):
    d = json.loads(run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height:format=duration", "-of", "json", chemin]))
    s = d["streams"][0]
    return float(d["format"]["duration"]), int(s["width"]), int(s["height"])


def version_travail(src, dst):
    """1080×1920, 30 i/s, sans son, recadrée au centre ; images clés rapprochées (lecture et
    découpe rapides à n'importe quel endroit)."""
    run(["ffmpeg", "-v", "error", "-y", "-i", src, "-an",
         "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,format=yuv420p",
         "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-g", "30", "-movflags", "+faststart", dst])


def plans(chemin, duree):
    """Plans [début, fin] aux changements de scène ; les morceaux trop courts sont écartés."""
    sortie = subprocess.run(["ffmpeg", "-v", "info", "-i", chemin, "-vf",
                             f"scale=270:480,select='gt(scene,{SEUIL_SCENE})',showinfo", "-f", "null", "-"],
                            capture_output=True, text=True).stderr
    coupes = sorted({round(float(t), 3) for t in re.findall(r"pts_time:([\d.]+)", sortie)})
    bornes = [0.0] + [t for t in coupes if 0.3 < t < duree - 0.3] + [duree]
    return [(a, b) for a, b in zip(bornes, bornes[1:]) if b - a >= PLAN_MIN]


def images(chemin, debut, fin, dossier, base):
    out = []
    for k, f in enumerate((0.25, 0.5, 0.75)):
        t = debut + (fin - debut) * f
        img = os.path.join(dossier, f"{base}-{k}.jpg")
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", chemin, "-frames:v", "1",
             "-vf", "scale=360:640", "-q:v", "4", img])
        out.append(img)
    return out


# ---------------------------------------------------------------- IA
def objet_json(texte):
    dec, i = json.JSONDecoder(), 0
    while (i := texte.find("{", i)) != -1:
        try:
            o, _ = dec.raw_decode(texte, i)
            if isinstance(o, dict):
                return o
        except ValueError:
            pass
        i += 1
    return None


def indice_categorie(dossier):
    return (f"Le plan est rangé dans le dossier « {dossier} » de la banque (classement de l'équipe) : "
            "c'est un indice sur le sujet, fie-toi d'abord aux images.\n") if dossier else ""


def fiche(imgs, dossier=None):
    contenu = [{"type": "text", "text": FICHE.format(themes="\n".join(f"- {k} : {v}" for k, v in THEMES.items()),
                                                     categorie=indice_categorie(dossier))}]
    for img in imgs:
        with open(img, "rb") as f:
            contenu.append({"type": "image_url",
                            "image_url": {"url": "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()}})
    for _ in range(3):
        d = openrouter("/chat/completions", {"model": LLM, "max_tokens": 800,
                                             "messages": [{"role": "user", "content": contenu}]})
        COUT["ia"] += (d.get("usage") or {}).get("cost") or 0
        o = objet_json(d["choices"][0]["message"]["content"] or "")
        if o and isinstance(o.get("description"), str):
            return nettoyer_fiche(o)
    raise ValueError("fiche illisible")


def nettoyer_fiche(o):
    bool_ = lambda v: v is True or str(v).lower() == "true"
    return {
        "description": str(o.get("description", ""))[:500],
        "themes": [t for t in o.get("themes") or [] if t in THEMES][:3],
        "mots_cles": [str(m).strip().lower()[:40] for m in (o.get("mots_cles") or []) if str(m).strip()][:12],
        "lieu": str(o.get("lieu") or "")[:80],
        "ambiance": str(o.get("ambiance") or "")[:40].lower(),
        "personnes": bool_(o.get("personnes")),
        "visage_reconnaissable": bool_(o.get("visage_reconnaissable")),
        "texte_ecran": bool_(o.get("texte_ecran")),
        "logo": bool_(o.get("logo")),
        "qualite": o.get("qualite") if o.get("qualite") in ("nette", "floue", "sombre") else "nette",
    }


def texte_de_fiche(f, dossier=None):
    """Ce qui est transformé en vecteur : tout ce qui décrit le plan, en clair."""
    themes = ", ".join(THEMES[t] for t in f["themes"])
    categorie = f" Catégorie : {dossier.lower()}." if dossier else ""
    return (f"{f['description']} Thèmes : {themes}. Mots-clés : {', '.join(f['mots_cles'])}. "
            f"Lieu : {f['lieu']}. Ambiance : {f['ambiance']}.{categorie}")


def vecteurs(textes):
    out = []
    for k in range(0, len(textes), 64):
        d = openrouter("/embeddings", {"model": EMBEDDING, "input": textes[k:k + 64], "dimensions": DIMENSIONS})
        COUT["vecteurs"] += (d.get("usage") or {}).get("cost") or 0
        out += [x["embedding"] for x in sorted(d["data"], key=lambda x: x["index"])]
    return out


# ---------------------------------------------------------------- une vidéo
def indexer(v, dossier):
    vid = v["id"]
    ici = os.path.join(dossier, vid)
    os.makedirs(ici, exist_ok=True)
    src = os.path.join(ici, "original")
    telecharger(v["lire"], src)
    travail = os.path.join(ici, "travail.mp4")
    version_travail(src, travail)
    duree, largeur, hauteur = sonder(travail)
    morceaux = plans(travail, duree)
    if not morceaux:
        raise ValueError("aucun plan de plus de 1,2 s")
    imgs = {r: images(travail, a, b, ici, f"{r}") for r, (a, b) in enumerate(morceaux)}
    chemins = {f"travail/{vid}.mp4": travail}
    chemins.update({f"images/{vid}/{os.path.basename(i)}": i for r in imgs for i in imgs[r]})
    depots = banque("depots", chemins=list(chemins))["depots"]
    for c, local in chemins.items():
        deposer(depots[c], local, "video/mp4" if c.endswith(".mp4") else "image/jpeg")
    with cf.ThreadPoolExecutor(6) as ex:
        fiches = list(ex.map(lambda r: fiche(imgs[r], v.get("dossier")), range(len(morceaux))))
    vecs = vecteurs([texte_de_fiche(f, v.get("dossier")) for f in fiches])
    sortie = [{**f, "rang": r, "debut": round(a, 3), "fin": round(b, 3),
               "images": [f"images/{vid}/{os.path.basename(i)}" for i in imgs[r]], "embedding": vecs[r]}
              for r, ((a, b), f) in enumerate(zip(morceaux, fiches))]
    rpc("studio_banque_job_ecrire", p_job=os.environ["JOB"], p_jeton=os.environ["JETON"], p_video=vid,
        p_infos={"chemin_travail": f"travail/{vid}.mp4", "duree": round(duree, 3), "largeur": largeur, "hauteur": hauteur},
        p_plans=sortie)
    return len(sortie)


def eteindre():
    if os.environ.get("STOP_URL"):
        try:
            _http(os.environ["STOP_URL"], b"{}", methode="POST",
                  entetes={"Authorization": f"Bearer {os.environ['STOP_TOKEN']}", "Content-Type": "application/json"})
        except Exception as e:
            print("arrêt impossible :", e, flush=True)


def main():
    debut = time.time()
    videos = banque("indexation")["videos"]
    rapport = {"videos": len(videos), "indexees": 0, "plans": 0, "erreurs": []}
    with tempfile.TemporaryDirectory() as dossier:
        def une(v):
            try:
                n = indexer(v, dossier)
                print(f"{v['nom']} : {n} plans", flush=True)
                return n, None
            except Exception as e:
                traceback.print_exc()
                message = f"{type(e).__name__}: {e}"[:400]
                try:
                    rpc("studio_banque_job_erreur", p_job=os.environ["JOB"], p_jeton=os.environ["JETON"],
                        p_video=v["id"], p_message=message)
                except Exception:
                    traceback.print_exc()
                return 0, f"{v['nom']} : {message}"

        with cf.ThreadPoolExecutor(3) as ex:
            for n, erreur in ex.map(une, videos):
                rapport["plans"] += n
                rapport["indexees"] += 1 if n else 0
                if erreur:
                    rapport["erreurs"].append(erreur)
    rapport["duree_s"] = round(time.time() - debut, 1)
    rapport["cout_usd"] = {k: round(v, 4) for k, v in COUT.items()}
    rpc("studio_banque_job_terminer", p_job=os.environ["JOB"], p_jeton=os.environ["JETON"], p_rapport=rapport)
    print(json.dumps(rapport, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        traceback.print_exc()
        try:
            rpc("studio_banque_job_erreur", p_job=os.environ["JOB"], p_jeton=os.environ["JETON"], p_video=None,
                p_message=f"{type(e).__name__}: {e}"[:400])
        except Exception:
            traceback.print_exc()
    finally:
        eteindre()
