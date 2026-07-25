-- ─────────────────────────────────────────────────────────────────────────
-- Process « Changer de carte » — couche DB.
--
-- Un lien tokenisé (ALB-CARD-XXXXXXXX) permet à un client de mettre à jour sa
-- carte bancaire (SetupIntent, PCI-safe) sur un abonnement existant, puis de
-- rejouer immédiatement l'échéance ouverte. Le CEO génère le lien depuis la
-- fiche vente ; le client l'ouvre sur plateforme.albarakaecosysteme.com.
--
-- Sécurité : RLS activée SANS policy → seul le service_role (edge fns) accède
-- en direct. Les RPC ci-dessous sont SECURITY DEFINER (lookup public, create
-- réservé au CEO).
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.card_update_links (
  id                     uuid primary key default gen_random_uuid(),
  token                  text unique not null,
  contact_id             uuid references public.contacts(id),
  sale_id                uuid references public.sales(id),
  stripe_subscription_id text not null,
  status                 text not null default 'active'
                           check (status in ('active','used','expired')),
  created_by             uuid,
  created_at             timestamptz not null default now(),
  used_at                timestamptz,
  expires_at             timestamptz not null default (now() + interval '14 days')
);

alter table public.card_update_links enable row level security;

-- ── Lookup (appelé par la page publique) ─────────────────────────────────
-- DB-only : validité + identité pour pré-remplir. La carte actuelle n'est pas
-- exposée ici (pas nécessaire au flux ; le client saisit juste sa nouvelle carte).
create or replace function public.lookup_card_update_token(p_token text)
returns table (
  full_name text,
  email     text,
  product   text,
  is_valid  boolean,
  reason    text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.card_update_links;
begin
  select * into r from public.card_update_links where token = p_token;
  if not found then
    return query select null::text, null::text, null::text, false, 'not_found';
    return;
  end if;
  if r.status = 'used' then
    return query select null::text, null::text, null::text, false, 'used';
    return;
  end if;
  if r.status = 'expired' or r.expires_at < now() then
    return query select null::text, null::text, null::text, false, 'expired';
    return;
  end if;

  return query
    select c.full_name, c.email, s.product, true, null::text
    from public.card_update_links l
    left join public.contacts c on c.id = l.contact_id
    left join public.sales    s on s.id = l.sale_id
    where l.token = p_token;
end;
$$;

-- ── Génération (réservée au CEO) ─────────────────────────────────────────
-- Crée un lien pour l'abonnement Stripe fourni (celui de l'échéance en échec).
-- Renvoie le token (le front construit l'URL plateforme.albarakaecosysteme.com).
create or replace function public.create_card_update_link(
  p_sale_id                uuid,
  p_contact_id             uuid,
  p_stripe_subscription_id text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'ceo'
  ) then
    raise exception 'forbidden: CEO only';
  end if;

  if p_stripe_subscription_id is null or p_stripe_subscription_id = '' then
    raise exception 'stripe_subscription_id requis';
  end if;

  v_token := 'ALB-CARD-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

  insert into public.card_update_links (token, contact_id, sale_id, stripe_subscription_id, created_by)
  values (v_token, p_contact_id, p_sale_id, p_stripe_subscription_id, auth.uid());

  return v_token;
end;
$$;

revoke all on function public.create_card_update_link(uuid, uuid, text) from public, anon;
grant execute on function public.create_card_update_link(uuid, uuid, text) to authenticated;
grant execute on function public.lookup_card_update_token(text) to anon, authenticated;
