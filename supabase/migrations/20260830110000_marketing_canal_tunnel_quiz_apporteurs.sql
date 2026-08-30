-- Le quiz des apporteurs devient une source de trafic a part entiere.
-- Applique en production le 30/08/2026.
--
-- Jusqu'ici, `apporteur_quiz` etait noye avec toutes les autres sources
-- d'apporteur (instagram, tiktok, whatsapp, recommandation…) sous un unique
-- canal « apporteur », exclu du classement. C'est pourtant la plus grosse des
-- sources apporteur — 277 leads a ce jour — et surtout un vrai tunnel : le
-- prospect remplit un quiz sur une page dediee, exactement comme il remplirait
-- un formulaire de landing. Le traiter comme une recommandation le rendait
-- invisible.
--
-- Les autres sources d'apporteur restent groupees : ce sont des apports
-- individuels, pas un tunnel.

create or replace function public.marketing_canal(p_source text, p_utm_source text)
returns text language sql immutable as $$
  select case
    when p_source is null                              then 'autre'
    when p_source = 'apporteur_quiz'                   then 'tunnel_quiz_apporteurs'
    when p_source like 'apporteur%'                    then 'apporteur'
    when p_source like '%\_ads'                        then 'meta_ads'
    when p_source like '%instagram_organic'            then 'instagram_organic'
    when p_source like '%tiktok_organic'               then 'tiktok_organic'
    when p_source like '%\_direct'                     then 'direct'
    when lower(coalesce(p_utm_source,'')) in ('fb','facebook','ig','instagram') then 'meta_ads'
    when p_source in ('vsl_a','vsl_b','webi')          then 'meta_ads'
    else 'autre'
  end;
$$;

comment on function public.marketing_canal(text, text) is
  'Canal d''acquisition d''un lead. Depuis le 24/08/2026 le libelle de source le porte ; avant, il se lit dans l''UTM. `apporteur_quiz` a son propre canal : c''est un tunnel, pas une recommandation.';

create or replace function public.marketing_tunnel(p_source text)
returns text language sql immutable as $$
  select case
    when p_source is null              then 'autre'
    when p_source = 'apporteur_quiz'   then 'quiz'
    when p_source like 'apporteur%'    then 'apporteur'
    when p_source like 'webi_wa%'      then 'wa'
    when p_source like 'webi_vsl%'     then 'vsl'
    when p_source in ('vsl_a','vsl_b') then 'vsl'
    when p_source = 'whatsapp_ads'     then 'wa'
    when p_source = 'webi'             then 'webinaire_legacy'
    else 'autre'
  end;
$$;
