-- ─────────────────────────────────────────────────────────────────────────
-- Les demandes du site vitrine ne reçoivent plus la séquence de la conférence
-- (demande de Hassan le 29/09/2026 : Sidali, en testant le site, a reçu
-- « Ton inscription est confirmée » pour la conférence du 04/10).
--
-- Cause : tout lead reçoit une conference_date (trigger
-- trg_lead_conference_date, dimanche suivant), et les listes d'envoi de la
-- conférence prennent TOUS les leads de cette date, quelle que soit la source.
--
-- On ne touche PAS à conference_date : elle sert aussi au suivi marketing
-- (marketing_perf, marketing_rdv) et aucun lead n'en est dépourvu. On écarte
-- seulement la source 'site_vitrine' des deux endroits qui remplissent les
-- listes :
--   - rafraichir_liste_conference : liste mail ET liste SMS (2 occurrences) ;
--   - tick_envois_conference : le compte des « inscriptions à confirmer ».
--
-- Réécriture par remplacement de texte sur la définition EN PRODUCTION, pour
-- ne rien perdre de ce qui y vit ; chaque remplacement est vérifié.
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  d text;
  n integer;
begin
  d := pg_get_functiondef('public.rafraichir_liste_conference(date, text)'::regprocedure);
  n := (length(d) - length(replace(d, 'where l.conference_date = p_conference_date', ''))) / length('where l.conference_date = p_conference_date');
  if n <> 2 then
    raise exception 'rafraichir_liste_conference : 2 occurrences attendues, % trouvée(s)', n;
  end if;
  execute replace(d, 'where l.conference_date = p_conference_date',
                  'where l.conference_date = p_conference_date and l.source is distinct from ''site_vitrine''');

  d := pg_get_functiondef('public.tick_envois_conference(timestamptz, boolean)'::regprocedure);
  n := (length(d) - length(replace(d, 'where l.conference_date = v_conf', ''))) / length('where l.conference_date = v_conf');
  if n <> 1 then
    raise exception 'tick_envois_conference : 1 occurrence attendue, % trouvée(s)', n;
  end if;
  execute replace(d, 'where l.conference_date = v_conf',
                  'where l.conference_date = v_conf and l.source is distinct from ''site_vitrine''');
end;
$$;
