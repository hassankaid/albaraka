#!/usr/bin/env python3
"""Crée (ou met à jour) le scénario Make « dépenses Meta quotidiennes » d'un client.

Un scénario par compte pub : lecture des 7 derniers jours par campagne, envoi à la
réception du CRM. Une erreur ne coupe pas le scénario : le jour manqué est relu le
lendemain, et le scénario de surveillance prévient si plus rien n'arrive.

    python3 creer-scenario-meta.py --client "AL BARAKA" --dossier 457391 \
        --business 1673586024770863 --compte act_1123481796898822 \
        --url https://…/functions/v1/depenses-pub --heure 07:00

Avec --niveau pub, le scénario lit la dépense par PUB (onglet « Par créa » du tableau
de bord), à côté du scénario par campagne qui fait les totaux.

Lit MAKE_API_TOKEN, MAKE_ZONE, MAKE_TEAM_ID et MAKE_CRM_SECRET dans .env.local.
"""
import argparse
import json

from make_api import IMT_FACEBOOK, REGLAGES, appel, env, ignorer, planifier, sauver


CHAMPS = {
    "campagne": ["campaign_id", "campaign_name", "spend", "impressions", "inline_link_clicks", "account_currency"],
    "pub": ["ad_id", "ad_name", "adset_id", "adset_name", "campaign_id", "campaign_name", "spend", "impressions",
            "inline_link_clicks", "account_currency"],
}


def plan(a, preset):
    champs = CHAMPS[a.niveau]
    entete = {"plateforme": "meta", "compte": a.compte, **({"niveau": "pub"} if a.niveau == "pub" else {})}
    return {
        "name": f"{a.client} - DÉPENSES META{' PAR PUB' if a.niveau == 'pub' else ''} - {a.compte} → CRM"
                + (" (import ponctuel)" if preset != "last_7d" else ""),
        "metadata": {"instant": False, "version": 1, "designer": {"orphans": []}, "scenario": REGLAGES},
        "flow": [
            {"id": 1, "module": "facebook-insights:GetAdAccountInsights", "version": 1,
             "parameters": {"__IMTCONN__": IMT_FACEBOOK},
             "mapper": {"sort": [{"field": "date_start", "direction": "ascending"}], "type": "adAccount",
                        "level": "ad" if a.niveau == "pub" else "campaign",
                        "limit": "5000", "business": a.business, "adAccount": a.compte, "date_preset": preset,
                        "specify_date": "date_preset", "time_increment": "1",
                        "fields": champs},
             "metadata": {"designer": {"x": 0, "y": 0}}, "onerror": [ignorer(5, 0)]},
            {"id": 2, "module": "builtin:BasicAggregator", "version": 1, "parameters": {"feeder": 1},
             "mapper": {k: "{{1.%s}}" % k for k in ["date_start", *champs]},
             "metadata": {"designer": {"x": 300, "y": 0}}},
            {"id": 3, "module": "json:TransformToJSON", "version": 1, "parameters": {"space": ""},
             "mapper": {"object": "{{2.array}}"}, "metadata": {"designer": {"x": 600, "y": 0}}},
            {"id": 4, "module": "http:ActionSendData", "version": 3, "parameters": {"handleErrors": True, "useNewZLibDeCompress": True},
             "mapper": {"ca": "", "qs": [], "url": a.url,
                        "data": json.dumps(entete)[:-1] + ', "lignes": {{3.json}} }',
                        "gzip": True, "method": "post", "headers": [{"name": "X-Cle-CRM", "value": env["MAKE_CRM_SECRET"]}],
                        "timeout": "", "useMtls": False, "authPass": "", "authUser": "", "bodyType": "raw", "contentType": "application/json",
                        "serializeUrl": False, "shareCookies": False, "parseResponse": True, "followRedirect": True,
                        "useQuerystring": False, "followAllRedirects": False, "rejectUnauthorized": True},
             "metadata": {"designer": {"x": 900, "y": 0}}, "onerror": [ignorer(6, 900)]},
        ],
    }


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    for o in ("client", "dossier", "business", "compte", "url"):
        p.add_argument("--" + o, required=True)
    p.add_argument("--heure", default="07:00")
    p.add_argument("--preset", default="last_7d", help="last_7d (quotidien) ou une période Meta pour un import ponctuel")
    p.add_argument("--niveau", default="campagne", choices=["campagne", "pub"])
    p.add_argument("--id", help="scénario existant à mettre à jour")
    a = p.parse_args()
    quotidien = a.preset == "last_7d"
    print(sauver(a.id, a.dossier, plan(a, a.preset), planifier(a.heure) if quotidien else {"type": "on-demand"}))
