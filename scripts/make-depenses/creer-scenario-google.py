#!/usr/bin/env python3
"""Crée (ou met à jour) le scénario Make « dépenses Google Ads quotidiennes » d'un client.

Lit le rapport par campagne et par jour (7 derniers jours, aujourd'hui exclu) et l'envoie à
la réception du CRM. La connexion Make est celle d'un compte Google qui a accès au compte pub.

    python3 creer-scenario-google.py --client "AL BARAKA" --dossier 457391 --connexion 123 \
        --compte 5343750139 --url https://…/functions/v1/depenses-pub [--debut 2026-01-01 --fin 2026-10-31]

Avec --debut et --fin, le scénario est un import ponctuel à lancer à la main.
"""
import argparse
import json

from make_api import REGLAGES, env, ignorer, planifier, sauver


def plan(a):
    debut = a.debut or '{{formatDate(addDays(now; -7); "YYYY-MM-DD")}}'
    fin = a.fin or '{{formatDate(addDays(now; -1); "YYYY-MM-DD")}}'
    return {
        "name": f"{a.client} - DÉPENSES GOOGLE - {a.compte} → CRM" + (" (import ponctuel)" if a.debut else ""),
        "metadata": {"instant": False, "version": 1, "designer": {"orphans": []}, "scenario": REGLAGES},
        "flow": [
            {"id": 1, "module": "google-ads-reports:runCampaignReport", "version": 1,
             "parameters": {"__IMTCONN__": int(a.connexion)},
             "mapper": {"accountId": a.compte, "startDate": debut, "endDate": fin, "limit": "5000"},
             "metadata": {"designer": {"x": 0, "y": 0}}, "onerror": [ignorer(5, 0)]},
            {"id": 2, "module": "builtin:BasicAggregator", "version": 1, "parameters": {"feeder": 1},
             "mapper": {"jour": "{{1.dimensions.date}}", "campagne_id": "{{1.dimensions.campaignId}}", "campagne": "{{1.dimensions.campaignName}}",
                        "montant": "{{1.metrics.cost}}", "impressions": "{{1.metrics.impressions}}", "clics": "{{1.metrics.clicks}}"},
             "metadata": {"designer": {"x": 300, "y": 0}}},
            {"id": 3, "module": "json:TransformToJSON", "version": 1, "parameters": {"space": ""},
             "mapper": {"object": "{{2.array}}"}, "metadata": {"designer": {"x": 600, "y": 0}}},
            {"id": 4, "module": "http:ActionSendData", "version": 3, "parameters": {"handleErrors": True, "useNewZLibDeCompress": True},
             "mapper": {"ca": "", "qs": [], "url": a.url,
                        "data": json.dumps({"plateforme": "google", "compte": a.compte})[:-1] + ', "lignes": {{3.json}} }',
                        "gzip": True, "method": "post", "headers": [{"name": "X-Cle-CRM", "value": env["MAKE_CRM_SECRET"]}],
                        "timeout": "", "useMtls": False, "authPass": "", "authUser": "", "bodyType": "raw", "contentType": "application/json",
                        "serializeUrl": False, "shareCookies": False, "parseResponse": True, "followRedirect": True,
                        "useQuerystring": False, "followAllRedirects": False, "rejectUnauthorized": True},
             "metadata": {"designer": {"x": 900, "y": 0}}, "onerror": [ignorer(6, 900)]},
        ],
    }


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    for o in ("client", "dossier", "connexion", "compte", "url"):
        p.add_argument("--" + o, required=True)
    p.add_argument("--heure", default="07:20")
    p.add_argument("--debut")
    p.add_argument("--fin")
    p.add_argument("--id")
    a = p.parse_args()
    print(sauver(a.id, a.dossier, plan(a), {"type": "on-demand"} if a.debut else planifier(a.heure)))
