"""Analyse d'appels AL BARAKA : le travail d'une machine d'analyse (Vercel Sandbox, la même
machine modèle que le Studio).

Lancé par /api/appels/demarrer avec, en variables d'environnement :
  APPEL_ID, JETON             l'appel et son jeton à usage unique (fonctions appel_job_*)
  MODE                        complet | analyse (voix inversées : on ne refait que l'analyse)
  LIENS                       {"source": url signée, "audio": url de dépôt signée, "audio_path": chemin}
  SUPABASE_URL, SUPABASE_ANON pour l'avancement
  OPENROUTER_API_KEY          Whisper, Gemini, Claude
  STOP_URL, STOP_TOKEN        pour éteindre la machine en fin de travail

La chaîne a été mise au point sur un vrai appel de Sabrina (banc d'essai du 23-25/10/2026) :
  1. son en 16 kHz mono, transcription Whisper au mot, par morceaux d'environ 100 s ;
  2. Gemini Flash écoute l'audio et rend les tours de parole (élève / prospect), en corrigeant
     les mots que Whisper rate (hijra, istikhara…) : 99,4 % des mots attribués comme Gemini Pro ;
  3. les tours sont recalés sur les mots horodatés de Whisper (temps de parole, silences) ;
  4. Claude Haiku note l'appel avec le référentiel du type d'appel (en base, pas dans ce dépôt) et
     les exemples de référence validés par les coachs (exemples_de_reference) ;
  5. le code vérifie chaque citation (mot pour mot) et calcule la note avec les poids de la grille.
Coût mesuré : environ 0,06 $ pour un appel de 6 min. Chaque appel à l'IA va au journal
ia_consommations (appel_job_cout), jamais sur la ligne de l'appel : les coûts sont réservés à l'admin.
"""
import base64
import concurrent.futures as cf
import difflib
import io
import json
import os
import re
import subprocess
import time
import traceback
import unicodedata
import urllib.error
import urllib.request
import wave

import numpy as np

STT = "openai/whisper-large-v3-turbo"
VOIX = "google/gemini-3.8-flash"
ANALYSE = "anthropic/claude-haiku-5.5"
# Whisper accepte le zéro conservation ; Gemini et Claude : pas de collecte des données
PRIVE = {"zdr": True, "data_collection": "deny"}
SANS_COLLECTE = {"data_collection": "deny"}
DUREE_MAX_S = 90 * 60
MORCEAU_S = 100  # transcription
FENETRE_VOIX_S = 20 * 60  # séparation des voix : Gemini écoute au plus 20 min d'un coup

APPEL, JETON = os.environ.get("APPEL_ID", ""), os.environ.get("JETON", "")
MODE = os.environ.get("MODE", "complet")
LIENS = json.loads(os.environ.get("LIENS") or "{}")
DOSSIER = "/tmp/appel"


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


def etape(nom):
    print(f"[{time.strftime('%H:%M:%S')}] {nom}", flush=True)
    rpc("appel_job_maj", p_id=APPEL, p_jeton=JETON, p_etape=nom)


class ServiceIA(ValueError):
    """L'IA refuse les appels (crédit épuisé, clé refusée) : inutile de réessayer."""

    def __init__(self):
        super().__init__("Le service d'intelligence artificielle ne répond plus. L'équipe est prévenue : "
                         "relance l'analyse un peu plus tard.")


def openrouter(chemin, corps, prive=SANS_COLLECTE, essais=3, delai=300):
    for k in range(essais):
        try:
            return json.loads(_http("https://openrouter.ai/api/v1" + chemin, {**corps, "provider": prive},
                                    entetes={"Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}",
                                             "Content-Type": "application/json"}, delai=delai))
        except urllib.error.HTTPError as e:
            if e.code in (401, 402, 403):
                raise ServiceIA() from e
            if k == essais - 1:
                raise
            time.sleep(3 * (k + 1))
        except Exception:
            if k == essais - 1:
                raise
            time.sleep(3 * (k + 1))


def noter_cout(modele, reponses, quoi):
    cout = sum((r.get("usage") or {}).get("cost") or 0 for r in reponses)
    try:
        rpc("appel_job_cout", p_id=APPEL, p_jeton=JETON, p_modele=modele, p_cout=round(cout, 6), p_etape=quoi)
    except Exception as e:  # le journal ne doit jamais faire échouer l'analyse
        print("coût non noté :", e, flush=True)


