-- ─────────────────────────────────────────────────────────────────────────
-- Analyse d'appels : référentiel Setting ADS v0.6, format de retour « coach » (24/11/2026).
--
-- Sabrina (22/11) : « je voudrais des retours structurés comme celui-ci » + 3 retours modèles.
-- Ses 5 choix (validés le 24/11, A partout ; Sidali validera 3 et 5 après coup) :
--   1. la note sur 100 n'est vue que par le coach ;
--   2. tous les points à travailler, dans l'ordre de l'appel, les moins graves en dernier ;
--   3. la phrase officielle pour présenter ce qu'on fait (fusion de ses 2 versions) ;
--   4. fin d'appel : les 8 explications, sauf prospect absent (le replay remplace Zoom, lien, horaire) ;
--   5. l'IA relève le budget et le profil ; l'accent reste au coach.
-- Replay : « dimanche après-midi » (choix B de Hassan, 24/11).
--
-- La v0.6 part de la v0.5 (exigences de Sabrina du 12/11, jamais activée) ; elle devient la
-- version active, la v0.4 est désactivée. Les 3 retours modèles de la coach sont ajoutés en base
-- hors de ce dépôt public. La machine (studio/appel.py) lit referentiel.format = 'coach'.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.appels_referentiels add column if not exists format text not null default 'v1';

insert into public.appels_referentiels (type_appel, version, contenu, grille, penalite_enregistrement, duree_min_s, duree_max_s, actif, format)
select type_appel, '0.6',
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    -- les noms de champs de l'ancien format
    replace(replace(replace(replace(replace(contenu,
      'version 0.5 (12/11/2026)', 'version 0.6 (24/11/2026)'),
      'dans « formulation_ideale »', 'dans « formulation »'),
      'Relève-les dans mots_faiblesse et tiens-en compte', 'Relève-les (en point « moins grave » s''ils reviennent souvent) et tiens-en compte'),
      'erreurs_critiques, axes ou conseil_prioritaire', 'erreurs_critiques, dans les points à travailler ou dans les priorités'),
      'ne pas en faire un axe d''amélioration', 'ne pas en faire un point à travailler'),
    -- 3. la phrase officielle
    '5\. L''offre en une phrase[^\n]*',
    '5. Présenter ce qu''on fait (phrase officielle, 24/11/2026) : « Nous, on forme et on accompagne à des compétences métiers qui permettent de travailler en ligne, des compétences que tu peux monétiser : le setting, le closing et le community management. » Puis TOUJOURS une question (ou le retour à la question en cours, par exemple la fourchette). Détailler davantage (coachings, formations, disponibilité des coachs…) est une erreur : le reste est expliqué en conférence.'),
    -- 4. la fin d'appel adaptée
    '8\. La fin d''appel \(P5/P6\)[^\n]*',
    '8. La fin d''appel (P5/P6) : le setter accompagne le prospect avec les explications de la « Liste à cocher ». Si le prospect a dit qu''il ne pourra pas être présent, il ne déroule ni le Zoom, ni le lien 30 min avant, ni l''échange avec Sidali, ni l''horaire : il parle du replay. Si plusieurs explications manquent, fais-en un point à travailler qui les cite.'),
    -- les réponses-types, avant les points administratifs
    '## Points administratifs',
    '## Réponses-types et règles de la coach (Sabrina, 22/11/2026, validées le 24/11/2026) : elles PRIMENT aussi sur le script
