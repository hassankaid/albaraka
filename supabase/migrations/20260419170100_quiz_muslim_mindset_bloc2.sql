-- Quiz Muslim Mindset — Bloc 2 : Éthique de la vente & Baraka (chapitres 3-4)
-- Attaché au chapitre "La baraka dans le travail" (fin de bloc 2).

SELECT public.import_quiz_from_json(jsonb_build_object(
  'titre', 'Quiz Muslim Mindset — Bloc 2 Éthique de la vente & Baraka',
  'description', 'Chapitres 3 et 4 — 4 questions. Valide ce quiz pour débloquer le chapitre suivant.',
  'max_errors', 0,
  'status', 'published',
  'chapitre_id', '0d4d1732-2b66-4adf-82b3-5ad8d8c6ac88',
  'questions', jsonb_build_array(
    jsonb_build_object(
      'question', 'Un prospect hésite mais tu sens qu''il n''a clairement pas les moyens. Tu fais quoi ?',
      'options', jsonb_build_array(
        'Tu le presses en créant de l''urgence pour closer',
        'Tu le laisses partir avec respect et sincérité',
        'Tu lui dis qu''il va rater sa vie s''il n''achète pas',
        'Tu inventes un faux discount pour le convaincre'
      ),
      'correct_index', 1,
      'explication', 'Chez AL BARAKA, on ne presse jamais quelqu''un qui n''a pas les moyens. Le respect du prospect fait partie de l''éthique de la vente en Islam.'
    ),
    jsonb_build_object(
      'question', 'Lequel de ces comportements est une ligne rouge absolue chez AL BARAKA ?',
      'options', jsonb_build_array(
        'Poser des questions de qualification au prospect',
        'Créer de la fausse rareté ou de la fausse urgence',
        'Parler du prix avec transparence',
        'Faire un suivi après un premier échange'
      ),
      'correct_index', 1,
      'explication', 'La fausse urgence et la fausse rareté sont des formes de mensonge — et le mensonge est interdit en Islam.'
    ),
    jsonb_build_object(
      'question', 'La baraka dans ton travail vient de :',
      'options', jsonb_build_array(
        'Travailler 14h par jour sans pause',
        'Avoir le dernier script à la mode',
        'L''intention sincère, le bismillah et l''honnêteté dans chaque interaction',
        'Poster le plus de contenu possible'
      ),
      'correct_index', 2,
      'explication', 'La baraka, c''est cette force qui fait que 2h de travail concentré avec la bonne intention produisent plus de résultats que 8h sans conviction.'
    ),
    jsonb_build_object(
      'question', 'Un prospect te dit « je dois en parler à ma femme ». Quelle réponse est éthique ?',
      'options', jsonb_build_array(
        '« Si tu as besoin de demander la permission, c''est que tu n''es pas prêt pour le business »',
        '« Pas de souci akhi, parles-en avec elle tranquillement, et je reste disponible inshaAllah »',
        '« L''offre expire ce soir, il faut te décider maintenant »',
        '« Les gens qui réussissent prennent des décisions seuls »'
      ),
      'correct_index', 1,
      'explication', 'Respecter le refus et la réflexion fait partie des principes de la vente éthique en Islam. La consultation (shoura) en couple est même recommandée.'
    )
  )
));
