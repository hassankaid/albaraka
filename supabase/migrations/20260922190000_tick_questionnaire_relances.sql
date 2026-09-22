-- Relances automatiques du questionnaire.
--
-- Calendrier, calé sur le jour du PREMIER envoi (heure de Paris) :
--   J+1 à 9h → relance
--   J+3 à 9h → dernier rappel, le matin même de la fermeture (23h59)
--
-- Le dernier rappel tombe le jour de la fermeture et non la veille : c'est le
-- message qui dit « le questionnaire ferme le … », il est plus fort quand
-- c'est vrai le jour même, et il reste quinze heures pour répondre.
--
-- Fenêtre de trois heures : un envoi raté à 9h peut encore partir jusqu'à
-- midi, mais jamais l'après-midi — une relance du matin qui arrive le soir
-- fait plus de mal que de bien. Rien ne part après la fermeture.
create or replace function public.tick_questionnaire()
returns table (etape text, action text, detail text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_premier timestamptz;
  v_jour date;
  v_ferme timestamptz;
  v_now timestamptz := now();
  r record;
  v_req bigint;
  v_n integer;
begin
  select min(envoye_le) into v_premier from questionnaire_invitations where envoye_le is not null;
  if v_premier is null then
    return;
  end if;

  v_jour  := (v_premier at time zone 'Europe/Paris')::date;
  v_ferme := (((v_jour + 3) + time '23:59') at time zone 'Europe/Paris');
  if v_now > v_ferme then
    return;
  end if;

  for r in
    select 'relance1' as etape, 2 as seq, (((v_jour + 1) + time '09:00') at time zone 'Europe/Paris') as prevu
    union all
    select 'relance2', 3, (((v_jour + 3) + time '09:00') at time zone 'Europe/Paris')
  loop
    continue when v_now < r.prevu or v_now > r.prevu + interval '3 hours';

    if exists (select 1 from email_campaign_sends
               where campaign_slug = 'questionnaire_clients' and email_seq = r.seq) then
      continue;
    end if;

    select count(*) into v_n
    from questionnaire_invitations
    where not test and not exclu and statut not in ('repondu', 'non_envoye');
    if v_n = 0 then
      continue;
    end if;

    v_req := net.http_post(
      url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/send-questionnaire-mail',
      body := jsonb_build_object('envoi', r.etape, 'max', 400),
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 145000
    );

    etape := r.etape; action := 'declenche'; detail := v_n || ' non-répondant(s)';
    return next;
  end loop;
end;
$$;

grant execute on function public.tick_questionnaire() to service_role;

select cron.schedule(
  'questionnaire_relances_auto',
  '* * * * *',
  $$ select public.tick_questionnaire() $$
);
