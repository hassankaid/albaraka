#!/usr/bin/env python3
"""Crée (ou met à jour) le scénario Make qui surveille la remontée des dépenses d'un client.

Chaque matin, il interroge le CRM (GET sur la réception, clé X-Cle-CRM) et envoie une
notification sur l'iPhone de Hassan si un compte n'a rien reçu depuis plus de 36 h, ou si
le CRM ne répond pas. Le CRM doit renvoyer { "en_retard": "…", "nb_en_retard": 0 }.

    python3 creer-surveillance.py --client "AL BARAKA" --dossier 457391 --url https://… [--cle SECRET_DU_CLIENT]
"""
import argparse

from make_api import REGLAGES, env, planifier, sauver

IPHONE_HASSAN = 4435465


def plan(a):
    return {
        "name": f"{a.client} - SURVEILLANCE DES DÉPENSES PUB",
        "metadata": {"instant": False, "version": 1, "designer": {"orphans": []}, "scenario": REGLAGES},
        "flow": [
            {"id": 1, "module": "http:ActionSendData", "version": 3, "parameters": {"handleErrors": False, "useNewZLibDeCompress": True},
             "mapper": {"ca": "", "qs": [], "url": a.url, "gzip": True, "method": "get",
                        "headers": [{"name": "X-Cle-CRM", "value": a.cle or env["MAKE_CRM_SECRET"]}],
                        "timeout": "", "useMtls": False, "authPass": "", "authUser": "", "bodyType": "", "serializeUrl": False,
                        "shareCookies": False, "parseResponse": True, "followRedirect": True, "useQuerystring": False,
                        "followAllRedirects": False, "rejectUnauthorized": True},
             "metadata": {"designer": {"x": 0, "y": 0}}},
            {"id": 2, "module": "ios:SendNotification", "version": 1, "parameters": {"device": IPHONE_HASSAN},
             "filter": {"name": "En retard, ou le CRM ne répond pas",
                        "conditions": [[{"a": "{{1.statusCode}}", "b": "200", "o": "number:notequal"}],
                                       [{"a": "{{1.data.nb_en_retard}}", "b": "0", "o": "number:greater"}]]},
             "mapper": {"title": f"⚠️ {a.client} : dépenses pub non reçues",
                        "body": "Rien depuis plus de 36 h : {{1.data.en_retard}}. Vérifier le scénario dans Make (réponse du CRM : {{1.statusCode}}).",
                        "action": "", "priority": 10, "collapsible": False},
             "metadata": {"designer": {"x": 300, "y": 0}}},
        ],
    }


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    for o in ("client", "dossier", "url"):
        p.add_argument("--" + o, required=True)
    p.add_argument("--cle")
    p.add_argument("--heure", default="09:30")
    p.add_argument("--id")
    a = p.parse_args()
    print(sauver(a.id, a.dossier, plan(a), planifier(a.heure)))