def objet_json(texte):
    texte = re.sub(r"^```(json)?|```$", "", (texte or "").strip()).strip()
    m = re.search(r"\{.*\}", texte, re.S)
    if not m:
        raise ValueError("réponse sans JSON")
    return json.loads(m.group(0))


# ---------------------------------------------------------------- son
def preparer_son(source):
    duree = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", source],
                                 capture_output=True, text=True, check=True).stdout.strip() or 0)
    if duree <= 0:
        raise ValueError("Le fichier ne contient pas de son lisible.")
    if duree > DUREE_MAX_S:
        raise ValueError(f"L'appel dure {int(duree // 60)} min : la limite est de 90 min.")
    wav, mp3 = f"{DOSSIER}/appel.wav", f"{DOSSIER}/appel.mp3"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", source, "-vn", "-ac", "1", "-ar", "16000", wav], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-b:a", "48k", mp3], check=True)
    return duree, wav, mp3


def lire_wav(chemin):
    with wave.open(chemin) as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16), w.getframerate()


def wav_octets(echantillons, sr):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(echantillons.tobytes())
    return buf.getvalue()


def bornes_calmes(a, sr, longueur):
    """Morceaux d'environ `longueur` secondes, coupés au point le plus calme à ±8 s."""
    duree = len(a) / sr
    pas = int(0.2 * sr)
    energie = np.array([np.abs(a[i:i + pas]).mean() for i in range(0, max(1, len(a) - pas), pas)])
    bornes, t = [0.0], float(longueur)
    while t < duree - 30:
        lo, hi = int((t - 8) / 0.2), min(len(energie), int((t + 8) / 0.2))
        b = (lo + int(np.argmin(energie[lo:hi]))) * 0.2 + 0.1 if hi > lo else t
        bornes.append(b)
        t = b + longueur
    bornes.append(duree)
    return bornes


# ---------------------------------------------------------------- 1. transcription
VOCABULAIRE = ("Appel de prospection AL BARAKA. Salamou 'alaykoum, wa 'alaykoum salam, inshaAllah, al hamdouliLah, "
               "BismiLah, macha'Allah, qu'Allah te facilite, barakAllahou fik, tawakkul, hijra, istikhara, Sidali, "
               "conférence, dimanche, WhatsApp, Zoom, formulaire.")


def transcrire(wav):
    a, sr = lire_wav(wav)
    bornes = bornes_calmes(a, sr, MORCEAU_S)

    def morceau(i):
        s, f = bornes[i], bornes[i + 1]
        d = openrouter("/audio/transcriptions", {
            "model": STT, "language": "fr", "response_format": "verbose_json",
            "timestamp_granularities": ["word", "segment"], "prompt": VOCABULAIRE,
            "input_audio": {"data": base64.b64encode(wav_octets(a[int(s * sr):int(f * sr)], sr)).decode(), "format": "wav"}},
            prive=PRIVE)
        return s, d

    with cf.ThreadPoolExecutor(6) as ex:
        resultats = list(ex.map(morceau, range(len(bornes) - 1)))
    noter_cout(STT, [d for _, d in resultats], "transcription")
    mots, segments = [], []
    for s, d in resultats:
        mots += [{"w": x["word"].strip(), "s": round(s + x["start"], 2), "e": round(s + x["end"], 2)}
                 for x in d.get("words") or [] if x.get("word", "").strip()]
        segments += [{"s": round(s + x["start"], 2), "e": round(s + x["end"], 2), "t": x["text"].strip()}
                     for x in d.get("segments") or [] if x.get("text", "").strip()]
    if len(mots) < 20:
        raise ValueError("On n'entend presque rien dans cet enregistrement : vérifie le fichier.")
    return mots, segments


