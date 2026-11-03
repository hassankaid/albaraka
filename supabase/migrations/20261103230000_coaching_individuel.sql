-- Coaching individuel payant avec Sabrina (demande de Sidali, 03/11/2026).
--
-- Parcours : l'élève paie 45 € sur /checkout/coaching, puis réserve son créneau
-- sur l'agenda Calendly « COACHING INDIVIDUEL - AL BARAKA » avec un lien à usage
-- unique, créé après le paiement. Sans paiement, pas de lien de réservation.
--
-- 1) offres_coaching : le prix, la coach, sa commission et l'agenda. Changer de
--    coach ou de prix se fait ici, sans toucher au code.
-- 2) Le lien de paiement (payment_links) est créé à la volée pour chaque élève,
--    comme pour Al Baraka 200 : un lien de paiement ne sert qu'une fois.
-- 3) La commission « Coach » est posée automatiquement quand le webhook Stripe
--    rattache la vente au lien (88,89 % pour Sabrina, décision de Sidali du 01/11).
-- 4) coaching_reservations : les réservations reçues de Calendly. Elles ne vont
--    PAS dans calls : un coaching n'est ni un RDV de vente ni un closing, et le
--    webhook remettrait le lead de l'élève en « contacté » à une annulation.
--
-- Appliqué en base le 03/11/2026.

create table if not exists public.offres_coaching (
  slug text primary key,
  libelle text not null,
  prix numeric(10, 2) not null,
  coach_id uuid not null references public.profiles(id),
  pourcentage_coach numeric(5, 2) not null,
  calendly_event_type text not null,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.offres_coaching is
  'Offres de coaching individuel payant : prix, coach, commission et agenda Calendly (UUID du type d''évènement).';

alter table public.offres_coaching enable row level security;
drop policy if exists offres_coaching_ceo on public.offres_coaching;
create policy offres_coaching_ceo on public.offres_coaching
  for all to authenticated
  using (public.get_user_role() = 'ceo') with check (public.get_user_role() = 'ceo');

insert into public.offres_coaching (slug, libelle, prix, coach_id, pourcentage_coach, calendly_event_type)
values ('coaching-individuel', 'COACHING INDIVIDUEL', 45, '071078ef-04ff-4ddc-9a38-f6ba8e6748c4', 88.89,
        'b8c343d6-1ff4-44a6-b81c-ead7aa03a104')
on conflict (slug) do nothing;

alter table public.payment_links
  add column if not exists offre_coaching text references public.offres_coaching(slug),
  add column if not exists reservation_url text,
  add column if not exists reservation_creee_le timestamptz;

comment on column public.payment_links.reservation_url is
  'Lien Calendly à usage unique, créé après le paiement d''un coaching (edge function coaching-reservation).';

-- Lien de paiement à la volée, appelé par /checkout/coaching (public).
create or replace function public.create_coaching_payment_link(
  p_slug text default 'coaching-individuel',
  p_prefill_email text default null,
  p_prefill_full_name text default null,
  p_prefill_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_offre record;
  v_token text;
  v_link_id uuid;
  v_essais int := 0;
begin
  select * into v_offre from public.offres_coaching where slug = p_slug;
  if not found then
    return jsonb_build_object('error', 'offer_not_found');
  end if;
  if not v_offre.actif then
    return jsonb_build_object('error', 'offer_not_active');
  end if;

  loop
    v_essais := v_essais + 1;
    v_token := 'ALB-PL-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.payment_links where token = v_token);
    if v_essais > 5 then
      raise exception 'token_generation_failed';
    end if;
  end loop;

  insert into public.payment_links (
    token, product_label, total_amount, installments_count,
    prefilled_full_name, prefilled_email, prefilled_phone,
    status, auto_generated, offre_coaching, notes
  )
  values (
    v_token, v_offre.libelle, v_offre.prix, 1,
    nullif(trim(coalesce(p_prefill_full_name, '')), ''),
    nullif(trim(lower(coalesce(p_prefill_email, ''))), ''),
    nullif(trim(coalesce(p_prefill_phone, '')), ''),
    'active', true, v_offre.slug,
    'Lien auto-genere : coaching individuel (' || v_offre.slug || ')'
  )
  returning id into v_link_id;

  return jsonb_build_object('success', true, 'token', v_token, 'link_id', v_link_id,
                            'product_label', v_offre.libelle, 'total_amount', v_offre.prix);
end;
$function$;

grant execute on function public.create_coaching_payment_link(text, text, text, text) to anon, authenticated;

-- Commission « Coach » posée quand la vente est rattachée au lien. Le webhook
-- Stripe insère la vente et ses paiements AVANT de renseigner payment_links.sale_id :
-- la ligne globale est donc répartie sur des paiements qui existent déjà.
create or replace function public.poser_commission_coaching()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_offre record;
begin
  if NEW.offre_coaching is null or NEW.sale_id is null or OLD.sale_id is not null then
    return NEW;
  end if;
  select * into v_offre from public.offres_coaching where slug = NEW.offre_coaching;
  if not found then
    return NEW;
  end if;
  if exists (select 1 from public.commissions c where c.sale_id = NEW.sale_id and c.role = 'coach') then
    return NEW;
  end if;
  insert into public.commissions (sale_id, beneficiary_user_id, role, percentage, amount, status)
  values (NEW.sale_id, v_offre.coach_id, 'coach', v_offre.pourcentage_coach,
          round(v_offre.prix * v_offre.pourcentage_coach / 100), 'pending');
  return NEW;
end;
$function$;

drop trigger if exists trg_payment_link_commission_coaching on public.payment_links;
create trigger trg_payment_link_commission_coaching
  after update of sale_id on public.payment_links
  for each row execute function public.poser_commission_coaching();

create table if not exists public.coaching_reservations (
  id uuid primary key default gen_random_uuid(),
  calendly_event_uri text not null unique,
  offre_coaching text references public.offres_coaching(slug),
  payment_link_id uuid references public.payment_links(id),
  sale_id uuid references public.sales(id),
  contact_id uuid references public.contacts(id),
  coach_id uuid references public.profiles(id),
  invitee_nom text,
  invitee_email text,
  scheduled_at timestamptz,
  statut text not null default 'planifie' check (statut in ('planifie', 'annule')),
  paye boolean not null default false,
  created_at timestamptz not null default now(),
  annule_le timestamptz
);

comment on table public.coaching_reservations is
  'Réservations Calendly de coaching individuel. paye = rattachée à un paiement de coaching ; sinon une alerte part au CEO.';

alter table public.coaching_reservations enable row level security;
drop policy if exists coaching_reservations_lecture on public.coaching_reservations;
create policy coaching_reservations_lecture on public.coaching_reservations
  for select to authenticated
  using (public.get_user_role() = 'ceo' or coach_id = auth.uid());
