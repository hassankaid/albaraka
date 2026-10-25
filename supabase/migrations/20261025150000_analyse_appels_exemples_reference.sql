-- ─────────────────────────────────────────────────────────────────────────
-- Analyse d'appels : les exemples de référence (cahier des charges de Sidali, section 6,
-- « Amélioration continue » ; demande de Hassan du 25/10/2026).
--
-- Quand un coach valide un retour en le cochant « exemple de référence », ce retour (dans
-- sa version corrigée, avec les notes que l'IA avait d'abord données) est joint aux
-- instructions de l'IA pour les appels suivants du même type : 4 au plus, les plus
-- récents. L'IA voit ainsi comment les coachs notent et ce qu'ils corrigent, et s'aligne
-- sur leur méthode. Ni la transcription ni l'audio des exemples ne sont transmis.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.appel_job_contexte(p_id uuid, p_jeton text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  a appels_analyses;
  r appels_referentiels;
  v_eleve text;
  v_exemples jsonb;
begin
  a := _appel_job(p_id, p_jeton);
  select * into r from appels_referentiels where type_appel = a.type_appel and actif
   order by cree_le desc limit 1;
  if not found then
    raise exception 'Aucun référentiel actif pour ce type d''appel';
  end if;
  select split_part(coalesce(full_name, ''), ' ', 1) into v_eleve from profiles where id = a.eleve_id;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id, 'note_ia', x.note_ia, 'note_finale', x.note_finale, 'nb_corrections', x.nb_corrections,
           'duree_s', x.duree_s, 'analyse_ia', x.analyse_ia, 'analyse_coach', x.analyse_coach) order by x.valide_le desc), '[]'::jsonb)
    into v_exemples
    from (select * from appels_analyses
           where type_appel = a.type_appel and statut = 'valide' and exemple_reference
             and analyse_coach is not null and id <> p_id
           order by valide_le desc limit 4) x;
  return jsonb_build_object(
    'type_appel', a.type_appel, 'prospect_informe', a.prospect_informe, 'voix_inversees', a.voix_inversees,
    'eleve', initcap(lower(v_eleve)), 'transcription', a.transcription, 'mesures', a.mesures, 'duree_s', a.duree_s,
    'exemples', v_exemples,
    'referentiel', jsonb_build_object('version', r.version, 'contenu', r.contenu, 'grille', r.grille,
      'penalite_enregistrement', r.penalite_enregistrement, 'duree_min_s', r.duree_min_s, 'duree_max_s', r.duree_max_s));
end $$;