# ---------------------------------------------------------------- 2. voix séparées
CONSIGNE_VOIX = """Tu reçois l'enregistrement audio d'un appel téléphonique de prospection (français, avec des expressions arabes courantes) et une transcription automatique Whisper horodatée, qui NE sépare PAS les voix et contient des erreurs.
Deux personnes : SETTER = la personne qui appelle et mène l'appel (l'élève évalué) ; PROSPECT = la personne appelée.
Travail : en écoutant l'audio, produis la transcription découpée en tours de parole, dans l'ordre.
- Chaque tour : locuteur, début et fin en secondes (approximatifs, appuie-toi sur les horodatages Whisper), texte.
- Le texte doit être VERBATIM, fidèle à ce qui est dit (garde les hésitations courtes, les « ouais », « ok »). Corrige uniquement les erreurs de Whisper en écoutant (ex. « hijra », « istikhara », noms propres).
- Coupe un segment Whisper en plusieurs tours quand deux personnes parlent dedans. Un « ok », « d'accord » de l'autre personne au milieu = tour séparé.
- Ignore les bruits ; un passage inaudible : « [inaudible] ».
- Si tu n'es pas sûr du locuteur d'un tour, mets "doute": true.
Réponds UNIQUEMENT en JSON : {"tours":[{"loc":"SETTER"|"PROSPECT","debut":0.0,"fin":0.0,"texte":"...","doute":false}]}"""


def separer_voix(mp3, segments, duree):
    """Gemini écoute l'appel par fenêtres de 20 min au plus (un appel de closing peut durer 1 h)."""
    fenetres, t = [], 0.0
    while t < duree - 1:
        fenetres.append((t, min(duree, t + FENETRE_VOIX_S)))
        t += FENETRE_VOIX_S

    def fenetre(f):
        a, b = f
        dans = [s for s in segments if a <= (s["s"] + s["e"]) / 2 < b]
        extrait = f"{DOSSIER}/voix_{int(a)}.mp3"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(a), "-to", str(b), "-i", mp3, "-c", "copy", extrait], check=True)
        texte = "\n".join(f"[{s['s'] - a:.1f}-{s['e'] - a:.1f}] {s['t']}" for s in dans)
        d = openrouter("/chat/completions", {
            "model": VOIX, "temperature": 0, "response_format": {"type": "json_object"},
            "messages": [{"role": "user", "content": [
                {"type": "text", "text": CONSIGNE_VOIX + "\n\nTranscription Whisper :\n" + texte},
                {"type": "input_audio", "input_audio": {"data": base64.b64encode(open(extrait, "rb").read()).decode(), "format": "mp3"}}]}],
            "usage": {"include": True}}, delai=600)
        tours = objet_json(d["choices"][0]["message"]["content"]).get("tours") or []
        for x in tours:
            x["debut"], x["fin"] = float(x.get("debut") or 0) + a, float(x.get("fin") or 0) + a
        return d, tours

    with cf.ThreadPoolExecutor(4) as ex:
        resultats = list(ex.map(fenetre, fenetres))
    noter_cout(VOIX, [d for d, _ in resultats], "voix")
    tours = [x for _, ts in resultats for x in ts if (x.get("texte") or "").strip() and x.get("loc") in ("SETTER", "PROSPECT")]
    if not tours:
        raise ValueError("Les voix n'ont pas pu être séparées.")
    return tours


# ---------------------------------------------------------------- 3. recalage et mesures
def norm(s):
    s = unicodedata.normalize("NFD", (s or "").lower())
    return re.findall(r"[a-z0-9]+", "".join(c for c in s if unicodedata.category(c) != "Mn"))


def recaler(tours, mots):
    """Chaque tour reçoit le début et la fin réels de ses mots (Whisper), et son temps de parole."""
    W = [(k, i) for i, m in enumerate(mots) for k in norm(m["w"])]
    G = [(k, j) for j, x in enumerate(tours) for k in norm(x["texte"])]
    sm = difflib.SequenceMatcher(None, [k for k, _ in G], [k for k, _ in W], autojunk=False)
    lien = {}
    for a, b, n in sm.get_matching_blocks():
        for d in range(n):
            lien.setdefault(G[a + d][1], set()).add(W[b + d][1])
    sortie = []
    for j, x in enumerate(tours):
        ids = sorted(lien.get(j, ()))
        t = {"n": j + 1, "loc": x["loc"], "texte": x["texte"].strip(), "doute": bool(x.get("doute"))}
        if ids:
            t["t0"], t["t1"] = mots[ids[0]]["s"], mots[ids[-1]]["e"]
            t["parole"] = round(sum(min(mots[i]["e"] - mots[i]["s"], 1.5) for i in ids), 2)
        else:
            t["t0"], t["t1"], t["parole"] = round(x["debut"], 2), round(x["fin"], 2), 0.0
        sortie.append(t)
    return sortie


def avec_voix(tours, inversees):
    if not inversees:
        return tours
    autre = {"SETTER": "PROSPECT", "PROSPECT": "SETTER"}
    return [{**t, "loc": autre[t["loc"]]} for t in tours]


