-- Lecture des résultats, réservée aux administrateurs.
--
-- Jusqu'ici les deux tables n'avaient AUCUNE politique : seules les fonctions
-- à jeton y accédaient, et le rôle de service. C'est ce qu'il fallait pendant
-- la collecte. Le tableau de bord, lui, lit directement — d'où ces deux
-- politiques en lecture seule, et rien d'autre : personne ne modifie une
-- réponse depuis l'écran.
create policy "questionnaire_invitations_lecture_ceo"
  on public.questionnaire_invitations for select
  using (public.is_ceo(auth.uid()));

create policy "questionnaire_reponses_lecture_ceo"
  on public.questionnaire_reponses for select
  using (public.is_ceo(auth.uid()));

-- Une ligne par répondant, prête pour l'écran et pour l'export CSV.
--
-- La vue porte la formation issue de NOS fichiers à côté de celle déclarée :
-- les dix clients qui ont les deux formules ont répondu eux-mêmes, et il est
-- utile de voir les deux.
create or replace view public.questionnaire_resultats as
  select
    i.id as invitation_id, i.prenom, i.formation as formation_fichier,
    i.statut, i.envoye_le, i.clique_le, i.repondu_le, r.soumis_le,
    r.q1,  r.q2,  r.q3,  r.q4,  r.q5,  r.q6,  r.q7,  r.q8,  r.q9,  r.q10,
    r.q11, r.q12, r.q13, r.q14, r.q15, r.q16, r.q17, r.q18, r.q19, r.q20,
    r.q21, r.q22, r.q23, r.q24, r.q25, r.q26, r.q27, r.q28, r.q29
  from public.questionnaire_invitations i
  join public.questionnaire_reponses r on r.invitation_id = i.id
  where i.test = false and r.soumis_le is not null;

-- La vue hérite des politiques des tables sous-jacentes.
alter view public.questionnaire_resultats set (security_invoker = on);
grant select on public.questionnaire_resultats to authenticated;

-- Le dénominateur du taux de réponse : combien de messages sont partis.
create or replace function public.questionnaire_avancement()
returns table (envoyes integer, repondus integer, cliques_sans_reponse integer, exclus integer)
language sql stable security definer set search_path to 'public', 'pg_temp'
as $$
  select
    count(*) filter (where statut <> 'non_envoye')::int,
    count(*) filter (where statut = 'repondu')::int,
    count(*) filter (where statut = 'clique')::int,
    (select count(*)::int from questionnaire_invitations where exclu)
  from questionnaire_invitations
  where test = false and exclu = false;
$$;

grant execute on function public.questionnaire_avancement() to authenticated;
