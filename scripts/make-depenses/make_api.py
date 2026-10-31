"""Petit client de l'API Make pour les scénarios de dépenses. Aucun secret ici : tout vient de .env.local."""
import json
import re
import urllib.error
import urllib.request
from pathlib import Path

env = {}
for ligne in (Path(__file__).resolve().parents[2] / ".env.local").read_text().splitlines():
    m = re.match(r"^(MAKE_[A-Z_]+)=(.*)$", ligne.strip())
    if m:
        env[m[1]] = m[2]

# Connexion Facebook de l'organisation Deen Code Academy (expire le 12/12/2026, rappel : scénario 9969861).
IMT_FACEBOOK = 6764462

# 10 erreurs d'affilée tolérées : le gestionnaire d'erreur évite déjà la plupart des coupures.
REGLAGES = {"dlq": False, "slots": None, "dataloss": False, "maxErrors": 10, "autoCommit": True, "roundtrips": 1,
            "sequential": False, "confidential": False, "freshVariables": False, "autoCommitTriggerLast": True}


def ignorer(identifiant, x):
    return {"id": identifiant, "module": "builtin:Ignore", "version": 1, "metadata": {"designer": {"x": x, "y": 300}}}


def planifier(heure):
    h, m = heure.split(":")
    fin = f"{h}:{int(m) + 1:02d}"
    return {"type": "indefinitely", "interval": 900, "restrict": [{"days": [1, 2, 3, 4, 5, 6, 0], "time": [heure, fin]}]}


def appel(methode, chemin, corps=None):
    r = urllib.request.Request(f"https://{env['MAKE_ZONE']}/api/v2{chemin}", method=methode,
                               data=json.dumps(corps).encode() if corps is not None else None,
                               headers={"Authorization": "Token " + env["MAKE_API_TOKEN"], "User-Agent": "curl/8",
                                        "Accept": "application/json", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=180) as x:
            t = x.read().decode()
            return json.loads(t) if t else {}
    except urllib.error.HTTPError as e:
        raise SystemExit(f"Make {methode} {chemin} : {e.code} {e.read().decode()[:500]}")


def sauver(identifiant, dossier, plan, planning, activer=True):
    corps = {"blueprint": json.dumps(plan, ensure_ascii=False), "scheduling": json.dumps(planning)}
    if identifiant:
        s = appel("PATCH", f"/scenarios/{identifiant}", corps)["scenario"]
    else:
        s = appel("POST", f"/scenarios?confirmed=true", {**corps, "teamId": int(env["MAKE_TEAM_ID"]), "folderId": int(dossier)})["scenario"]
    if activer and not appel("GET", f"/scenarios/{s['id']}")["scenario"].get("isActive"):
        appel("POST", f"/scenarios/{s['id']}/start")
    return {"id": s["id"], "nom": s["name"]}
