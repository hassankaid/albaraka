-- ═══════════════════════════════════════════════════════════════════════════
-- Perf : index sur calls.contact_id pour accélérer la vue leads_enriched.
--
-- DIAGNOSTIC
--   La page /leads admin mettait ~1s à charger 200 leads (EXPLAIN ANALYZE
--   "SELECT * FROM leads_enriched ORDER BY created_at DESC LIMIT 200" =
--   ~1044 ms).
--   Cause : la vue fait 2 sous-queries sur calls (contact_call et any_call)
--   filtrées sur contact_id. Aucun index sur calls.contact_id → Seq Scan
--   exécuté 3642 fois (une par lead). Buffers hit ≈ 364 000 sur ces deux
--   sous-queries seules.
--
-- FIX
--   Index BTREE simple sur calls.contact_id, plus un composite
--   (contact_id, scheduled_at DESC NULLS LAST) qui élimine en plus le sort
--   intermédiaire de la sous-query any_call.
--
-- IMPACT MESURÉ
--   Avant : 1044 ms (Seq Scan répété 3642x)
--   Après :  64 ms (Index Scan, ×16 plus rapide)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_calls_contact_id
  ON public.calls (contact_id);

CREATE INDEX IF NOT EXISTS idx_calls_contact_id_scheduled_desc
  ON public.calls (contact_id, scheduled_at DESC NULLS LAST);
