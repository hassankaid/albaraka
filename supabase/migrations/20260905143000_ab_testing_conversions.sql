-- ═══════════════════════════════════════════════════════════════════════
-- A/B testing — le modèle, corrigé après observation des tunnels réels.
--
-- CE QUE J'AVAIS MAL POSÉ. Ma première version enregistrait l'exposition sur la
-- landing. Or les deux tunnels partagent la MÊME landing — choix assumé, écrit
-- dans `tunnels/config.ts` — et la variante n'apparaît que sur la page de
-- REMERCIEMENT. Vérifié en chargeant les pages : `?v=1` et `?v=3` rendent une
-- landing identique au caractère près (2 172), et deux vidéos différentes sur
-- la page de remerciement (1204770334 contre 1204770335).
--
-- Compter l'exposition sur la landing gonflait donc le dénominateur avec des
-- visiteurs qui n'ont jamais vu de variante.
--
-- LE MODÈLE, EN UNE PHRASE : parmi les visiteurs qui ont VU une variante,
-- combien ont fait l'action suivante ?
--
--   exposition = a vu la variante        (page de remerciement)
--   conversion = a fait l'action d'après (groupe WhatsApp, ou rendez-vous)
--
-- Le taux d'inscription n'entre pas dans le test : les deux groupes voient la
-- même landing, il serait identique par construction et tout écart ne serait
-- que du bruit. En contrepartie, l'expérience est PROPRE — les deux groupes ont
-- vécu exactement la même chose jusqu'à l'inscription, donc aucun biais amont.
--
-- UNE SEULE TABLE POUR TOUTES LES CONVERSIONS, quel que soit le tunnel et
-- quelle que soit l'action. Dériver le rendez-vous depuis `calls` et le clic
-- WhatsApp d'ailleurs aurait donné deux chemins de mesure, deux façons de se
-- tromper. `calls` reste le fait de gestion ; `ab_conversions` est le fait
-- d'expérience.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.ab_conversions (
  id          uuid primary key default gen_random_uuid(),
  test_id     uuid not null references public.ab_tests(id) on delete cascade,
  visitor_id  text not null,
  variant     text not null,
  action      text not null check (action in ('groupe_whatsapp','rendez_vous')),
  created_at  timestamptz not null default now(),
  -- Un visiteur qui clique trois fois sur le bouton du groupe a converti UNE
  -- fois. Sans cette contrainte, un enthousiaste ferait gagner sa variante.
  unique (test_id, visitor_id, action)
);

create index if not exists ab_conversions_test_idx on public.ab_conversions (test_id, variant);

alter table public.ab_conversions enable row level security;

drop policy if exists ab_conversions_select_staff on public.ab_conversions;
create policy ab_conversions_select_staff on public.ab_conversions
  for select using (coalesce(get_user_role(), '') in ('ceo','agence'));

-- L'action attendue d'un tunnel, portée par le test lui-même : c'est elle qu'on
-- optimise, et elle est figée au lancement comme le reste du périmètre.
alter table public.ab_tests add column if not exists action text;

update public.ab_tests
set action = case when tunnel = 'vsl' then 'rendez_vous' else 'groupe_whatsapp' end
where action is null;

alter table public.ab_tests alter column action set not null;
alter table public.ab_tests drop constraint if exists ab_tests_action_check;
alter table public.ab_tests
  add constraint ab_tests_action_check check (action in ('groupe_whatsapp','rendez_vous'));

comment on column public.ab_tests.metrique is
  'Indicatif seulement. L''action décisive du test est dans `action`.';

-- ── Les résultats, refondus sur ce modèle ──────────────────────────────
drop function if exists public.ab_test_resultats(text);

create function public.ab_test_resultats(p_code text)
returns table (
  variant     text,
  poids       int,
  visiteurs   bigint,
  conversions bigint,
  ventes      bigint,
  ca          numeric
)
language sql
stable
security invoker
as $function$
  with t as (
    select id, code, variants, weights, action from ab_tests where code = p_code
  ),
  -- Une ligne par variante déclarée, même à zéro visiteur : une variante qui
  -- ne reçoit personne est une information, pas une absence.
  declarees as (
    select v.variant, w.poids
    from t
    cross join lateral unnest(t.variants) with ordinality as v(variant, i)
    cross join lateral unnest(t.weights)  with ordinality as w(poids, j)
    where v.i = w.j
  ),
  expo as (
    select e.variant, count(*) as n
    from ab_exposures e join t on t.id = e.test_id
    group by e.variant
  ),
  conv as (
    select c.variant, count(*) as n
    from ab_conversions c join t on t.id = c.test_id and c.action = t.action
    group by c.variant
  ),
  -- Les ventes se rattachent par le visiteur : le lead porte son `visitor_id`,
  -- l'exposition aussi. Indicatif — sur ces volumes, une vente ne prouve rien.
  ventes as (
    select e.variant, count(s.id) as n, coalesce(sum(s.amount_ht), 0) as ca
    from ab_exposures e
    join t on t.id = e.test_id
    join leads l on l.visitor_id = e.visitor_id
    join sales s on s.lead_id = l.id
    group by e.variant
  )
  select d.variant, d.poids,
         coalesce(e.n, 0), coalesce(c.n, 0),
         coalesce(v.n, 0), coalesce(v.ca, 0)
  from declarees d
  left join expo   e on e.variant = d.variant
  left join conv   c on c.variant = d.variant
  left join ventes v on v.variant = d.variant
  order by d.variant;
$function$;

comment on function public.ab_test_resultats(text) is
  'Mesures brutes par variante : exposés, convertis, ventes. Taux et significativité côté application.';
