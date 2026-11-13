-- Contrats v3 (13/11/2026) — cahier des charges de Sidali du 12/11/2026.
-- Le paiement vaut signature : le contrat est créé « signé » au paiement, à partir des
-- cases cochées sur la page de paiement, puis un PDF unique (contrat + attestation de
-- renonciation + CGV) est envoyé au client. Ne concerne que les NOUVELLES commandes :
-- les contrats existants (signés ou en attente) ne sont pas touchés.

-- 1. Les modèles v3 (Pass, Liberty, module à la carte).
alter table public.client_contracts drop constraint if exists client_contracts_template_key_check;
alter table public.client_contracts add constraint client_contracts_template_key_check
  check (template_key = any (array['pass_standard','pass_conference','liberty_standard','liberty_conference',
                                   'pass_v3','liberty_v3','carte_v3']));

-- 2. Ce que le contrat v3 conserve, pour la preuve (archivage 5 ans, cahier des charges §4).
alter table public.client_contracts
  add column if not exists contrat_version text,
  add column if not exists acces_active_le timestamptz,
  add column if not exists donnees_contrat jsonb,
  add column if not exists email_copie_path text,
  add column if not exists email_resend_id text;

comment on column public.client_contracts.contrat_version is 'Version du modèle (v3-2026-11-13…) ; null = ancien circuit avec signature dessinée.';
comment on column public.client_contracts.acces_active_le is 'Activation de l''accès (validation du premier paiement) : ferme la rétractation (art. L. 221-28, 13°).';
comment on column public.client_contracts.donnees_contrat is 'Données exactes ayant servi au contrat v3 (texte reconstruit par _shared/contrat_v3.ts).';
comment on column public.client_contracts.email_copie_path is 'Copie de l''e-mail envoyé au client (bucket contracts), gardée comme preuve.';

-- 3. Numérotation : les numéros v3 portent un préfixe (ALB-PASS-CTR-2026-11-0013). La
--    séquence du mois doit compter TOUS les contrats, avec ou sans préfixe, sinon deux
--    contrats v3 du même mois recevraient le même numéro.
create or replace function public.next_contract_number(p_year integer, p_month integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_seq int;
  v_number text;
begin
  v_prefix := 'CTR-' || p_year::text || '-' || lpad(p_month::text, 2, '0');
  select count(*) + 1 into v_seq
    from client_contracts
   where contract_number like '%' || v_prefix || '-%';
  v_number := v_prefix || '-' || lpad(v_seq::text, 4, '0');
  while exists (select 1 from client_contracts where contract_number like '%' || v_number) loop
    v_seq := v_seq + 1;
    v_number := v_prefix || '-' || lpad(v_seq::text, 4, '0');
  end loop;
  return v_number;
end;
$$;

-- 4. Historique de connexion des clients (preuve que l'accès a été mis à disposition et
--    utilisé, cahier des charges §4). Une ligne par ouverture de session, au plus toutes
--    les 30 minutes par personne. Gardé au moins 5 ans : aucune purge.
create table if not exists public.historique_connexions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  connecte_le timestamptz not null default now(),
  adresse_ip text,
  navigateur text
);
create index if not exists historique_connexions_user_idx on public.historique_connexions (user_id, connecte_le desc);
alter table public.historique_connexions enable row level security;
drop policy if exists historique_connexions_lecture_ceo on public.historique_connexions;
create policy historique_connexions_lecture_ceo on public.historique_connexions
  for select to authenticated
  using ((select public.get_user_role()) = 'ceo');
revoke all on public.historique_connexions from anon;
revoke insert, update, delete on public.historique_connexions from authenticated;

create or replace function public.enregistrer_connexion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_entetes json;
begin
  if v_uid is null then
    return;
  end if;
  if exists (select 1 from historique_connexions
              where user_id = v_uid and connecte_le > now() - interval '30 minutes') then
    return;
  end if;
  begin
    v_entetes := current_setting('request.headers', true)::json;
  exception when others then
    v_entetes := null;
  end;
  insert into historique_connexions (user_id, adresse_ip, navigateur)
  values (v_uid,
          nullif(trim(split_part(coalesce(v_entetes ->> 'x-forwarded-for', ''), ',', 1)), ''),
          left(v_entetes ->> 'user-agent', 400));
end;
$$;
revoke all on function public.enregistrer_connexion() from public, anon;
grant execute on function public.enregistrer_connexion() to authenticated;

-- 5. Plus de mot « formation » dans ce qu'on vend : les modules à la carte.
update public.offers
   set label = regexp_replace(label, '^\s*Formation\s+', 'Module ', 'i'),
       updated_at = now()
 where category = 'a_la_carte' and label ~* '^\s*Formation\s+';

-- 6. La copie de l'e-mail envoyé au client (preuve) est rangée en HTML à côté du contrat.
update storage.buckets
   set allowed_mime_types = array(select distinct unnest(coalesce(allowed_mime_types, '{}'::text[]) || array['text/html']))
 where id = 'contracts';
