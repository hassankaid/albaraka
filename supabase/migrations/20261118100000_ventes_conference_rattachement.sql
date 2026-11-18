-- Rattachement des ventes à leur conférence (18/11/2026).
--
-- Constat (remontée de Sidali, 17/11) : 6 ventes la semaine de la conférence
-- du 15/11, mais 3 seulement affichées sous le 15/11. Les 3 du lundi 16/11
-- étaient rangées sous le 08/11.
--
-- Deux causes :
--   1. Un bon de commande n'est jamais relié à son lead ni à son call
--      (sales.lead_id et sales.call_id vides sur 101 ventes sur 101). La
--      conférence était donc toujours déduite de la date de la vente.
--   2. Cette déduction (prev_or_current_sunday_noon_paris) renvoyait, du lundi
--      au samedi, la conférence de la semaine PRÉCÉDENTE. Seul le dimanche après
--      l'heure de début tombait juste. 41 ventes sur 101 décalées d'une semaine.
--
-- Règle validée par Hassan le 17/11 : une vente compte pour la conférence à
-- travers laquelle le lead a pris rendez-vous. Ordre de recherche :
--   a. le lead ou le call de la vente, s'ils sont renseignés (inchangé) ;
--   b. le dernier call non annulé du contact pris avant la vente, si sa
--      conférence est déjà passée au moment de la vente (un call de
--      rediffusion est rangé sur la conférence SUIVANTE : il est alors ignoré
--      et c'est le lead qui parle) ;
--   c. le dernier lead du contact créé avant la vente, même condition ;
--   d. à défaut, la conférence en cours ou la dernière passée à la date de la
--      vente (fonction corrigée).
--
-- Les montants, paiements et commissions ne bougent pas : seule la conférence
-- sous laquelle la vente s'affiche change.

-- ── 1. Conférence en cours ou dernière passée : correctif ───────────────────
create or replace function public.prev_or_current_sunday_noon_paris(p_ts timestamp with time zone)
returns date
language plpgsql
stable
as $function$
DECLARE
  v_paris    timestamp;
  v_dow      int;
  v_dimanche date;
  v_heure    time;
BEGIN
  IF p_ts IS NULL THEN
    RETURN NULL;
  END IF;
  v_paris    := (p_ts AT TIME ZONE 'Europe/Paris');
  v_dow      := EXTRACT(DOW FROM v_paris)::int;
  v_dimanche := v_paris::date - v_dow;   -- le dimanche de la semaine (ou aujourd'hui)

  SELECT c.starts_at_local INTO v_heure
    FROM public.conferences c
   WHERE c.conference_date = v_dimanche;
  v_heure := COALESCE(v_heure, time '11:00');

  -- Seul le dimanche AVANT l'heure de début appartient encore à la semaine
  -- d'avant. Du lundi au samedi, la dernière conférence passée est celle du
  -- dimanche qui précède (avant le 18/11/2026 : celle d'une semaine plus tôt).
  IF v_dow = 0 AND v_paris::time < v_heure THEN
    RETURN v_dimanche - 7;
  END IF;
  RETURN v_dimanche;
END;
$function$;

comment on function public.prev_or_current_sunday_noon_paris(timestamp with time zone) is
  'Conférence en cours ou dernière passée à cet instant (bascule à l''heure de début, 11h00 par défaut). Corrigée le 18/11/2026 : renvoyait une semaine trop tôt du lundi au samedi.';

-- ── 2. Conférence d'une vente sans lead ni call ─────────────────────────────
create or replace function public.conference_de_vente(p_contact_id uuid, p_ref timestamp with time zone)
returns date
language plpgsql
stable
set search_path = public
as $function$
DECLARE
  v_jour date;
  v_conf date;
BEGIN
  IF p_ref IS NULL THEN
    RETURN NULL;
  END IF;
  v_jour := (p_ref AT TIME ZONE 'Europe/Paris')::date;

  IF p_contact_id IS NOT NULL THEN
    SELECT k.conference_date INTO v_conf
      FROM public.calls k
     WHERE k.contact_id = p_contact_id
       AND k.status IS DISTINCT FROM 'annule'
       AND k.created_at <= p_ref
     ORDER BY k.created_at DESC
     LIMIT 1;
    IF v_conf IS NOT NULL AND v_conf <= v_jour THEN
      RETURN v_conf;
    END IF;

    SELECT l.conference_date INTO v_conf
      FROM public.leads l
     WHERE l.contact_id = p_contact_id
       AND l.created_at <= p_ref
       AND l.conference_date IS NOT NULL
       AND l.conference_date <= v_jour
     ORDER BY l.created_at DESC
     LIMIT 1;
    IF v_conf IS NOT NULL THEN
      RETURN v_conf;
    END IF;
  END IF;

  RETURN public.prev_or_current_sunday_noon_paris(p_ref);
END;
$function$;

comment on function public.conference_de_vente(uuid, timestamp with time zone) is
  'Conférence d''une vente sans lead ni call : celle du dernier call du contact, sinon de son dernier lead, sinon la dernière passée. Règle du 17/11/2026.';

create or replace function public.set_sale_conference_date()
returns trigger
language plpgsql
as $function$
DECLARE
  v_conf date;
BEGIN
  IF NEW.sale_type = 'studio' THEN
    NEW.conference_date := NULL;
    RETURN NEW;
  END IF;
  IF NEW.lead_id IS NOT NULL THEN
    SELECT conference_date INTO v_conf FROM public.leads WHERE id = NEW.lead_id;
    IF v_conf IS NOT NULL THEN
      NEW.conference_date := v_conf;
      RETURN NEW;
    END IF;
  END IF;
  IF NEW.call_id IS NOT NULL THEN
    SELECT conference_date INTO v_conf FROM public.calls WHERE id = NEW.call_id;
    IF v_conf IS NOT NULL THEN
      NEW.conference_date := v_conf;
      RETURN NEW;
    END IF;
  END IF;
  NEW.conference_date := public.conference_de_vente(NEW.contact_id, COALESCE(NEW.sold_at, NEW.created_at));
  RETURN NEW;
END;
$function$;

-- Le contact entre désormais dans le calcul : le déclencheur doit le suivre.
drop trigger if exists trg_sale_conference_date on public.sales;
create trigger trg_sale_conference_date
  before insert or update of lead_id, call_id, contact_id, sold_at, created_at on public.sales
  for each row execute function public.set_sale_conference_date();

-- ── 3. Rattrapage des ventes existantes ─────────────────────────────────────
-- Depuis le 01/09/2026 seulement (cycle des conférences suivi au marketing) :
-- l'historique plus ancien n'est pas réécrit, comme pour les rendez-vous le
-- 30/08 (chiffres déjà arrêtés). 25 ventes concernées, dont 22 PASS.
update public.sales s
   set conference_date = public.conference_de_vente(s.contact_id, coalesce(s.sold_at, s.created_at))
 where s.sale_type is distinct from 'studio'
   and s.lead_id is null
   and s.call_id is null
   and coalesce(s.sold_at, s.created_at) >= timestamptz '2026-09-01 00:00 Europe/Paris'
   and s.conference_date is distinct from public.conference_de_vente(s.contact_id, coalesce(s.sold_at, s.created_at));

-- ── 4. Rattrapage des calls d'inscription conférence ────────────────────────
-- Ce sont les seuls calls qui passent par la fonction corrigée. Les autres
-- (rediffusion, VSL…) suivent la conférence suivante et ne changent pas.
-- Même borne que les ventes : 3 calls concernés.
update public.calls k
   set conference_date = public.prev_or_current_sunday_noon_paris(coalesce(k.scheduled_at, k.created_at))
 where k.event_type in ('INSCRIPTION CONFÉRENCE', 'inscription_conference')
   and k.created_at >= timestamptz '2026-09-01 00:00 Europe/Paris'
   and k.conference_date is distinct from public.prev_or_current_sunday_noon_paris(coalesce(k.scheduled_at, k.created_at));
