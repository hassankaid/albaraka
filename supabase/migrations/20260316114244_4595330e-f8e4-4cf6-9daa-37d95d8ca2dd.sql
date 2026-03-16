-- Temporarily age 5 leads for testing the recycle function
UPDATE leads 
SET updated_at = now() - interval '35 days' 
WHERE status = 'pas_de_reponse' AND assigned_to IS NOT NULL 
AND id IN (SELECT id FROM leads WHERE status = 'pas_de_reponse' AND assigned_to IS NOT NULL LIMIT 5);