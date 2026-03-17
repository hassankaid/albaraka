
-- ═══ Fix 5 inconsistent organic leads ═══

-- 1) Set 3 leads with sales to 'close'
UPDATE leads
SET status = 'close', updated_at = now()
WHERE id IN (
  '597f0c15-6bd8-4d70-9df7-4f90cd6faf9d',  -- AKIF
  '593670fc-f34b-41d4-b0aa-c3fff00533f0',  -- ZAKARIYA HEBBAR
  '94f858d4-7ca7-4b46-beb2-ee536964084a'   -- NEYLLA
);

-- 2) Log status_change activities for those 3
INSERT INTO lead_activities (lead_id, user_id, action, old_value, new_value, note) VALUES
('597f0c15-6bd8-4d70-9df7-4f90cd6faf9d', '37a05543-77eb-405e-87c8-2cac8d75fa5c', 'status_change', 'inscrit_conference', 'close', 'Correction manuelle — vente existante sur le contact'),
('593670fc-f34b-41d4-b0aa-c3fff00533f0', '37a05543-77eb-405e-87c8-2cac8d75fa5c', 'status_change', 'inscrit_conference', 'close', 'Correction manuelle — vente existante sur le contact'),
('94f858d4-7ca7-4b46-beb2-ee536964084a', '37a05543-77eb-405e-87c8-2cac8d75fa5c', 'status_change', 'inscrit_conference', 'close', 'Correction manuelle — vente existante sur le contact');

-- 3) Set AMEL to 'call_booke' (active follow-up call)
UPDATE leads
SET status = 'call_booke', updated_at = now()
WHERE id = 'd3d21125-d228-4f7d-b016-60654cb676d0';

INSERT INTO lead_activities (lead_id, user_id, action, old_value, new_value, note) VALUES
('d3d21125-d228-4f7d-b016-60654cb676d0', '37a05543-77eb-405e-87c8-2cac8d75fa5c', 'status_change', 'inscrit_conference', 'call_booke', 'Correction manuelle — call follow-up actif sur le contact');

-- 4) Recycle NOUSSOURA (call annulé, no sale)
UPDATE leads
SET status = 'a_recycler', assigned_to = NULL, assigned_at = NULL, updated_at = now()
WHERE id = '99af776c-88ff-46c9-83eb-0151c0c5f8e8';

INSERT INTO lead_activities (lead_id, user_id, action, old_value, new_value, note) VALUES
('99af776c-88ff-46c9-83eb-0151c0c5f8e8', '37a05543-77eb-405e-87c8-2cac8d75fa5c', 'status_change', 'inscrit_conference', 'a_recycler', 'Recyclage manuel — call annulé, pas de vente');

-- ═══ Recycle remaining 157 dormant organic leads ═══
-- (inscrit_conference, no setter, organic source, no call/sale on contact)

-- First recycle them
UPDATE leads
SET status = 'a_recycler', assigned_to = NULL, assigned_at = NULL, updated_at = now()
WHERE source IN ('instagram_organic','apporteur_facebook','apporteur_whatsapp','apporteur_instagram','apporteur_linkedin','apporteur_recommandation','apporteur_telegram','apporteur_tiktok','apporteur_autre','autre')
  AND status = 'inscrit_conference'
  AND assigned_to IS NULL
  AND id NOT IN (
    '597f0c15-6bd8-4d70-9df7-4f90cd6faf9d',
    '593670fc-f34b-41d4-b0aa-c3fff00533f0',
    '94f858d4-7ca7-4b46-beb2-ee536964084a',
    'd3d21125-d228-4f7d-b016-60654cb676d0',
    '99af776c-88ff-46c9-83eb-0151c0c5f8e8'
  );

-- Log activity for each recycled lead
INSERT INTO lead_activities (lead_id, user_id, action, old_value, new_value, note)
SELECT 
  l.id,
  '37a05543-77eb-405e-87c8-2cac8d75fa5c',
  'status_change',
  'inscrit_conference',
  'a_recycler',
  'Recyclage manuel — lead organique non affecté'
FROM leads l
WHERE l.source IN ('instagram_organic','apporteur_facebook','apporteur_whatsapp','apporteur_instagram','apporteur_linkedin','apporteur_recommandation','apporteur_telegram','apporteur_tiktok','apporteur_autre','autre')
  AND l.status = 'a_recycler'
  AND l.assigned_to IS NULL
  AND l.id NOT IN (
    '597f0c15-6bd8-4d70-9df7-4f90cd6faf9d',
    '593670fc-f34b-41d4-b0aa-c3fff00533f0',
    '94f858d4-7ca7-4b46-beb2-ee536964084a',
    'd3d21125-d228-4f7d-b016-60654cb676d0',
    '99af776c-88ff-46c9-83eb-0151c0c5f8e8'
  )
  AND NOT EXISTS (
    SELECT 1 FROM lead_activities la 
    WHERE la.lead_id = l.id AND la.action = 'status_change' AND la.new_value = 'a_recycler' AND la.note = 'Recyclage manuel — lead organique non affecté'
  );
