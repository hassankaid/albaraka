-- Questionnaire clients AL BARAKA — socle de données.
--
-- Deux tables. Les INVITATIONS portent le lien personnalisé et l'état de la
-- relance ; les RÉPONSES portent une colonne par question, comme demandé au
-- chapitre 6 du cahier des charges (une ligne par répondant, exportable en
-- CSV sans avoir à déplier du JSON).
--
-- Personne n'accède à ces tables directement : tout passe par les fonctions
-- plus bas, qui n'acceptent qu'un jeton. Un client ne peut donc ni lire les
-- réponses d'un autre, ni découvrir la liste des invités.

-- ── Les invitations ─────────────────────────────────────────────────────
create table if not exists public.questionnaire_invitations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  -- Le jeton EST le mot de passe du lien : 32 caractères tirés au hasard.
  token        text not null unique,
  -- 'al_baraka', 'liberty', ou 'les_deux' pour les dix clients qui ont les
  -- deux formules — eux seuls verront la Q10, faute de réponse évidente.
  formation    text not null check (formation in ('al_baraka','liberty','les_deux')),
  prenom       text,
  email        text not null,
  statut       text not null default 'non_envoye'
               check (statut in ('non_envoye','envoye','ouvert','clique','repondu')),
  envoye_le    timestamptz,
  ouvert_le    timestamptz,
  clique_le    timestamptz,
  repondu_le   timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id)
);

create index if not exists questionnaire_invitations_statut_idx
  on public.questionnaire_invitations (statut);

-- ── Les réponses ────────────────────────────────────────────────────────
--
-- `soumis_le` fait la différence entre un brouillon et une réponse. La ligne
-- naît au premier enregistrement automatique, bien avant la validation : le
-- client qui ferme son téléphone au milieu retrouve ses réponses en revenant.
create table if not exists public.questionnaire_reponses (
  id             uuid primary key default gen_random_uuid(),
  invitation_id  uuid not null unique references public.questionnaire_invitations(id) on delete cascade,
  commence_le    timestamptz not null default now(),
  maj_le         timestamptz not null default now(),
  soumis_le      timestamptz,

  q1  text, q2  text, q3  text, q4  text,                    -- profil
  q5  text, q6  text, q7  text, q8  text, q9  text,          -- situation pro
  q10 text, q11 text, q12 text, q13 text, q14 text, q15 text,-- arrivée
  q16 text, q17 smallint check (q17 between 1 and 10),       -- progression
  q18 text, q19 text, q20 text,
  q21 text, q22 text, q23 text,                              -- résultats
  q24 smallint check (q24 between 1 and 10),                 -- avis
  q25 smallint check (q25 between 1 and 10),
  q26 smallint check (q26 between 0 and 10),                 -- NPS
  q27 text[],                                                -- choix multiple
  q28 text, q29 text                                         -- améliorations
);

alter table public.questionnaire_invitations enable row level security;
alter table public.questionnaire_reponses   enable row level security;

-- Aucune politique : tout passe par les fonctions SECURITY DEFINER ci-dessous
-- et par le rôle de service. Les administrateurs liront le tableau de bord via
-- une vue dédiée en phase 2.

