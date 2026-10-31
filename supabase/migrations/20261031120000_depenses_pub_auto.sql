-- Dépenses publicitaires remontées chaque matin par Make (Meta, Snap, Google).
-- Même modèle que SHAH IMMO : un scénario par compte, les 7 derniers jours relus,
-- une réception rejouable (edge function depenses-pub, clé partagée X-Cle-CRM).
-- Appliqué en base le 31/10/2026.

alter table public.ads
  add column if not exists plateforme text not null default 'meta',
  add column if not exists compte_id text,
  add column if not exists devise text not null default 'EUR',
  add column if not exists importe_le timestamptz;

alter table public.ads drop constraint if exists ads_plateforme_check;
alter table public.ads add constraint ads_plateforme_check check (plateforme in ('meta', 'snap', 'google'));

-- Un identifiant de campagne n'est unique que dans sa plateforme.
alter table public.ads drop constraint if exists ads_date_campaign_unique;
alter table public.ads drop constraint if exists ads_plateforme_date_campagne_unique;
alter table public.ads add constraint ads_plateforme_date_campagne_unique unique (plateforme, date, campaign_id);

-- Plus personne n'écrit avec la clé publique : les anciens scénarios Make sont éteints.
drop policy if exists ads_insert_all on public.ads;

-- Les comptes suivis : ce qui doit remonter, et donc ce qu'on surveille.
create table if not exists public.ads_comptes (
  plateforme text not null check (plateforme in ('meta', 'snap', 'google')),
  compte_id text not null,
  nom text not null,
  actif boolean not null default true,
  primary key (plateforme, compte_id)
);
alter table public.ads_comptes enable row level security;
drop policy if exists ads_comptes_select_ceo on public.ads_comptes;
create policy ads_comptes_select_ceo on public.ads_comptes for select to authenticated using (get_user_role() = 'ceo');

-- Journal de chaque envoi de Make, pour dater la dernière remontée.
create table if not exists public.ads_imports (
  id bigint generated always as identity primary key,
  plateforme text not null,
  compte_id text not null,
  recu_le timestamptz not null default now(),
  lignes integer not null default 0,
  effacees integer not null default 0,
  erreur text
);
create index if not exists ads_imports_compte_idx on public.ads_imports (plateforme, compte_id, recu_le desc);
alter table public.ads_imports enable row level security;
drop policy if exists ads_imports_select_ceo on public.ads_imports;
create policy ads_imports_select_ceo on public.ads_imports for select to authenticated using (get_user_role() = 'ceo');

-- Reçoit les lignes d'un compte : remplace chaque jour de campagne, et efface ce que la
-- plateforme ne renvoie plus sur la période reçue. Rejouable sans risque.
create or replace function public.importer_depenses_pub(p_plateforme text, p_compte text, p_lignes jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_min date;
  v_max date;
  v_lignes int := 0;
  v_effacees int := 0;
begin
  if jsonb_typeof(p_lignes) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Lignes attendues sous forme de liste.';
  end if;

  select min((l ->> 'jour')::date), max((l ->> 'jour')::date) into v_min, v_max
    from jsonb_array_elements(p_lignes) l;

  insert into public.ads (date, campaign_id, campaign_name, channel, amount_spent, impressions, clicks, plateforme, compte_id, devise, importe_le)
  select (l ->> 'jour')::date, l ->> 'campagne_id', upper(coalesce(nullif(btrim(l ->> 'campagne'), ''), l ->> 'campagne_id')), 'WEBINAIRE',
         round(coalesce(nullif(l ->> 'montant', '')::numeric, 0), 2),
         coalesce(nullif(l ->> 'impressions', '')::numeric, 0)::int, coalesce(nullif(l ->> 'clics', '')::numeric, 0)::int,
         p_plateforme, p_compte, upper(coalesce(nullif(btrim(l ->> 'devise'), ''), 'EUR')), now()
    from jsonb_array_elements(p_lignes) l
   where coalesce(nullif(l ->> 'montant', '')::numeric, 0) > 0
  on conflict (plateforme, date, campaign_id) do update
    set campaign_name = excluded.campaign_name, amount_spent = excluded.amount_spent,
        impressions = excluded.impressions, clicks = excluded.clicks,
        compte_id = excluded.compte_id, devise = excluded.devise, importe_le = excluded.importe_le;
  get diagnostics v_lignes = row_count;

  if v_min is not null then
    delete from public.ads a
     where a.plateforme = p_plateforme and a.compte_id = p_compte and a.date between v_min and v_max
       and not exists (
         select 1 from jsonb_array_elements(p_lignes) l
          where (l ->> 'jour')::date = a.date and l ->> 'campagne_id' = a.campaign_id
            and coalesce(nullif(l ->> 'montant', '')::numeric, 0) > 0);
    get diagnostics v_effacees = row_count;
  end if;

  insert into public.ads_imports (plateforme, compte_id, lignes, effacees) values (p_plateforme, p_compte, v_lignes, v_effacees);
  return jsonb_build_object('lignes', v_lignes, 'effacees', v_effacees, 'du', v_min, 'au', v_max);
end $$;
revoke execute on function public.importer_depenses_pub(text, text, jsonb) from public, anon, authenticated;

-- Dernière remontée de chaque compte suivi. Au-delà de 36 h, le compte est en retard.
create or replace function public.statut_depenses_pub()
returns jsonb language sql stable security definer set search_path = public as $$
  with c as (
    select c.plateforme, c.compte_id, c.nom,
           (select max(i.recu_le) from public.ads_imports i where i.plateforme = c.plateforme and i.compte_id = c.compte_id) dernier_import,
           (select max(a.date) from public.ads a where a.plateforme = c.plateforme and a.compte_id = c.compte_id) dernier_jour
      from public.ads_comptes c where c.actif
  )
  select jsonb_build_object(
    'comptes', coalesce(jsonb_agg(jsonb_build_object('plateforme', plateforme, 'compte', compte_id, 'nom', nom, 'dernier_import', dernier_import, 'dernier_jour', dernier_jour)), '[]'::jsonb),
    'en_retard', coalesce(string_agg(nom, ', ') filter (where dernier_import is null or dernier_import < now() - interval '36 hours'), ''),
    'nb_en_retard', count(*) filter (where dernier_import is null or dernier_import < now() - interval '36 hours'))
  from c
$$;
revoke execute on function public.statut_depenses_pub() from public, anon, authenticated;

insert into public.ads_comptes (plateforme, compte_id, nom) values
  ('meta', 'act_1123481796898822', 'Meta - Pub de Ethicarena')
on conflict do nothing;
