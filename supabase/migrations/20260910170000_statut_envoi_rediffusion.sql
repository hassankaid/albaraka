-- ═══════════════════════════════════════════════════════════════════════
-- Nouveau statut de fiche : « Envoi rediffusion ».
--
-- LE BESOIN. Quand un inscrit manque la conference, le commercial lui envoie
-- la rediffusion puis attend son retour. Faute de statut, l'equipe le notait a
-- la main : « rediffusion » apparait dans 32 notes la semaine du 07/09 pour la
-- seule Melanie, et la fiche passait en « a_relancer », ce qui melangeait deux
-- situations differentes.
--
-- LE COMPORTEMENT EST CELUI D'« a_relancer », DELIBEREMENT. Un suivi ouvert :
--   - la fiche reste chez son commercial ;
--   - elle n'est PAS recyclee : ni instantanement (seuls pas_de_reponse et
--     pas_de_reponse_post_conference le sont), ni par le cron nocturne
--     recycle-stale-leads (qui ne vise que a_qualifier et inscrit_conference) ;
--   - si le commercial est desactive, elle repart dans les leads a traiter,
--     comme ses « a_relancer » (liberer_fiches_a_traiter) ;
--   - apporteurs et collaborateurs, confirmes comme intermediaires, peuvent la
--     poser (apporteur_update_lead_status + liste du front).
--
-- CE QUI NE CHANGE PAS. release_overdue_apported_leads ne libere que
-- 'a_qualifier' : une fiche en rediffusion est deja travaillee, comme une
-- « a_relancer ». La vue leads_enriched traduit certains statuts en libelle
-- mais retombe sur la valeur brute (ELSE l.status), et aucun ecran ne lit ce
-- libelle. Les fiches existantes gardent leur statut : les notes « rediffusion »
-- deja ecrites restent des notes.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Le statut devient une valeur autorisee ─────────────────────────
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check check (status = any (array[
  'a_qualifier', 'faux_numero', 'pas_de_reponse', 'pas_de_reponse_post_conference',
  'pas_qualifie', 'a_relancer', 'perdu', 'inscrit_conference', 'call_booke',
  'renvoi_pole_vente', 'close', 'envoi_rediffusion'
]::text[]));