- Ordre de la qualification : le but, le pourquoi, la situation, le budget avec la fourchette, puis le temps. Un capital demandé avant le but et le pourquoi = trop tôt.
- Profil e-commerce (stock, boutique…) : « Nous, on n''est pas du tout dans le e-commerce. »
- Conjoint : « Est-ce qu''aujourd''hui ton époux / ton épouse te soutient dans ce projet ? » plutôt que « est-il au courant ? ».
- « Vous êtes situés où ? » : « Moi, je suis en France. La société, elle, est aux Émirats : le fondateur est français et il s''est expatrié là-bas. »
- Replay (prospect qui ne pourra pas être là le dimanche) : « Le replay est disponible le dimanche après-midi, dans le groupe WhatsApp de la conférence. » S''il n''est pas dans le groupe, on le lui envoie le dimanche après-midi, jamais le lundi.
- Présence incertaine (« j''essaierai ») : ne pas laisser passer, engager : « Si ce projet est important pour toi, fais le nécessaire pour te mettre en condition. L''idée, c''est de te réserver ces 3 heures pour la conférence. »
- Disqualification : les signaux que tu relèves sont le budget et le profil. Dès que le budget coince (fins de mois difficiles, découvert), poser la question directe du capital et ne pas la lâcher ; pas de budget = on clôt l''appel, poliment. Un appel court clos pour cette raison est un BON appel. Continuer à qualifier un prospect sans budget = du temps perdu (« valorise ton temps »). L''accent ne se relève pas : tu ne l''entends pas, c''est le coach qui l''ajoute.
- Toujours finir ses phrases par une question ; un grand blanc après une explication laisse le prospect mener l''appel.
- Pas de phrases « administratives » (« je vais reprendre le dossier », « je vais te poser quelques questions »).
- Questions à ne pas oublier (moins grave) : prêt(e) à utiliser les réseaux sociaux ? à l''aise avec les gens ?

## Points administratifs'),
    -- un appel clos faute de budget n'est pas « trop court »
    'Le code signale un appel hors de cette plage \(décision Sidali F=A\)\.',
    'Le code signale un appel hors de cette plage (décision Sidali F=A). Exception : un appel clos tôt parce que le prospect n''a pas de budget est un bon appel (indique-le dans clos_sans_budget) : il n''est pas signalé.'),
    -- le format du retour de la coach remplace l'ancienne structure
    '## Structure du retour \(Mode Élève, 250 à 350 mots\).*?(?=## Règles de comportement)',
    '## Format du retour (format de la coach, validé le 24/11/2026)
Le retour reprend EXACTEMENT la structure des retours de la coach, en 4 blocs :
1. Un verdict en une phrase (« Globalement, ton appel est plutôt pas mal 👏 », « L''appel est très déstructuré. Voici les points à reprendre. »), ou le point principal s''il domine tout l''appel (par exemple des signaux de disqualification ignorés).
2. ✅ Ce qui a bien marché : des puces courtes, seulement si l''appel est correct.
3. ⚠️ Points à travailler : dans l''ordre de l''appel, tous ceux qui comptent (souvent 4 à 8), les plus légers en dernier, marqués « (moins grave) ». Chaque point dit ce que l''élève a dit ou fait, avec ses mots, puis 👉 la phrase exacte à dire.
4. 🎯 Trois priorités pour le prochain appel.
Pas de note, pas de détail par étape, pas de règles R1-R7 dans le retour : la note par étape reste pour le coach.
Ton : celui de la coach. Tutoiement, phrases courtes et directes, aucun jargon. Juger les comportements, jamais la personne.

'),
  (select jsonb_agg(case when e->>'code' = 'P5/P6' then
            jsonb_set(e, '{liste}',
              (select jsonb_agg(case when p->>'court' in ('lien envoyé 30 min avant', 'échange avec Sidali 30 min avant',
                                                          'début à 11 h, environ 2 h 30', 'rappel du matin', 'application Zoom')
                                     then p || '{"presence": true}'::jsonb else p end order by i)
                 from jsonb_array_elements(e->'liste') with ordinality as l(p, i))
              || '[{"court": "replay le dimanche après-midi", "detail": "Prospect qui ne pourra pas être là : lui expliquer que le replay est disponible le dimanche après-midi, dans le groupe WhatsApp de la conférence.", "absent": true}]'::jsonb)
          else e end order by o)
     from jsonb_array_elements(grille) with ordinality as t(e, o)),
  penalite_enregistrement, duree_min_s, duree_max_s, false, 'coach'
  from public.appels_referentiels
 where type_appel = 'setting_ads' and version = '0.5'
   and not exists (select 1 from public.appels_referentiels where type_appel = 'setting_ads' and version = '0.6');

-- la machine sait quel format produire
create or replace function public.appel_job_contexte(p_id uuid, p_jeton text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
    'referentiel', jsonb_build_object('version', r.version, 'contenu', r.contenu, 'grille', r.grille, 'format', r.format,
      'penalite_enregistrement', r.penalite_enregistrement, 'duree_min_s', r.duree_min_s, 'duree_max_s', r.duree_max_s));
end $function$;

-- activation : la v0.6 remplace la v0.4
update public.appels_referentiels set actif = (version = '0.6') where type_appel = 'setting_ads';
