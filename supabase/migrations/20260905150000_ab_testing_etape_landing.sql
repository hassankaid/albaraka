-- ═══════════════════════════════════════════════════════════════════════
-- A/B testing — un test dit désormais OÙ il se joue.
--
-- Jusqu'ici tout test se jouait sur la page de remerciement : c'est là que la
-- variante vidéo apparaît, et l'exposition y était comptée. C'était juste, mais
-- incomplet — rien ne mesurait la LANDING. On ne comptait pas ses visites, et
-- l'inscrit ne gardait aucune trace de la page par laquelle il était passé. La
-- première marche du tunnel, celle qui reçoit tout le trafic payant, était la
-- seule qu'on ne savait pas évaluer.
--
-- Ce manque est un manque de MESURE, pas de contenu : il existe que la landing
-- varie ou non. Tant qu'elle est unique, un test de landing mesurera deux fois
-- la même page et ne trouvera aucun écart — c'est le résultat attendu, et la
-- preuve que l'instrument est juste. Le jour où le marketing en écrit une
-- seconde version, tout est déjà en place.
--
--   etape = 'merci'    exposition sur la page de remerciement
--                      conversion = rejoindre le groupe, ou prendre rendez-vous
--
--   etape = 'landing'  exposition à l'arrivée sur la landing
--                      conversion = s'inscrire
--
-- La contrainte de cohérence lie les deux : une étape n'admet que les actions
-- qui se produisent APRÈS elle. Mesurer l'inscription depuis la page de
-- remerciement n'aurait aucun sens — on y arrive déjà inscrit.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.ab_tests
  add column if not exists etape text not null default 'merci';

alter table public.ab_tests drop constraint if exists ab_tests_etape_check;
alter table public.ab_tests
  add constraint ab_tests_etape_check check (etape in ('landing','merci'));

-- L'inscription rejoint les actions mesurables, des deux côtés.
alter table public.ab_tests drop constraint if exists ab_tests_action_check;
alter table public.ab_tests
  add constraint ab_tests_action_check
  check (action in ('groupe_whatsapp','rendez_vous','inscription'));

alter table public.ab_conversions drop constraint if exists ab_conversions_action_check;
alter table public.ab_conversions
  add constraint ab_conversions_action_check
  check (action in ('groupe_whatsapp','rendez_vous','inscription'));

alter table public.ab_tests drop constraint if exists ab_tests_etape_action_coherentes;
alter table public.ab_tests
  add constraint ab_tests_etape_action_coherentes check (
    (etape = 'landing' and action = 'inscription')
    or (etape = 'merci' and action in ('groupe_whatsapp','rendez_vous'))
  );

comment on column public.ab_tests.etape is
  'Où se joue le test : ''landing'' (exposition à l''arrivée, conversion = inscription) ou ''merci'' (exposition sur la page de remerciement).';
