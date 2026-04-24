-- Funnel quiz (lead_quiz_owners) — ouverture aux détenteurs du pass AL BARAKA
--
-- Avant : seul un user avec la feature `quiz_lead_magnet` ou role='ceo'
--         pouvait créer/modifier son owner (tunnel de prospection perso).
--         Initialement whitelisté sur le seul compte SID TEST.
--
-- Après : on ouvre aussi à tous les détenteurs d'un pass AL BARAKA actif.
--         La whitelist `quiz_lead_magnet` est conservée comme back-door pour
--         des cas exceptionnels (partenaire externe, test, accès sans pass).
--
-- Logique d'accès (INSERT + UPDATE) :
--   CEO  OU  pass al_baraka actif  OU  feature quiz_lead_magnet
--
-- La policy SELECT (owners_read_own_or_ceo) reste inchangée : chacun lit son
-- propre owner.

-- INSERT : drop + recreate avec la 3e condition
DROP POLICY IF EXISTS owners_insert_whitelisted_or_ceo ON lead_quiz_owners;
DROP POLICY IF EXISTS owners_insert_pass_or_ceo ON lead_quiz_owners;
CREATE POLICY owners_insert_pass_or_ceo ON lead_quiz_owners
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo')
      OR EXISTS (SELECT 1 FROM user_passes WHERE user_id = auth.uid() AND pass_type = 'al_baraka' AND revoked_at IS NULL)
      OR EXISTS (SELECT 1 FROM user_feature_unlocks WHERE user_id = auth.uid() AND feature = 'quiz_lead_magnet')
    )
  );

-- UPDATE : drop + recreate avec la 3e condition (USING + WITH CHECK identiques)
DROP POLICY IF EXISTS owners_update_whitelisted_or_ceo ON lead_quiz_owners;
DROP POLICY IF EXISTS owners_update_pass_or_ceo ON lead_quiz_owners;
CREATE POLICY owners_update_pass_or_ceo ON lead_quiz_owners
  FOR UPDATE
  USING (
    user_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo')
      OR EXISTS (SELECT 1 FROM user_passes WHERE user_id = auth.uid() AND pass_type = 'al_baraka' AND revoked_at IS NULL)
      OR EXISTS (SELECT 1 FROM user_feature_unlocks WHERE user_id = auth.uid() AND feature = 'quiz_lead_magnet')
    )
  )
  WITH CHECK (
    user_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo')
      OR EXISTS (SELECT 1 FROM user_passes WHERE user_id = auth.uid() AND pass_type = 'al_baraka' AND revoked_at IS NULL)
      OR EXISTS (SELECT 1 FROM user_feature_unlocks WHERE user_id = auth.uid() AND feature = 'quiz_lead_magnet')
    )
  );
