-- Chaque conférence a désormais sa propre heure de début et son propre groupe
-- WhatsApp, portés par sa fiche. Jusqu'ici ces deux informations n'existaient
-- qu'en dur dans le code (theme.ts pour les funnels, send-conference-mail et
-- r-sms pour les envois), et l'heure de bascule des inscriptions était figée à
-- midi dans deux fonctions SQL — cohérent quand la conférence était à 18h30,
-- faux depuis qu'elle est à 11h00.
--
-- Appliquée en production le 30/08/2026 sous la version 20260830070252. La
-- version appliquée renseignait en plus les deux conférences du 30/08 et du
-- 06/09 ; ces lignes de données ne figurent pas ici, elles se saisissent
-- désormais depuis /admin/conferences.

alter table public.conferences
  add column if not exists whatsapp_group_url text,
  add column if not exists starts_at_local time without time zone;

comment on column public.conferences.whatsapp_group_url is
  'Lien d''invitation du groupe WhatsApp de CETTE conférence. Change chaque semaine ; l''ancien groupe reste ouvert, donc une erreur ne produit aucun message d''erreur — elle envoie les inscrits dans la salle de la semaine précédente.';
comment on column public.conferences.starts_at_local is
  'Heure de début, en heure de Paris. NULL = 11h00 par défaut. C''est aussi l''heure à laquelle les nouvelles inscriptions basculent sur la conférence suivante.';

-- ── Bascule des inscriptions ────────────────────────────────────────────────
-- Les deux fonctions ci-dessous gardent leur nom historique en « noon » : le
-- renommer casserait les appelants. L'heure ne vient plus de midi mais de la
-- fiche de la conférence, avec 11h00 comme valeur par défaut.
-- Elles passent d'IMMUTABLE à STABLE puisqu'elles lisent une table. Vérifié :
-- aucun index ni colonne générée ne dépend d'elles.

create or replace function public.next_sunday_noon_paris_after(p_ts timestamp with time zone)
returns date
language plpgsql
stable
as $function$
DECLARE
  v_paris   timestamp;
  v_dow     int;
  v_dimanche date;
  v_heure   time;
BEGIN
  IF p_ts IS NULL THEN
    RETURN NULL;
  END IF;
  v_paris    := (p_ts AT TIME ZONE 'Europe/Paris');
  v_dow      := EXTRACT(DOW FROM v_paris)::int;                 -- 0 = dimanche
  v_dimanche := v_paris::date - (v_dow || ' days')::interval;   -- dimanche de la semaine en cours

  SELECT c.starts_at_local INTO v_heure
    FROM public.conferences c
   WHERE c.conference_date = v_dimanche;
  v_heure := COALESCE(v_heure, time '11:00');

  -- Dimanche avant l'heure de début : la prochaine conférence est celle du jour.
  -- Sinon : celle du dimanche suivant.
  IF v_dow = 0 AND v_paris::time < v_heure THEN
    RETURN v_dimanche;
  ELSE
    RETURN v_dimanche + INTERVAL '7 days';
  END IF;
END;
$function$;

create or replace function public.prev_or_current_sunday_noon_paris(p_ts timestamp with time zone)
returns date
language plpgsql
stable
as $function$
DECLARE
  v_paris   timestamp;
  v_dow     int;
  v_dimanche date;
  v_heure   time;
BEGIN
  IF p_ts IS NULL THEN
    RETURN NULL;
  END IF;
  v_paris    := (p_ts AT TIME ZONE 'Europe/Paris');
  v_dow      := EXTRACT(DOW FROM v_paris)::int;
  v_dimanche := v_paris::date - (v_dow || ' days')::interval;

  SELECT c.starts_at_local INTO v_heure
    FROM public.conferences c
   WHERE c.conference_date = v_dimanche;
  v_heure := COALESCE(v_heure, time '11:00');

  -- Miroir de la fonction précédente : la conférence en cours ou la dernière passée.
  IF v_dow = 0 AND v_paris::time >= v_heure THEN
    RETURN v_dimanche;
  ELSE
    RETURN v_dimanche - INTERVAL '7 days';
  END IF;
END;
$function$;

comment on function public.next_sunday_noon_paris_after(timestamp with time zone) is
  'Conférence à laquelle rattacher une inscription faite à cet instant. Nom historique : la bascule n''est plus à midi mais à l''heure de la fiche (11h00 par défaut).';
comment on function public.prev_or_current_sunday_noon_paris(timestamp with time zone) is
  'Conférence en cours ou dernière passée à cet instant. Même remarque sur le nom que sa fonction miroir.';

-- ── Lecture publique, strictement limitée ───────────────────────────────────
-- Les funnels sont servis à des visiteurs anonymes et doivent connaître la date,
-- l'heure et le groupe de la prochaine conférence. La table entière ne peut pas
-- leur être ouverte : elle contient les jetons et les codes d'accès des replays.
-- D'où cette fonction, qui n'expose que les trois colonnes nécessaires.

create or replace function public.conference_courante()
returns table (conference_date date, starts_at_local time without time zone, whatsapp_group_url text)
language sql
stable
security definer
set search_path = public
as $function$
  select c.conference_date,
         coalesce(c.starts_at_local, time '11:00'),
         c.whatsapp_group_url
    from public.conferences c
   where c.conference_date = public.next_sunday_noon_paris_after(now())
   limit 1;
$function$;

comment on function public.conference_courante() is
  'Conférence sur laquelle les funnels doivent inscrire en ce moment. Bascule d''elle-même à l''heure de début. SECURITY DEFINER pour ne rien exposer d''autre que ces trois colonnes.';

grant execute on function public.conference_courante() to anon, authenticated;
