-- ═══════════════════════════════════════════════════════════════════════
-- Fermer les vues qui contournaient la RLS pour le role `anon`.
--
-- CE QUI A ETE TROUVE. Onze vues du schema public appartenaient a `postgres`
-- sans l'option `security_invoker` : elles s'executaient donc avec les droits de
-- leur proprietaire et CONTOURNAIENT la RLS des tables sous-jacentes. Le role
-- `anon` avait SELECT sur toutes. Or la cle anon est publique par nature : elle
-- voyage dans le bundle du site.
--
-- Exposition mesuree : leads_enriched 5 271 lignes, email_campaign_recipient_status
-- 4 479, sms_campaign_recipient_status 1 724, calls_enriched 1 301, plus la vue
-- contact_timeline (6 788 lignes) — soit l'integralite des prospects, appels,
-- ventes et coordonnees de campagne, lisibles sans compte.
--
-- CE QU'ON FAIT. On retire l'acces anonyme. Aucune de ces vues n'est lue par une
-- page publique : verification faite fichier par fichier, elles ne servent qu'a
-- des ecrans derriere authentification. Les utilisateurs connectes ne voient
-- donc aucune difference.
--
-- `public_certificates_view` est VOLONTAIREMENT epargnee : elle alimente
-- /verify/:number, page ouverte a tous par conception, et son `security_invoker`
-- est explicitement pose a false. Verifie apres coup dans le navigateur : la
-- page repond toujours.
--
-- CE QU'ON NE FAIT PAS ENCORE. Ces vues contournent aussi la RLS pour les
-- utilisateurs CONNECTES : un apporteur qui interroge `leads_enriched` lit les
-- 5 271 leads, la ou les 9 politiques RLS de `leads` ne lui en montreraient
-- qu'une poignee. Poser `security_invoker = on` corrigerait cela, mais changerait
-- ce que voit chaque role et demande d'etre teste ecran par ecran. A traiter
-- separement, pas dans la meme migration qu'un correctif urgent.
-- ═══════════════════════════════════════════════════════════════════════

revoke all on public.leads_enriched                  from anon;
revoke all on public.calls_enriched                  from anon;
revoke all on public.email_campaign_recipient_status from anon;
revoke all on public.sms_campaign_recipient_status   from anon;
revoke all on public.recon_sale_verdict              from anon;
revoke all on public.activity_weekly_totals          from anon;
revoke all on public.email_campaign_stats            from anon;
revoke all on public.sms_campaign_stats              from anon;
revoke all on public.email_campaign_duplicates       from anon;

-- Vue morte : aucune reference dans src/ ni supabase/, absente de toute
-- migration versionnee. Sa definition, conservee ici au cas ou :
--   SELECT contact_id, 'lead', id, created_at, source, status FROM leads
--   UNION ALL SELECT contact_id, 'call', id, scheduled_at, event_type, status FROM calls
--   UNION ALL SELECT contact_id, 'sale', id, sold_at, product, payment_status FROM sales
--   ORDER BY 4 DESC;
drop view if exists public.contact_timeline;
