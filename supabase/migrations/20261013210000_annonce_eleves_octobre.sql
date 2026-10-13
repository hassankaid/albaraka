-- ─────────────────────────────────────────────────────────────────────────
-- Annonce e-mail aux élèves du 13/10/2026 (texte de Sidali : parcours,
-- ressources, Studio, communauté WhatsApp). Destinataires : les élèves avec un
-- pass AL BARAKA ou Liberty actif dont l'accès n'est pas coupé, hors adresses
-- désabonnées et hors ceux qui l'ont déjà reçue (journal email_campaign_sends).
-- Appelée par l'edge function send-annonce-eleves (clé de service).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.destinataires_annonce_eleves(p_campagne text)
returns table(email text, first_name text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select distinct on (lower(trim(u.email)))
         lower(trim(u.email)) as email,
         split_part(coalesce(p.full_name, ''), ' ', 1) as first_name
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'apporteur'
    and u.email is not null
    and exists (select 1 from public.user_passes x
                 where x.user_id = p.id and x.revoked_at is null and x.pass_type in ('al_baraka', 'liberty'))
    and not public.acces_formations_coupe(p.id)
    and not exists (select 1 from public.email_unsubscribes d where lower(trim(d.email)) = lower(trim(u.email)))
    and not exists (select 1 from public.email_campaign_sends s
                     where s.campaign_slug = p_campagne and s.status = 'sent'
                       and lower(trim(s.recipient_email)) = lower(trim(u.email)))
  order by lower(trim(u.email));
$$;
revoke execute on function public.destinataires_annonce_eleves(text) from public, anon, authenticated;
