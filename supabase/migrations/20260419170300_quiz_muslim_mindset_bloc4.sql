-- Quiz Muslim Mindset — Bloc 4 : Principes Premiers & Fondamentaux (chapitres 7-9)
-- Attaché au chapitre "Devenir un chercheur de fondamentaux" (fin de bloc 4).

SELECT public.import_quiz_from_json(jsonb_build_object(
  'titre', 'Quiz Muslim Mindset — Bloc 4 Principes Premiers & Fondamentaux',
  'description', 'Chapitres 7, 8 et 9 — 4 questions. Valide ce quiz pour débloquer le chapitre suivant.',
  'max_errors', 0,
  'status', 'published',
  'chapitre_id', 'a4a54af1-e280-4ce6-b391-b8b298c96264',
  'questions', jsonb_build_array(
    jsonb_build_object(
      'question', 'Les Principes Premiers, c''est :',
      'options', jsonb_build_array(
        'Les dernières techniques tendances sur Instagram',
        'Les vérités fondamentales qui ne changent pas avec le temps',
        'Les scripts qu''on te donne à copier-coller',
        'Les règles strictes de l''entreprise'
      ),
      'correct_index', 1,
      'explication', 'Les Principes Premiers (First Principles) sont les piliers fondamentaux qui soutiennent une idée. C''est le sol sur lequel pousse ton business.'
    ),
    jsonb_build_object(
      'question', 'Quelle est la différence entre un « déclencheur » et un « fondamental » ?',
      'options', jsonb_build_array(
        'Le déclencheur est plus efficace que le fondamental',
        'Le fondamental s''use avec le temps, pas le déclencheur',
        'Le déclencheur provoque une action à court terme et s''use ; le fondamental est intemporel',
        'Il n''y a pas de différence, c''est la même chose'
      ),
      'correct_index', 2,
      'explication', 'Les déclencheurs (hooks, techniques) s''usent avec la fatigue publicitaire. Les fondamentaux (simplicité, émotion, preuve sociale) touchent la psychologie humaine profonde et ne changent jamais.'
    ),
    jsonb_build_object(
      'question', '« Chez AL BARAKA, on te donne du poisson ET on t''apprend à pêcher. » Ça veut dire :',
      'options', jsonb_build_array(
        'On te donne les scripts à copier ET on t''explique pourquoi ils marchent',
        'On te donne un revenu fixe en attendant tes résultats',
        'On fait le travail à ta place au début',
        'On te forme uniquement à la théorie'
      ),
      'correct_index', 0,
      'explication', 'Copier c''est bien, ça te fait gagner du temps. Mais copier en améliorant et en comprenant POURQUOI ça marche, c''est devenir autonome.'
    ),
    jsonb_build_object(
      'question', 'Tu vois un concurrent poster un Réel qui fait 500K vues. En tant que chercheur de fondamentaux, tu te demandes :',
      'options', jsonb_build_array(
        '« Quel filtre il a utilisé ? Je vais copier le même format. »',
        '« Quel fondamental de la psychologie humaine rend ce hook si efficace ? »',
        '« C''est sûrement un coup de chance, ça ne se reproduira pas. »',
        '« Je dois poster exactement la même chose demain. »'
      ),
      'correct_index', 1,
      'explication', 'Un chercheur de fondamentaux ne copie pas aveuglément. Il analyse le POURQUOI — quel principe de psychologie humaine est à l''œuvre ?'
    )
  )
));
