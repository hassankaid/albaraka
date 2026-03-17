
-- Backfill missing lead_activities for all recycled leads
-- Use CEO as system user for the activity log
INSERT INTO lead_activities (lead_id, user_id, action, old_value, new_value, note)
SELECT 
  l.id,
  '37a05543-77eb-405e-87c8-2cac8d75fa5c',
  'status_change',
  'pas_de_reponse',
  'a_recycler',
  'Recyclage automatique — pas de réponse depuis plus de 30 jours (rétro-rempli)'
FROM leads l
WHERE l.status = 'a_recycler'
AND NOT EXISTS (
  SELECT 1 FROM lead_activities la 
  WHERE la.lead_id = l.id AND la.action = 'status_change' AND la.new_value = 'a_recycler'
);