-- ── Ouvrir le questionnaire ─────────────────────────────────────────────
--
-- Rend ce qu'il faut pour afficher la page, et les réponses déjà saisies pour
-- reprendre où on en était. Marque le lien comme cliqué au passage : c'est ce
-- qui distingue un non-répondant d'un client qui a ouvert sans finir.
create or replace function public.questionnaire_ouvrir(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_inv public.questionnaire_invitations%rowtype;
  v_rep public.questionnaire_reponses%rowtype;
begin
  select * into v_inv from questionnaire_invitations where token = p_token;
  if v_inv.id is null then
    return jsonb_build_object('ok', false, 'raison', 'lien_inconnu');
  end if;

  select * into v_rep from questionnaire_reponses where invitation_id = v_inv.id;

  if v_rep.soumis_le is not null then
    return jsonb_build_object('ok', false, 'raison', 'deja_repondu',
                              'prenom', v_inv.prenom);
  end if;

  update questionnaire_invitations
  set clique_le = coalesce(clique_le, now()),
      statut = case when statut in ('non_envoye','envoye','ouvert') then 'clique' else statut end
  where id = v_inv.id;

  return jsonb_build_object(
    'ok', true,
    'prenom', v_inv.prenom,
    'formation', v_inv.formation,
    -- La Q10 ne s'affiche que si la formation est indécidable.
    'demander_formation', v_inv.formation = 'les_deux',
    'reponses', case when v_rep.id is null then '{}'::jsonb else
      jsonb_strip_nulls(to_jsonb(v_rep) - 'id' - 'invitation_id'
                        - 'commence_le' - 'maj_le' - 'soumis_le') end
  );
end;
$$;

-- ── Enregistrer / soumettre ─────────────────────────────────────────────
--
-- Une seule fonction pour les deux : l'enregistrement automatique appelle avec
-- `p_final = false` à chaque section, la validation avec `true`. Les réponses
-- arrivent en JSON et sont recopiées dans leurs colonnes — écrire 29
-- paramètres aurait rendu l'appel illisible et fragile.
create or replace function public.questionnaire_enregistrer(
  p_token text, p_reponses jsonb, p_final boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_inv public.questionnaire_invitations%rowtype;
  v_deja timestamptz;
begin
  select * into v_inv from questionnaire_invitations where token = p_token;
  if v_inv.id is null then
    return jsonb_build_object('ok', false, 'raison', 'lien_inconnu');
  end if;

  select soumis_le into v_deja from questionnaire_reponses where invitation_id = v_inv.id;
  if v_deja is not null then
    -- Une seule réponse par client, critère de recette n°5.
    return jsonb_build_object('ok', false, 'raison', 'deja_repondu');
  end if;

  insert into questionnaire_reponses as r (
    invitation_id, q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,q11,q12,q13,q14,q15,
    q16,q17,q18,q19,q20,q21,q22,q23,q24,q25,q26,q27,q28,q29)
  select v_inv.id,
    p_reponses->>'q1',  p_reponses->>'q2',  p_reponses->>'q3',  p_reponses->>'q4',
    p_reponses->>'q5',  p_reponses->>'q6',  p_reponses->>'q7',  p_reponses->>'q8',
    p_reponses->>'q9',  p_reponses->>'q10', p_reponses->>'q11', p_reponses->>'q12',
    p_reponses->>'q13', p_reponses->>'q14', p_reponses->>'q15', p_reponses->>'q16',
    nullif(p_reponses->>'q17','')::smallint,
    p_reponses->>'q18', p_reponses->>'q19', p_reponses->>'q20', p_reponses->>'q21',
    p_reponses->>'q22', p_reponses->>'q23',
    nullif(p_reponses->>'q24','')::smallint,
    nullif(p_reponses->>'q25','')::smallint,
    nullif(p_reponses->>'q26','')::smallint,
    case when p_reponses ? 'q27'
         then array(select jsonb_array_elements_text(p_reponses->'q27')) end,
    p_reponses->>'q28', p_reponses->>'q29'
  on conflict (invitation_id) do update set
    q1=excluded.q1,   q2=excluded.q2,   q3=excluded.q3,   q4=excluded.q4,
    q5=excluded.q5,   q6=excluded.q6,   q7=excluded.q7,   q8=excluded.q8,
    q9=excluded.q9,   q10=excluded.q10, q11=excluded.q11, q12=excluded.q12,
    q13=excluded.q13, q14=excluded.q14, q15=excluded.q15, q16=excluded.q16,
    q17=excluded.q17, q18=excluded.q18, q19=excluded.q19, q20=excluded.q20,
    q21=excluded.q21, q22=excluded.q22, q23=excluded.q23, q24=excluded.q24,
    q25=excluded.q25, q26=excluded.q26, q27=excluded.q27, q28=excluded.q28,
    q29=excluded.q29,
    maj_le = now(),
    soumis_le = case when p_final then now() else r.soumis_le end;

  if p_final then
    update questionnaire_invitations
    set statut = 'repondu', repondu_le = now()
    where id = v_inv.id;
  end if;

  return jsonb_build_object('ok', true, 'final', p_final);
end;
$$;

-- ── Suppression sur demande (RGPD) ──────────────────────────────────────
--
-- Le client écrit à ethicarena@outlook.com ; un administrateur exécute ceci.
-- L'invitation est conservée mais remise à zéro : sans elle, la personne
-- recevrait de nouveau les relances.
create or replace function public.questionnaire_effacer_reponses(p_email text)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare v_n integer;
begin
  delete from questionnaire_reponses r
  using questionnaire_invitations i
  where r.invitation_id = i.id and lower(trim(i.email)) = lower(trim(p_email));
  get diagnostics v_n = row_count;

  update questionnaire_invitations
  set statut = 'repondu', repondu_le = coalesce(repondu_le, now())
  where lower(trim(email)) = lower(trim(p_email));

  return v_n;
end;
$$;

grant execute on function public.questionnaire_ouvrir(text) to anon, authenticated;
grant execute on function public.questionnaire_enregistrer(text, jsonb, boolean) to anon, authenticated;
grant execute on function public.questionnaire_effacer_reponses(text) to service_role;
