-- Quiz Muslim Mindset — Bloc 1 : At-Tawakkul & Al-Qadr (chapitres 1-2)
-- Attaché au chapitre "Al-Qadr et la responsabilité" (fin de bloc 1).
-- max_errors = 0 → 100% de bonnes réponses requises pour valider.

SELECT public.import_quiz_from_json(jsonb_build_object(
  'titre', 'Quiz Muslim Mindset — Bloc 1 At-Tawakkul & Al-Qadr',
  'description', 'Chapitres 1 et 2 — 5 questions. Valide ce quiz pour débloquer le chapitre suivant.',
  'max_errors', 0,
  'status', 'published',
  'chapitre_id', '591bc84d-d630-4168-9bb4-66e7815404ba',
  'questions', jsonb_build_array(
    jsonb_build_object(
      'question', 'Tu as envoyé 30 DM aujourd''hui et personne n''a répondu. Quelle est la bonne réaction ?',
      'options', jsonb_build_array(
        'J''arrête les DM, ça ne marche pas pour moi',
        'Je change de stratégie et j''essaie les appels',
        'Qadarou Lah, je contrôle mon effort pas le résultat — demain je recommence',
        'Je me plains en coaching'
      ),
      'correct_index', 2,
      'explication', 'Le tawakkul, c''est accepter le décret d''Allah tout en maintenant l''effort. Tu ne contrôles pas les réponses, tu contrôles tes actions.'
    ),
    jsonb_build_object(
      'question', 'Le tawakkul, c''est :',
      'options', jsonb_build_array(
        'Attendre qu''Allah envoie des clients sans rien faire',
        'Faire les causes avec excellence, puis s''en remettre à Allah pour le résultat',
        'Stresser sur chaque prospect jusqu''à ce qu''il achète',
        'Laisser ses coachs faire le travail à ta place'
      ),
      'correct_index', 1,
      'explication', 'Allah ﷲ dit : « Et quiconque place sa confiance en Allah, Il lui suffit. » [Coran, Sourate At-Talaq (65), verset 3]'
    ),
    jsonb_build_object(
      'question', 'Quel verset le module cite pour illustrer le tawakkul ?',
      'options', jsonb_build_array(
        '« Certes, avec la difficulté vient la facilité. » (Al-Inshirah, 5)',
        '« Et quiconque place sa confiance en Allah, Il lui suffit. » (At-Talaq, 65:3)',
        '« Allah ne change pas un peuple tant que celui-ci ne change pas ce qui est en lui. » (Ar-Ra''d, 11)',
        '« Invoquez-Moi, Je vous répondrai. » (Ghafir, 60)'
      ),
      'correct_index', 1,
      'explication', 'C''est le verset 3 de la Sourate At-Talaq (65) qui est cité dans le module.'
    ),
    jsonb_build_object(
      'question', 'Le hadith « Attache ta chamelle, puis place ta confiance en Allah » signifie :',
      'options', jsonb_build_array(
        'Il faut toujours vérifier sa voiture avant de voyager',
        'On fait d''abord les efforts concrets, puis on se fie au décret d''Allah',
        'La confiance en Allah remplace l''effort',
        'Il faut avoir un plan B en permanence'
      ),
      'correct_index', 1,
      'explication', 'Rapporté par At-Tirmidhi (2517), classé Hasan. Ce hadith résume l''équilibre entre l''effort humain et la confiance en Allah.'
    ),
    jsonb_build_object(
      'question', 'Vrai ou Faux : « Tu es responsable du résultat de ta prospection. »',
      'options', jsonb_build_array(
        'Vrai',
        'Faux — tu es responsable de ton effort, le résultat appartient à Allah'
      ),
      'correct_index', 1,
      'explication', 'Tu es responsable de te former, de prospecter, de closer. Le résultat appartient à Allah. C''est la base de Al-Qadr appliqué au business.'
    )
  )
));
