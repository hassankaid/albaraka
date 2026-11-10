-- ─────────────────────────────────────────────────────────────────────────
-- Changer le closer d'un call (demande de Sidali, 10/11/2026 ; décisions de Hassan).
--
-- Le closer d'un call (`calls.assigned_to`) est posé par Calendly (hôte du round
-- robin) et rien ne permettait de le changer : quand Sabrina confie un call à
-- Hedi pour équilibrer, Hedi ne pouvait ni le traiter ni y laisser de note, et
-- le call restait compté pour Sabrina.
--
-- Décisions :
--   - peuvent changer le closer : le CEO et le closer actuel du call ;
--   - chaque changement est tracé (call_activities « reassigned », ancien → nouveau)
--     et le nouveau closer reçoit une notification ;
--   - les commissions ne bougent pas : elles restent posées à la main sur la vente.
--
-- Le rendez-vous Calendly (agenda, lien Zoom) n'est pas modifié : c'est le CRM.
-- ─────────────────────────────────────────────────────────────────────────

-- Les membres à qui confier un call : équipe active (CEO + collaborateurs).
-- `habituel` = a eu au moins un call ces 90 derniers jours (affichés en premier).
create or replace function public.closers_possibles()
 returns table(id uuid, full_name text, habituel boolean)
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select p.id, p.full_name,
         exists (select 1 from public.calls c
                  where c.assigned_to = p.id and c.scheduled_at > now() - interval '90 days') as habituel
  from public.profiles p
  where coalesce(public.get_user_role(), '') in ('ceo', 'collaborateur')
    and p.role in ('ceo', 'collaborateur')
    and coalesce(p.is_active, true)
  order by 3 desc, 2
$function$;

revoke all on function public.closers_possibles() from public, anon;
grant execute on function public.closers_possibles() to authenticated;

create or replace function public.changer_closer_call(p_call_id uuid, p_nouveau uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_role text := coalesce(public.get_user_role(), '');
  v_moi uuid := auth.uid();
  v_call record;
  v_ancien_nom text;
  v_nouveau_nom text;
  v_moi_nom text;
  v_contact text;
  v_quand text;
begin
  if v_moi is null then
    raise exception 'Connexion requise';
  end if;

  select c.id, c.assigned_to, c.scheduled_at, c.contact_id, c.raw_full_name
    into v_call
  from public.calls c
  where c.id = p_call_id
  for update;

  if not found then
    raise exception 'Call introuvable';
  end if;

  if v_role <> 'ceo' and v_call.assigned_to is distinct from v_moi then
    raise exception 'Seul le closer du call ou le CEO peut le confier à quelqu''un d''autre';
  end if;

  select full_name into v_nouveau_nom
  from public.profiles
  where id = p_nouveau and role in ('ceo', 'collaborateur') and coalesce(is_active, true);
  if v_nouveau_nom is null then
    raise exception 'Ce membre ne peut pas recevoir de call';
  end if;

  if v_call.assigned_to = p_nouveau then
    return;
  end if;

  select full_name into v_ancien_nom from public.profiles where id = v_call.assigned_to;
  select full_name into v_moi_nom from public.profiles where id = v_moi;

  update public.calls set assigned_to = p_nouveau where id = p_call_id;

  insert into public.call_activities (call_id, user_id, action, old_value, new_value, note)
  values (p_call_id, v_moi, 'reassigned', v_call.assigned_to::text, p_nouveau::text,
          format('Closer changé : %s → %s', coalesce(v_ancien_nom, 'personne'), v_nouveau_nom));

  if p_nouveau <> v_moi then
    select coalesce(nullif(btrim(ct.full_name), ''), nullif(btrim(v_call.raw_full_name), ''), 'un prospect')
      into v_contact
    from (select 1) x left join public.contacts ct on ct.id = v_call.contact_id;
    v_quand := case when v_call.scheduled_at is null then ''
                    else ' du ' || to_char(v_call.scheduled_at at time zone 'Europe/Paris', 'DD/MM à HH24"h"MI') end;
    insert into public.notifications (user_id, type, title, body, link, metadata)
    values (p_nouveau, 'call_confie', 'Un call t''a été confié',
            format('%s t''a confié le call de %s%s.', coalesce(v_moi_nom, 'Quelqu''un'), v_contact, v_quand),
            '/calls',
            jsonb_build_object('call_id', p_call_id, 'ancien_closer', v_call.assigned_to, 'par', v_moi));
  end if;
end
$function$;

revoke all on function public.changer_closer_call(uuid, uuid) from public, anon;
grant execute on function public.changer_closer_call(uuid, uuid) to authenticated;
