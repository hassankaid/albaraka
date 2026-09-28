-- ─────────────────────────────────────────────────────────────────────────
-- pgcrypto vit dans le schéma « extensions », pas « public ».
--
-- generate_quiz_owner_slug appelait gen_random_bytes SANS le qualifier et
-- sans fixer de search_path : elle dépendait donc de celui du client.
-- PostgREST n'expose que « public », d'où l'erreur que voyaient les
-- apporteurs sur leur tableau de bord — « function gen_random_bytes(integer)
-- does not exist » — et l'impossibilité de générer leur lien de quiz.
--
-- Les deux autres fonctions du projet qui utilisent pgcrypto
-- (rafraichir_liste_conference, generer_invitations_questionnaire) écrivaient
-- déjà extensions.gen_random_bytes. Celle-ci était la seule à ne pas le faire,
-- et la seule appelée depuis le navigateur — c'est pour ça qu'elle était la
-- seule à échouer.
--
-- Corrigé des deux côtés : appels qualifiés ET search_path explicite.
-- Signalé par Hassan le 28/09/2026 en testant un compte élève.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.generate_quiz_owner_slug(p_full_name text)
returns text
language plpgsql
set search_path to 'public', 'extensions'
as $function$
DECLARE
  v_first text; v_base text; v_suffix text; v_slug text; v_attempt int := 0;
BEGIN
  v_first := COALESCE(NULLIF(TRIM(SPLIT_PART(COALESCE(p_full_name, ''), ' ', 1)), ''), 'user');
  v_base := LOWER(TRANSLATE(
    v_first,
    'àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÑÇ',
    'aaaaaaeeeeiiiioooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYYNC'
  ));
  v_base := REGEXP_REPLACE(v_base, '[^a-z0-9]+', '', 'g');
  IF LENGTH(v_base) < 2 THEN v_base := 'user'; END IF;
  IF LENGTH(v_base) > 22 THEN v_base := SUBSTRING(v_base, 1, 22); END IF;

  LOOP
    v_suffix := ENCODE(extensions.gen_random_bytes(3), 'hex');
    v_slug := v_base || '-' || v_suffix;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM lead_quiz_owners WHERE slug = v_slug);
    v_attempt := v_attempt + 1;
    IF v_attempt > 10 THEN
      v_slug := v_base || '-' || ENCODE(extensions.gen_random_bytes(8), 'hex');
      EXIT;
    END IF;
  END LOOP;

  RETURN v_slug;
END;
$function$;
