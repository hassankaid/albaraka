-- Notifie le CEO (cloche) à chaque upload ou modification de RIB par un
-- apporteur ou un collaborateur.

create or replace function public.notify_ceo_on_rib_change()
returns trigger language plpgsql security definer as $$
declare
  v_ceo_ids uuid[];
  v_apporteur_name text;
  v_action text;
begin
  if (tg_op = 'UPDATE') then
    if (coalesce(old.bank_rib_url, '') = coalesce(new.bank_rib_url, ''))
       and (old.bank_details is not distinct from new.bank_details) then
      return new;
    end if;
    v_action := case
      when old.bank_rib_url is null and new.bank_rib_url is not null then 'upload'
      else 'modification'
    end;
  else
    if new.bank_rib_url is null and new.bank_details is null then
      return new;
    end if;
    v_action := 'upload';
  end if;

  if new.role not in ('apporteur', 'collaborateur') then
    return new;
  end if;

  select array_agg(id) into v_ceo_ids from public.profiles where role = 'ceo';
  if v_ceo_ids is null or array_length(v_ceo_ids, 1) = 0 then
    return new;
  end if;

  v_apporteur_name := coalesce(nullif(trim(new.full_name), ''), new.email, 'Utilisateur');

  insert into public.notifications (user_id, type, title, body, link, metadata)
  select
    id,
    'rib_change',
    case when v_action = 'upload' then 'RIB ajouté' else 'RIB modifié' end,
    v_apporteur_name || ' vient de ' ||
      case when v_action = 'upload' then 'ajouter' else 'modifier' end ||
      ' son RIB.',
    '/admin/training/students/' || new.id,
    jsonb_build_object(
      'apporteur_id', new.id,
      'apporteur_name', v_apporteur_name,
      'action', v_action
    )
  from unnest(v_ceo_ids) as id;

  return new;
end;
$$;

drop trigger if exists trg_profiles_rib_change on public.profiles;

create trigger trg_profiles_rib_change
  after insert or update of bank_rib_url, bank_details on public.profiles
  for each row execute function public.notify_ceo_on_rib_change();
