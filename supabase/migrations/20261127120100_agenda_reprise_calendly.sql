-- ═══════════════════════════════════════════════════════════════════════════
-- Moteur de rendez-vous : reprise de la configuration Calendly (27/11/2026)
--
-- Relevé le 27/11/2026 dans Calendly (lecture seule, compte de l'organisation) :
-- durées, pas des créneaux, préavis, horizon, questions, redirections, hôtes et
-- horaires appliqués à chaque type d'événement. Aucun rappel automatique
-- n'est activé côté Calendly (seulement les e-mails de confirmation).
--
-- Les agendas sont créés INACTIFS : ils ne deviennent réservables qu'à la
-- bascule, agenda par agenda (Calendly reste en service en attendant).
-- Les adresses de réponse des hôtes viennent de leur compte (auth.users) :
-- aucune adresse n'est écrite dans ce fichier.
--
-- Appliqué en base le 27/11/2026 (testé d'abord dans une transaction annulée).
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  c_hedi    constant uuid := '533b3a7f-cec4-4d44-8300-a8cd806ddad3';
  c_sabrina constant uuid := '071078ef-04ff-4ddc-9a38-f6ba8e6748c4';
  h_hedi_travail uuid; h_hedi_conf uuid;
  h_sab_dispo uuid; h_sab_conf uuid; h_sab_coaching uuid;
  e uuid;
begin
  -- ── Hôtes ────────────────────────────────────────────────────────────────
  insert into public.agenda_hotes (hote_id, nom_affiche, email_reponse, fuseau)
  select p.id, initcap(p.full_name), u.email, 'Europe/Paris'
  from public.profiles p join auth.users u on u.id = p.id
  where p.id in (c_hedi, c_sabrina)
  on conflict (hote_id) do nothing;

  if (select count(*) from public.agenda_hotes where hote_id in (c_hedi, c_sabrina)) <> 2 then
    raise exception 'Hôtes introuvables (profils Hedi / Sabrina)';
  end if;

  -- ── Horaires de Hedi (heure de Paris) ───────────────────────────────────
  insert into public.agenda_horaires (hote_id, nom, par_defaut)
  values (c_hedi, 'Heures de travail', true) returning id into h_hedi_travail;
  insert into public.agenda_plages (horaire_id, jour, debut, fin)
  select h_hedi_travail, j, '09:00', '17:00' from generate_series(1, 6) j;

  insert into public.agenda_horaires (hote_id, nom) values (c_hedi, 'Inscription conférence')
  returning id into h_hedi_conf;
  insert into public.agenda_plages (horaire_id, jour, debut, fin) values (h_hedi_conf, 7, '14:20', '20:30');

  -- ── Horaires de Sabrina ─────────────────────────────────────────────────
  insert into public.agenda_horaires (hote_id, nom, par_defaut)
  values (c_sabrina, 'Disponibilités', true) returning id into h_sab_dispo;
  insert into public.agenda_plages (horaire_id, jour, debut, fin) values
    (h_sab_dispo, 1, '10:00', '12:00'), (h_sab_dispo, 1, '15:00', '16:00'),
    (h_sab_dispo, 2, '10:00', '12:00'), (h_sab_dispo, 2, '14:45', '16:00'),
    (h_sab_dispo, 3, '10:00', '12:00'), (h_sab_dispo, 3, '15:00', '16:00'),
    (h_sab_dispo, 4, '10:00', '12:00'), (h_sab_dispo, 4, '14:45', '16:00'),
    (h_sab_dispo, 5, '10:00', '11:00'),
    (h_sab_dispo, 6, '10:00', '13:00'),
    (h_sab_dispo, 7, '09:30', '12:30');

  insert into public.agenda_horaires (hote_id, nom) values (c_sabrina, 'Inscription conférence')
  returning id into h_sab_conf;
  insert into public.agenda_plages (horaire_id, jour, debut, fin) values (h_sab_conf, 7, '14:00', '20:30');

  insert into public.agenda_horaires (hote_id, nom) values (c_sabrina, 'Coaching')
  returning id into h_sab_coaching;
  insert into public.agenda_plages (horaire_id, jour, debut, fin) values
    (h_sab_coaching, 1, '13:30', '14:30'),
    (h_sab_coaching, 2, '09:30', '12:30'), (h_sab_coaching, 2, '13:30', '14:30'), (h_sab_coaching, 2, '15:30', '16:30'),
    (h_sab_coaching, 3, '09:30', '12:30'), (h_sab_coaching, 3, '15:30', '16:30'), (h_sab_coaching, 3, '20:30', '21:30'),
    (h_sab_coaching, 4, '09:30', '12:30'), (h_sab_coaching, 4, '13:30', '14:30'), (h_sab_coaching, 4, '15:30', '16:30'),
    (h_sab_coaching, 5, '14:00', '16:00'), (h_sab_coaching, 5, '20:00', '21:30'),
    (h_sab_coaching, 6, '09:30', '12:30'), (h_sab_coaching, 6, '20:30', '21:30'),
    (h_sab_coaching, 7, '20:30', '21:30');

  -- ── Agendas (inactifs jusqu'à la bascule) ───────────────────────────────
  -- Inscription conférence : 20 min, créneaux de 20 min, sans préavis, 24 h glissantes.
  insert into public.agenda_evenements (cle, nom, event_type, duree_min, pas_min, preavis_min, horizon_min,
    question_telephone, redirection_url, calendly_event_type, actif, description)
  values ('inscription-conference', 'Inscription conférence', 'inscription_conference', 20, 20, 0, 1440,
    'Quel est votre numéro Whatsapp ?', 'https://event.albarakaecosysteme.com/appel-conference/confirmation',
    '29475949-1729-46d9-a073-9587e8a655c5', false,
    'Félicitations pour votre prise de décision ! On vous appellera à l''heure du rendez-vous pour avancer inshaAllah')
  returning id into e;
  insert into public.agenda_evenement_hotes (evenement_id, hote_id, horaire_id) values
    (e, c_hedi, h_hedi_conf), (e, c_sabrina, h_sab_conf);

  insert into public.agenda_evenements (cle, nom, event_type, duree_min, pas_min, preavis_min, horizon_min,
    question_telephone, redirection_url, calendly_event_type, actif)
  values ('rediffusion-conference', 'Rediffusion conférence', 'rediffusion_conference', 20, 20, 180, 2880,
    'Quel est votre numéro Whatsapp ?', 'https://event.albarakaecosysteme.com/appel-conference/confirmation',
    'd81763ec-39d2-4ca0-be42-fc61f04fd484', false)
  returning id into e;
  insert into public.agenda_evenement_hotes (evenement_id, hote_id) values (e, c_hedi), (e, c_sabrina);

  insert into public.agenda_evenements (cle, nom, event_type, duree_min, pas_min, preavis_min, horizon_min,
    redirection_url, calendly_event_type, actif)
  values ('vsl', 'VSL', 'appel_vsl_tunnel', 45, 15, 180, 2880,
    'https://event.albarakaecosysteme.com/appel-conference/confirmation',
    '2ce9ca9a-2bfd-435c-a1e6-87fc9716f2c7', false)
  returning id into e;
  insert into public.agenda_evenement_hotes (evenement_id, hote_id) values (e, c_hedi), (e, c_sabrina);

  insert into public.agenda_evenements (cle, nom, event_type, duree_min, pas_min, preavis_min, horizon_min,
    redirection_url, calendly_event_type, actif)
  values ('temoignages', 'Témoignages', 'appel_temoignages', 45, 15, 180, 2880,
    'https://event.albarakaecosysteme.com/appel-conference/confirmation',
    '5123cdb3-bf46-4492-910f-b958f7f99f06', false)
  returning id into e;
  insert into public.agenda_evenement_hotes (evenement_id, hote_id) values (e, c_sabrina);

  insert into public.agenda_evenements (cle, nom, event_type, duree_min, pas_min, preavis_min, horizon_min,
    redirection_url, calendly_event_type, actif)
  values ('site-web', 'Site web Al Baraka', 'site_vitrine', 30, 15, 180, 2880,
    'https://event.albarakaecosysteme.com/al-baraka-200/confirmation',
    '655fa72e-bde0-4a12-a6bf-b10cf1d5fe68', false)
  returning id into e;
  insert into public.agenda_evenement_hotes (evenement_id, hote_id) values (e, c_hedi), (e, c_sabrina);

  insert into public.agenda_evenements (cle, nom, event_type, duree_min, pas_min, preavis_min, horizon_min,
    redirection_url, calendly_event_type, actif)
  values ('al-baraka-200', 'Al Baraka 200 €/mois', 'al_baraka_200', 30, 15, 180, 2880,
    'https://event.albarakaecosysteme.com/al-baraka-200/confirmation',
    '7becdc54-4834-4863-8eab-fab2af2928c0', false)
  returning id into e;
  insert into public.agenda_evenement_hotes (evenement_id, hote_id) values (e, c_hedi), (e, c_sabrina);

  insert into public.agenda_evenements (cle, nom, event_type, duree_min, pas_min, preavis_min, horizon_min,
    redirection_url, calendly_event_type, actif)
  values ('liberty', 'Liberty', 'tunnel_liberty', 60, 15, 180, 2880,
    'https://event.albarakaecosysteme.com/liberty/confirmation',
    'db3f5dde-0a79-4130-9a28-709478fa9835', false)
  returning id into e;
  insert into public.agenda_evenement_hotes (evenement_id, hote_id) values (e, c_hedi), (e, c_sabrina);

  insert into public.agenda_evenements (cle, nom, event_type, duree_min, pas_min, preavis_min, horizon_min,
    redirection_url, calendly_event_type, actif)
  values ('pole-vente', 'Pôle vente', 'pole_vente', 45, 15, 180, 2880,
    'https://event.albarakaecosysteme.com/appel-conference/confirmation',
    '24e32865-5df5-49c6-af55-c2089e546eb6', false)
  returning id into e;
  insert into public.agenda_evenement_hotes (evenement_id, hote_id) values (e, c_hedi);

  -- Coaching individuel payant : réservable seulement avec le jeton du paiement.
  -- Lieu Zoom : le lien sera décidé à la bascule du coaching (lieu_detail vide).
  insert into public.agenda_evenements (cle, nom, event_type, duree_min, pas_min, preavis_min, horizon_min,
    lieu_type, redirection_url, acces, calendly_event_type, actif)
  values ('coaching-individuel', 'Coaching individuel Al Baraka', 'coaching_individuel', 60, 15, 180, 1440,
    'zoom', 'https://plateforme.albarakaecosysteme.com/coaching/confirmation', 'jeton',
    'b8c343d6-1ff4-44a6-b81c-ead7aa03a104', false)
  returning id into e;
  insert into public.agenda_evenement_hotes (evenement_id, hote_id, horaire_id) values (e, c_sabrina, h_sab_coaching);
end $$;
