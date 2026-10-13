-- ─────────────────────────────────────────────────────────────────────────
-- Coachings : un élève dont l'accès est suspendu (pass retiré ou vente
-- « perdue », règle du 13/10/2026) n'a accès à aucun coaching, même avec une
-- dérogation manuelle (Hassan, 13/10/2026 : « rien du tout »).
-- Seul changement par rapport à la version précédente : le premier cas.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.coachings_de(p_user uuid)
returns table(slot_id text, titre text, deverrouille boolean, origine text, formation_requise uuid, motif_manuel text)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_role text;
  v_coupe boolean;
begin
  if p_user is null then return; end if;
  select p.role into v_role from profiles p where p.id = p_user;
  v_coupe := public.acces_formations_coupe(p_user);

  return query
  select s.id, s.title,
         case
           when v_coupe then false
           when public.acces_manuel(p_user, 'coaching', s.id) = 'autorise' then true
           when public.acces_manuel(p_user, 'coaching', s.id) = 'bloque' then false
           when coalesce(v_role, '') <> 'apporteur' then true
           when s.formation_requise_id is null then true
           else public.is_formation_complete_for_user(p_user, s.formation_requise_id)
         end,
         case
           when v_coupe then 'suspendu'
           when public.acces_manuel(p_user, 'coaching', s.id) is not null then 'manuel'
           when coalesce(v_role, '') <> 'apporteur' then 'staff'
           when s.formation_requise_id is null then 'libre'
           else 'formation'
         end,
         s.formation_requise_id,
         (select a.motif from acces_manuels a
           where a.user_id = p_user and a.domaine = 'coaching' and a.cible = s.id
             and a.revoque_le is null and (a.expire_le is null or a.expire_le > now())
           limit 1)
  from coaching_weekly_slots s
  where s.is_active
  order by s.display_order;
end;
$function$;