def mesurer(tours, duree):
    temps = {"SETTER": 0.0, "PROSPECT": 0.0}
    for t in tours:
        temps[t["loc"]] += t["parole"]
    total = sum(temps.values()) or 1
    questions = [{"tour": a["n"], "t": round(a["t1"], 1), "silence_s": round(max(0, b["t0"] - a["t1"]), 1)}
                 for a, b in zip(tours, tours[1:])
                 if a["loc"] == "SETTER" and b["loc"] == "PROSPECT" and a["texte"].rstrip().endswith("?")]
    return {"duree_s": round(duree, 1), "parole_s": {k: round(v, 1) for k, v in temps.items()},
            "part_setter_pct": round(100 * temps["SETTER"] / total, 1),
            "part_prospect_pct": round(100 * temps["PROSPECT"] / total, 1), "questions_setter": questions}


# ---------------------------------------------------------------- 4. analyse
SCHEMA = """{
 "type_coherent": true, "remarque_type": "", "prospect_informe": false,
 "erreurs_critiques": [{"titre":"","explication":"","tour":0,"citation":""}],
 "etapes": [{"code":"P1","nom":"","note":0,"justification":"","citations":[{"tour":0,"texte":""}]}],
 "regles": [{"code":"R1","statut":"respectée|partielle|violée|non applicable","mesure":"","commentaire":"","tour":0,"citation":""}],
 "mots_faiblesse": [{"tour":0,"citation":""}],
 "objections": [{"numero":"","nom":"","tour":0,"citation":"","care_applique":"oui|partiel|non","commentaire":""}],
 "analyse_globale": "",
 "points_forts": [{"titre":"","pourquoi":"","etape":"","regle":"","tour":0,"citation":""}],
 "axes": [{"titre":"","probleme":"","pourquoi":"","formulation_ideale":"","etape":"","tour":0,"citation":""}],
 "conseil_prioritaire": {"etape":"","texte":""},
 "encouragement": "",
 "fiche_closer": {"prenom":"","ville_ou_pays":"","situation":"","budget":"","score_couleur":"VERT|ORANGE|ROUGE","motivations":"","conjoint":"","notes_closer":""}
}"""

mmss = lambda s: f"{int(s // 60)}:{int(s % 60):02d}"


def exemples_de_reference(exemples):
    """Les retours validés et cochés « exemple de référence » par les coachs (4 au plus, les plus
    récents) : la version corrigée, avec ce que le coach a changé par rapport à l'IA. C'est ainsi
    que l'outil s'aligne sur la méthode des coachs (cahier des charges, section 6)."""
    blocs = []
    for k, x in enumerate(exemples or [], 1):
        coach, ia = x.get("analyse_coach") or {}, x.get("analyse_ia") or {}
        notes_ia = {e.get("code"): e.get("note") for e in ia.get("etapes") or []}
        lignes = [f"## Exemple {k} · note finale validée par le coach : {round(float(x.get('note_finale') or 0))}/100"
                  + (f" (l'IA avait proposé {round(float(x.get('note_ia') or 0))})" if x.get("note_ia") is not None and x.get("note_ia") != x.get("note_finale") else "")]
        for e in coach.get("etapes") or []:
            avant = notes_ia.get(e.get("code"))
            corrige = f" (l'IA avait mis {avant}/10, le coach a corrigé)" if avant is not None and avant != e.get("note") else ""
            lignes.append(f"- {e.get('code')} {e.get('nom', '')} : {e.get('note')}/10{corrige}. {e.get('justification', '')}")
        gardes = [a for a in coach.get("axes") or [] if not a.get("retire")]
        retires = [a for a in coach.get("axes") or [] if a.get("retire")]
        if gardes:
            lignes.append("Axes retenus par le coach : " + " ; ".join(f"{a.get('titre')} (à dire : {a.get('formulation_ideale')})" for a in gardes))
        if retires:
            lignes.append("Axes RETIRÉS par le coach (jugés inutiles ou trop exigeants) : " + " ; ".join(a.get("titre", "") for a in retires))
        forts = [p.get("titre") for p in coach.get("points_forts") or [] if not p.get("retire")]
        if forts:
            lignes.append("Points forts retenus : " + " ; ".join(forts))
        if (coach.get("conseil_prioritaire") or {}).get("texte"):
            lignes.append("Conseil prioritaire validé : " + coach["conseil_prioritaire"]["texte"])
        blocs.append("\n".join(lignes))
    if not blocs:
        return ""
    return ("# Exemples de référence validés par les coachs\n"
            "Voici des retours que les coachs ont validés comme modèles, avec leurs corrections. Aligne ta façon de noter, "
            "ton niveau d'exigence et ton ton sur eux. Ne recopie pas leur contenu : l'appel à analyser est différent.\n\n"
            + "\n\n".join(blocs) + "\n\n")


