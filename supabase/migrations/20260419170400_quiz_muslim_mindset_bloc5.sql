-- Quiz Muslim Mindset — Bloc 5 : Hauts et bas & An-Niyyah (chapitres 10-12)
-- Attaché au dernier chapitre "L'intention sincère (An-Niyyah) + Conclusion".
-- Sa validation déclenche la complétion 100% de la formation + certificat + chapitre suivant du parcours AL BARAKA.

SELECT public.import_quiz_from_json(jsonb_build_object(
  'titre', 'Quiz Muslim Mindset — Bloc 5 Hauts et bas & An-Niyyah',
  'description', 'Chapitres 10, 11 et 12 — 3 questions. Valide ce quiz pour finaliser la formation.',
  'max_errors', 0,
  'status', 'published',
  'chapitre_id', 'd48a1cd6-b288-440a-b5f8-1bb1cfd0ecb8',
  'questions', jsonb_build_array(
    jsonb_build_object(
      'question', 'Sur 100 DM envoyés, combien de ventes peux-tu raisonnablement espérer selon le module ?',
      'options', jsonb_build_array(
        '10 ventes',
        '5 ventes',
        '1 vente',
        '0, les DM ne marchent pas'
      ),
      'correct_index', 2,
      'explication', '100 DM → 20 réponses → 7 qualifiés → 4 en conférence → 1 achat. C''est la réalité et c''est suffisant.'
    ),
    jsonb_build_object(
      'question', 'Le hadith « Les actes ne valent que par les intentions » est rapporté par :',
      'options', jsonb_build_array(
        'At-Tirmidhi uniquement',
        'Al-Bukhari (n°1) et Muslim (n°1907)',
        'Abu Dawud et An-Nasa''i',
        'Ahmad et Ibn Majah'
      ),
      'correct_index', 1,
      'explication', 'C''est le tout premier hadith du Sahih Al-Bukhari (n°1), aussi rapporté par Muslim (n°1907). L''un des hadiths les plus importants de l''Islam.'
    ),
    jsonb_build_object(
      'question', 'Dernière question — Engage-toi. Quelle intention vas-tu poser MAINTENANT pour ton business ?',
      'options', jsonb_build_array(
        '« Je veux gagner de l''argent rapidement et prouver à mon entourage qu''ils avaient tort »',
        '« BismiLah, je travaille avec excellence pour ma famille, pour la oumma, et je m''en remets à Allah pour le résultat »',
        '« Je vais essayer quelques semaines et on verra bien »',
        '« Je fais ça en attendant de trouver un vrai travail »'
      ),
      'correct_index', 1,
      'explication', 'L''intention sincère (An-Niyyah) est le fondement de tout. Quand l''intention est pure, les résultats suivent. BismiLah, tu es prêt(e) pour la suite du parcours AL BARAKA.'
    )
  )
));
