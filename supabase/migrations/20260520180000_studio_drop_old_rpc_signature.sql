-- B4 v7 hotfix (20/05/2026) — Drop ancienne signature update_studio_segment_broll
--
-- Quand on a etendu la RPC avec p_broll_start_ms / p_broll_end_ms (defaults NULL),
-- Postgres a garde l'ancienne fonction 4-params en plus de la nouvelle 6-params.
-- Resultat : ambiguite "could not choose the best candidate function" sur les
-- appels avec 4 params (depuis studio-plan-brolls + frontend handleSavePrompt).
--
-- Fix : DROP l'ancienne signature. La nouvelle (avec defaults NULL) la couvre.

DROP FUNCTION IF EXISTS update_studio_segment_broll(uuid, int, text, text);