def consigne_analyse(ctx, tours, mesures):
    ref = ctx["referentiel"]
    codes = ", ".join(e["code"] for e in ref["grille"])
    transcript = "\n".join(f"T{t['n']} [{mmss(t['t0'])}] {t['loc']} : {t['texte']}" for t in tours)
    silences = "; ".join(f"T{q['tour']} {q['silence_s']} s" for q in mesures["questions_setter"]) or "aucune question mesurée"
    return f"""Tu es l'outil d'analyse d'appels d'AL BARAKA. Tu produis le BROUILLON de retour qu'un coach validera avant qu'il n'arrive à l'élève.
Type d'appel déclaré : {ctx['type_appel']}. Le SETTER est l'élève évalué ({ctx.get('eleve') or "l'élève"}). Le PROSPECT est la personne appelée.

{ref['contenu']}

{exemples_de_reference(ctx.get('exemples'))}# Mesures calculées par le code
Durée totale : {mmss(mesures['duree_s'])}. Temps de parole mesuré : setter {mesures['parole_s']['SETTER']} s ({mesures['part_setter_pct']} %), prospect {mesures['parole_s']['PROSPECT']} s ({mesures['part_prospect_pct']} %). La transcription automatique rate une partie des réponses très courtes du prospect : la part réelle du setter est un peu plus basse que la mesure.
Silences entre la fin d'une question du setter et la réponse du prospect : {silences}

# Transcription (voix séparées automatiquement, numéros de tour T1…)
{transcript}

Réponds UNIQUEMENT avec un objet JSON valide de cette forme (toutes les étapes {codes} ; toutes les règles R1 à R7). Tutoie l'élève. N'écris AUCUNE note globale chiffrée (sur 100) dans les textes : le code calcule la note et l'affiche lui-même. Les citations sont copiées MOT POUR MOT depuis la transcription. Dans les valeurs texte, n'utilise jamais le caractère " (guillemet droit) : utilise « ».
{SCHEMA}"""


def analyser(ctx, tours, mesures):
    d = openrouter("/chat/completions", {
        "model": ANALYSE, "temperature": 0.2, "max_tokens": 24000, "reasoning": {"max_tokens": 3000},
        "messages": [{"role": "user", "content": consigne_analyse(ctx, tours, mesures)}], "usage": {"include": True}}, delai=600)
    noter_cout(ANALYSE, [d], "analyse")
    return objet_json(d["choices"][0]["message"]["content"])


# ---------------------------------------------------------------- 5. vérification et note
def n_citation(s):
    s = unicodedata.normalize("NFC", s or "").replace("’", "'").lower()
    return re.sub(r"\s+", " ", re.sub(r"[«»\"…]|\.\.\.", "", s)).strip(" .,?!")


