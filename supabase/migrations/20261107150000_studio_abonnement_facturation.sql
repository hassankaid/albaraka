-- ─────────────────────────────────────────────────────────────────────────
-- Abonnement Studio : chaque paiement devient une vente + une échéance payée,
-- donc une facture client FAC-… comme le reste (demande de Sidali, 07/11/2026 :
-- son comptable doit retrouver toutes les transactions dans les factures).
--
-- Avant : le Studio n'écrivait que dans `studio_abonnements`. Stripe émettait
-- sa propre facture, mais rien n'apparaissait dans « Paiements » ni dans
-- « Factures du mois ».
--
-- Modèle : UNE vente « ABONNEMENT STUDIO » (sale_type = 'studio') par
-- abonnement Stripe, et UNE échéance payée par facture Stripe encaissée. Le
-- montant de la vente est le cumul encaissé.
--
-- Une vente Studio n'est pas une vente commerciale : elle ne ferme pas les
-- leads du contact, ne reçoit pas de date de conférence et n'est pas attribuée
-- au marketing (ROAS par créa). Aucune commission : pas de lead, pas de closer.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Enregistrement idempotent d'un paiement Studio (appelé par stripe-webhook).
--    Renvoie { payment_id, cree } ; cree = false si la facture Stripe était déjà enregistrée.
drop function if exists public.enregistrer_paiement_studio(uuid, text, text, numeric, date, text, text, text);
create function public.enregistrer_paiement_studio(
  p_user_id uuid,
  p_email text,
  p_nom text,
  p_montant numeric,
  p_paye_le date,
  p_subscription text,
  p_invoice text,
  p_payment_intent text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_payment uuid;
  v_email text;
  v_nom text;
  v_contact uuid;
  v_sale uuid;
  v_n int;
begin
  if p_subscription is null or p_invoice is null or coalesce(p_montant, 0) <= 0 then
    raise exception 'enregistrer_paiement_studio : abonnement, facture et montant requis';
  end if;

  -- invoice.paid et invoice.payment_succeeded arrivent ensemble : on sérialise.
  perform pg_advisory_xact_lock(hashtext('studio:' || p_subscription));

  -- Déjà enregistrée : `cree` = false, l'appelant n'envoie pas une 2e facture.
  select id into v_payment from public.payments where stripe_invoice_id = p_invoice;
  if v_payment is not null then
    return jsonb_build_object('payment_id', v_payment, 'cree', false);
  end if;

  select coalesce(nullif(trim(p_email), ''), p.email), coalesce(nullif(trim(p_nom), ''), p.full_name)
    into v_email, v_nom
  from (select 1) x left join public.profiles p on p.id = p_user_id;
  v_email := lower(nullif(trim(v_email), ''));

  -- La vente de cet abonnement, si elle existe déjà.
  select s.id, s.contact_id into v_sale, v_contact
  from public.sales s
  where s.sale_type = 'studio'
    and exists (select 1 from public.payments p where p.sale_id = s.id and p.stripe_subscription_id = p_subscription)
  limit 1;

  if v_sale is null then
    if v_email is not null then
      select id into v_contact from public.contacts where lower(email) = v_email order by created_at limit 1;
    end if;
    if v_contact is null then
      if v_email is null then
        raise exception 'enregistrer_paiement_studio : ni e-mail ni contact pour %', p_subscription;
      end if;
      insert into public.contacts (email, full_name) values (v_email, v_nom) returning id into v_contact;
    end if;

    insert into public.sales (contact_id, product, amount_ht, sale_type, buyer_profile_id, sold_at,
                              mensualites, payment_status, lead_origine_mode)
    values (v_contact, 'ABONNEMENT STUDIO', 0, 'studio', p_user_id, p_paye_le::timestamptz + interval '12 hours',
            0, 'paid', 'manuel')
    returning id into v_sale;
  end if;

  select count(*) + 1 into v_n from public.payments where sale_id = v_sale;

  insert into public.payments (sale_id, contact_id, payment_number, total_payments, amount, due_date, paid_at,
                               status, payment_method, stripe_subscription_id, stripe_invoice_id, stripe_payment_intent_id)
  values (v_sale, v_contact, v_n, v_n, p_montant, p_paye_le, p_paye_le,
          'paid', 'stripe', p_subscription, p_invoice, p_payment_intent)
  returning id into v_payment;

  update public.payments set total_payments = v_n where sale_id = v_sale and total_payments <> v_n;
  update public.sales
     set amount_ht = (select coalesce(sum(amount), 0) from public.payments where sale_id = v_sale),
         mensualites = v_n
   where id = v_sale;

  return jsonb_build_object('payment_id', v_payment, 'cree', true);
end;
$$;

revoke all on function public.enregistrer_paiement_studio(uuid, text, text, numeric, date, text, text, text) from public, anon, authenticated;
grant execute on function public.enregistrer_paiement_studio(uuid, text, text, numeric, date, text, text, text) to service_role;

-- 2. Pas de date de conférence pour une vente Studio.
create or replace function public.set_sale_conference_date()
 returns trigger
 language plpgsql
as $function$
DECLARE
  v_conf date;
  v_ref timestamptz;
BEGIN
  IF NEW.sale_type = 'studio' THEN
    NEW.conference_date := NULL;
    RETURN NEW;
  END IF;
  IF NEW.lead_id IS NOT NULL THEN
    SELECT conference_date INTO v_conf FROM public.leads WHERE id = NEW.lead_id;
    IF v_conf IS NOT NULL THEN
      NEW.conference_date := v_conf;
      RETURN NEW;
    END IF;
  END IF;
  IF NEW.call_id IS NOT NULL THEN
    SELECT conference_date INTO v_conf FROM public.calls WHERE id = NEW.call_id;
    IF v_conf IS NOT NULL THEN
      NEW.conference_date := v_conf;
      RETURN NEW;
    END IF;
  END IF;
  v_ref := COALESCE(NEW.sold_at, NEW.created_at);
  NEW.conference_date := public.prev_or_current_sunday_noon_paris(v_ref);
  RETURN NEW;
END;
$function$;

-- 3. Une vente Studio ne ferme ni les leads ni les appels du contact.
create or replace function public.update_lead_call_on_sale()
 returns trigger
 language plpgsql
as $function$
BEGIN
  IF NEW.sale_type = 'studio' THEN
    RETURN NEW;
  END IF;

  -- Met à jour tous les leads du contact en 'close'
  UPDATE public.leads
  SET status = 'close', updated_at = NOW()
  WHERE contact_id = NEW.contact_id
  AND status NOT IN ('close', 'perdu');

  -- Met à jour le dernier call du contact en 'close'
  UPDATE public.calls
  SET status = 'close', updated_at = NOW()
  WHERE contact_id = NEW.contact_id
  AND status NOT IN ('close', 'annule')
  AND id = (
    SELECT id FROM public.calls
    WHERE contact_id = NEW.contact_id
    ORDER BY scheduled_at DESC
    LIMIT 1
  );

  RETURN NEW;
END;
$function$;

-- 4. Le marketing (ventes attribuées, ROAS par créa) ignore le Studio.
create or replace view public.marketing_ventes_attribuees
with (security_invoker = on) as
 SELECT id AS vente_id,
    sold_at,
    conference_date,
    amount_ht,
    product,
    contact_id,
    COALESCE(lead_id, ( SELECT c.lead_id
           FROM calls c
          WHERE c.id = s.call_id), lead_origine_id, ( SELECT l.id
           FROM leads l
          WHERE l.contact_id = s.contact_id AND (s.sold_at IS NULL OR l.created_at <= s.sold_at)
          ORDER BY l.created_at DESC
         LIMIT 1)) AS lead_id,
        CASE
            WHEN lead_id IS NOT NULL THEN 'direct'::text
            WHEN (( SELECT c.lead_id
               FROM calls c
              WHERE c.id = s.call_id)) IS NOT NULL THEN 'via_appel'::text
            WHEN lead_origine_id IS NOT NULL THEN 'deduit'::text
            WHEN (EXISTS ( SELECT 1
               FROM leads l
              WHERE l.contact_id = s.contact_id AND (s.sold_at IS NULL OR l.created_at <= s.sold_at))) THEN 'deduit'::text
            ELSE 'non_attribue'::text
        END AS mode_attribution
   FROM sales s
  WHERE s.sale_type IS DISTINCT FROM 'studio';
