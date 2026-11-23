-- ─────────────────────────────────────────────────────────────────────────
-- Ventes ↔ conférence : la réinscription à une conférence compte (23/11/2026).
--
-- Remontée de Sidali : « une vente ne remonte pas de la conférence d'hier ».
-- Cas : une lead inscrite pour la conférence du 15/11, jamais jointe, que la
-- setter réinscrit le 19/11 (statut « Inscrit conférence ») pour celle du
-- 22/11. Elle y assiste et achète le 22/11 au soir, sans call. La règle du
-- 17/11 prenait la conférence de son lead (15/11), qui ne change jamais :
-- la vente partait sur le 15/11.
--
-- Nouvelle règle : parmi les conférences déjà passées le jour de la vente,
-- on prend la PLUS RÉCENTE de :
--   1. celle du dernier call non annulé du contact ;
--   2. celle de son dernier lead ;
--   3. la conférence qui suit son dernier passage en « Inscrit conférence »
--      (dans les 30 jours avant la vente : une réinscription vieille de
--      plusieurs mois ne dit plus rien de l'achat).
-- Sinon, la dernière conférence passée (inchangé).
--
-- Testé en transaction annulée : 3 ventes changent depuis le 01/09 (22/11 :
-- 15/11 → 22/11 ; 10/11 : 25/10 → 08/11 ; 15/09 : 15/02 → 13/09).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.conference_de_vente(p_contact_id uuid, p_ref timestamp with time zone)
returns date
language plpgsql
stable
set search_path to 'public'
as $function$
DECLARE
  v_jour date;
  v_call date;
  v_lead date;
  v_reinscr timestamptz;
  v_conf_reinscr date;
  v_conf date;
BEGIN
  IF p_ref IS NULL THEN
    RETURN NULL;
  END IF;
  v_jour := (p_ref AT TIME ZONE 'Europe/Paris')::date;

  IF p_contact_id IS NOT NULL THEN
    -- 1. Dernier call (les calls de rediffusion pointent sur la conférence
    --    suivante : écartés s'ils sont après le jour de la vente).
    SELECT k.conference_date INTO v_call
      FROM public.calls k
     WHERE k.contact_id = p_contact_id
       AND k.status IS DISTINCT FROM 'annule'
       AND k.created_at <= p_ref
     ORDER BY k.created_at DESC
     LIMIT 1;
    IF v_call > v_jour THEN
      v_call := NULL;
    END IF;

    -- 2. Dernier lead.
    SELECT l.conference_date INTO v_lead
      FROM public.leads l
     WHERE l.contact_id = p_contact_id
       AND l.created_at <= p_ref
       AND l.conference_date IS NOT NULL
       AND l.conference_date <= v_jour
     ORDER BY l.created_at DESC
     LIMIT 1;

    -- 3. Dernière réinscription par une setter.
    SELECT max(a.created_at) INTO v_reinscr
      FROM public.lead_activities a
      JOIN public.leads l ON l.id = a.lead_id
     WHERE l.contact_id = p_contact_id
       AND a.action = 'status_change'
       AND a.new_value = 'inscrit_conference'
       AND a.created_at <= p_ref
       AND a.created_at > p_ref - interval '30 days';
    IF v_reinscr IS NOT NULL THEN
      SELECT min(c.conference_date) INTO v_conf_reinscr
        FROM public.conferences c
       WHERE c.conference_date >= (v_reinscr AT TIME ZONE 'Europe/Paris')::date
         AND c.conference_date <= v_jour;
    END IF;

    v_conf := GREATEST(v_call, v_lead, v_conf_reinscr);
    IF v_conf IS NOT NULL THEN
      RETURN v_conf;
    END IF;
  END IF;

  RETURN public.prev_or_current_sunday_noon_paris(p_ref);
END;
$function$;

comment on function public.conference_de_vente(uuid, timestamp with time zone) is
  'Conférence d''une vente sans lead ni call : la plus récente (déjà passée le jour de la vente) entre celle du dernier call, du dernier lead et celle qui suit la dernière réinscription (30 j) ; sinon la dernière passée. Règle du 23/11/2026.';

-- Rattrapage, même borne que le 18/11 (ventes depuis le 01/09/2026).
update public.sales s
   set conference_date = public.conference_de_vente(s.contact_id, coalesce(s.sold_at, s.created_at))
 where s.sale_type is distinct from 'studio'
   and s.lead_id is null
   and s.call_id is null
   and coalesce(s.sold_at, s.created_at) >= timestamptz '2026-09-01 00:00 Europe/Paris'
   and s.conference_date is distinct from public.conference_de_vente(s.contact_id, coalesce(s.sold_at, s.created_at));
