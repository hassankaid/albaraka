-- Factures de recouvrement « REC » (09/10/2026).
--
-- Une échéance impayée qu'on transmet au cabinet d'avocats reçoit, à la
-- demande, une facture REC0000001… datée du jour de l'échéance. Elle n'est
-- jamais envoyée au client. Les 15 factures déjà transmises au cabinet le
-- 29/08/2026 (fichier « IMPAYES A TRANSMETTRE AU CABINET ») sont reprises
-- avec leur numéro ; les numéros absents de ce fichier ne sont jamais
-- réattribués : la suite repart du plus grand numéro existant.
--
-- Si le client paie ensuite, la facture FAC habituelle est créée comme pour
-- toute échéance payée ; la facture REC reste (son statut se lit sur
-- l'échéance).
--
-- Les données des clients ne sont PAS dans ce fichier : le repo est public.

create table if not exists public.factures_recouvrement (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique check (numero ~ '^REC[0-9]{7}$'),
  payment_id uuid not null unique references public.payments(id) on delete restrict,
  sale_id uuid references public.sales(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  montant numeric(12,2) not null check (montant > 0),
  date_facture date not null,
  payment_number integer,
  total_payments integer,
  produit text,
  client_nom text not null,
  client_email text,
  client_telephone text,
  client_adresse text,
  client_code_postal text,
  client_ville text,
  client_pays text,
  pdf_path text,
  origine text not null default 'plateforme' check (origine in ('plateforme', 'fichier_cabinet')),
  transmise_le date,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists factures_recouvrement_sale_idx on public.factures_recouvrement (sale_id);
create index if not exists factures_recouvrement_contact_idx on public.factures_recouvrement (contact_id);

alter table public.factures_recouvrement enable row level security;

drop policy if exists factures_recouvrement_select_ceo on public.factures_recouvrement;
create policy factures_recouvrement_select_ceo on public.factures_recouvrement
  for select to authenticated using (public.is_ceo(auth.uid()));

-- Seule mise à jour permise depuis l'interface : la date de transmission au
-- cabinet. Numéro, montant, date et échéance ne bougent jamais.
drop policy if exists factures_recouvrement_update_ceo on public.factures_recouvrement;
create policy factures_recouvrement_update_ceo on public.factures_recouvrement
  for update to authenticated using (public.is_ceo(auth.uid())) with check (public.is_ceo(auth.uid()));

revoke insert, update, delete on public.factures_recouvrement from anon, authenticated;
grant select on public.factures_recouvrement to authenticated;
grant update (transmise_le) on public.factures_recouvrement to authenticated;

-- Crée la facture REC d'une échéance impayée, ou renvoie celle qui existe.
-- Numéro = plus grand numéro existant + 1, sous verrou : deux clics
-- simultanés ne peuvent ni doublonner ni sauter un numéro.
create or replace function public.creer_facture_recouvrement(
  p_payment_id uuid,
  p_client jsonb,
  p_produit text,
  p_created_by uuid
) returns public.factures_recouvrement
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment record;
  v_facture public.factures_recouvrement;
  v_suivant integer;
begin
  perform pg_advisory_xact_lock(hashtext('factures_recouvrement_numero'));

  select * into v_facture from public.factures_recouvrement where payment_id = p_payment_id;
  if found then
    return v_facture;
  end if;

  select id, sale_id, contact_id, amount, due_date, status, payment_number, total_payments
    into v_payment
    from public.payments where id = p_payment_id;
  if not found then
    raise exception 'echeance introuvable';
  end if;
  if v_payment.status = 'paid' then
    raise exception 'echeance deja payee : pas de facture de recouvrement';
  end if;

  select coalesce(max(substring(numero from 4)::integer), 0) + 1
    into v_suivant
    from public.factures_recouvrement;

  insert into public.factures_recouvrement (
    numero, payment_id, sale_id, contact_id, montant, date_facture,
    payment_number, total_payments, produit,
    client_nom, client_email, client_telephone, client_adresse,
    client_code_postal, client_ville, client_pays, origine, created_by
  ) values (
    'REC' || lpad(v_suivant::text, 7, '0'),
    v_payment.id, v_payment.sale_id, v_payment.contact_id, v_payment.amount, v_payment.due_date,
    v_payment.payment_number, v_payment.total_payments, p_produit,
    coalesce(nullif(p_client->>'nom', ''), 'CLIENT'),
    nullif(p_client->>'email', ''), nullif(p_client->>'telephone', ''), nullif(p_client->>'adresse', ''),
    nullif(p_client->>'code_postal', ''), nullif(p_client->>'ville', ''), nullif(p_client->>'pays', ''),
    'plateforme', p_created_by
  ) returning * into v_facture;

  return v_facture;
end;
$$;

revoke all on function public.creer_facture_recouvrement(uuid, jsonb, text, uuid) from public, anon, authenticated;
grant execute on function public.creer_facture_recouvrement(uuid, jsonb, text, uuid) to service_role;

comment on table public.factures_recouvrement is
  'Factures REC transmises au cabinet de recouvrement : une par échéance impayée, datée du jour de l''échéance, jamais envoyée au client.';
