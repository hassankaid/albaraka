-- Extension du trigger d'auto-attribution : un nouveau lead hérite aussi
-- de l'assignee d'un call existant (Calendly orphelin) si aucun autre lead
-- n'est trouvé.
--
-- Cas typique adressé : un prospect prend un appel Calendly avant de
-- s'inscrire via Systeme.io. Le call est créé orphelin (lead_id NULL),
-- assigné à Sabrina. Plus tard, le prospect s'inscrit → un lead est créé.
-- Aujourd'hui ce lead arrivait dans le pot "à qualifier" et un autre
-- collab pouvait le prendre, créant un chevauchement.
--
-- Règle nuancée pour respecter le recyclage :
--   1. Lead non-recyclé avec assignee → hériter
--   2. Au moins un lead recyclé existant → reset volontaire, ne pas hériter
--   3. Call non-cancelled avec assignee → hériter de l'assignee du call
--   4. Sinon → lead libre

CREATE OR REPLACE FUNCTION auto_assign_new_lead_to_contact_collab()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_assignee uuid;
  v_has_recycled boolean;
  v_inherit_source text; -- 'lead' ou 'call', utilisé pour la note
BEGIN
  -- Si on a déjà un assigné explicite (ex : création manuelle CEO), respecter.
  IF NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- ── RÈGLE 1 : Autre lead non-recyclé du contact avec un assignee ──
  SELECT assigned_to INTO v_existing_assignee
  FROM leads
  WHERE contact_id = NEW.contact_id
    AND assigned_to IS NOT NULL
    AND recycled_at IS NULL
  ORDER BY assigned_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF v_existing_assignee IS NOT NULL THEN
    NEW.assigned_to := v_existing_assignee;
    NEW.assigned_at := now();
    v_inherit_source := 'lead';
  ELSE
    -- ── RÈGLE 2 : Au moins un lead recyclé pour ce contact → reset volontaire ──
    -- Si Sidali a explicitement recyclé un lead du contact dans le passé,
    -- sa décision prime. On ignore aussi les calls et on laisse le lead libre.
    SELECT EXISTS(
      SELECT 1 FROM leads
      WHERE contact_id = NEW.contact_id
        AND recycled_at IS NOT NULL
    ) INTO v_has_recycled;

    IF NOT v_has_recycled THEN
      -- ── RÈGLE 3 : Fallback sur les calls non-cancelled du contact ──
      SELECT assigned_to INTO v_existing_assignee
      FROM calls
      WHERE contact_id = NEW.contact_id
        AND assigned_to IS NOT NULL
        AND status IS DISTINCT FROM 'cancelled'
      ORDER BY scheduled_at DESC NULLS LAST, created_at DESC
      LIMIT 1;

      IF v_existing_assignee IS NOT NULL THEN
        NEW.assigned_to := v_existing_assignee;
        NEW.assigned_at := now();
        v_inherit_source := 'call';
      END IF;
    END IF;
  END IF;

  -- ── Traçabilité : entrée dans lead_activities si héritage effectué ──
  IF NEW.assigned_to IS NOT NULL AND v_inherit_source IS NOT NULL THEN
    INSERT INTO lead_activities (lead_id, user_id, action, new_value, note)
    VALUES (
      NEW.id,
      NEW.assigned_to,
      'assigned',
      NEW.assigned_to::text,
      CASE
        WHEN v_inherit_source = 'lead' THEN
          'Auto-assigné par cohérence : un autre lead du contact est déjà attribué à ce collaborateur'
        WHEN v_inherit_source = 'call' THEN
          'Auto-assigné par cohérence : un appel Calendly avec ce contact est déjà attribué à ce collaborateur'
        ELSE
          'Auto-assigné par cohérence'
      END
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger inchangé (la fonction est juste remplacée)
