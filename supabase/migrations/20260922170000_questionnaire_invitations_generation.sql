-- Une invitation de test ne doit jamais partir dans la campagne réelle.
--
-- Sans ce marqueur, la seule façon de tester le parcours serait d'emprunter le
-- lien d'un vrai client — ce qui marquerait son invitation comme cliquée et lui
-- créerait un brouillon de réponses qui n'est pas le sien.
alter table public.questionnaire_invitations
  add column if not exists test boolean not null default false;

comment on column public.questionnaire_invitations.test is
  'Invitation de recette : exclue des envois et des statistiques.';

-- Fabrique les invitations manquantes, une par client actif.
--
-- Rejouable : un client déjà invité garde son jeton, donc son lien reste
-- valable et ses réponses en cours ne sont pas perdues. C'est ce qui permet de
-- relancer la fonction quand de nouveaux clients arrivent.
--
-- `les_deux` pour ceux qui détiennent PASS et LIBERTY : eux seuls verront la
-- Q10, puisqu'on ne peut pas répondre à leur place.
create or replace function public.generer_invitations_questionnaire()
returns table (crees integer, total integer)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare v_crees integer;
begin
  with clients as (
    select up.user_id,
           case when count(distinct up.pass_type) > 1 then 'les_deux'
                else min(up.pass_type::text) end as formation
    from user_passes up
    where up.revoked_at is null
    group by up.user_id
  )
  insert into questionnaire_invitations (user_id, token, formation, prenom, email)
  select c.user_id,
         encode(extensions.gen_random_bytes(16), 'hex'),
         c.formation,
         prenom_affichable(p.full_name),
         lower(trim(p.email))
  from clients c
  join profiles p on p.id = c.user_id
  where p.email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'
  on conflict (user_id) do nothing;

  get diagnostics v_crees = row_count;

  crees := v_crees;
  select count(*) into total from questionnaire_invitations;
  return next;
end;
$$;

grant execute on function public.generer_invitations_questionnaire() to service_role;