def verifier(analyse, tours, ctx, mesures):
    par_n = {t["n"]: t for t in tours}
    retirees = []

    def ok(o, ou):
        c = o.get("citation") if "citation" in o else o.get("texte")
        if not c:
            return True
        t = o.get("tour")
        if t in par_n and n_citation(c) in n_citation(par_n[t]["texte"]):
            o["horodatage"] = par_n[t]["t0"]
            return True
        for n, x in par_n.items():
            if n_citation(c) in n_citation(x["texte"]):
                o["tour"], o["horodatage"] = n, x["t0"]
                return True
        retirees.append({"ou": ou, "tour": t, "citation": c})
        return False

    for cle in ("erreurs_critiques", "regles", "mots_faiblesse", "objections", "points_forts", "axes"):
        for o in analyse.get(cle) or []:
            if not ok(o, cle):
                o["citation"] = ""
    analyse["mots_faiblesse"] = [o for o in analyse.get("mots_faiblesse") or [] if o.get("citation")]
    for e in analyse.get("etapes") or []:
        e["citations"] = [c for c in e.get("citations") or [] if ok(c, "etape " + str(e.get("code")))]

    # la note est calculée ici, avec les poids de la grille : jamais par l'IA
    ref = ctx["referentiel"]
    poids = {g["code"]: g for g in ref["grille"]}
    etapes = {e.get("code"): e for e in analyse.get("etapes") or []}
    analyse["etapes"] = [{**etapes.get(g["code"], {"code": g["code"], "note": 0, "justification": "Étape non évaluée.", "citations": []}),
                          "nom": g.get("nom") or etapes.get(g["code"], {}).get("nom", ""), "poids": g["poids"]}
                         for g in ref["grille"]]
    for e in analyse["etapes"]:
        e["note"] = max(0.0, min(10.0, float(e.get("note") or 0)))
    note_etapes = sum(e["note"] * e["poids"] for e in analyse["etapes"]) / 10
    informe = bool(ctx.get("prospect_informe")) or bool(analyse.get("prospect_informe"))
    penalite = 0 if informe else float(ref.get("penalite_enregistrement") or 0)
    duree = mesures["duree_s"]
    alerte = None
    if ref.get("duree_min_s") and duree < ref["duree_min_s"]:
        alerte = f"Appel de {mmss(duree).replace(':', ' min ')} : trop court (norme {ref['duree_min_s'] // 60} à {ref['duree_max_s'] // 60} min)"
    elif ref.get("duree_max_s") and duree > ref["duree_max_s"]:
        alerte = f"Appel de {int(duree // 60)} min : trop long (norme {ref['duree_min_s'] // 60} à {ref['duree_max_s'] // 60} min)"
    analyse.update({"note_etapes": round(note_etapes, 1), "penalite": penalite, "prospect_informe": informe,
                    "note_globale": round(max(0.0, note_etapes - penalite), 1), "alerte_duree": alerte,
                    "_verif": {"citations_retirees": retirees}, "_modele": ANALYSE,
                    "_exemples": [x.get("id") for x in ctx.get("exemples") or []]})
    return analyse


# ---------------------------------------------------------------- orchestration
def eteindre():
    if os.environ.get("STOP_URL"):
        try:
            _http(os.environ["STOP_URL"], b"{}", methode="POST",
                  entetes={"Authorization": f"Bearer {os.environ['STOP_TOKEN']}", "Content-Type": "application/json"})
        except Exception as e:  # la machine s'arrêtera de toute façon à son délai
            print("arrêt impossible :", e, flush=True)


def main():
    os.makedirs(DOSSIER, exist_ok=True)
    ctx = rpc("appel_job_contexte", p_id=APPEL, p_jeton=JETON)
    if MODE == "analyse" and ctx.get("transcription"):
        tours, duree = ctx["transcription"]["tours"], float(ctx.get("duree_s") or 0)
    else:
        etape("reception")
        source = f"{DOSSIER}/source"
        with urllib.request.urlopen(LIENS["source"], timeout=600) as rep, open(source, "wb") as f:
            while bloc := rep.read(1 << 20):
                f.write(bloc)
        duree, wav, mp3 = preparer_son(source)
        # l'audio léger que le coach réécoute dans la page de validation
        with open(mp3, "rb") as f:
            _http(LIENS["audio"], f.read(), methode="PUT", entetes={"Content-Type": "audio/mpeg", "x-upsert": "true"}, delai=600)
        etape("transcription")
        mots, segments = transcrire(wav)
        etape("voix")
        tours = recaler(separer_voix(mp3, segments, duree), mots)
        rpc("appel_job_transcription", p_id=APPEL, p_jeton=JETON, p_transcription={"tours": tours, "mots": len(mots)},
            p_duree=round(duree, 1), p_audio_path=LIENS.get("audio_path"))
    etape("analyse")
    tours = avec_voix(tours, ctx.get("voix_inversees"))
    mesures = mesurer(tours, duree)
    analyse = verifier(analyser(ctx, tours, mesures), tours, ctx, mesures)
    rpc("appel_job_terminer", p_id=APPEL, p_jeton=JETON, p_analyse=analyse, p_mesures=mesures,
        p_note=analyse["note_globale"], p_version=ctx["referentiel"]["version"])


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        traceback.print_exc()
        message = str(e) if isinstance(e, (ValueError, ServiceIA)) else "L'analyse a échoué. Relance-la, ou préviens l'équipe si ça recommence."
        try:
            rpc("appel_job_erreur", p_id=APPEL, p_jeton=JETON, p_message=message)
        except Exception:
            traceback.print_exc()
    finally:
        eteindre()
