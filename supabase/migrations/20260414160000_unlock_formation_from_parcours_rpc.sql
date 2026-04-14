-- RPC SECURITY DEFINER permettant à un élève de s'auto-enroller à une formation
-- débloquée par un chapitre "redirect_formation" de son parcours.
-- Remplace l'insert direct côté client qui violait les RLS policies (CEO only).

create or replace function public.unlock_formation_from_parcours(p_formation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row_id uuid;
  v_has_pass boolean;
  v_formation_in_parcours boolean;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select exists (
    select 1 from public.user_passes
    where user_id = v_user_id and revoked_at is null
  ) into v_has_pass;

  if not v_has_pass then
    raise exception 'no active pass';
  end if;

  select exists (
    select 1 from public.parcours_chapitres
    where formation_id = p_formation_id
  ) into v_formation_in_parcours;

  if not v_formation_in_parcours then
    raise exception 'formation not linked to any parcours';
  end if;

  insert into public.formation_enrollments (user_id, formation_id, source, granted_by)
  values (v_user_id, p_formation_id, 'parcours', v_user_id)
  on conflict (user_id, formation_id) do update
    set revoked_at = null,
        source = case when public.formation_enrollments.source = 'manual'
                     then 'manual'
                     else 'parcours' end
  returning id into v_row_id;

  return v_row_id;
end;
$$;

grant execute on function public.unlock_formation_from_parcours(uuid) to authenticated;