-- ── 2. Les apporteurs peuvent le poser sur leurs fiches ────────────────
-- Corps identique a la version en production, seul 'envoi_rediffusion' est
-- ajoute a v_allowed_statuses (et PAS a v_instant_recycle_statuses).
create or replace function public.apporteur_update_lead_status(p_lead_id uuid, p_new_status text, p_note text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_role text;
  v_lead_apporteur uuid;
  v_lead_assignee uuid;
  v_old_status text;
  v_now timestamptz := now();
  v_allowed_statuses text[] := ARRAY[
    'a_qualifier',
    'inscrit_conference',
    'envoi_rediffusion',
    'faux_numero',
    'pas_qualifie',
    'a_relancer',
    'perdu',
    'call_booke',
    'close',
    'pas_de_reponse',
    'pas_de_reponse_post_conference'
  ];
  v_instant_recycle_statuses text[] := ARRAY[
    'pas_de_reponse',
    'pas_de_reponse_post_conference'
  ];
  v_should_recycle boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller;
  IF v_caller_role NOT IN ('apporteur', 'collaborateur') THEN
    RAISE EXCEPTION 'Cette fonction est réservée aux apporteurs et collaborateurs (rôle actuel: %)', v_caller_role;
  END IF;

  IF NOT (p_new_status = ANY(v_allowed_statuses)) THEN
    RAISE EXCEPTION 'Statut "%" non autorisé. Statuts permis: %',
      p_new_status, array_to_string(v_allowed_statuses, ', ');
  END IF;

  SELECT apporteur_id, status, assigned_to INTO v_lead_apporteur, v_old_status, v_lead_assignee
  FROM leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead introuvable';
  END IF;

  -- Règle d'autorisation durcie (anti double-saisie) :
  --   - Caller assigné au lead → OK (il est en charge du traitement)
  --   - Caller apporteur ET lead non assigné → OK (personne ne traite encore)
  --   - Sinon (apporteur d'un lead assigné ailleurs) → bloqué
  IF NOT (
    v_lead_assignee = v_caller
    OR (v_lead_assignee IS NULL AND v_lead_apporteur = v_caller)
  ) THEN
    IF v_lead_apporteur = v_caller AND v_lead_assignee IS NOT NULL THEN
      RAISE EXCEPTION 'Ce lead est en cours de traitement par un autre collaborateur. Tu ne peux pas modifier son statut pour éviter d''écraser son travail.';
    ELSE
      RAISE EXCEPTION 'Vous ne pouvez modifier que les leads qui vous sont affectés (ou que vous avez apportés et qui ne sont pas encore assignés).';
    END IF;
  END IF;

  IF v_old_status = p_new_status AND (p_note IS NULL OR length(trim(p_note)) = 0) THEN
    RETURN jsonb_build_object('ok', true, 'changed', false, 'lead_id', p_lead_id, 'status', p_new_status);
  END IF;

  v_should_recycle := p_new_status = ANY(v_instant_recycle_statuses);

  IF v_should_recycle THEN
    UPDATE leads SET status = p_new_status, assigned_to = NULL, assigned_at = NULL, recycled_at = v_now, updated_at = v_now WHERE id = p_lead_id;
  ELSE
    UPDATE leads SET status = p_new_status, updated_at = v_now WHERE id = p_lead_id;
  END IF;

  IF v_old_status IS DISTINCT FROM p_new_status THEN
    INSERT INTO lead_activities (lead_id, user_id, action, old_value, new_value, note)
    VALUES (
      p_lead_id, v_caller, 'status_change', v_old_status, p_new_status,
      CASE WHEN p_note IS NOT NULL AND length(trim(p_note)) > 0
        THEN 'Modification — ' || trim(p_note)
        ELSE 'Modification'
      END
    );
  ELSIF p_note IS NOT NULL AND length(trim(p_note)) > 0 THEN
    INSERT INTO lead_activities (lead_id, user_id, action, note)
    VALUES (p_lead_id, v_caller, 'note_added', 'Note — ' || trim(p_note));
  END IF;

  IF v_should_recycle THEN
    IF v_lead_assignee IS NOT NULL THEN
      INSERT INTO lead_activities (lead_id, user_id, action, old_value, note)
      VALUES (p_lead_id, v_caller, 'unassigned', v_lead_assignee::text, 'Désaffecté automatiquement suite au statut "' || p_new_status || '"');
    END IF;
    INSERT INTO lead_activities (lead_id, user_id, action, note)
    VALUES (p_lead_id, v_caller, 'recycled', 'Recyclage instantané — statut "' || p_new_status || '"');
  END IF;

  RETURN jsonb_build_object('ok', true, 'changed', true, 'recycled', v_should_recycle, 'lead_id', p_lead_id, 'old_status', v_old_status, 'new_status', p_new_status);
END;
$function$;

-- ── 3. Un commercial desactive libere aussi ses fiches en rediffusion ───
-- Corps identique a 20260910150000_heritage_ignore_les_inactifs.sql, seule la
-- liste des statuts liberes s'allonge.
create or replace function public.liberer_fiches_a_traiter(p_user_id uuid, p_motif text default null)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_auteur uuid;
  v_note   text := coalesce(nullif(p_motif, ''),
                            'Commercial desactive : fiche remise dans les leads a traiter');
  v_nb     integer := 0;
  r        record;
begin
  if auth.uid() is not null and coalesce(get_user_role(), '') <> 'ceo' then
    raise exception 'Seul le CEO peut remettre les fiches d''un commercial dans le pot commun';
  end if;

  v_auteur := coalesce(
    auth.uid(),
    (select id from profiles where role = 'ceo' order by created_at limit 1),
    p_user_id
  );

  for r in
    select id from leads
    where assigned_to = p_user_id
      and status in ('a_qualifier', 'nouveau', 'a_relancer', 'envoi_rediffusion')
    for update
  loop
    update leads set assigned_to = null, assigned_at = null where id = r.id;

    insert into lead_activities (lead_id, user_id, action, old_value, new_value, note)
    values (r.id, v_auteur, 'unassigned', p_user_id::text, null, v_note);

    v_nb := v_nb + 1;
  end loop;

  return v_nb;
end;
$function$;
