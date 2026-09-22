-- Le nom complet, présentable.
--
-- Même traitement que `prenom_affichable`, mais sur tous les mots : les noms
-- arrivent en capitales dans `profiles`, et « ABDELAZIZ BAHIH » en face d'une
-- réponse se lit moins bien que « Abdelaziz Bahih ». Les marques invisibles
-- partent aussi — deux clients en portent une, et elle survit à initcap.
create or replace function public.nom_affichable(p_nom_complet text)
returns text
language sql
immutable
as $$
  select nullif(
    initcap(
      btrim(regexp_replace(
        regexp_replace(coalesce(p_nom_complet, ''),
                       '[​-‏‪-‮⁠﻿]', '', 'g'),
        '\s+', ' ', 'g'))
    ),
  '');
$$;

grant execute on function public.nom_affichable(text) to anon, authenticated, service_role;

-- La vue porte désormais le nom complet à côté du prénom.
--
-- Il est lu dans `profiles` plutôt que recopié dans l'invitation : un nom
-- corrigé dans la fiche du client se reflète aussitôt dans le tableau de bord,
-- sans rien à resynchroniser.
--
-- La colonne est ajoutée EN FIN de vue : PostgreSQL refuse d'insérer une
-- colonne au milieu d'une vue remplacée, et la supprimer pour la recréer
-- aurait coupé la lecture le temps de la migration.
create or replace view public.questionnaire_resultats as
  select
    i.id as invitation_id,
    i.prenom,
    i.formation as formation_fichier,
    i.statut, i.envoye_le, i.clique_le, i.repondu_le, r.soumis_le,
    r.q1,  r.q2,  r.q3,  r.q4,  r.q5,  r.q6,  r.q7,  r.q8,  r.q9,  r.q10,
    r.q11, r.q12, r.q13, r.q14, r.q15, r.q16, r.q17, r.q18, r.q19, r.q20,
    r.q21, r.q22, r.q23, r.q24, r.q25, r.q26, r.q27, r.q28, r.q29,
    public.nom_affichable(p.full_name) as nom_complet
  from public.questionnaire_invitations i
  join public.questionnaire_reponses r on r.invitation_id = i.id
  left join public.profiles p on p.id = i.user_id
  where i.test = false and r.soumis_le is not null;

alter view public.questionnaire_resultats set (security_invoker = on);
grant select on public.questionnaire_resultats to authenticated;
