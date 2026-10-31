#!/usr/bin/env python3
"""Crée (ou met à jour) le scénario Make « dépenses Snapchat quotidiennes » d'un client.

Make n'a pas de module de statistiques Snap : le scénario lit le compte (devise), ses
campagnes (noms) et ses statistiques par jour avec « Make an API call », et envoie le tout
tel quel à la réception du CRM, qui le traduit. Le jour Snap est celui du fuseau du compte.

    python3 creer-scenario-snap.py --client "AL BARAKA" --dossier 457391 --connexion 14710517 \
        --compte <id du compte> --url https://…/functions/v1/depenses-pub \
        --fuseau Asia/Dubai --decalage +04:00 [--debut 2026-10-01 --fin 2026-11-01]

Avec --debut et --fin (31 jours au plus), le scénario est un import ponctuel à lancer à la main.
"""
import argparse

from make_api import REGLAGES, env, ignorer, planifier, sauver


def appel_snap(identifiant, x, connexion, url, qs):
    return {"id": identifiant, "module": "snapchat-campaign-management:makeAnApiCall", "version": 1,
            "parameters": {"__IMTCONN__": connexion},
            "mapper": {"url": url, "method": "GET", "headers": [{"key": "Content-Type", "value": "application/json"}],
                       "qs": [{"key": k, "value": v} for k, v in qs], "body": ""},
            "metadata": {"designer": {"x": x, "y": 0}}, "onerror": [ignorer(identifiant + 10, x)]}


def en_json(identifiant, x, source):
    return {"id": identifiant, "module": "json:TransformToJSON", "version": 1, "parameters": {"space": ""},
            "mapper": {"object": "{{%d.body}}" % source}, "metadata": {"designer": {"x": x, "y": 0}}}


def plan(a, debut, fin):
    connexion = int(a.connexion)
    compte = f"/v1/adaccounts/{a.compte}"
    return {
        "name": f"{a.client} - DÉPENSES SNAP - {a.compte} → CRM" + (" (import ponctuel)" if a.debut else ""),
        "metadata": {"instant": False, "version": 1, "designer": {"orphans": []}, "scenario": REGLAGES},
        "flow": [
            {"id": 1, "module": "snapchat-campaign-management:getAnAdAccount", "version": 1,
             "parameters": {"__IMTCONN__": connexion}, "mapper": {"ad_account_id": a.compte},
             "metadata": {"designer": {"x": 0, "y": 0}}, "onerror": [ignorer(11, 0)]},
            appel_snap(2, 300, connexion, f"{compte}/campaigns", [("limit", "1000")]),
            appel_snap(3, 600, connexion, f"{compte}/stats", [
                ("granularity", "DAY"), ("breakdown", "campaign"), ("fields", "spend,impressions,swipes"),
                ("start_time", debut), ("end_time", fin)]),
            en_json(4, 900, 2),
            en_json(5, 1200, 3),
            {"id": 6, "module": "http:ActionSendData", "version": 3, "parameters": {"handleErrors": True, "useNewZLibDeCompress": True},
             "mapper": {"ca": "", "qs": [], "url": a.url,
                        "data": '{ "plateforme": "snap", "compte": "%s", "devise": "{{1.currency}}", "snap_campagnes": {{4.json}}, "snap_stats": {{5.json}} }' % a.compte,
                        "gzip": True, "method": "post", "headers": [{"name": "X-Cle-CRM", "value": env["MAKE_CRM_SECRET"]}],
                        "timeout": "", "useMtls": False, "authPass": "", "authUser": "", "bodyType": "raw", "contentType": "application/json",
                        "serializeUrl": False, "shareCookies": False, "parseResponse": True, "followRedirect": True,
                        "useQuerystring": False, "followAllRedirects": False, "rejectUnauthorized": True},
             "metadata": {"designer": {"x": 1500, "y": 0}}, "onerror": [ignorer(16, 1500)]},
        ],
    }


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    for o in ("client", "dossier", "connexion", "compte", "url", "fuseau", "decalage"):
        p.add_argument("--" + o, required=True)
    p.add_argument("--heure", default="07:10")
    p.add_argument("--debut")
    p.add_argument("--fin")
    p.add_argument("--id")
    a = p.parse_args()
    jour = lambda d: '{{formatDate(addDays(now; %d); "YYYY-MM-DD"; "%s")}}T00:00:00%s' % (d, a.fuseau, a.decalage)
    debut = f"{a.debut}T00:00:00{a.decalage}" if a.debut else jour(-7)
    fin = f"{a.fin}T00:00:00{a.decalage}" if a.fin else jour(0)
    print(sauver(a.id, a.dossier, plan(a, debut, fin), {"type": "on-demand"} if a.debut else planifier(a.heure)))
