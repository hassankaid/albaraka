-- ─────────────────────────────────────────────────────────────────────────
-- Offre « Al Baraka 200 €/mois » — 2 400 € payables en 1× à 12×.
--
-- Ce n'est pas un abonnement : c'est le Pass AL BARAKA vendu à 2 400 € au
-- lieu de 3 000 €, étalé sur 12 mensualités de 200 € par défaut. Le total
-- ne bouge pas quand on choisit moins de mensualités — 6× = 400 €/mois.
-- Stripe reçoit un `cancel_at` à N mois : la souscription s'arrête toute
-- seule après la dernière échéance.
--
-- Pourquoi une catégorie à part et pas `al_baraka` ?
-- Parce que `validate_coupon` accepte un coupon dès qu'une des offres qu'il
-- vise appartient à la catégorie attendue. Ranger cette offre dans
-- `al_baraka` aurait rendu AB1000 et AB500 valables ici : 2 400 − 1 000 =
-- 1 400 € pour le même accès. Une catégorie propre ferme la porte. Pour
-- ouvrir un code promo dessus plus tard, il suffit d'ajouter
-- 'al_baraka_200' à son `applies_to_categories`.
--
-- Le Pass accordé après paiement reste bien `al_baraka` (cf. le mapping
-- dans stripe-webhook) : même onboarding, même accès, même Discord.
-- ─────────────────────────────────────────────────────────────────────────

-- 1) La catégorie
alter table public.offers drop constraint if exists offers_category_check;
alter table public.offers add constraint offers_category_check
  check (category in ('al_baraka', 'al_baraka_200', 'liberty', 'a_la_carte'));

-- 2) L'offre
insert into public.offers
  (slug, category, label, default_price_ht, min_installments_count, max_installments_count, status)
values
  ('al-baraka-200', 'al_baraka_200', 'Al Baraka 200 €/mois', 2400, 1, 12, 'active')
on conflict (slug) do update
  set category               = excluded.category,
      label                  = excluded.label,
      default_price_ht       = excluded.default_price_ht,
      min_installments_count = excluded.min_installments_count,
      max_installments_count = excluded.max_installments_count,
      status                 = excluded.status,
      updated_at             = now();

-- 3) Le lien de paiement, créé à la volée
--
-- Même stratégie que les formations à la carte et que les Pass différés :
-- on ne construit pas un énième checkout, on fabrique un payment_link et on
-- renvoie le client sur /pay/<token>, qui sait déjà tout faire — échéancier,
-- engagements, contrat, encaissement, attribution du Pass.
create or replace function public.create_al_baraka_200_payment_link(
  p_installments integer default 12,
  p_deferred_start date default null,
  p_prefill_email text default null,
  p_prefill_full_name text default null,
  p_prefill_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $func$
declare
  v_offer record;
  v_token text;
  v_link_id uuid;
  v_attempts int := 0;
begin
  select id, label, default_price_ht, status, category,
         min_installments_count, max_installments_count
  into v_offer
  from public.offers
  where slug = 'al-baraka-200'
  limit 1;

  if not found then
    return jsonb_build_object('error', 'offer_not_found', 'slug', 'al-baraka-200');
  end if;
  if v_offer.category <> 'al_baraka_200' then
    return jsonb_build_object('error', 'offer_wrong_category', 'category', v_offer.category);
  end if;
  if v_offer.status <> 'active' then
    return jsonb_build_object('error', 'offer_not_active', 'status', v_offer.status);
  end if;

  if p_installments is null
     or p_installments < v_offer.min_installments_count
     or p_installments > v_offer.max_installments_count then
    return jsonb_build_object(
      'error', 'invalid_installments',
      'received', p_installments,
      'min', v_offer.min_installments_count,
      'max', v_offer.max_installments_count
    );
  end if;

  if p_deferred_start is not null then
    if p_deferred_start <= current_date then
      return jsonb_build_object('error', 'deferred_start_must_be_future');
    end if;
    if p_deferred_start > current_date + interval '180 days' then
      return jsonb_build_object('error', 'deferred_start_too_far',
        'message', 'La date de demarrage ne peut pas etre a plus de 6 mois.');
    end if;
  end if;

  loop
    v_attempts := v_attempts + 1;
    v_token := 'ALB-PL-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.payment_links where token = v_token);
    if v_attempts > 5 then
      raise exception 'token_generation_failed';
    end if;
  end loop;

  insert into public.payment_links (
    token, product_label, total_amount, installments_count,
    deferred_start_date,
    prefilled_full_name, prefilled_email, prefilled_phone,
    status, auto_generated,
    grants_offer_id,
    notes
  )
  values (
    v_token,
    v_offer.label,
    v_offer.default_price_ht,
    p_installments,
    p_deferred_start,
    nullif(trim(coalesce(p_prefill_full_name, '')), ''),
    nullif(trim(lower(coalesce(p_prefill_email, ''))), ''),
    nullif(trim(coalesce(p_prefill_phone, '')), ''),
    'active',
    true,
    v_offer.id,
    'Lien auto-genere : Al Baraka 200 EUR/mois (' || p_installments || 'x)'
      || coalesce(', differe au ' || p_deferred_start, '')
  )
  returning id into v_link_id;

  return jsonb_build_object(
    'success', true,
    'token', v_token,
    'link_id', v_link_id,
    'product_label', v_offer.label,
    'total_amount', v_offer.default_price_ht,
    'installments_count', p_installments,
    'deferred_start_date', p_deferred_start
  );
end;
$func$;

grant execute on function public.create_al_baraka_200_payment_link(integer, date, text, text, text)
  to anon, authenticated;

comment on function public.create_al_baraka_200_payment_link is
  'Cree a la volee un payment_link pour l''offre Al Baraka 200 EUR/mois (2 400 EUR, 1x a 12x). Appele par /checkout/al-baraka-200/<N>, qui redirige ensuite vers /pay/<token>. Accorde le Pass AL BARAKA apres paiement via grants_offer_id.';

-- 4) Lookup public, pour que la page de checkout puisse valider le nombre de
--    mensualites avant de creer quoi que ce soit et afficher une erreur nette.
create or replace function public.lookup_al_baraka_200_offer()
returns table(
  offer_id uuid,
  label text,
  default_price_ht numeric,
  min_installments_count integer,
  max_installments_count integer,
  is_valid boolean,
  reason text
)
language plpgsql
security definer
set search_path to 'public'
as $func$
declare
  v_offer record;
begin
  select o.id, o.label, o.default_price_ht, o.min_installments_count,
         o.max_installments_count, o.status, o.category
  into v_offer
  from public.offers o
  where o.slug = 'al-baraka-200'
  limit 1;

  if not found then
    return query select null::uuid, null::text, 0::numeric, 0, 0, false, 'offer_not_found'::text;
    return;
  end if;

  if v_offer.status <> 'active' then
    return query select v_offer.id, v_offer.label, v_offer.default_price_ht,
      v_offer.min_installments_count, v_offer.max_installments_count, false, 'offer_not_active'::text;
    return;
  end if;

  return query select v_offer.id, v_offer.label, v_offer.default_price_ht,
    v_offer.min_installments_count, v_offer.max_installments_count, true, null::text;
end;
$func$;

grant execute on function public.lookup_al_baraka_200_offer() to anon, authenticated;

comment on function public.lookup_al_baraka_200_offer is
  'Lookup public de l''offre Al Baraka 200 EUR/mois (prix + fourchette de mensualites), pour la page /checkout/al-baraka-200/<N>.';
