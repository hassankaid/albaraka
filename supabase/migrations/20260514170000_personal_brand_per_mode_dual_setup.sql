-- Personal Brand — support de DEUX espaces par membre (un par mode).
--
-- Contexte : un membre Liberty doit pouvoir dérouler à la fois le personal
-- brand AL BARAKA (mode 'pass') ET le sien (mode 'liberty'), chacun avec ses
-- propres profils / prompt / cycles 4 semaines. Or la table était limitée à
-- UNE ligne par membre (PK = user_id).
--
-- Solution : la clé primaire passe à (user_id, mode) → une ligne par membre
-- ET par mode. Aucune table ne référence user_personal_brand → pas de FK à
-- migrer. personal_brand_weeks porte déjà sa propre colonne `mode` et un
-- cycle_id unique par cycle, donc les semaines des deux modes coexistent
-- sans collision.

-- 1) Backfill du mode pour les anciennes lignes (créées avant l'ajout de la
--    colonne `mode` le 11/05). On déduit du pass : liberty si pass liberty
--    actif, sinon pass (cas AL BARAKA + le résiduel sans pass).
UPDATE public.user_personal_brand upb
SET mode = 'liberty'
WHERE upb.mode IS NULL
  AND EXISTS (
    SELECT 1 FROM public.user_passes up
    WHERE up.user_id = upb.user_id
      AND up.pass_type = 'liberty'
      AND up.revoked_at IS NULL
  );

UPDATE public.user_personal_brand
SET mode = 'pass'
WHERE mode IS NULL;

-- 2) mode devient obligatoire (il fait désormais partie de la clé primaire).
ALTER TABLE public.user_personal_brand
  ALTER COLUMN mode SET NOT NULL;

-- 3) Clé primaire (user_id) → (user_id, mode).
ALTER TABLE public.user_personal_brand
  DROP CONSTRAINT IF EXISTS user_personal_brand_pkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_personal_brand'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.user_personal_brand
      ADD CONSTRAINT user_personal_brand_pkey PRIMARY KEY (user_id, mode);
  END IF;
END $$;

-- La policy RLS user_personal_brand_own reste valide telle quelle : elle
-- filtre sur user_id = auth.uid() (ou rôle ceo), indépendamment du mode.
