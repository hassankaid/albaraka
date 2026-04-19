-- Quiz Muslim Mindset — Bloc 3 : Discipline & Argent en Islam (chapitres 5-6)
-- Attaché au chapitre "L'argent en Islam : vision saine de la richesse" (fin de bloc 3).

SELECT public.import_quiz_from_json(jsonb_build_object(
  'titre', 'Quiz Muslim Mindset — Bloc 3 Discipline & Argent en Islam',
  'description', 'Chapitres 5 et 6 — 4 questions. Valide ce quiz pour débloquer le chapitre suivant.',
  'max_errors', 0,
  'status', 'published',
  'chapitre_id', 'c92b2ae9-ead9-4eb8-aa04-e4ebc612f95b',
  'questions', jsonb_build_array(
    jsonb_build_object(
      'question', '« La régularité bat le talent. » Ça veut dire :',
      'options', jsonb_build_array(
        '5 contenus moyens par semaine valent mieux qu''1 contenu parfait par mois',
        'Il faut publier même quand le contenu est mauvais',
        'Le talent ne sert à rien',
        'Il suffit de poster pour avoir des résultats'
      ),
      'correct_index', 0,
      'explication', 'La constance est la clé. 5 contenus réguliers créent plus de momentum qu''un seul contenu « parfait » tous les 30 jours.'
    ),
    jsonb_build_object(
      'question', 'Le module compare la discipline business à :',
      'options', jsonb_build_array(
        'Le sport de haut niveau',
        'La régularité de la salat',
        'Un marathon',
        'L''armée'
      ),
      'correct_index', 1,
      'explication', 'Tu ne rates pas ta salat parce que « t''as pas le temps ». Ton business mérite la même discipline.'
    ),
    jsonb_build_object(
      'question', 'Selon le hadith cité dans le module, la richesse est :',
      'options', jsonb_build_array(
        'Toujours une fitna pour le croyant',
        'Un bien quand elle est licite et entre les mains d''un homme pieux',
        'Quelque chose à éviter pour se rapprocher d''Allah',
        'Réservée à ceux qui ont étudié la finance'
      ),
      'correct_index', 1,
      'explication', 'Le Prophète ﷺ a dit : « Quel bon bien que la richesse licite pour l''homme pieux ! » [Rapporté par Ahmad (17096)]'
    ),
    jsonb_build_object(
      'question', 'Vrai ou Faux : « L''argent en Islam est haram. »',
      'options', jsonb_build_array(
        'Vrai',
        'Faux — ce qui est haram c''est la manière de le gagner, pas l''argent en lui-même'
      ),
      'correct_index', 1,
      'explication', 'Le Prophète ﷺ était commerçant, Khadija رضي الله عنها était une femme d''affaires prospère. L''argent est un bien quand il est dans ta main, pas dans ton cœur.'
    )
  )
));
