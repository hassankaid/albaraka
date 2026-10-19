-- ─────────────────────────────────────────────────────────────────────────
-- Studio : le coût IA des montages est réservé à l'admin (demande de Hassan, 19/10/2026).
--
-- La colonne studio_montages.cout_ia_usd (migration 20261019200000) et le coût du
-- rapport (rapport.cout_usd) étaient lisibles par l'élève sur ses propres montages
-- (sa ligne de studio_montages lui est ouverte). On les range dans une table à part,
-- lisible par le CEO seulement ; l'élève n'a plus aucun accès à ces chiffres.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.studio_montages_couts (
  montage_id uuid primary key references public.studio_montages(id) on delete cascade,
  cout_ia_usd numeric(10, 5) not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.studio_montages_couts is
  'Coût IA cumulé de chaque montage (tous passages), réservé au CEO. Écrit par studio_job_cout.';

alter table public.studio_montages_couts enable row level security;

drop policy if exists studio_montages_couts_ceo on public.studio_montages_couts;
create policy studio_montages_couts_ceo on public.studio_montages_couts
  for select using (public.is_ceo(auth.uid()));

revoke insert, update, delete on public.studio_montages_couts from anon, authenticated;

insert into public.studio_montages_couts (montage_id, cout_ia_usd)
select id, cout_ia_usd from public.studio_montages where cout_ia_usd > 0
on conflict (montage_id) do nothing;

alter table public.studio_montages drop column if exists cout_ia_usd;

-- le coût ne figure plus dans le rapport lisible par l'élève
update public.studio_montages set rapport = rapport - 'cout_usd' where rapport ? 'cout_usd';

create or replace function public.studio_job_cout(
  p_id uuid, p_jeton text, p_cout numeric, p_credit numeric default null, p_panne text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  seuil numeric := coalesce((studio_config_valeur('credit_alerte_seuil'))::text::numeric, 10);
  derniere timestamptz := (studio_config_valeur('credit_alerte_le') #>> '{}')::timestamptz;
  titre text;
  corps text;
begin
  perform _studio_job(p_id, p_jeton);
  insert into studio_montages_couts (montage_id, cout_ia_usd)
  values (p_id, greatest(0, least(coalesce(p_cout, 0), 5)))
  on conflict (montage_id) do update
    set cout_ia_usd = studio_montages_couts.cout_ia_usd + excluded.cout_ia_usd, updated_at = now();

  if p_credit is not null then
    insert into studio_config (cle, valeur)
    values ('credit_ia', jsonb_build_object('reste', round(p_credit, 2), 'mesure_le', now()))
    on conflict (cle) do update set valeur = excluded.valeur;
  end if;

  if p_panne is null and (p_credit is null or p_credit >= seuil) then
    return;
  end if;
  if derniere is not null
     and derniere > now() - (case when p_panne is not null then interval '1 hour' else interval '12 hours' end) then
    return;
  end if;

  if p_panne = 'cle' then
    titre := 'Studio en panne : clé IA refusée';
    corps := 'OpenRouter refuse la clé du Studio : les montages échouent. Vérifiez la clé OPENROUTER_API_KEY.';
  elsif p_panne is not null or coalesce(p_credit, 0) <= 0 then
    titre := 'Studio en panne : crédit IA épuisé';
    corps := 'Les montages échouent tant que le crédit OpenRouter n''est pas rechargé (openrouter.ai, page Credits).';
  else
    titre := 'Crédit IA du Studio bas';
    corps := 'Il reste ' || replace(to_char(p_credit, 'FM999990.00'), '.', ',') || ' $ de crédit OpenRouter (alerte sous '
             || to_char(seuil, 'FM9990') || ' $). Rechargez sur openrouter.ai, page Credits, avant la panne.';
  end if;

  insert into notifications (user_id, type, title, body, link, metadata)
  select p.id, 'studio_credit', titre, corps, '/studio', jsonb_build_object('credit', p_credit, 'panne', p_panne)
    from profiles p where p.role = 'ceo';

  insert into studio_config (cle, valeur) values ('credit_alerte_le', to_jsonb(now()))
  on conflict (cle) do update set valeur = excluded.valeur;
end $$;

create or replace function public.studio_suivi_ia()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with depuis as (select coalesce((studio_config_valeur('cout_suivi_depuis') #>> '{}')::timestamptz, now()) as t),
  suivis as (
    select m.statut, coalesce(c.cout_ia_usd, 0) as cout
      from studio_montages m left join studio_montages_couts c on c.montage_id = m.id, depuis
     where m.created_at >= depuis.t
  )
  select case when not is_ceo(auth.uid()) then null else jsonb_build_object(
    'credit', studio_config_valeur('credit_ia'),
    'seuil', studio_config_valeur('credit_alerte_seuil'),
    'depuis', (select t from depuis),
    'montages', (select count(*) from suivis where cout > 0),
    'depense', (select round(coalesce(sum(cout), 0), 2) from suivis),
    'cout_moyen', (select case when count(*) >= 3 then round(avg(cout), 3) end
                     from suivis where statut = 'termine' and cout > 0)
  ) end;
$$;
