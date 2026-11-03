-- Rattacher chaque vente à la pub qui l'a amenée (demande de Skalesy, 03/11/2026).
--
-- 1) La vente garde son LEAD D'ORIGINE, figé au moment où elle est créée
--    (sales.lead_origine_id). Jusqu'ici, une vente passée par /checkout n'avait
--    aucun lien avec le lead : la vue marketing_ventes_attribuees le déduisait à
--    chaque lecture, par le contact.
--
--    Colonne à part, et non sales.lead_id : remplir lead_id déplacerait la
--    conférence de la vente (trigger set_sale_conference_date, 35 ventes passées
--    auraient changé de conférence) et ouvrirait les commissions apporteur sur les
--    paiements suivants (create_commission_on_payment_insert). lead_origine_id ne
--    sert qu'à l'attribution marketing.
--
--    Règle : le lead posé sur la vente, sinon celui de l'appel, sinon le dernier
--    lead du contact créé avant la vente, en préférant un lead dont on connaît
--    l'origine à un passage par un lien nu (« Sans source ») : quelqu'un venu
--    d'une pub puis revenu par un lien sans paramètres reste crédité à la pub.
--
-- 2) Le lead garde les identifiants de clic des régies (fbclid, cookies _fbc/_fbp
--    de Meta, ScCid et cookie _scid de Snap, gclid) et l'appli d'où il vient
--    (navigateur intégré de Snapchat, Instagram…). Ils permettront de renvoyer les
--    ventes à Meta et Snap, et d'expliquer les leads « Sans source ».
--
-- Appliqué en base le 03/11/2026.

alter table public.leads
  add column if not exists clic_pub jsonb,
  add column if not exists app_origine text;

comment on column public.leads.clic_pub is
  'Identifiants de clic des régies à l''inscription : fbclid, fbc, fbp (Meta), sccid, scid (Snap), gclid (Google), user_agent.';
comment on column public.leads.app_origine is
  'Appli dont le navigateur a servi à l''inscription (snapchat, instagram, facebook, tiktok, whatsapp, navigateur), d''après le user-agent.';

alter table public.sales
  add column if not exists lead_origine_id uuid references public.leads(id) on delete set null,
  add column if not exists lead_origine_mode text;

alter table public.sales drop constraint if exists sales_lead_origine_mode_check;
alter table public.sales add constraint sales_lead_origine_mode_check
  check (lead_origine_mode is null or lead_origine_mode in ('direct', 'via_appel', 'contact', 'manuel'));

comment on column public.sales.lead_origine_id is
  'Lead d''origine de la vente pour l''attribution marketing (pub, canal). Figé à la création ; ''manuel'' n''est jamais recalculé.';

create index if not exists sales_lead_origine_id_idx on public.sales(lead_origine_id);

create or replace function public.vente_lead_origine(
  p_lead_id uuid, p_call_id uuid, p_contact_id uuid, p_sold_at timestamptz
)
returns table(lead_id uuid, mode text)
language sql
stable
set search_path to 'public'
as $function$
  select x.lead_id, x.mode
  from (
    select p_lead_id as lead_id, 'direct'::text as mode, 1 as rang
    where p_lead_id is not null
    union all
    select c.lead_id, 'via_appel', 2
    from public.calls c
    where c.id = p_call_id and c.lead_id is not null
    union all
    (select l.id, 'contact', 3
     from public.leads l
     cross join lateral public.lead_attribution(l.source, l.source_detail, l.utm_source) a
     where p_contact_id is not null
       and l.contact_id = p_contact_id
       and l.created_at <= coalesce(p_sold_at, now())
     order by (a.canal = 'sans_source'), l.created_at desc
     limit 1)
  ) x
  order by x.rang
  limit 1;
$function$;

create or replace function public.sales_poser_lead_origine()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v record;
begin
  -- Un rattachement corrigé à la main ne bouge plus.
  if NEW.lead_origine_mode = 'manuel' then
    return NEW;
  end if;
  select * into v from public.vente_lead_origine(NEW.lead_id, NEW.call_id, NEW.contact_id, coalesce(NEW.sold_at, NEW.created_at, now()));
  NEW.lead_origine_id := v.lead_id;
  NEW.lead_origine_mode := v.mode;
  return NEW;
end;
$function$;

drop trigger if exists trg_sale_lead_origine on public.sales;
create trigger trg_sale_lead_origine
  before insert or update of lead_id, call_id, contact_id on public.sales
  for each row execute function public.sales_poser_lead_origine();

-- Rattrapage des ventes existantes. Aucun trigger existant ne réagit à ces deux
-- colonnes : ni la conférence, ni l'accès, ni les commissions ne bougent.
update public.sales s
set lead_origine_id = v.lead_id,
    lead_origine_mode = v.mode
from public.sales s2
cross join lateral public.vente_lead_origine(s2.lead_id, s2.call_id, s2.contact_id, coalesce(s2.sold_at, s2.created_at)) v
where s.id = s2.id
  and s.lead_origine_mode is distinct from 'manuel';

-- La vue d'attribution lit désormais le lead figé. La déduction à la lecture reste
-- en dernier recours (vente sans contact au moment de sa création).
create or replace view public.marketing_ventes_attribuees
with (security_invoker = on) as
 select s.id as vente_id,
    s.sold_at,
    s.conference_date,
    s.amount_ht,
    s.product,
    s.contact_id,
    coalesce(s.lead_id,
      (select c.lead_id from calls c where c.id = s.call_id),
      s.lead_origine_id,
      (select l.id from leads l
        where l.contact_id = s.contact_id and (s.sold_at is null or l.created_at <= s.sold_at)
        order by l.created_at desc limit 1)) as lead_id,
    case
      when s.lead_id is not null then 'direct'::text
      when (select c.lead_id from calls c where c.id = s.call_id) is not null then 'via_appel'::text
      when s.lead_origine_id is not null then 'deduit'::text
      when exists (select 1 from leads l
        where l.contact_id = s.contact_id and (s.sold_at is null or l.created_at <= s.sold_at)) then 'deduit'::text
      else 'non_attribue'::text
    end as mode_attribution
   from sales s;
